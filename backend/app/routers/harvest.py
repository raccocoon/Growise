from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.harvest_service import get_harvest_prediction
from app.services.crisis_service import calculate_crisis_mode

router = APIRouter(prefix="/api", tags=["Harvest"])


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


class HarvestRequest(BaseModel):
    profile_id:            str
    crop_name:             str
    planted_date:          str
    growth_duration_days:  int  = 30
    crisis_mode:           Optional[bool] = False


@router.post("/when-to-harvest")
async def when_to_harvest(
    body:          HarvestRequest,
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

    # Get 30-day weather forecast
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

    # Get harvest prediction
    try:
        result = await get_harvest_prediction(
            forecast_30days      = weather_data["weather_array"],
            planted_date         = body.planted_date,
            growth_duration_days = body.growth_duration_days,
            lat                  = profile["lat"],
            lng                  = profile["lng"],
            crisis_mode          = effective_crisis_mode
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Harvest prediction failed: {str(e)}"
        )

    if result.get("status") in ["no_data", "error"]:
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Invalid request")
        )

    return {
        "success":       True,
        "profile":       profile,
        "crop_name":     body.crop_name,
        "crisis_status": crisis,
        **result
    }
