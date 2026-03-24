import httpx
import json
import re
import asyncio
from datetime import datetime, timedelta
from app.config import OPENROUTER_API_KEY

try:
    import json_repair
except ImportError:
    json_repair = None


def _parse_json_safe(content: str) -> dict:
    """Parse JSON from AI response, handling markdown, trailing commas, unescaped quotes, etc."""
    content = (content or "").strip()
    # Remove markdown code fences
    if "```" in content:
        content = re.sub(r"^```\w*\n?", "", content)
        content = re.sub(r"\n?```\s*$", "", content)
        content = content.strip()
    # Extract JSON object (first { to matching })
    start = content.find("{")
    if start >= 0:
        depth, end = 0, start
        for i, c in enumerate(content[start:], start):
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        content = content[start:end]
    # Fix trailing commas (common LLM mistake)
    content = re.sub(r",\s*}", "}", content)
    content = re.sub(r",\s*]", "]", content)
    # Parse: use json_repair if available (fixes unescaped quotes, etc. from LLMs)
    if json_repair:
        return json_repair.loads(content)
    return json.loads(content)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# openrouter/free routes to available free models; avoids rate limits on single model
MODEL = "openrouter/free"
# Fallbacks if router fails (e.g. 429)
FALLBACK_MODELS = [
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "qwen/qwen-2-7b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
]

def _get_headers():
    """Build headers with current API key (loaded at request time)."""
    if not OPENROUTER_API_KEY:
        raise Exception(
            "OPENROUTER_API_KEY is missing. Add it to backend/.env — get a free key at https://openrouter.ai/settings/keys"
        )
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "http://localhost:8000",
        "X-Title":       "GroWise"
    }


# ════════════════════════════════════════════════════════════════════════════
# CORE AI CALLER
# ════════════════════════════════════════════════════════════════════════════

async def _call_ai(
    system_prompt: str,
    user_prompt:   str,
    max_tokens:    int = 2000
) -> dict:
    """
    Call OpenRouter. Uses openrouter/free router, falls back to alternatives on 429.
    Returns parsed JSON dict.
    """
    headers = _get_headers()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    models_to_try = [MODEL] + FALLBACK_MODELS
    last_error = None

    for attempt, model in enumerate(models_to_try):
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    OPENROUTER_URL,
                    headers=headers,
                    json=payload
                )

            if res.status_code == 200:
                result = res.json()
                content = result["choices"][0]["message"]["content"]
                try:
                    return _parse_json_safe(content)
                except json.JSONDecodeError as je:
                    raise Exception(
                        f"AI returned invalid JSON: {je}. "
                        f"First 500 chars: {repr((content or '')[:500])}"
                    )

            if res.status_code == 429:
                last_error = Exception(f"OpenRouter error 429: {res.text}")
                # Brief delay before retry/fallback
                if attempt < len(models_to_try) - 1:
                    await asyncio.sleep(2.0)
                continue

            raise Exception(f"OpenRouter error {res.status_code}: {res.text}")

        except Exception as e:
            last_error = e
            if "429" in str(e) and attempt < len(models_to_try) - 1:
                await asyncio.sleep(2.0)
                continue
            raise

    if last_error:
        raise last_error
    raise Exception("OpenRouter: no model succeeded")


# ════════════════════════════════════════════════════════════════════════════
# FEATURE 3 — WHAT TO PLANT
# ════════════════════════════════════════════════════════════════════════════

