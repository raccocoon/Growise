from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, date
from app.services.supabase_client import supabase

router = APIRouter(prefix="/api", tags=["Planting Logs"])


def _parse_planted_date(raw) -> date:
    if raw is None:
        raise ValueError("missing planted_date")
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    s = str(raw).strip()
    if "T" in s:
        s = s.split("T", 1)[0]
    if len(s) >= 10:
        s = s[:10]
    return datetime.strptime(s, "%Y-%m-%d").date()


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


class StartGrowingRequest(BaseModel):
    profile_id:            str
    crop_name:             str
    local_name:            Optional[str]   = ""
    growth_duration_days:  int             = 30
    planted_date:          str             # YYYY-MM-DD
    estimated_cost_myr:    Optional[float] = 0
    difficulty:            Optional[str]   = ""
    flood_tolerant:        Optional[bool]  = False
    drought_tolerant:      Optional[bool]  = False
    weather_suitability:   Optional[str]   = ""
    confidence:            Optional[int]   = 0
    notes:                 Optional[str]   = ""


class HarvestRequest(BaseModel):
    actual_harvest: str  # YYYY-MM-DD


# ── Start Growing ─────────────────────────────────────────────
@router.post("/planting-logs/start")
async def start_growing(
    body:          StartGrowingRequest,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    # Verify profile belongs to user
    profile = supabase.table("farm_profiles") \
        .select("id") \
        .eq("id", body.profile_id) \
        .eq("user_id", user_id) \
        .execute()

    if not profile.data:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    # Calculate estimated harvest
    try:
        planted  = datetime.strptime(body.planted_date, "%Y-%m-%d")
        est_harv = (planted + timedelta(
            days=body.growth_duration_days
        )).strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid planted_date format. Use YYYY-MM-DD"
        )

    # Check if same crop already active for this profile
    existing = supabase.table("planting_logs") \
        .select("id") \
        .eq("user_id", user_id) \
        .eq("farm_profile_id", body.profile_id) \
        .eq("crop_name", body.crop_name) \
        .is_("actual_harvest", "null") \
        .execute()

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail=f"{body.crop_name} is already growing. "
                   f"Harvest it first before starting again."
        )

    # Insert to planting_logs
    res = supabase.table("planting_logs").insert({
        "user_id":             user_id,
        "farm_profile_id":     body.profile_id,
        "crop_name":           body.crop_name,
        "local_name":          body.local_name,
        "growth_duration_days": body.growth_duration_days,
        "planted_date":        body.planted_date,
        "estimated_harvest":   est_harv,
        "actual_harvest":      None,
        "estimated_cost_myr":  body.estimated_cost_myr,
        "difficulty":          body.difficulty,
        "flood_tolerant":      body.flood_tolerant,
        "drought_tolerant":    body.drought_tolerant,
        "weather_suitability": body.weather_suitability,
        "confidence":          body.confidence,
        "status":              "growing",
        "notes":               body.notes
    }).execute()

    return {
        "success":          True,
        "message":          f"Started growing {body.crop_name}!",
        "planting_log":     res.data[0],
        "planted_date":     body.planted_date,
        "estimated_harvest": est_harv
    }


# ── Get All Active Crops ──────────────────────────────────────
@router.get("/planting-logs")
async def get_planting_logs(
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    res = supabase.table("planting_logs") \
        .select("*, farm_profiles(region_name, land_size, land_size_unit)") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()

    # Add days since planted and growth progress
    logs = []
    today = datetime.now().date()

    for log in res.data:
        if log.get("planted_date"):
            planted  = _parse_planted_date(log["planted_date"])
            days_since = (today - planted).days
            growth_dur = log.get("growth_duration_days", 30)
            progress   = min(100, round(days_since / growth_dur * 100))

            # Growth stage
            if days_since <= 0:   stage = "not_planted"
            elif days_since <= 7:  stage = "seedling"
            elif days_since <= 21: stage = "vegetative"
            elif days_since <= 40: stage = "flowering"
            elif days_since <= 60: stage = "fruiting"
            else:                  stage = "maturity"

            log["days_since_planted"] = days_since
            log["growth_progress"]    = progress
            log["growth_stage"]       = stage
        logs.append(log)

    return {
        "success": True,
        "data":    logs,
        "total":   len(logs)
    }


# ── Get Active Crops Only ─────────────────────────────────────
@router.get("/planting-logs/active")
async def get_active_crops(
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    res = supabase.table("planting_logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .is_("actual_harvest", "null") \
        .eq("status", "growing") \
        .order("planted_date", desc=True) \
        .execute()

    today = datetime.now().date()
    logs  = []

    for log in res.data:
        if log.get("planted_date"):
            planted    = _parse_planted_date(log["planted_date"])
            days_since = (today - planted).days
            growth_dur = log.get("growth_duration_days", 30)
            progress   = min(100, round(days_since / growth_dur * 100))

            if days_since <= 0:    stage = "not_planted"
            elif days_since <= 7:  stage = "seedling"
            elif days_since <= 21: stage = "vegetative"
            elif days_since <= 40: stage = "flowering"
            elif days_since <= 60: stage = "fruiting"
            else:                  stage = "maturity"

            log["days_since_planted"] = days_since
            log["growth_progress"]    = progress
            log["growth_stage"]       = stage
        logs.append(log)

    return {
        "success": True,
        "data":    logs,
        "total":   len(logs)
    }


# ── Mark as Harvested ─────────────────────────────────────────
@router.patch("/planting-logs/{log_id}/harvest")
async def mark_harvested(
    log_id:        str,
    body:          HarvestRequest,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    # Verify ownership
    existing = supabase.table("planting_logs") \
        .select("*") \
        .eq("id", log_id) \
        .eq("user_id", user_id) \
        .execute()

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Planting log not found"
        )

    res = supabase.table("planting_logs") \
        .update({
            "actual_harvest": body.actual_harvest,
            "status":         "harvested"
        }) \
        .eq("id", log_id) \
        .execute()

    return {
        "success":        True,
        "message":        "Marked as harvested!",
        "actual_harvest": body.actual_harvest,
        "data":           res.data[0]
    }


# ── Delete Log ────────────────────────────────────────────────
@router.delete("/planting-logs/{log_id}")
async def delete_log(
    log_id:        str,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    supabase.table("planting_logs") \
        .delete() \
        .eq("id", log_id) \
        .eq("user_id", user_id) \
        .execute()

    return {"success": True, "message": "Deleted"}