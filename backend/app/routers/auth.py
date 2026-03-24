from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.supabase_client import supabase

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    email:            str
    password:         str
    name:             str
    experience_level: str


class LoginRequest(BaseModel):
    email:    str
    password: str


@router.post("/register")
async def register(body: RegisterRequest):
    try:
        res = supabase.auth.sign_up({
            "email":    body.email,
            "password": body.password,
            "options": {
                "data": {
                    "name":             body.name,
                    "experience_level": body.experience_level
                }
            }
        })

        if not res.user:
            raise HTTPException(status_code=400, detail="Registration failed")

        supabase.table("users").insert({
            "id":               res.user.id,
            "email":            body.email,
            "name":             body.name,
            "experience_level": body.experience_level
        }).execute()

        return {
            "success": True,
            "token": res.session.access_token,
            "user": {
                "id":               res.user.id,
                "email":            body.email,
                "name":             body.name,
                "experience_level": body.experience_level
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email":    body.email,
            "password": body.password
        })

        if not res.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_data = supabase.table("users") \
            .select("*") \
            .eq("id", res.user.id) \
            .execute()

        user_info = user_data.data[0] if user_data.data else {
            "name":             res.user.user_metadata.get("name", ""),
            "experience_level": res.user.user_metadata.get("experience_level", "beginner")
        }

        return {
            "success": True,
            "token": res.session.access_token,
            "user": {
                "id":               res.user.id,
                "email":            res.user.email,
                "name":             user_info["name"],
                "experience_level": user_info["experience_level"]
            }
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.get("/me")
async def get_me(authorization: str = Header(...)):
    try:
        token     = authorization.replace("Bearer ", "")
        auth_user = supabase.auth.get_user(token)

        user_data = supabase.table("users") \
            .select("*") \
            .eq("id", auth_user.user.id) \
            .execute()

        if not user_data.data:
            raise HTTPException(status_code=404, detail="User not found")

        return { "success": True, "data": user_data.data[0] }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")