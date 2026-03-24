from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.planting_service import get_planting_windows

router = APIRouter(prefix="/api", tags=["Planting"])


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


class PlantingRequest(BaseModel):
    profile_id:   str
    crop_name:    Optional[str] = ""
    planted_date: Optional[str] = None
    crisis_mode:  Optional[bool] = False


@router.post("/when-to-plant")
async def when_to_plant(
    body:          PlantingRequest,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

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

    result = get_planting_windows(
        forecast_30days=weather_data["weather_array"],
        planted_date=body.planted_date,
        crisis_mode=body.crisis_mode or False,
        crop_name=body.crop_name or None
    )

    return {
        "success":      True,
        "profile":      profile,
        "crop_name":    body.crop_name or "",
        "planted_date": body.planted_date,
        "windows":      result.get("windows", []),
        "daily_scores": result.get("daily_scores", []),
        "crisis_mode":  body.crisis_mode or False,
        "message":      result.get("message")
    }
