from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.supabase_client import supabase
from app.services.soil_service import get_soil_type

router = APIRouter(prefix="/api/profile", tags=["Profile"])


# ── Auth helper ──────────────────────────────────────────────────
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


# ── Request model ────────────────────────────────────────────────
class CreateProfileRequest(BaseModel):
    region_id:        str
    land_size:        float
    land_size_unit:   str
    water_source:     str
    experience_level: str
    is_default:       Optional[bool] = False


# ── Endpoints ────────────────────────────────────────────────────
@router.get("/regions")
async def get_regions():
    res = supabase.table("regions").select("*").execute()
    return { "success": True, "data": res.data }


@router.get("/farms")
async def get_farms(authorization: str = Header(...)):
    user_id = get_user(authorization)
    res = supabase.table("farm_profiles") \
        .select("*, regions(name, lat, lng)") \
        .eq("user_id", user_id) \
        .execute()
    return { "success": True, "data": res.data }


@router.get("/farms/{profile_id}")
async def get_farm(
    profile_id: str,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)
    res = supabase.table("farm_profiles") \
        .select("*, regions(name, lat, lng)") \
        .eq("id", profile_id) \
        .eq("user_id", user_id) \
        .execute()

    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Farm profile not found"
        )

    return { "success": True, "data": res.data[0] }


@router.post("/farms")
async def create_farm(
    body: CreateProfileRequest,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    # Get region lat/lng
    region = supabase.table("regions") \
        .select("*") \
        .eq("id", body.region_id) \
        .execute()

    if not region.data:
        raise HTTPException(
            status_code=404,
            detail="Region not found"
        )

    reg = region.data[0]
    lat = reg["lat"]
    lng = reg["lng"]

    # Auto detect soil type
    soil = await get_soil_type(lat, lng)

    # Check if this is the first profile (auto set default)
    existing = supabase.table("farm_profiles") \
        .select("id") \
        .eq("user_id", user_id) \
        .execute()

    is_default = body.is_default or len(existing.data) == 0

    # Insert profile
    res = supabase.table("farm_profiles").insert({
        "user_id":          user_id,
        "region_id":        body.region_id,
        "region_name":      reg["name"],
        "lat":              lat,
        "lng":              lng,
        "land_size":        body.land_size,
        "land_size_unit":   body.land_size_unit,
        "water_source":     body.water_source,
        "experience_level": body.experience_level,
        "soil_type":        soil,
        "is_default":       is_default
    }).execute()

    return { "success": True, "data": res.data[0] }


@router.put("/farms/{profile_id}")
async def update_farm(
    profile_id: str,
    body: dict,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    res = supabase.table("farm_profiles") \
        .update(body) \
        .eq("id", profile_id) \
        .eq("user_id", user_id) \
        .execute()

    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Farm profile not found"
        )

    return { "success": True, "data": res.data[0] }


@router.delete("/farms/{profile_id}")
async def delete_farm(
    profile_id: str,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    supabase.table("farm_profiles") \
        .delete() \
        .eq("id", profile_id) \
        .eq("user_id", user_id) \
        .execute()

    return { "success": True, "message": "Profile deleted" }


@router.patch("/farms/{profile_id}/default")
async def set_default(
    profile_id: str,
    authorization: str = Header(...)
):
    user_id = get_user(authorization)

    # Reset all profiles to false first
    supabase.table("farm_profiles") \
        .update({"is_default": False}) \
        .eq("user_id", user_id) \
        .execute()

    # Set target as default
    res = supabase.table("farm_profiles") \
        .update({"is_default": True}) \
        .eq("id", profile_id) \
        .eq("user_id", user_id) \
        .execute()

    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Farm profile not found"
        )

    return { "success": True, "data": res.data[0] }