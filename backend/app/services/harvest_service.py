from datetime import datetime, timedelta, date
import httpx
from app.utils.confidence import harvest_confidence


# ════════════════════════════════════════════════════════════════════════════
# ARCHIVE API — FETCH HISTORICAL WEATHER SINCE PLANTING
# ════════════════════════════════════════════════════════════════════════════

async def fetch_historical_since_planting(
    lat:          float,
    lng:          float,
    planted_date: str
) -> dict:
    """
    Fetch historical weather from planted_date to yesterday.
    Used to calculate stress delay.
    """
    try:
        today      = datetime.now().date()
        start_date = planted_date
        end_date   = (today - timedelta(days=1)).isoformat()

        # If planted yesterday or today no history available
        planted = datetime.strptime(planted_date, "%Y-%m-%d").date()
        if planted >= today:
            return {"daily": {}}

        daily_params = ",".join([
            "temperature_2m_max",
            "precipitation_sum",
            "soil_moisture_0_to_7cm"
        ])

        url = (
            f"https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}"
            f"&longitude={lng}"
            f"&start_date={start_date}"
            f"&end_date={end_date}"
            f"&daily={daily_params}"
            f"&timezone=Asia%2FKuching"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(url)
            if res.status_code != 200:
                print(f"Archive API error: {res.status_code}")
                return {"daily": {}}
            return res.json()

    except Exception as e:
        print(f"Archive fetch failed: {e}")
        return {"daily": {}}


# ════════════════════════════════════════════════════════════════════════════
# STRESS DELAY CALCULATION
# ════════════════════════════════════════════════════════════════════════════

def calculate_stress_delay(historical: dict) -> dict:
    """
    Calculate how many days of growth delay
    occurred due to weather stress since planting.
    """
    daily    = historical.get("daily", {})
    temps    = daily.get("temperature_2m_max",    [])
    rains    = daily.get("precipitation_sum",     [])
    soils    = daily.get("soil_moisture_0_to_7cm", [])

    delay       = 0.0
    stress_days = []

    for i in range(len(temps)):
        temp = temps[i] if i < len(temps) else None
        rain = rains[i] if i < len(rains) else None
        soil = soils[i] if i < len(soils) else None

        day_stress = 0.0
        reasons    = []

        # Heat stress
        if temp is not None:
            if temp > 35:
                day_stress += 0.5
                reasons.append(f"Heat stress {temp}°C (+0.5d)")
            elif temp > 33:
                day_stress += 0.2
                reasons.append(f"Mild heat {temp}°C (+0.2d)")

        # Waterlogging stress
        if soil is not None:
            if soil > 0.42:
                day_stress += 0.5
                reasons.append(f"Waterlogged soil {soil} (+0.5d)")
            elif soil > 0.38:
                day_stress += 0.2
                reasons.append(f"Wet soil {soil} (+0.2d)")

        # Drought stress
        if soil is not None:
            if soil < 0.12:
                day_stress += 1.0
                reasons.append(f"Drought stress {soil} (+1.0d)")
            elif soil < 0.15:
                day_stress += 0.5
                reasons.append(f"Dry soil {soil} (+0.5d)")

        # Flood stress
        if rain is not None:
            if rain > 80:
                day_stress += 1.0
                reasons.append(f"Flood {rain}mm (+1.0d)")
            elif rain > 60:
                day_stress += 0.5
                reasons.append(f"Heavy rain {rain}mm (+0.5d)")

        if day_stress > 0:
            stress_days.append({
                "day_index": i,
                "stress":    day_stress,
                "reasons":   reasons
            })

        delay += day_stress

    return {
        "total_delay_days": round(delay, 1),
        "delay_rounded":    round(delay),
        "stress_days_count": len(stress_days),
        "stress_details":   stress_days[:5]  # show top 5 stress days
    }


# ════════════════════════════════════════════════════════════════════════════
# HARVEST DAY SCORING
# ════════════════════════════════════════════════════════════════════════════

def score_harvest_day(day: dict) -> int:
    """
    Score a forecast day as a harvest day (0-100).
    Higher = better conditions to harvest.
    """
    score    = 100
    rainfall = day.get("rainfall_mm")     or 0
    humidity = day.get("humidity")        or 0
    temp_max = day.get("temp_max")        or 0
    rain_prob= day.get("rain_probability") or 0
    wcode    = day.get("weather_code")

    # Rainfall penalty
    if rainfall > 20:   score -= 50
    elif rainfall > 10: score -= 25
    elif rainfall > 5:  score -= 10

    # Humidity penalty
    if humidity > 90:   score -= 30
    elif humidity > 82: score -= 15

    # Temperature penalty
    if temp_max > 35:   score -= 20

    # Rain probability penalty
    if rain_prob > 70:   score -= 20
    elif rain_prob > 50: score -= 10

    # Thunderstorm penalty
    if wcode and int(wcode) in [95, 96, 99]:
        score -= 60

    return max(0, score)


# ════════════════════════════════════════════════════════════════════════════
# READINESS STATUS
# ════════════════════════════════════════════════════════════════════════════

def get_readiness_status(
    today:        date,
    window_start: date,
    window_end:   date,
    best_score:   int
) -> dict:
    """
    Determine harvest readiness status.
    """
    if today < window_start:
        days_until = (window_start - today).days
        return {
            "status":  "not_ready",
            "label":   "Not Ready",
            "color":   "#757575",
            "message": f"{days_until} day(s) until harvest window opens"
        }

    elif window_start <= today <= window_end:
        if best_score >= 60:
            return {
                "status":  "harvest_now",
                "label":   "Harvest Now",
                "color":   "#2E7D32",
                "message": "Good conditions confirmed — harvest today"
            }
        else:
            return {
                "status":  "ready_wait",
                "label":   "Ready but Wait",
                "color":   "#E65100",
                "message": "Crop is ready but conditions not ideal today"
            }

    else:
        return {
            "status":  "overdue",
            "label":   "Overdue",
            "color":   "#B71C1C",
            "message": "Harvest window passed — harvest immediately"
        }


# ════════════════════════════════════════════════════════════════════════════
# MAIN FUNCTION
# ════════════════════════════════════════════════════════════════════════════

async def get_harvest_prediction(
    forecast_30days:      list,
    planted_date:         str,
    growth_duration_days: int,
    lat:                  float,
    lng:                  float,
    crisis_mode:          bool = False
) -> dict:
    """
    Calculate adjusted harvest date and find best harvest window.
    """

    # Pre-condition
    if not planted_date:
        return {
            "status":  "no_data",
            "message": "No planted date provided"
        }

    try:
        planted = datetime.strptime(planted_date, "%Y-%m-%d").date()
    except ValueError:
        return {
            "status":  "error",
            "message": "Invalid planted_date. Use YYYY-MM-DD"
        }

    today = datetime.now().date()

    # ── Step 1: Base harvest date ──────────────────────────────
    base_harvest = planted + timedelta(days=growth_duration_days)

    # ── Step 2: Stress delay from historical data ──────────────
    stress_info = {"total_delay_days": 0, "delay_rounded": 0,
                   "stress_days_count": 0, "stress_details": []}

    if planted < today:
        historical  = await fetch_historical_since_planting(
            lat, lng, planted_date
        )
        stress_info = calculate_stress_delay(historical)

    delay_days       = stress_info["delay_rounded"]
    adjusted_harvest = base_harvest + timedelta(days=delay_days)

    days_until = max(0, (adjusted_harvest - today).days)
    conf = harvest_confidence(
        days_until_harvest=days_until,
        stress_delay_days=delay_days
    )

    # ── Step 3: Harvest window ─────────────────────────────────
    window_start = adjusted_harvest - timedelta(days=2)
    window_end   = adjusted_harvest + timedelta(days=5)

    # ── Step 4: Score forecast days in window ──────────────────
    window_days  = []
    harvest_events = []

    for day in forecast_30days:
        day_date = datetime.strptime(day["date"], "%Y-%m-%d").date()

        if window_start <= day_date <= window_end:
            score = score_harvest_day(day)
            if crisis_mode:
                score = max(score, 60)  # urgency override

            window_days.append({
                "date":       day["date"],
                "day_number": day["day_number"],
                "score":      score,
                "good":       score >= 60,
                "zone":       day["zone"],
                "confidence": day["confidence"],
                "weather": {
                    "temp_max":         day.get("temp_max"),
                    "rainfall_mm":      day.get("rainfall_mm"),
                    "humidity":         day.get("humidity"),
                    "rain_probability": day.get("rain_probability"),
                    "weather_label":    day.get("weather_label"),
                    "weather_icon":     day.get("weather_icon")
                }
            })

            harvest_events.append({
                "date":             day["date"],
                "day_number":       day["day_number"],
                "type":             "harvest",
                "score":            score,
                "good":             score >= 60,
                "zone":             day["zone"],
                "confidence":       day.get("confidence", 50),
                "confidence_label": day.get("confidence_label", "Medium"),
                "confidence_color": day.get("confidence_color", "yellow"),
                "crisis_urgency":   crisis_mode
            })

    # Best harvest day
    best_day = max(window_days, key=lambda d: d["score"]) \
               if window_days else None

    # ── Step 5: Best harvest time ──────────────────────────────
    best_temp = best_day["weather"]["temp_max"] if best_day else 30
    if best_temp and best_temp > 32:
        best_time = "6:00 AM – 9:00 AM"
        time_reason = "Harvest before peak heat"
    else:
        best_time = "6:00 AM – 10:00 AM or 4:00 PM – 6:00 PM"
        time_reason = "Cooler temperatures for better quality"

    # ── Step 6: Early harvest alert ────────────────────────────
    early_alert = None

    for day in forecast_30days:
        day_date = datetime.strptime(day["date"], "%Y-%m-%d").date()
        rainfall = day.get("rainfall_mm") or 0

        if day_date < window_start:
            if rainfall > 80:
                suggested = (
                    adjusted_harvest - timedelta(days=4)
                ).isoformat()
                early_alert = {
                    "type":           "CRITICAL",
                    "message":        "Flood risk approaching — harvest immediately",
                    "trigger_date":   day["date"],
                    "trigger_rain":   rainfall,
                    "suggested_date": suggested
                }
                break
            elif rainfall > 40:
                suggested = (
                    adjusted_harvest - timedelta(days=3)
                ).isoformat()
                early_alert = {
                    "type":           "WARNING",
                    "message":        "Heavy rain approaching — harvest 3 days early",
                    "trigger_date":   day["date"],
                    "trigger_rain":   rainfall,
                    "suggested_date": suggested
                }

    # ── Step 7: Readiness status ───────────────────────────────
    readiness = get_readiness_status(
        today,
        window_start,
        window_end,
        best_day["score"] if best_day else 0
    )

    # Crisis override
    if crisis_mode and readiness["status"] in ["harvest_now","ready_wait"]:
        readiness["status"]  = "harvest_now"
        readiness["message"] = "CRISIS — harvest immediately regardless of conditions"
        readiness["color"]   = "#B71C1C"

    # ── Step 8: Build daily array for calendar ─────────────────
    daily = []
    for day in forecast_30days:
        day_date     = datetime.strptime(day["date"], "%Y-%m-%d").date()
        days_to_harv = (adjusted_harvest - day_date).days
        in_window    = window_start <= day_date <= window_end

        score = score_harvest_day(day) if in_window else None
        is_best = (
            best_day is not None and
            day["date"] == best_day["date"]
        )

        daily.append({
            "date":              day["date"],
            "day_number":        day["day_number"],
            "zone":              day["zone"],
            "confidence":        day["confidence"],
            "in_harvest_window": in_window,
            "harvest_score":     score,
            "is_best_day":       is_best,
            "days_to_harvest":   days_to_harv,
            "before_window":     day_date < window_start,
            "after_window":      day_date > window_end
        })

    return {
        "planted_date":        planted_date,
        "growth_duration_days": growth_duration_days,
        "base_harvest_date":   base_harvest.isoformat(),
        "stress_delay_days":   delay_days,
        "stress_info":         stress_info,
        "adjusted_harvest_date": adjusted_harvest.isoformat(),
        "harvest_window": {
            "start": window_start.isoformat(),
            "end":   window_end.isoformat()
        },
        "best_harvest_day":    best_day,
        "best_harvest_time":   best_time,
        "best_harvest_time_reason": time_reason,
        "window_days":         window_days,
        "harvest_events":      harvest_events,
        "harvest_confidence":  conf["score"],
        "harvest_confidence_label": conf["label"],
        "harvest_confidence_color": conf["color"],
        "early_alert":         early_alert,
        "readiness":           readiness,
        "daily":               daily,
        "crisis_mode":         crisis_mode
    }
