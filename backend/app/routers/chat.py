from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import date, datetime
from app.services.ai_service import _chatbot_call

router = APIRouter(prefix="/api", tags=["Chat"])


# ── Models ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    profile_id: str
    message:    str
    history:    List[ChatMessage] = []


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_growth_stage(days_since: int) -> str:
    if days_since <= 7:  return "seedling"
    if days_since <= 21: return "vegetative"
    if days_since <= 40: return "flowering"
    if days_since <= 60: return "fruiting"
    return "maturity"


async def build_farmer_context(profile_id: str) -> dict:
    from app.services.supabase_client import supabase
    from app.services import weather_service
    from app.services.crisis_service import calculate_crisis_mode

    try:
        profile_res = (
            supabase.table("farm_profiles")
            .select("*")
            .eq("id", profile_id)
            .execute()
        )
        if not profile_res.data:
            return {}
        profile = profile_res.data[0]

        logs_res = (
            supabase.table("planting_logs")
            .select("*")
            .eq("farm_profile_id", profile_id)
            .is_("actual_harvest", "null")
            .execute()
        )
        logs = logs_res.data or []

        forecast     = await weather_service.get_weather(profile["lat"], profile["lng"])
        weather_array = forecast.get("weather_array", [])
        today_weather = weather_array[0] if weather_array else {}
        crisis        = calculate_crisis_mode(weather_array[:6])

        active_crops = []
        for log in logs:
            planted_raw = log.get("planted_date")
            if not planted_raw:
                continue
            try:
                planted    = datetime.fromisoformat(str(planted_raw)).date()
                days_since = (date.today() - planted).days
            except Exception:
                days_since = 0
            active_crops.append({
                "crop_name":            log.get("crop_name", ""),
                "local_name":           log.get("local_name", ""),
                "days_since":           days_since,
                "stage":                get_growth_stage(days_since),
                "estimated_harvest":    log.get("estimated_harvest"),
                "growth_duration_days": log.get("growth_duration_days", 30),
            })

        return {
            "profile":       profile,
            "active_crops":  active_crops,
            "today_weather": today_weather,
            "crisis":        crisis,
        }

    except Exception as e:
        print(f"[leafy] context build failed: {e}")
        return {}


