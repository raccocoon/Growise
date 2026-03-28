import httpx
import json
from datetime import datetime, timedelta
from app.config import OPENROUTER_API_KEY

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Model priority list — tries each in order if previous fails
MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
]

HEADERS = {
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
    Call OpenRouter first, then fallback data if AI fails.
    Returns parsed JSON dict.
    """
    try:
        # Try OpenRouter first
        return await _call_openrouter(system_prompt, user_prompt, max_tokens)
    except Exception as e:
        print(f"OpenRouter failed: {e}")
        print("Using fallback recommendations...")
        
        # Return fallback recommendations based on farmer profile
        return _get_fallback_recommendations(system_prompt, user_prompt)


def _get_fallback_recommendations(system_prompt: str, user_prompt: str) -> dict:
    """
    Return sensible fallback recommendations when AI services fail.
    """
    print("Generating fallback crop recommendations...")
    
    # Extract basic info from user prompt
    is_beginner = "beginner" in user_prompt.lower()
    land_small = "100 sqft" in user_prompt.lower() or "small" in user_prompt.lower()
    
    # Basic recommendations for Sarawak farmers
    recommendations = []
    
    if is_beginner and land_small:
        recommendations = [
            {
                "rank": 1,
                "crop_name": "kangkung",
                "local_name": "Water Spinach",
                "confidence": 90,
                "confidence_label": "Excellent",
                "difficulty": "Very Easy",
                "why_recommended": "Perfect for beginners - grows quickly in small spaces with minimal care. Thrives in Sarawak's humid climate.",
                "growth_duration_days": 30,
                "estimated_harvest_date": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                "estimated_cost_myr": 10,
                "expected_yield": "2-3 kg per sqft",
                "weather_suitability": "Excellent",
                "main_concern": "Watch for pests in humid weather",
                "flood_tolerant": True,
                "drought_tolerant": False,
                "min_land_sqft": 10
            },
            {
                "rank": 2,
                "crop_name": "bayam",
                "local_name": "Spinach",
                "confidence": 85,
                "confidence_label": "Very Good",
                "difficulty": "Very Easy",
                "why_recommended": "Fast-growing leafy green perfect for small spaces. Grows well in partial shade common in Sarawak.",
                "growth_duration_days": 25,
                "estimated_harvest_date": (datetime.now() + timedelta(days=25)).strftime('%Y-%m-%d'),
                "estimated_cost_myr": 8,
                "expected_yield": "1-2 kg per sqft",
                "weather_suitability": "Very Good",
                "main_concern": "Needs regular watering in dry spells",
                "flood_tolerant": True,
                "drought_tolerant": False,
                "min_land_sqft": 10
            },
            {
                "rank": 3,
                "crop_name": "sawi",
                "local_name": "Mustard Green",
                "confidence": 80,
                "confidence_label": "Good",
                "difficulty": "Easy",
                "why_recommended": "Reliable crop for beginners with good disease resistance. Suitable for Sarawak's tropical climate.",
                "growth_duration_days": 35,
                "estimated_harvest_date": (datetime.now() + timedelta(days=35)).strftime('%Y-%m-%d'),
                "estimated_cost_myr": 12,
                "expected_yield": "1.5-2.5 kg per sqft",
                "weather_suitability": "Good",
                "main_concern": "May bolt in very hot weather",
                "flood_tolerant": True,
                "drought_tolerant": False,
                "min_land_sqft": 10
            }
        ]
    else:
        # General recommendations for other scenarios
        recommendations = [
            {
                "rank": 1,
                "crop_name": "chili",
                "local_name": "Cili",
                "confidence": 85,
                "confidence_label": "Very Good",
                "difficulty": "Easy",
                "why_recommended": "Popular crop in Sarawak with good market demand. Suitable for most soil types.",
                "growth_duration_days": 60,
                "estimated_harvest_date": (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d'),
                "estimated_cost_myr": 15,
                "expected_yield": "0.5-1 kg per plant",
                "weather_suitability": "Very Good",
                "main_concern": "Needs regular fertilizing for good yields",
                "flood_tolerant": False,
                "drought_tolerant": True,
                "min_land_sqft": 20
            },
            {
                "rank": 2,
                "crop_name": "cucumber",
                "local_name": "Timun",
                "confidence": 80,
                "confidence_label": "Good",
                "difficulty": "Easy",
                "why_recommended": "Fast-growing vine crop perfect for Sarawak's climate. Good yield for space used.",
                "growth_duration_days": 45,
                "estimated_harvest_date": (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d'),
                "estimated_cost_myr": 20,
                "expected_yield": "2-4 kg per plant",
                "weather_suitability": "Good",
                "main_concern": "Requires trellis support for best growth",
                "flood_tolerant": False,
                "drought_tolerant": True,
                "min_land_sqft": 40
            },
            {
                "rank": 3,
                "crop_name": "tomato",
                "local_name": "Tomato",
                "confidence": 75,
                "confidence_label": "Good",
                "difficulty": "Easy",
                "why_recommended": "Versatile crop popular in Sarawak. Can be grown in containers or ground.",
                "growth_duration_days": 70,
                "estimated_harvest_date": (datetime.now() + timedelta(days=70)).strftime('%Y-%m-%d'),
                "estimated_cost_myr": 25,
                "expected_yield": "2-3 kg per plant",
                "weather_suitability": "Good",
                "main_concern": "Prone to pests in humid conditions",
                "flood_tolerant": False,
                "drought_tolerant": False,
                "min_land_sqft": 30
            }
        ]
    
    return {"recommendations": recommendations}


async def _call_openrouter(
    system_prompt: str,
    user_prompt:   str,
    max_tokens:    int = 2000
) -> dict:
    """
    Call OpenRouter. Tries models in order until one works.
    Returns parsed JSON dict.
    """
    last_error = None

    for model in MODELS:
        try:
            print(f"Trying model: {model}")

            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt}
                ],
                "temperature": 0.3,
                "max_tokens":  max_tokens
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(
                    OPENROUTER_URL,
                    headers=HEADERS,
                    json=payload
                )

            print(f"Status: {res.status_code} for {model}")

            if res.status_code != 200:
                print(f"Error response: {res.text[:300]}")
                last_error = f"HTTP {res.status_code}"
                continue

            result  = res.json()
            content = result["choices"][0]["message"]["content"]

            print(f"Content preview: {content[:200] if content else 'EMPTY'}")

            if not content or content.strip() == "":
                print(f"Empty response from {model} — trying next")
                last_error = "Empty response"
                continue

            parsed = _parse_json(content)
            if parsed is not None:
                print(f"Success with model: {model}")
                return parsed

            print(f"Invalid JSON from {model} — trying next")
            print(f"Raw content: {content[:300]}")
            last_error = "Invalid JSON"
 
        except Exception as e:
            print(f"Exception with {model}: {e}")
            last_error = str(e)
            continue

    raise Exception(
        f"All models failed. Last error: {last_error}"
    )


def _parse_json(content: str) -> dict:
    """
    Safely parse JSON from AI response.
    Handles markdown fences and extra text.
    """
    if not content:
        return None

    content = content.strip()

    # Try direct parse first
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Strip markdown fences ```json
    if "```json" in content:
        try:
            start = content.index("```json") + 7
            end   = content.index("```", start)
            return json.loads(content[start:end].strip())
        except Exception:
            pass

    # Strip markdown fences ```
    if "```" in content:
        try:
            start = content.index("```") + 3
            end   = content.index("```", start)
            return json.loads(content[start:end].strip())
        except Exception:
            pass

    # Find JSON object anywhere in response
    try:
        start = content.index("{")
        end   = content.rindex("}") + 1
        return json.loads(content[start:end])
    except Exception:
        pass

    return None


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
    land = profile.get("land_size", 0)
    unit = profile.get("land_size_unit", "sqft")
    if unit == "acre":      land_sqft = land * 43560
    elif unit == "hectare": land_sqft = land * 107639
    else:                   land_sqft = land

    today   = datetime.now()
    harvest = today + timedelta(days=60)

    user_prompt = f"""
Recommend 5 crops for this Sarawak farmer:

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

    land = profile.get("land_size", 0)
    unit = profile.get("land_size_unit", "sqft")
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
    return datetime.now() - _guide_timestamps[key] > timedelta(days=7)