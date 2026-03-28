from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.supabase_client import supabase
from app.services.weather_service import get_weather
from app.services.pesticide_service import get_pesticide_events
import numpy as np

router = APIRouter(prefix="/api", tags=["Pesticide"])


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
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )


class PesticideRequest(BaseModel):
    profile_id: str
    crop_name: str
    planted_date: str
    farming_method: str = "conventional"


@router.post("/when-to-pesticide")
async def when_to_pesticide(
    body: PesticideRequest,
    authorization: str = Header(...),
):
    get_user(authorization)

    profile_res = (
        supabase.table("farm_profiles")
        .select("*")
        .eq("id", body.profile_id)
        .execute()
    )

    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = profile_res.data[0]

    try:
        weather_data = await get_weather(profile["lat"], profile["lng"])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Weather failed: {str(e)}",
        )

    result = get_pesticide_events(
        forecast_30days=weather_data["weather_array"],
        planted_date=body.planted_date,
        farming_method=body.farming_method,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    fm = (body.farming_method or "conventional").strip().lower()
    if fm not in ("organic", "conventional"):
        fm = "conventional"

    # Convert numpy types to regular Python types
    result = convert_numpy_types(result)

    return {
        "success": True,
        "profile": profile,
        "crop_name": body.crop_name,
        "planted_date": body.planted_date,
        "farming_method": fm,
        **{k: v for k, v in result.items() if k != "error"},
    }