def build_system_prompt(context: dict) -> str:
    profile    = context.get("profile", {})
    crops      = context.get("active_crops", [])
    weather    = context.get("today_weather", {})
    crisis     = context.get("crisis", {})
    experience = profile.get("experience_level", "intermediate")

    if crops:
        crops_lines = ""
        for c in crops:
            crops_lines += (
                f"\n  - {c['crop_name']}"
                f" ({c.get('local_name', '')})"
                f": {c['days_since']} days since planting"
                f", {c['stage']} stage"
                f", estimated harvest: {c.get('estimated_harvest', 'unknown')}"
            )
    else:
        crops_lines = "\n  No active crops currently."

    if crisis.get("crisis_flag"):
        crisis_text = (
            f"ACTIVE — Risk Score {crisis.get('risk_score', 0)}/100\n"
            f"  Triggers: {', '.join(crisis.get('triggers', []))}\n"
            f"  Action: prioritize survival crops only "
            f"(Kangkung, Sawi, Bayam, Tapioca, Sweet Corn)"
        )
    elif crisis.get("warning_flag"):
        crisis_text = f"WARNING — Risk Score {crisis.get('risk_score', 0)}/100"
    else:
        crisis_text = "Normal — no extreme weather"

    tone_rule = {
        "beginner": (
            "Use simple friendly language. "
            "Explain the reason behind every tip. "
            "Be encouraging. Avoid technical jargon."
        ),
        "intermediate": (
            "Use practical language with some technical detail. "
            "Assume basic farming knowledge."
        ),
        "expert": (
            "Use direct technical language. "
            "Skip basics. Focus on optimization and yield. "
            "Include specific measurements where relevant."
        ),
    }.get(experience, "Use practical friendly language.")

    return f"""You are Leafy, the AI farming assistant for \
GrowBuddy — an agricultural advisory app for Sarawak, Malaysia.
You are friendly, practical, and always reference the \
farmer's actual farm data.

FARMER PROFILE:
  Region: {profile.get('region_name', 'Sarawak')}, Sarawak
  Experience level: {experience}
  Land size: {profile.get('land_size', '?')} \
{profile.get('land_size_unit', '')}
  Soil type: {profile.get('soil_type', 'Loam')}
  Water source: {profile.get('water_source', 'rain_fed')}

ACTIVE CROPS:{crops_lines}

TODAY'S WEATHER:
  Temperature: {weather.get('temp_min', '?')}–\
{weather.get('temp_max', '?')}°C
  Rainfall: {weather.get('rainfall_mm', 0)}mm
  Humidity: {weather.get('humidity', '?')}%
  Condition: {weather.get('weather_label', 'Unknown')}
  Flood risk: {weather.get('flood_risk', 'low')}
  Farming score: {weather.get('farming_score', '?')}/100

CRISIS STATUS: {crisis_text}

RESPONSE RULES:
  - CRITICAL: Always format response as bullet points ONLY
  - NEVER write paragraphs - always use bullet points
  - Maximum 4 bullet points per response
  - Each bullet point must be ONE short sentence only
  - Maximum 15 words per bullet point
  - Start each bullet with: •
  - Use very simple words - no technical terms at all
  - Always give reason inside same bullet after "so that" or "because"
  - Use simple measurements like "a little" instead of "5ml/L"
  - Use "a few" instead of specific numbers
  - Say "when soil is dry" instead of "when moisture < 20%"
  - Say "warm weather" instead of "25-30°C"
  - Tone by experience: {tone_rule}
  - If crisis ACTIVE: start with warning bullet,
    then survival advice bullets
  - If asked about fertilizing during crisis:
    say fertilizing is paused due to heavy rain
  - If asked about harvest during crisis:
    say harvest right away if crop is ready
  - If non-farming question: one bullet redirecting
    politely back to farming topics
  - Respond in same language as farmer uses
  - You are Leafy only — never say you are GPT or AI
  - EXAMPLE good response:
      • Plant seeds in shallow soil so that roots grow easily
      • Water daily because plants need moisture to thrive
      • Add a little fertilizer so that plants get nutrients
      • Your plants will grow fast because weather is warm"""


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    body:          ChatRequest,
    authorization: str = Header(...),
):
    from app.routers.auth import get_user
    get_user(authorization)   # raises 401 on invalid token

    context       = await build_farmer_context(body.profile_id)
    system_prompt = build_system_prompt(context)

    trimmed_history = body.history[-20:]

    messages = [{"role": "system", "content": system_prompt}]
    for msg in trimmed_history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    _profile       = context.get("profile", {})
    _crops         = context.get("active_crops", [])
    _crisis        = context.get("crisis", {})

    region         = _profile.get("region_name", "Sarawak")
    experience_level = _profile.get("experience_level", "intermediate")
    land_size      = _profile.get("land_size", "?")
    land_size_unit = _profile.get("land_size_unit", "")
    soil_type      = _profile.get("soil_type", "Loam")
    water_source   = _profile.get("water_source", "rain_fed")

    if _crops:
        active_crops = ", ".join(
            f"{c['crop_name']} ({c.get('stage', '')}, day {c.get('days_since', 0)})"
            for c in _crops
        )
    else:
        active_crops = "None"

    if _crisis.get("crisis_flag"):
        crisis_mode = f"ACTIVE — Risk Score {_crisis.get('risk_score', 0)}/100, Triggers: {', '.join(_crisis.get('triggers', []))}"
    elif _crisis.get("warning_flag"):
        crisis_mode = f"WARNING — Risk Score {_crisis.get('risk_score', 0)}/100"
    else:
        crisis_mode = "Normal"

    user_message = body.message

    leafy_prompt = f"""{user_message}

•
•
•
•

Answer:"""

    raw = await _chatbot_call(leafy_prompt)
    if raw and raw.strip():
        return {"response": raw.strip(), "ai_source": "chatbot"}
    return {"response": "• Try again in a moment because connection is busy\n• Protect crops from rain so that they stay safe\n• Harvest ready crops because heavy rain is coming\n• Avoid fertilizing so that plants don't get sick", "ai_source": "fallback"}
