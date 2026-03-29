from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.fertilize_service import get_fertilize_events
from app.services.crisis_service import calculate_crisis_mode
import numpy as np

router = APIRouter(prefix="/api", tags=["Fertilize"])


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


class FertilizeRequest(BaseModel):
    profile_id:   str
    crop_name:    str
    planted_date: str
    crisis_mode:  Optional[bool] = False


@router.post("/when-to-fertilize")
async def when_to_fertilize(
    body:          FertilizeRequest,
    authorization: str = Header(...)
):
    get_user(authorization)

    # Get farm profile
    profile_res = supabase.table("farm_profiles") \
        .select("*") \
        .eq("id", body.profile_id) \
        .execute()

    if not profile_res.data:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    profile = profile_res.data[0]

    # Get 30-day weather
    try:
        weather_data = await get_weather(
            profile["lat"],
            profile["lng"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Weather failed: {str(e)}"
        )

    accurate_days = [
        d for d in weather_data["weather_array"]
        if d["zone"] == "accurate"
    ]
    crisis = calculate_crisis_mode(accurate_days)
    effective_crisis_mode = crisis["crisis_flag"] or (body.crisis_mode or False)

    # Get fertilize events
    result = get_fertilize_events(
        forecast_30days = weather_data["weather_array"],
        planted_date    = body.planted_date,
        crop_name       = body.crop_name,
        land_size       = profile.get("land_size", 100),
        land_size_unit  = profile.get("land_size_unit", "sqft"),
        crisis_mode     = effective_crisis_mode
    )

    if "error" in result:
        raise HTTPException(
            status_code=400,
            detail=result["error"]
        )

    # Convert numpy types to regular Python types
    result = convert_numpy_types(result)

    return {
        "success":      True,
        "profile":      profile,
        "crop_name":    body.crop_name,
        "planted_date": body.planted_date,
        "crisis_mode":  effective_crisis_mode,
        "crisis_status": crisis,
        **result
    }