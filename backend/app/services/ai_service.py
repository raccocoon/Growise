import httpx
import json
import os
from datetime import datetime, timedelta
from app.config import OPENROUTER_API_KEY, OPENROUTER_CHATBOT_KEY
from app.utils.confidence import crop_confidence, CROP_REFERENCE

try:
    from google import genai as google_genai
    from google.genai import types as google_types
    print("[gemini] library imported")
except Exception as e:
    google_genai = None
    google_types = None
    print(f"[gemini] library import failed: {e}")

CHATBOT_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-3n-e4b-it:free",
    "google/gemma-3-4b-it:free",
]

OPENROUTER_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-3n-e4b-it:free",
    "google/gemma-3-4b-it:free",
]

# ── Rate limit tracker ────────────────────────────────────────────────────────

rate_limit_status: dict = {
    "openrouter": {"limited": False, "reset_at": None},
    "gemini":     {"limited": False, "reset_at": None},
}


def _is_rate_limited(provider: str) -> bool:
    s = rate_limit_status[provider]
    if not s["limited"]:
        return False
    if s["reset_at"] and datetime.utcnow() >= s["reset_at"]:
        s["limited"] = False
        s["reset_at"] = None
        return False
    return True


def _set_rate_limited(provider: str) -> None:
    rate_limit_status[provider]["limited"] = True
    rate_limit_status[provider]["reset_at"] = datetime.utcnow() + timedelta(minutes=5)
    print(f"[rate-limit] {provider} rate-limited until {rate_limit_status[provider]['reset_at']}")


# ── JSON parser ───────────────────────────────────────────────────────────────

def _parse_json(content: str):
    if not content:
        return None
    content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    if "```json" in content:
        try:
            start = content.index("```json") + 7
            end   = content.index("```", start)
            return json.loads(content[start:end].strip())
        except Exception:
            pass
    if "```" in content:
        try:
            start = content.index("```") + 3
            end   = content.index("```", start)
            return json.loads(content[start:end].strip())
        except Exception:
            pass
    try:
        start = content.index("{")
        end   = content.rindex("}") + 1
        return json.loads(content[start:end])
    except Exception:
        pass
    return None


# ── Shared AI callers ────────────────────────────────────────────────────────