async def get_crop_recommendation(
    profile:         dict,
    soil_type:       str,
    weather_summary: dict,
    crisis_mode:     bool = False
) -> dict:

    crisis_note = ""
    if crisis_mode:
        crisis_note = """
CRISIS MODE IS ACTIVE.
Extreme weather detected.
Only recommend from this list:
kangkung, sawi, bayam, tapioca, sweet corn.
In why_recommended explain why normal crops
are too risky under current conditions.
"""

    system_prompt = f"""
You are GroWise, an expert agricultural advisor
for Sarawak, Malaysia.

You recommend the most suitable crops for farmers
based on their profile, soil type, and live weather.

Available crops to choose from:
kangkung, bayam, sawi, cili padi, chili, tomato,
cucumber, terung, pumpkin, pineapple, ginger,
tapioca, paddy, sweet corn, black pepper, durian,
sago, bitter gourd, long bean, lady finger.

STRICT RULES — you must follow all of these:
- Beginner experience → Very Easy and Easy crops only
- flood_risk HIGH → flood-tolerant crops only
- drought_risk HIGH + water_source rain_fed →
  drought-tolerant crops only
- Land too small for crop → eliminate that crop
- Always return EXACTLY 5 crops ranked 1 to 5
- Respond in valid JSON only
- No extra text, no markdown, no explanation outside JSON

{crisis_note}

Minimum land size reference:
kangkung=10sqft, bayam=10sqft, sawi=10sqft,
chili=20sqft, tomato=30sqft, cucumber=40sqft,
paddy=500sqft, durian=1000sqft, sago=2000sqft,
pineapple=200sqft, ginger=50sqft, tapioca=100sqft,
sweet corn=100sqft, black pepper=200sqft,
terung=30sqft, pumpkin=100sqft, bitter gourd=50sqft,
long bean=30sqft, lady finger=20sqft, cili padi=20sqft.
"""

    # Convert land to sqft for comparison
    land     = profile.get("land_size", 0)
    unit     = profile.get("land_size_unit", "sqft")
    if unit == "acre":     land_sqft = land * 43560
    elif unit == "hectare": land_sqft = land * 107639
    else:                   land_sqft = land

    today    = datetime.now()
    harvest  = today + timedelta(days=60)

    user_prompt = f"""
Recommend 3 crops for this Sarawak farmer:

FARMER PROFILE:
  Experience level : {profile.get('experience_level')}
  Region           : {profile.get('region_name')}, Sarawak
  Land size        : {profile.get('land_size')} {unit} ({round(land_sqft)} sqft)
  Water source     : {profile.get('water_source')}
  Soil type        : {soil_type}
  Current month    : {today.strftime('%B %Y')}

CURRENT WEATHER (next 6 days):
  Average temperature : {weather_summary.get('avg_temp')}°C
  Temperature range   : {weather_summary.get('temp_min')}°C – {weather_summary.get('temp_max')}°C
  Total rainfall      : {weather_summary.get('total_rainfall')}mm over 6 days
  Average humidity    : {weather_summary.get('avg_humidity')}%
  Max wind speed      : {weather_summary.get('max_wind')} km/h
  Rainy days          : {weather_summary.get('rainy_days')} out of 6
  Dry days            : {weather_summary.get('dry_days')} out of 6
  Soil moisture       : {weather_summary.get('avg_soil_moisture')}
  Flood risk          : {weather_summary.get('flood_risk')}
  Drought risk        : {weather_summary.get('drought_risk')}
  Crisis mode         : {crisis_mode}

Return this exact JSON structure:
{{
  "recommendations": [
    {{
      "rank": 1,
      "crop_name": "",
      "local_name": "",
      "confidence": 85,
      "confidence_label": "Good",
      "difficulty": "Very Easy",
      "why_recommended": "2-3 sentences personalized for this farmer",
      "growth_duration_days": 30,
      "estimated_harvest_date": "{harvest.strftime('%Y-%m-%d')}",
      "estimated_cost_myr": 15,
      "expected_yield": "1-2 kg per sqft",
      "weather_suitability": "Good",
      "main_concern": "one sentence about main risk",
      "flood_tolerant": true,
      "drought_tolerant": false,
      "min_land_sqft": 10
    }}
  ]
}}
"""

    return await _call_ai(system_prompt, user_prompt, max_tokens=2000)

    # ════════════════════════════════════════════════════════════════════════════
# FEATURE 4 — HOW TO PLANT
# ════════════════════════════════════════════════════════════════════════════

# Simple in-memory cache
_guide_cache      = {}
_guide_timestamps = {}


