from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.fertilize_service import get_fertilize_events

router = APIRouter(prefix="/api", tags=["Fertilize"])


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

    # Get fertilize events
    result = get_fertilize_events(
        forecast_30days = weather_data["weather_array"],
        planted_date    = body.planted_date,
        crop_name       = body.crop_name,
        land_size       = profile.get("land_size", 100),
        land_size_unit  = profile.get("land_size_unit", "sqft"),
        crisis_mode     = body.crisis_mode or False
    )

    if "error" in result:
        raise HTTPException(
            status_code=400,
            detail=result["error"]
        )

    return {
        "success":      True,
        "profile":      profile,
        "crop_name":    body.crop_name,
        "planted_date": body.planted_date,
        "crisis_mode":  body.crisis_mode,
        **result
    }