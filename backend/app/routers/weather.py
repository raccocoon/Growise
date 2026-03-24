from fastapi import APIRouter, HTTPException, Header
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather

router = APIRouter(prefix="/api", tags=["Weather"])


def get_user(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user  = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


@router.get("/weather")
async def weather_endpoint(
    profile_id:    str,
    authorization: str = Header(...)
):
    get_user(authorization)

    res = supabase.table("farm_profiles") \
        .select("*") \
        .eq("id", profile_id) \
        .execute()

    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    p = res.data[0]

    try:
        result = await get_weather(p["lat"], p["lng"])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Weather failed: {str(e)}"
        )

    return { "success": True, **result }