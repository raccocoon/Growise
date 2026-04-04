from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.services.supabase_client import supabase
from app.services.calendar_service import generate_calendar

router = APIRouter(prefix="/api", tags=["Land Analysis"])


def get_user(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user  = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class CalendarRequest(BaseModel):
    profile_id:           str
    crop_name:            str
    planted_date:         Optional[str] = None   # YYYY-MM-DD or None
    growth_duration_days: Optional[int] = 30


@router.post("/calendar")
async def get_growbuddy_calendar(
    body:          CalendarRequest,
    authorization: str = Header(...),
):
    user_id = get_user(authorization)

    # Ownership check — user may only access their own profiles
    profile_res = supabase.table("farm_profiles") \
        .select("id") \
        .eq("id", body.profile_id) \
        .eq("user_id", user_id) \
        .execute()

    if not profile_res.data:
        raise HTTPException(
            status_code=403,
            detail="Profile not found or access denied",
        )

    # Parse optional planted_date
    planted_date: Optional[date] = None
    if body.planted_date:
        try:
            planted_date = date.fromisoformat(body.planted_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid planted_date format — use YYYY-MM-DD",
            )

    try:
        result = await generate_calendar(
            profile_id           = body.profile_id,
            crop_name            = body.crop_name,
            planted_date         = planted_date,
            growth_duration_days = body.growth_duration_days,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calendar generation failed: {str(e)}")

    return result
