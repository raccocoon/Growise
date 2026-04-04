"""
calendar_service.py
-------------------
Assembler service for the GrowBuddy 30-day calendar.
Calls all existing advisory services and stitches their outputs
into one unified 30-day array.  No existing service logic is
rewritten here.
"""

from datetime import date, datetime, timedelta
from collections import defaultdict
from typing import Optional
import math

from app.services import (
    weather_service,
    crisis_service,
    planting_service,
    fertilize_service,
    pesticide_service,
    harvest_service,
)
from app.services.supabase_client import supabase

# ── Numpy / non-serializable type converter ──────────────────────────────────

def _convert(obj):
    """
    Recursively convert numpy scalars and other non-JSON-serializable types
    to their Python equivalents so FastAPI can serialize the response.
    numpy.bool_, numpy.int*, numpy.float* all come from pmdarima ARIMA
    forecasts and boolean expressions on numpy arrays.
    """
    # numpy types — detected by module name to avoid a hard numpy import
    typ = type(obj)
    mod = getattr(typ, "__module__", "") or ""
    if "numpy" in mod:
        if hasattr(obj, "item"):          # numpy scalar → Python scalar
            return obj.item()
        if hasattr(obj, "tolist"):        # numpy array → list
            return [_convert(v) for v in obj.tolist()]
    # Standard containers
    if isinstance(obj, dict):
        return {k: _convert(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_convert(v) for v in obj]
    # float NaN / Inf → None (not valid JSON)
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


# ── In-memory cache (3-hour TTL) ─────────────────────────────────────────────

_cal_cache:      dict = {}
_cal_timestamps: dict = {}
_CACHE_TTL_HOURS = 3


def _cache_key(profile_id: str, crop_name: str, planted_date) -> str:
    pd = planted_date.isoformat() if isinstance(planted_date, date) else (planted_date or "none")
    return f"calendar:{profile_id}:{crop_name}:{pd}"


def _cache_expired(key: str) -> bool:
    if key not in _cal_timestamps:
        return True
    return datetime.now() - _cal_timestamps[key] > timedelta(hours=_CACHE_TTL_HOURS)


# ── Planting window expansion ─────────────────────────────────────────────────

def _expand_planting_windows(plant_result: dict) -> list:
    """
    get_planting_windows() returns windows (start_date/end_date pairs) and
    daily_scores (per-day).  Expand windows into per-day plant events so
    the calendar assembler can index them by date string.
    """
    windows      = plant_result.get("windows", [])
    daily_scores = plant_result.get("daily_scores", [])

    # Build date → window lookup
    date_to_window: dict = {}
    for w in windows:
        try:
            start = datetime.strptime(w["start_date"], "%Y-%m-%d").date()
            end   = datetime.strptime(w["end_date"],   "%Y-%m-%d").date()
        except (KeyError, ValueError):
            continue
        cur = start
        while cur <= end:
            date_to_window[cur.isoformat()] = w
            cur += timedelta(days=1)

    events = []
    for ds in daily_scores:
        date_str = ds.get("date")
        if date_str in date_to_window:
            w = date_to_window[date_str]
            events.append({
                "date":         date_str,
                "day_number":   ds.get("day_number"),
                "type":         "plant",
                "score":        ds.get("score"),
                "label":        w.get("label"),
                "color":        w.get("color"),
                "window_score": w.get("window_score"),
                "best_time":    w.get("best_time"),
                "best_time_reason": w.get("best_time_reason"),
                "message":      w.get("message"),
                "zone":         ds.get("zone"),
                "confidence":   ds.get("confidence"),
            })
    return events


# ── Main assembler ────────────────────────────────────────────────────────────

async def generate_calendar(
    profile_id:           str,
    crop_name:            str,
    planted_date:         Optional[date] = None,
    growth_duration_days: Optional[int]  = None,
) -> dict:
    """
    Assemble a unified 30-day GrowBuddy calendar from all advisory services.

    Returns the full response dict including crisis_status, harvest_summary,
    and the 30-element calendar array.
    """

    # ── Cache check ──────────────────────────────────────────────────────────
    key = _cache_key(profile_id, crop_name, planted_date)
    if not _cache_expired(key):
        return _cal_cache[key]

    # ── Step 1: Fetch farm profile ───────────────────────────────────────────
    profile_res = supabase.table("farm_profiles") \
        .select("*") \
        .eq("id", profile_id) \
        .execute()

    if not profile_res.data:
        raise ValueError(f"Farm profile {profile_id} not found")

    profile = profile_res.data[0]

    lat             = profile["lat"]
    lng             = profile["lng"]
    land_size       = profile.get("land_size", 1)
    land_size_unit  = profile.get("land_size_unit", "hectare")
    farming_method  = profile.get("farming_method") or "conventional"

    # ── Step 2: Fetch planting log if planted_date not provided ──────────────
    if planted_date is None:
        log_res = supabase.table("planting_logs") \
            .select("*") \
            .eq("farm_profile_id", profile_id) \
            .eq("crop_name", crop_name) \
            .is_("actual_harvest", "null") \
            .execute()

        if log_res.data:
            log = log_res.data[0]
            raw_pd = log.get("planted_date")
            if raw_pd:
                try:
                    s = str(raw_pd)
                    if "T" in s:
                        s = s.split("T", 1)[0]
                    planted_date = datetime.strptime(s[:10], "%Y-%m-%d").date()
                except ValueError:
                    planted_date = None
            if growth_duration_days is None:
                growth_duration_days = log.get("growth_duration_days")

    # Normalise growth_duration_days
    if not growth_duration_days or growth_duration_days < 1:
        growth_duration_days = 30

    # String form used by every downstream service
    planted_date_str: Optional[str] = (
        planted_date.isoformat() if planted_date else None
    )

    # ── Step 3: Weather (must complete before anything else) ─────────────────
    weather_data    = await weather_service.get_weather(lat, lng)
    forecast_30days = weather_data["weather_array"]

    # Crisis uses only accurate (days 1-6) zone
    accurate_days = [d for d in forecast_30days if d.get("zone") == "accurate"]
    crisis = crisis_service.calculate_crisis_mode(accurate_days)

    # ── Sync services (called sequentially — they are not async) ─────────────
    plant_result = planting_service.get_planting_windows(
        forecast_30days   = forecast_30days,
        planted_date      = planted_date_str,
        crisis_mode       = crisis["crisis_flag"],
        crisis_safe_crops = crisis.get("crisis_safe_crops"),
        crop_name         = crop_name,
    )

    fert_result = fertilize_service.get_fertilize_events(
        forecast_30days = forecast_30days,
        planted_date    = planted_date_str or "",
        crop_name       = crop_name,
        land_size       = land_size,
        land_size_unit  = land_size_unit,
        crisis_mode     = crisis["crisis_flag"],
    )

    pest_result = pesticide_service.get_pesticide_events(
        forecast_30days = forecast_30days,
        planted_date    = planted_date_str or "",
        farming_method  = farming_method,
        crisis_mode     = crisis["crisis_flag"],
    )

    # ── Async harvest ────────────────────────────────────────────────────────
    harvest_info = await harvest_service.get_harvest_prediction(
        forecast_30days      = forecast_30days,
        planted_date         = planted_date_str or "",
        growth_duration_days = growth_duration_days,
        lat                  = lat,
        lng                  = lng,
        crisis_mode          = crisis["crisis_flag"],
    )

    # ── Step 4: Index all engine outputs by date string ──────────────────────
    plant_events   = _expand_planting_windows(plant_result)
    fert_events    = fert_result.get("events", [])
    pest_events    = pest_result.get("events", [])
    h_events       = harvest_info.get("harvest_events", [])

    events_by_date: dict = defaultdict(list)

    for e in plant_events:
        events_by_date[e["date"]].append(e)

    for e in fert_events:
        if e.get("should_fertilize"):
            events_by_date[e["date"]].append(e)

    for e in pest_events:
        events_by_date[e["date"]].append(e)

    for e in h_events:
        e = dict(e)
        if crisis["crisis_flag"]:
            e["urgency"] = "immediate"
        events_by_date[e["date"]].append(e)

    # ── Step 5: Assembly loop ────────────────────────────────────────────────
    today    = date.today()
    calendar = []

    for i in range(30):
        day_number   = i + 1
        current_date = today + timedelta(days=i)
        date_str     = current_date.isoformat()
        day          = forecast_30days[i] if i < len(forecast_30days) else {}

        # Collect events for this date
        day_events = list(events_by_date.get(date_str, []))

        # Crisis override
        is_crisis = crisis["crisis_flag"]
        if is_crisis:
            # Remove all fertilize events
            day_events = [e for e in day_events if e.get("type") != "fertilize"]

            # Remove pesticide events if rain > 10mm
            if day.get("rainfall_mm", 0) > 10:
                day_events = [e for e in day_events if e.get("type") != "pesticide"]

            # Set harvest urgency to immediate
            for e in day_events:
                if e.get("type") == "harvest":
                    e["urgency"] = "immediate"
                    e["message"] = "Crisis active — harvest immediately, do not wait"

            # Crisis is communicated via top-level crisis_status only —
            # do NOT add crisis_advisory as a per-day event pill.

        # Generate alerts — accurate zone (days 1-6) only
        alerts = []
        if day.get("zone") == "accurate":
            rainfall     = day.get("rainfall_mm", 0) or 0
            temp_max     = day.get("temp_max", 0) or 0
            soil_moisture = day.get("soil_moisture")
            weathercode  = day.get("weather_code")

            if rainfall > 80:
                alerts.append({
                    "type":    "CRITICAL",
                    "message": f"Flood risk — {rainfall}mm rainfall expected",
                })
            elif rainfall > 50:
                alerts.append({
                    "type":    "WARNING",
                    "message": f"Heavy rain — {rainfall}mm expected",
                })

            if soil_moisture is not None and soil_moisture < 0.12:
                alerts.append({
                    "type":    "WARNING",
                    "message": "Drought risk — soil moisture critically low",
                })

            if temp_max > 36:
                alerts.append({
                    "type":    "WARNING",
                    "message": f"Extreme heat — {temp_max}°C expected",
                })

            if weathercode in [95, 96, 99]:
                alerts.append({
                    "type":    "WARNING",
                    "message": "Thunderstorm forecast — avoid all field work",
                })

            if is_crisis:
                alerts.append({
                    "type":    "CRITICAL",
                    "message": f"Crisis mode active — risk score {crisis['risk_score']}/100",
                })

        # Assemble day object
        calendar.append({
            "date":             date_str,
            "day_number":       day_number,
            "zone":             day.get("zone"),
            "confidence":       day.get("confidence"),
            "confidence_label": day.get("confidence_label"),
            "confidence_color": day.get("confidence_color"),
            "is_crisis":        is_crisis,
            "weather": {
                "temp_max":        day.get("temp_max"),
                "temp_min":        day.get("temp_min"),
                "rainfall_mm":     day.get("rainfall_mm"),
                "rain_probability": day.get("rain_probability"),
                "humidity":        day.get("humidity"),
                "wind_kmh":        day.get("wind_kmh"),
                "soil_moisture":   day.get("soil_moisture"),
                "weather_code":    day.get("weather_code"),
                "weather_label":   day.get("weather_label"),
                "weather_icon":    day.get("weather_icon"),
                "flood_risk":      day.get("flood_risk"),
                "drought_risk":    day.get("drought_risk"),
                "arima_interval":  day.get("arima_interval"),
            },
            "events": day_events,
            "alerts": alerts,
        })

    # ── Step 6: Build full response ──────────────────────────────────────────
    readiness = harvest_info.get("readiness") or {}

    result = {
        "success":     True,
        "profile_id":  profile_id,
        "crop_name":   crop_name,
        "planted_date": planted_date_str,
        "generated_at": datetime.utcnow().isoformat(),
        "crisis_status": {
            "crisis_flag":   crisis["crisis_flag"],
            "warning_flag":  crisis["warning_flag"],
            "mode":          crisis["mode"],
            "risk_score":    crisis["risk_score"],
            "triggers":      crisis.get("triggers", []),
        },
        "harvest_summary": {
            "base_harvest_date":       harvest_info.get("base_harvest_date"),
            "adjusted_harvest_date":   harvest_info.get("adjusted_harvest_date"),
            "stress_delay_days":       harvest_info.get("stress_delay_days"),
            "readiness_status":        readiness.get("status"),
            "readiness_message":       readiness.get("message"),
            "readiness_color":         readiness.get("color"),
            "harvest_confidence":      harvest_info.get("harvest_confidence"),
            "harvest_confidence_label": harvest_info.get("harvest_confidence_label"),
            "harvest_confidence_color": harvest_info.get("harvest_confidence_color"),
            "early_harvest_alert":     harvest_info.get("early_alert"),
        },
        "planting_message": plant_result.get("message"),
        "calendar": calendar,
    }

    # ── Step 7: Sanitize numpy types, then cache ────────────────────────────
    result = _convert(result)

    _cal_cache[key]      = result
    _cal_timestamps[key] = datetime.now()

    return result
