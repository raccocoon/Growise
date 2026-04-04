import os
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from typing import Optional

from app.services.supabase_client import supabase

router = APIRouter(prefix="/api/debug", tags=["Debug"])

CRISIS_OVERRIDE: dict = {"active": False}


# ════════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════════

async def _get_region_key(profile_id: str) -> Optional[str]:
    try:
        res = (
            supabase.table("farm_profiles")
            .select("lat,lng")
            .eq("id", profile_id)
            .execute()
        )
        if not res.data:
            return None
        p = res.data[0]
        lat, lng = p["lat"], p["lng"]
        return f"{round(lat, 2)}_{round(lng, 2)}"
    except Exception:
        return None


def _build_fake_crisis_weather() -> dict:
    today = datetime.now().date()

    # Crisis rainfall for days 1-6
    rain_6    = [85, 62, 70, 55, 80, 45]
    tmax_6    = [38, 37, 38, 36, 37, 36]
    tmin_6    = [28, 27, 28, 26, 27, 26]
    hum_max_6 = [95, 93, 94, 92, 91, 90]
    hum_min_6 = [85, 83, 84, 82, 81, 80]
    rain_p_6  = [95, 90, 92, 88, 93, 75]
    wind_6    = [12, 10, 11,  9, 13,  8]
    wcode_6   = [95, 96, 95, 99, 96, 80]

    weather_array = []

    # ── Days 1-6: real crisis zone ──────────────────────────────────
    for i in range(6):
        hum = round((hum_max_6[i] + hum_min_6[i]) / 2, 1)
        weather_array.append({
            "date":               (today + timedelta(days=i)).isoformat(),
            "day_number":         i + 1,
            "zone":               "accurate",
            "confidence":         95,
            "confidence_label":   "High",
            "confidence_color":   "green",
            "temp_max":           tmax_6[i],
            "temp_min":           tmin_6[i],
            "rainfall_mm":        rain_6[i],
            "rain_probability":   rain_p_6[i],
            "humidity":           hum,
            "wind_kmh":           wind_6[i],
            "soil_moisture":      0.48,
            "soil_moisture_note": None,
            "weather_code":       wcode_6[i],
            "weather_label":      "Thunderstorm",
            "weather_icon":       "⛈️",
            "arima_interval":     None,
            "flood_risk":         "high",
            "drought_risk":       "low",
            "farming_score":      15,
        })

    # ── Days 7-14: predicted elevated zone ──────────────────────────
    for i in range(6, 14):
        idx = i - 6
        rain = round(40 - idx * 1.5, 1)
        weather_array.append({
            "date":               (today + timedelta(days=i)).isoformat(),
            "day_number":         i + 1,
            "zone":               "predicted",
            "confidence":         round(70 - idx * 3),
            "confidence_label":   "Good",
            "confidence_color":   "yellow",
            "temp_max":           round(35 + (idx % 2) * 1.0, 1),
            "temp_min":           27.0,
            "rainfall_mm":        rain,
            "rain_probability":   round(70 - idx * 3),
            "humidity":           round(89 - idx * 0.5, 1),
            "wind_kmh":           round(10 - idx * 0.3, 1),
            "soil_moisture":      0.42,
            "soil_moisture_note": "6-day avg",
            "weather_code":       None,
            "weather_label":      "Predicted",
            "weather_icon":       "🔮",
            "arima_interval":     None,
            "flood_risk":         "medium" if rain > 30 else "low",
            "drought_risk":       "low",
            "farming_score":      25,
        })

    # ── Days 15-30: estimated zone ──────────────────────────────────
    for i in range(14, 30):
        idx = i - 14
        rain = round(max(5, 25 - idx * 0.8), 1)
        weather_array.append({
            "date":               (today + timedelta(days=i)).isoformat(),
            "day_number":         i + 1,
            "zone":               "estimated",
            "confidence":         max(20, 50 - idx * 2),
            "confidence_label":   "Low",
            "confidence_color":   "red",
            "temp_max":           round(34 + (idx % 3) * 0.5, 1),
            "temp_min":           26.0,
            "rainfall_mm":        rain,
            "rain_probability":   round(max(20, 55 - idx * 2)),
            "humidity":           round(max(75, 87 - idx * 0.5), 1),
            "wind_kmh":           round(max(5, 9 - idx * 0.2), 1),
            "soil_moisture":      0.38,
            "soil_moisture_note": "6-day avg",
            "weather_code":       None,
            "weather_label":      "Predicted",
            "weather_icon":       "🔮",
            "arima_interval":     None,
            "flood_risk":         "low",
            "drought_risk":       "low",
            "farming_score":      40,
        })

    # ── Weekly summaries ────────────────────────────────────────────
    priority = {"high": 3, "medium": 2, "low": 1}
    weekly = []
    for w in range(4):
        chunk = weather_array[w * 7: w * 7 + 7]
        if not chunk:
            continue
        temps  = [d["temp_max"] for d in chunk if d["temp_max"] is not None]
        rains  = [d["rainfall_mm"] for d in chunk if d["rainfall_mm"] is not None]
        floods = [d["flood_risk"] for d in chunk]
        weekly.append({
            "week":              w + 1,
            "avg_temp":          round(sum(temps) / len(temps), 1) if temps else None,
            "total_rainfall":    round(sum(rains), 1),
            "rainy_days":        len([r for r in rains if r > 5]),
            "flood_risk":        max(floods, key=lambda x: priority.get(x, 0)),
            "best_farming_days": [
                d["day_number"] for d in chunk if d["farming_score"] > 75
            ],
        })

    return {
        "weather_array":    weather_array,
        "weekly_summaries": weekly,
        "location":         {},
        "generated_at":     datetime.now().isoformat(),
    }


# ════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@router.post("/crisis-toggle")
async def toggle_crisis(enable: bool, profile_id: str = None):
    if os.getenv("APP_ENV", "development") != "development":
        raise HTTPException(status_code=403, detail="Debug endpoints disabled")

    CRISIS_OVERRIDE["active"] = enable

    from app.services import weather_service
    from app.services import calendar_service
    calendar_service._cal_cache.clear()
    calendar_service._cal_timestamps.clear()

    if profile_id:
        region_key = await _get_region_key(profile_id)
        if region_key:
            if enable:
                weather_service._crisis_weather_cache[region_key] = _build_fake_crisis_weather()
            else:
                weather_service._crisis_weather_cache.pop(region_key, None)

    return {
        "success":         True,
        "crisis_override": enable,
        "message":         "Crisis mode injected" if enable else "Cache cleared — returning to live data",
    }


@router.get("/crisis-status")
async def get_crisis_status():
    return {"crisis_override": CRISIS_OVERRIDE["active"]}


@router.post("/reset-rate-limits")
async def reset_rate_limits():
    from app.services.ai_service import rate_limit_status
    rate_limit_status["openrouter"]["limited"] = False
    rate_limit_status["openrouter"]["reset_at"] = None
    rate_limit_status["gemini"]["limited"]     = False
    rate_limit_status["gemini"]["reset_at"]    = None
    return {"success": True, "message": "Rate limits reset"}