async def get_planting_guide(
    crop:            dict,
    profile:         dict,
    weather_summary: dict
) -> dict:

    from datetime import datetime

    # Cache key — same farmer + crop + month = serve from cache
    month     = datetime.now().strftime("%Y-%m")
    cache_key = f"{profile.get('id')}:{crop.get('crop_name')}:{month}"

    if cache_key in _guide_cache:
        if not _guide_expired(cache_key):
            print(f"Guide cache hit: {cache_key}")
            return {"cached": True, "guide": _guide_cache[cache_key]}

    exp = profile.get("experience_level", "beginner")

    if exp == "beginner":
        tone = """
Language: Simple, friendly, encouraging.
Always include "why" field for every step — explain WHY it matters.
No technical jargon. Assume zero farming knowledge.
Add local Sarawak shop tips in what_you_need.
"""
    elif exp == "intermediate":
        tone = """
Language: Practical mix of simple and technical.
Include "why" field for key steps only.
Mention local Sarawak context where relevant.
"""
    else:
        tone = """
Language: Direct and technical. No hand-holding.
Set all "why" fields to null — skip explanations.
Focus on optimization, yield per sqft, and ROI.
Include advanced tips for experienced farmers.
"""

    system_prompt = f"""
You are GroWise, an expert agricultural advisor
for Sarawak, Malaysia.

Generate a complete personalized planting guide
for a Sarawak farmer.

TONE AND LANGUAGE RULES:
{tone}

IMPORTANT:
- Scale all quantities to the farmer's actual land size
- Reference local Sarawak conditions
- Use metric units only
- Return valid JSON only — no markdown, no extra text
"""

    land     = profile.get("land_size", 0)
    unit     = profile.get("land_size_unit", "sqft")
    if unit == "acre":      land_sqft = land * 43560
    elif unit == "hectare": land_sqft = land * 107639
    else:                   land_sqft = land

    user_prompt = f"""
Generate a complete planting guide for this farmer:

CROP: {crop.get('crop_name')} ({crop.get('local_name', '')})
  Growth duration  : {crop.get('growth_duration_days')} days
  Main concern     : {crop.get('main_concern')}
  Est. harvest     : {crop.get('estimated_harvest_date')}

FARMER:
  Experience  : {exp}
  Region      : {profile.get('region_name')}, Sarawak
  Land size   : {land} {unit} ({round(land_sqft)} sqft)
  Water source: {profile.get('water_source')}
  Soil type   : {profile.get('soil_type')}

CURRENT CONDITIONS:
  Month       : {datetime.now().strftime('%B %Y')}
  Avg temp    : {weather_summary.get('avg_temp')}°C
  Rainfall    : {weather_summary.get('total_rainfall')}mm/6days
  Humidity    : {weather_summary.get('avg_humidity')}%
  Flood risk  : {weather_summary.get('flood_risk')}
  Drought risk: {weather_summary.get('drought_risk')}

Return this exact JSON structure:
{{
  "crop_name": "{crop.get('crop_name')}",
  "local_name": "{crop.get('local_name', '')}",
  "overview": "2 sentences about this crop and why it suits this farmer now",
  "what_you_need": [
    {{
      "item": "NPK fertilizer",
      "quantity": "500g",
      "estimated_cost_myr": 5,
      "where_to_get": "Any hardware shop in {profile.get('region_name')}"
    }}
  ],
  "soil_preparation": [
    {{
      "step": 1,
      "title": "Clear the area",
      "action": "what to do",
      "why": "why this matters — null if expert",
      "days_before_planting": 3
    }}
  ],
  "planting_specs": {{
    "spacing_cm": 20,
    "depth_cm": 2,
    "best_time_of_day": "6:00 AM – 8:00 AM",
    "seeds_needed": "scaled to land size",
    "rows": "number of rows for land size"
  }},
  "planting_steps": [
    {{
      "step": 1,
      "title": "Prepare holes",
      "action": "what to do",
      "why": "why this matters — null if expert",
      "tip": "pro tip"
    }}
  ],
  "care_schedule": {{
    "watering": {{
      "frequency": "once daily",
      "amount": "500ml per plant",
      "best_time": "early morning",
      "rainy_day_tip": "what to do on rainy days",
      "dry_day_tip": "what to do on dry days"
    }},
    "fertilizing": {{
      "start_day": 7,
      "frequency": "every 7 days",
      "type": "NPK 15-15-15",
      "amount": "20g per sqm",
      "tip": "fertilizing tip"
    }},
    "weeding": "how and when to weed"
  }},
  "what_to_watch": [
    {{
      "problem": "Yellow leaves",
      "sign": "what to look for",
      "action": "what to do"
    }}
  ],
  "harvest_signs": [
    "visual sign 1",
    "visual sign 2"
  ],
  "expected_yield": "yield estimate based on {land} {unit}",
  "sarawak_tips": [
    "tip specific to Sarawak climate or soil"
  ]
}}
"""

    result = await _call_ai(system_prompt, user_prompt, max_tokens=3000)

    # Cache it
    guide = result if "crop_name" in result else result.get("guide", result)
    _guide_cache[cache_key]      = guide
    _guide_timestamps[cache_key] = datetime.now()

    return {"cached": False, "guide": guide}


def _guide_expired(key: str) -> bool:
    if key not in _guide_timestamps:
        return True
    from datetime import datetime, timedelta
    return datetime.now() - _guide_timestamps[key] > timedelta(days=7)
