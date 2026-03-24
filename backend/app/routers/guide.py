from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.ai_service import get_planting_guide
from datetime import datetime

router = APIRouter(prefix="/api", tags=["Guide"])


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


class GuideRequest(BaseModel):
    profile_id:           str
    crop_name:            str
    local_name:           str = ""
    growth_duration_days: int = 30
    main_concern:         str = ""
    estimated_harvest_date: str = ""
    estimated_cost_myr:   float = 0
    expected_yield:       str = ""
    confidence:           int = 0


@router.post("/guide")
async def guide(
    body:          GuideRequest,
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

    # Get weather summary
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

    accurate = [
        d for d in weather_data["weather_array"]
        if d["zone"] == "accurate"
    ]

    def avg(lst):
        clean = [v for v in lst if v is not None]
        return round(sum(clean) / len(clean), 1) if clean else 0

    def total(lst):
        clean = [v for v in lst if v is not None]
        return round(sum(clean), 1) if clean else 0

    weather_summary = {
        "avg_temp":       avg([d["temp_max"]    for d in accurate]),
        "total_rainfall": total([d["rainfall_mm"] for d in accurate]),
        "avg_humidity":   avg([d["humidity"]    for d in accurate]),
        "flood_risk":     accurate[0]["flood_risk"]   if accurate else "low",
        "drought_risk":   accurate[0]["drought_risk"] if accurate else "low",
        "current_month":  datetime.now().strftime("%B")
    }

    # Build crop dict from request
    crop = {
        "crop_name":            body.crop_name,
        "local_name":           body.local_name,
        "growth_duration_days": body.growth_duration_days,
        "main_concern":         body.main_concern,
        "estimated_harvest_date": body.estimated_harvest_date,
        "estimated_cost_myr":   body.estimated_cost_myr,
        "expected_yield":       body.expected_yield
    }

    # Get guide
    try:
        result = await get_planting_guide(
            crop=crop,
            profile=profile,
            weather_summary=weather_summary
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Guide generation failed: {str(e)}"
        )

    return {
        "success":      True,
        "cached":       result.get("cached", False),
        "profile":      profile,
        "crop":         crop,
        "weather":      weather_summary,
        "guide":        result.get("guide", {})
    }