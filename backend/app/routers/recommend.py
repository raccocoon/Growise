from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.ai_service import get_crop_recommendation
from app.services.crisis_service import calculate_crisis_mode
import numpy as np


def convert_numpy_types(obj):
    """Convert numpy types to regular Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj


router = APIRouter(prefix="/api", tags=["Recommend"])


def get_user(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user  = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


class RecommendRequest(BaseModel):
    profile_id:  str
    crisis_mode: Optional[bool] = False


@router.post("/recommend")
async def recommend(
    body:          RecommendRequest,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    # Get farm profile
    profile_res = supabase.table("farm_profiles") \
        .select("*") \
        .eq("id", body.profile_id) \
        .eq("user_id", user_id) \
        .execute()

    if not profile_res.data:
        raise HTTPException(
            status_code=404,
            detail="Farm profile not found"
        )

    profile = profile_res.data[0]

    # Get weather
    try:
        weather_data = await get_weather(
            profile["lat"],
            profile["lng"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Weather fetch failed: {str(e)}"
        )

    # Build weather summary from accurate days only
    accurate = [
        d for d in weather_data["weather_array"]
        if d["zone"] == "accurate"
    ]

    crisis = calculate_crisis_mode(accurate)
    effective_crisis_mode = crisis["crisis_flag"] or (body.crisis_mode or False)

    def avg(lst):
        clean = [v for v in lst if v is not None]
        return round(sum(clean) / len(clean), 1) if clean else 0

    def total(lst):
        clean = [v for v in lst if v is not None]
        return round(sum(clean), 1) if clean else 0

    temps   = [d["temp_max"]     for d in accurate]
    t_mins  = [d["temp_min"]     for d in accurate]
    rains   = [d["rainfall_mm"]  for d in accurate]
    hums    = [d["humidity"]     for d in accurate]
    winds   = [d["wind_kmh"]     for d in accurate]
    soils   = [d["soil_moisture"] for d in accurate]

    weather_summary = {
        "avg_temp":          avg(temps),
        "temp_max":          max([t for t in temps if t], default=0),
        "temp_min":          min([t for t in t_mins if t], default=0),
        "total_rainfall":    total(rains),
        "avg_daily_rain":    round(total(rains) / 6, 1),
        "avg_humidity":      avg(hums),
        "max_wind":          max([w for w in winds if w], default=0),
        "avg_soil_moisture": avg(soils),
        "rainy_days":        sum(1 for r in rains if r and r > 5),
        "dry_days":          sum(1 for r in rains if r is not None and r < 2),
        "flood_risk":        accurate[0]["flood_risk"]    if accurate else "low",
        "drought_risk":      accurate[0]["drought_risk"]  if accurate else "low",
        "current_month":     datetime.now().strftime("%B")
    }

    # Get AI recommendation
    try:
        result = await get_crop_recommendation(
            profile=profile,
            soil_type=profile.get("soil_type", "Loam"),
            weather_summary=weather_summary,
            crisis_mode=effective_crisis_mode
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI recommendation failed: {str(e)}"
        )

    return {
        "success":         True,
        "profile":         profile,
        "weather_summary": weather_summary,
        "crisis_mode":     effective_crisis_mode,
        "crisis_status":   crisis,
        "recommendations": result.get("recommendations", [])
    }