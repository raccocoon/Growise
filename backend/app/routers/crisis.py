from fastapi import APIRouter, HTTPException, Header
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.crisis_service import calculate_crisis_mode

router = APIRouter(prefix="/api", tags=["Crisis"])


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


@router.get("/crisis-status")
async def crisis_status(
    profile_id:    str,
    authorization: str = Header(...)
):
    get_user(authorization)

    # Get profile
    profile_res = supabase.table("farm_profiles") \
        .select("*") \
        .eq("id", profile_id) \
        .execute()

    if not profile_res.data:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
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
            detail=f"Weather failed: {str(e)}"
        )

    # Only use accurate zone days for crisis calculation
    accurate_days = [
        d for d in weather_data["weather_array"]
        if d["zone"] == "accurate"
    ]

    crisis = calculate_crisis_mode(accurate_days)

    return {
        "success": True,
        "profile": {
            "id":          profile["id"],
            "region_name": profile["region_name"]
        },
        "weather_summary": {
            "avg_temp":     crisis["avg_temp"],
            "avg_humidity": crisis["avg_humidity"],
            "max_rainfall": crisis["max_rainfall"]
        },
        **crisis
    }