async def _gemini_call(prompt: str, max_tokens: int = 2000) -> str | None:
    """Try Gemini models in order; return response text or None (never raises)."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[gemini] GEMINI_API_KEY not found in environment")
        return None
    if google_genai is None:
        print("[gemini] library not available")
        return None
    try:
        client = google_genai.Client(api_key=api_key)
    except Exception as e:
        print(f"[gemini] client init failed: {e}")
        return None
    for model_id in ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]:
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=prompt,
                config=google_types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=max_tokens,
                ),
            )
            text = (response.text or "").strip()
            if text:
                print(f"[gemini] success: {model_id}")
                return text
        except Exception as e:
            print(f"[gemini] {model_id} failed: {e}")
            continue
    return None


async def _openrouter_call(prompt: str, max_tokens: int = 1500) -> str | None:
    """Try OpenRouter models in order; return response text or None (never raises)."""
    for model in OPENROUTER_MODELS:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type":  "application/json",
                        "HTTP-Referer":  "https://grobuddy.app",
                        "X-Title":       "GrowBuddy",
                    },
                    json={
                        "model":       model,
                        "messages":    [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens":  max_tokens,
                    },
                )
            if res.status_code == 200:
                text = res.json()["choices"][0]["message"]["content"].strip()
                if text:
                    print(f"[openrouter] success: {model}")
                    return text
            elif res.status_code == 429:
                print(f"[openrouter] {model} rate limited, trying next")
                continue
            else:
                print(f"[openrouter] {model} status {res.status_code}, trying next")
                continue
        except Exception as e:
            print(f"[openrouter] {model} error: {e}, trying next")
            continue
    return None


async def _chatbot_call(prompt: str) -> str | None:
    for model in CHATBOT_MODELS:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_CHATBOT_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://grobuddy.app",
                        "X-Title": "GrowBuddy Leafy",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.4,
                        "max_tokens": 400,
                    },
                )
            if res.status_code == 200:
                text = res.json()["choices"][0]["message"]["content"].strip()
                if text:
                    print(f"[chatbot] success: {model}")
                    return text
            elif res.status_code == 429:
                print(f"[chatbot] {model} rate limited, trying next")
                continue
            else:
                print(f"[chatbot] {model} status {res.status_code}, trying next")
                continue
        except Exception as e:
            print(f"[chatbot] {model} error: {e}, trying next")
            continue
    return None


async def _guide_openrouter_call(prompt: str) -> str | None:
    from app.config import OPENROUTER_GUIDE_KEY
    key = os.environ.get("OPENROUTER_GUIDE_KEY") or OPENROUTER_GUIDE_KEY
    if not key:
        print("[guide-openrouter] OPENROUTER_GUIDE_KEY not set")
        return None
    models = [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "google/gemma-3n-e4b-it:free",
        "google/gemma-3-4b-it:free",
    ]
    for model in models:
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://grobuddy.app",
                        "X-Title": "GrowBuddy Guide",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 4000,
                    },
                )
            if res.status_code == 200:
                text = res.json()["choices"][0]["message"]["content"].strip()
                if text:
                    print(f"[guide-openrouter] success: {model}")
                    return text
            elif res.status_code == 429:
                print(f"[guide-openrouter] {model} rate limited, trying next")
            else:
                print(f"[guide-openrouter] {model} status {res.status_code}, trying next")
        except Exception as e:
            print(f"[guide-openrouter] {model} error: {e}, trying next")
    return None


# ════════════════════════════════════════════════════════════════════════════
# FEATURE 3 — WHAT TO PLANT
# ════════════════════════════════════════════════════════════════════════════

def _preset_recommendations() -> list:
    today = datetime.now()
    return [
        {
            "rank": 1, "crop_name": "kangkung", "local_name": "Water Spinach",
            "difficulty": "Very Easy", "growth_duration_days": 30,
            "why_recommended": "Fast-growing, flood-tolerant leafy green ideal for Sarawak's humid climate.",
            "estimated_first_harvest_date": (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            "flood_tolerant": True, "drought_tolerant": False,
            "main_concern": "Watch for pests in humid weather", "weather_suitability": "Excellent",
        },
        {
            "rank": 2, "crop_name": "bayam", "local_name": "Spinach",
            "difficulty": "Very Easy", "growth_duration_days": 25,
            "why_recommended": "Fast-growing leafy green that thrives in partial shade common in Sarawak.",
            "estimated_first_harvest_date": (today + timedelta(days=25)).strftime("%Y-%m-%d"),
            "flood_tolerant": True, "drought_tolerant": False,
            "main_concern": "Needs regular watering in dry spells", "weather_suitability": "Very Good",
        },
        {
            "rank": 3, "crop_name": "sawi", "local_name": "Mustard Green",
            "difficulty": "Easy", "growth_duration_days": 35,
            "why_recommended": "Reliable beginner crop with good disease resistance suited to Sarawak.",
            "estimated_first_harvest_date": (today + timedelta(days=35)).strftime("%Y-%m-%d"),
            "flood_tolerant": True, "drought_tolerant": False,
            "main_concern": "May bolt in very hot weather", "weather_suitability": "Good",
        },
    ]


async def get_crop_recommendation(
    profile:         dict,
    soil_type:       str,
    weather_summary: dict,
    crisis_mode:     bool = False,
) -> dict:

    system_prompt = (
        "You are an agricultural expert for Sarawak, Malaysia.\n"
        "Recommend exactly 3 crops as JSON only.\n"
        "Rules:\n"
        "- Match crops to farmer profile, soil, weather, land size\n"
        "- Beginner: Very Easy and Easy crops only\n"
        "- flood_risk HIGH: flood-tolerant crops only\n"
        "- drought_risk HIGH + rain_fed: drought-tolerant only\n"
        "- crisis_mode True: only [kangkung, sawi, bayam, tapioca, sweet corn]\n"
        "- Return exactly 3 crops. JSON only, no markdown.\n"
        'Return JSON: {"recommendations":[{"rank":1,"crop_name":"","local_name":"","difficulty":"","growth_duration_days":0,"why_recommended":"","estimated_first_harvest_date":"","flood_tolerant":true,"drought_tolerant":false,"main_concern":"","weather_suitability":""}]}\n'
        "Return exactly 3 crops. JSON only."
    )

    land       = profile.get("land_size", 0)
    unit       = profile.get("land_size_unit", "sqft")
    today      = datetime.now()
    harvest_dt = today + timedelta(days=60)

    if unit == "acre":       land_sqft = land * 43560
    elif unit == "hectare":  land_sqft = land * 107639
    else:                    land_sqft = land

    user_prompt = (
        f"Farmer profile:\n"
        f"  experience_level: {profile.get('experience_level')}\n"
        f"  region_name: {profile.get('region_name')}, Sarawak\n"
        f"  land_size: {land} {unit} ({round(land_sqft)} sqft)\n"
        f"  land_type: {profile.get('land_type', 'open')}\n"
        f"  water_source: {profile.get('water_source')}\n"
        f"  soil_type: {soil_type}\n"
        f"Weather (next 6 days):\n"
        f"  avg_temp: {weather_summary.get('avg_temp')}°C\n"
        f"  total_rainfall: {weather_summary.get('total_rainfall')}mm\n"
        f"  avg_humidity: {weather_summary.get('avg_humidity')}%\n"
        f"  rainy_days: {weather_summary.get('rainy_days')} of 6\n"
        f"  dry_days: {weather_summary.get('dry_days')} of 6\n"
        f"  max_wind: {weather_summary.get('max_wind')} km/h\n"
        f"  flood_risk: {weather_summary.get('flood_risk')}\n"
        f"  drought_risk: {weather_summary.get('drought_risk')}\n"
        f"  current_month: {today.strftime('%B %Y')}\n"
        f"  crisis_mode: {crisis_mode}\n"
        f"Return exactly 3 recommendations. estimated_first_harvest_date example: "
        f"{harvest_dt.strftime('%Y-%m-%d')}"
    )

    def _apply_confidence(recs):
        for crop in recs:
            crop_key = crop.get("crop_name", "").lower().strip()
            ref = CROP_REFERENCE.get(crop_key)
            if ref:
                conf = crop_confidence(
                    soil_type=soil_type,
                    crop_suitable_soils=ref["suitable_soils"],
                    avg_temp=weather_summary.get("avg_temp", 28),
                    crop_ideal_temp=ref["ideal_temp"],
                    avg_rainfall=weather_summary.get("total_rainfall", 50),
                    crop_ideal_rainfall=ref["ideal_rainfall"],
                )
            else:
                conf = {"score": 50, "label": "Medium", "color": "yellow"}
            crop["confidence"] = conf["score"]
            crop["confidence_label"] = conf["label"]
            crop["confidence_color"] = conf["color"]
        return recs

    combined_prompt = system_prompt + "\n\n" + user_prompt + "\n\nReturn valid JSON only. No markdown."

    raw = await _gemini_call(combined_prompt, max_tokens=2000)
    if raw is None:
        raw = await _openrouter_call(combined_prompt, max_tokens=4000)

    if raw:
        print(f"[recommend] raw response preview: {raw[:300]}")
        clean = raw.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        elif clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        result = _parse_json(clean)
        print(f"[recommend] parsed result keys: {list(result.keys()) if result else 'None'}")
        if result:
            recs = result.get("recommendations") or result.get("crops") or result.get("data") or []
            if not recs and isinstance(result, list):
                recs = result
            if recs:
                print(f"[recommend] got {len(recs)} crops from AI")
                return {"recommendations": _apply_confidence(recs), "ai_source": "gemini_or_openrouter", "rate_limited": False}
            else:
                print(f"[recommend] no recs found in keys: {list(result.keys())}")

    # Preset fallback
    print("[preset] using hardcoded recommendations")
    return {
        "recommendations": _apply_confidence(_preset_recommendations()),
        "ai_source": "preset",
        "rate_limited": True,
    }


# ════════════════════════════════════════════════════════════════════════════
# FEATURE 4 — HOW TO PLANT
# ════════════════════════════════════════════════════════════════════════════

_guide_cache:      dict = {}
_guide_timestamps: dict = {}


def _guide_expired(key: str) -> bool:
    if key not in _guide_timestamps:
        return True
    return datetime.now() - _guide_timestamps[key] > timedelta(days=7)


def _preset_guide(crop: dict, profile: dict) -> dict:
    name  = crop.get("crop_name", "crop")
    today = datetime.now()
    return {
        "crop_name":   name,
        "local_name":  crop.get("local_name", ""),
        "overview":    f"{name.capitalize()} is well-suited for Sarawak's tropical climate. Follow this guide for best results.",
        "soil_preparation": [
            {"step": 1, "title": "Clear the area",    "action": "Remove weeds and debris from the planting area.",         "why": "Clean soil reduces pest and disease risk.",   "days_before_planting": 3},
            {"step": 2, "title": "Loosen the soil",   "action": "Dig or till the soil to 15–20 cm depth.",                 "why": "Loose soil improves root growth and drainage.", "days_before_planting": 2},
            {"step": 3, "title": "Add organic matter","action": "Mix in compost or organic fertilizer at 2 kg per sqm.",   "why": "Nutrients support healthy seedling growth.",   "days_before_planting": 1},
        ],
        "planting_specs": {
            "spacing_cm":      20,
            "depth_cm":        2,
            "best_time_of_day": "6:00 AM – 8:00 AM",
            "seeds_needed":    "10–15 seeds per sqm",
            "rows":            "Rows 20 cm apart",
        },
        "planting_steps": [
            {"step": 1, "title": "Prepare planting holes", "action": "Make holes 2 cm deep, spaced 20 cm apart.",  "why": "Correct spacing ensures adequate sunlight.",  "tip": "Water the soil before planting."},
            {"step": 2, "title": "Place seeds",            "action": "Drop 2–3 seeds per hole and cover lightly.", "why": "Multiple seeds improve germination success.", "tip": "Firm the soil gently after covering."},
            {"step": 3, "title": "Water immediately",      "action": "Water gently after planting.",               "why": "Moisture triggers germination.",               "tip": "Use a watering can for gentle application."},
        ],
        "care_schedule": {
            "watering": {
                "frequency":   "Once daily",
                "amount":      "500 ml per sqm",
                "best_time":   "Early morning",
                "rainy_day_tip": "Skip watering if soil is already moist.",
                "dry_day_tip":   "Water twice — morning and late afternoon.",
            },
            "fertilizing": {
                "start_day": 7,
                "frequency": "Every 7 days",
                "type":      "NPK 15-15-15",
                "amount":    "20 g per sqm",
                "tip":       "Apply around plant base, not on leaves.",
            },
            "weeding": "Remove weeds weekly to prevent competition for nutrients.",
        },
        "what_to_watch": [
            {"problem": "Yellow leaves", "sign": "Leaves turn pale yellow",   "action": "Apply nitrogen-rich fertilizer."},
            {"problem": "Wilting",        "sign": "Leaves droop during the day", "action": "Check soil moisture and water immediately."},
        ],
        "harvest_signs": [
            "Leaves are full-sized and dark green.",
            "Plant has reached expected height.",
            f"Approximately {crop.get('growth_duration_days', 30)} days after planting.",
        ],
        "expected_yield":  "Varies by land size and care — typical yield is 1–2 kg per sqm.",
        "sarawak_tips": [
            "Sarawak's high humidity means fungal diseases are common — ensure good air circulation.",
            "Rain is frequent — check drainage to prevent waterlogging.",
        ],
    }


async def get_planting_guide(
    crop:            dict,
    profile:         dict,
    weather_summary: dict,
) -> dict:

    month     = datetime.now().strftime("%Y-%m")
    cache_key = f"{profile.get('id')}:{crop.get('crop_name')}:{month}"

    if cache_key in _guide_cache and not _guide_expired(cache_key):
        print(f"[guide] cache hit: {cache_key}")
        return {"cached": True, "guide": _guide_cache[cache_key], "ai_source": "cache", "rate_limited": False}

    exp = (profile.get("experience_level") or "beginner").lower()

    if exp == "beginner":
        tone = (
            "Beginner tone: simple, friendly, encouraging. "
            "Always explain WHY for every step. No jargon. "
            "Add local Sarawak context."
        )
    elif exp == "intermediate":
        tone = (
            "Intermediate tone: practical mix of simple and technical. "
            "Include why for key steps. Mention Sarawak context."
        )
    else:
        tone = (
            "Expert tone: direct and technical. No hand-holding. "
            "Set why fields to null. Focus on yield optimization and ROI."
        )

    land       = profile.get("land_size", 0)
    unit       = profile.get("land_size_unit", "sqft")
    if unit == "acre":       land_sqft = land * 43560
    elif unit == "hectare":  land_sqft = land * 107639
    else:                    land_sqft = land

    today = datetime.now()

    system_prompt = (
        "You are an agricultural expert for Sarawak, Malaysia.\n"
        f"Tone: {tone}\n"
        "Generate a complete personalized planting guide.\n"
        "Return valid JSON only. No markdown. No extra text.\n"
        "Format all text fields as bullet points only.\n"
        "Each bullet point max 15 words. Start with •.\n"
        "Always give reason after 'so that' or 'because'.\n"
        "Use simple words only. No technical terms.\n"
        "JSON structure:\n"
        '{"overview": "string",'
        '"soil_preparation": "string",'
        '"planting_specs": "string",'
        '"planting_steps": "string",'
        '"care_schedule": "string",'
        '"what_to_watch": "string",'
        '"harvest_signs": "string",'
        '"expected_yield": "string",'
        '"sarawak_tips": "string"}'
    )

    user_prompt = (
        f"Crop: {crop.get('crop_name')} ({crop.get('local_name', '')})\n"
        f"  growth_duration_days: {crop.get('growth_duration_days')}\n"
        f"  main_concern: {crop.get('main_concern')}\n"
        f"Farmer:\n"
        f"  experience_level: {exp}\n"
        f"  region_name: {profile.get('region_name')}, Sarawak\n"
        f"  land_size: {land} {unit} ({round(land_sqft)} sqft)\n"
        f"  water_source: {profile.get('water_source')}\n"
        f"  soil_type: {profile.get('soil_type')}\n"
        f"Conditions:\n"
        f"  current_month: {today.strftime('%B %Y')}\n"
        f"  avg_temp: {weather_summary.get('avg_temp')}°C\n"
        f"  total_rainfall: {weather_summary.get('total_rainfall')}mm\n"
        f"  avg_humidity: {weather_summary.get('avg_humidity')}%\n"
        f"  flood_risk: {weather_summary.get('flood_risk')}\n"
        f"  drought_risk: {weather_summary.get('drought_risk')}"
    )

    combined_prompt = system_prompt + "\n\n" + user_prompt + "\n\nReturn valid JSON only. No markdown. No extra text."
    raw = await _guide_openrouter_call(combined_prompt)
    if raw:
        clean = raw.strip()
        if clean.startswith("```json"): clean = clean[7:]
        elif clean.startswith("```"): clean = clean[3:]
        if clean.endswith("```"): clean = clean[:-3]
        guide = _parse_json(clean.strip())
        if guide and "overview" in guide:
            _guide_cache[cache_key] = guide
            _guide_timestamps[cache_key] = datetime.now()
            return {"cached": False, "guide": guide, "ai_source": "guide-openrouter", "rate_limited": False}
        else:
            print(f"[guide-openrouter] parse failed, keys: {list(guide.keys()) if guide else 'None'}")
    print("[preset] using preset guide")
    guide = _preset_guide(crop, profile)
    _guide_cache[cache_key] = guide
    _guide_timestamps[cache_key] = datetime.now()
    return {"cached": False, "guide": guide, "ai_source": "preset", "rate_limited": True}


_guide_cache.clear()
_guide_timestamps.clear()
print("[guide] cache cleared on startup")

if __name__ == "__main__":
    import asyncio

    async def _test_guide():
        mock_crop = {
            "crop_name":            "bayam",
            "local_name":           "Spinach",
            "growth_duration_days": 25,
            "main_concern":         "pests",
        }
        mock_profile = {
            "id":               "test",
            "experience_level": "beginner",
            "region_name":      "Kuching",
            "land_size":        100,
            "land_size_unit":   "sqft",
            "water_source":     "rain",
            "soil_type":        "Clay Loam",
        }
        mock_weather = {
            "avg_temp":      28,
            "total_rainfall": 50,
            "avg_humidity":  80,
            "flood_risk":    "low",
            "drought_risk":  "low",
        }
        result = await get_planting_guide(mock_crop, mock_profile, mock_weather)
        print(f"[test] ai_source = {result['ai_source']}")

    asyncio.run(_test_guide())
