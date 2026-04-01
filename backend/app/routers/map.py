import math
import os
import json
import httpx
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List

from app.routers.auth import get_user
from app.services import soil_service, weather_service, crisis_service

router = APIRouter(prefix="/api/map", tags=["Map"])

class MapRequest(BaseModel):
    polygon: List[List[float]]

REGIONS = [
    {"name": "Kuching", "lat": 1.5533, "lng": 110.3592},
    {"name": "Miri", "lat": 4.3995, "lng": 113.9914},
    {"name": "Sibu", "lat": 2.2885, "lng": 111.8295},
    {"name": "Bintulu", "lat": 3.1667, "lng": 113.0333},
    {"name": "Sri Aman", "lat": 1.2333, "lng": 111.4667},
    {"name": "Kapit", "lat": 2.0167, "lng": 112.9333},
    {"name": "Mukah", "lat": 2.9000, "lng": 112.0833},
    {"name": "Lawas", "lat": 4.8500, "lng": 115.4000},
    {"name": "Sarikei", "lat": 2.1333, "lng": 111.5167},
]

MIN_LAND_SQFT = {
    "kangkung": 10, "bayam": 10, "sawi": 10,
    "cili padi": 20, "chili": 20, "tomato": 20,
    "cucumber": 30, "terung": 30, "pumpkin": 50,
    "ginger": 50, "tapioca": 100, "sweet corn": 100,
    "paddy": 500, "pineapple": 200, "black pepper": 200,
    "durian": 1000, "sago": 2000
}

def find_nearest_region(lat: float, lng: float) -> str:
    nearest = min(REGIONS, key=lambda r: math.sqrt((lat - r["lat"])**2 + (lng - r["lng"])**2))
    return nearest["name"]

def calculate_polygon_area(polygon: List[List[float]]) -> dict:
    n = len(polygon)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][0] * polygon[j][1]
        area -= polygon[j][0] * polygon[i][1]
    area_degrees = abs(area) / 2
    area_m2 = area_degrees * (111000 ** 2)
    area_acres = round(area_m2 / 4046.86, 4)
    area_sqft = round(area_m2 * 10.764)
    return {"acres": area_acres, "sqft": area_sqft, "display": f"{area_acres} acres"}

def build_weather_snapshot(forecast_30days: List[dict]) -> dict:
    days = forecast_30days[:6]
    
    # temp_max / temp_min calculation
    valid_temps = [((d.get("temp_max") or 0) + (d.get("temp_min") or 0)) / 2 for d in days if d.get("temp_max") is not None]
    avg_temp = round(sum(valid_temps) / len(valid_temps), 1) if valid_temps else 0
    
    # rainfall calculation
    rainfalls = [(d.get("rainfall_mm") or 0) for d in days]
    total_rainfall = round(sum(rainfalls), 1)
    
    # humidity calculation (weather_array provides "humidity")
    valid_hums = [(d.get("humidity") or 0) for d in days if d.get("humidity") is not None]
    avg_humidity = round(sum(valid_hums) / len(valid_hums), 1) if valid_hums else 0
    
    rainy_days = len([r for r in rainfalls if r > 5])
    dry_days = len([r for r in rainfalls if r < 2])
    
    max_wind = max([(d.get("wind_kmh") or 0) for d in days]) if days else 0
    
    if any(r > 80 for r in rainfalls):
        flood_risk = "high"
    elif any(r > 50 for r in rainfalls):
        flood_risk = "medium"
    else:
        flood_risk = "low"
        
    if dry_days >= 5:
        drought_risk = "high"
    elif dry_days >= 4:
        drought_risk = "medium"
    else:
        drought_risk = "low"
        
    arima_preview = [
        {
            "date": d.get("date"),
            "temp_max": d.get("temp_max"),
            "rainfall_mm": d.get("rainfall_mm"),
            "zone": d.get("zone"),
            "confidence": d.get("confidence")
        } for d in forecast_30days
    ]
    
    return {
        "avg_temp": avg_temp,
        "total_rainfall": total_rainfall,
        "avg_humidity": avg_humidity,
        "rainy_days": rainy_days,
        "dry_days": dry_days,
        "max_wind": max_wind,
        "flood_risk": flood_risk,
        "drought_risk": drought_risk,
        "arima_preview": arima_preview
    }

def get_farming_score_label(score: int) -> str:
    if score >= 75: return "Good"
    elif score >= 50: return "Moderate"
    else: return "Poor"

def get_planting_insight(forecast_6days: List[dict]):
    scored_days = []
    
    for d in forecast_6days:
        score = 100
        rain = d.get("rainfall_mm") or 0
        temp_max = d.get("temp_max") or 0
        wind = d.get("wind_kmh") or 0
        soil = d.get("soil_moisture")
        wcode = d.get("weather_code") or 0
        
        if rain > 40: score -= 50
        elif rain > 20: score -= 25
        elif rain > 10: score -= 10
        elif rain < 1: score -= 10
        
        if temp_max > 36: score -= 30
        elif temp_max > 33: score -= 10
        
        if wind > 40: score -= 20
        elif wind > 25: score -= 10
        
        if soil is not None:
            if soil > 0.42: score -= 30
            elif soil > 0.38: score -= 15
            elif soil < 0.10: score -= 20
            elif soil < 0.15: score -= 10
            
        if wcode in [95, 96, 99]:
            score -= 30
            
        final_score = max(0, min(100, score))
        hard_blocked = rain > 40 or temp_max > 36 or wcode in [95, 96, 99]
        scored_days.append({"date": d.get("date"), "score": final_score, "hard_blocked": hard_blocked})
        
    next_suitable_window = "No suitable window in next 6 days"
    window_score = 0
    window_label = "Poor"
    
    for i, day in enumerate(scored_days):
        if not day["hard_blocked"] and day["score"] >= 65:
            window_score = day["score"]
            if i in [0, 1]: next_suitable_window = "Today is a good day to plant"
            elif i in [2, 3]: next_suitable_window = "2-4 days from now"
            elif i in [4, 5]: next_suitable_window = "4-6 days from now"
            break

    if window_score >= 80: window_label = "Excellent"
    elif window_score >= 65: window_label = "Good"
    elif window_score >= 50: window_label = "Acceptable"
    else: window_label = "Poor"

    return {
        "next_suitable_window": next_suitable_window,
        "window_label": window_label,
        "window_score": window_score
    }

async def get_map_crop_recommendation(
    detected_region: str, soil_type: str, weather_snapshot: dict, crisis_flag: bool
):
    system_msg = """You are an agricultural expert for Sarawak, Malaysia.
Based on the region, soil, and weather — suggest exactly 3 crops
that generally grow well in these conditions.
Rules:
- These are regional suggestions only, not personalised
- If crisis_flag is True: only suggest from [kangkung, sawi, bayam, tapioca, sweet corn]
- flood_risk HIGH: flood-tolerant crops only
- drought_risk HIGH: drought-tolerant crops only
- Return JSON only. No markdown. No explanation outside JSON.
- Format: {"crops": [{"crop_name": "x", "local_name": "x"}]}"""

    user_msg = f"""Region: {detected_region}, Sarawak
Soil: {soil_type}
Avg temp: {weather_snapshot.get('avg_temp')}°C
Total rainfall (6 days): {weather_snapshot.get('total_rainfall')}mm
Avg humidity: {weather_snapshot.get('avg_humidity')}%
Flood risk: {weather_snapshot.get('flood_risk')}
Drought risk: {weather_snapshot.get('drought_risk')}
Crisis mode: {crisis_flag}
Return exactly 3 crops as JSON."""

    fallback = [
        {"crop_name": "Kangkung", "local_name": "Kangkung"},
        {"crop_name": "Sweet Corn", "local_name": "Jagung Manis"},
        {"crop_name": "Tapioca", "local_name": "Ubi Kayu"}
    ]

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("Warning: OPENROUTER_API_KEY not set. Returning fallback.")
        return fallback

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3.3-70b-instruct:free",
                    "temperature": 0.3,
                    "max_tokens": 400,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": user_msg}
                    ]
                }
            )
            
            if res.status_code != 200:
                print(f"OpenRouter returned {res.status_code}: {res.text}")
                return fallback
                
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            
            content = content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(content)
            return parsed.get("crops", fallback)
            
    except Exception as e:
        print(f"Error fetching crops: {e}")
        return fallback

@router.post("/analyze")
async def analyze_farm(body: MapRequest, authorization: str = Header(...)):
    user = get_user(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")

    if not body.polygon or len(body.polygon) < 3:
        raise HTTPException(status_code=400, detail="Polygon needs at least 3 points")

    # Step 1 — centroid from polygon
    centroid_lat = sum(p[0] for p in body.polygon) / len(body.polygon)
    centroid_lng = sum(p[1] for p in body.polygon) / len(body.polygon)

    # Step 2 — area
    area = calculate_polygon_area(body.polygon)

    # Step 3 — nearest region
    detected_region = find_nearest_region(centroid_lat, centroid_lng)

    # Step 4 — soil (single dominant type only)
    soil_type = soil_service.get_soil_type(centroid_lat, centroid_lng)

    # Step 5 — weather
    weather_data = await weather_service.get_weather(centroid_lat, centroid_lng)
    forecast_30days = weather_data.get("weather_array", [])
    if not forecast_30days:
        raise HTTPException(status_code=400, detail="Unable to fetch weather data")
    forecast_6days = forecast_30days[:6]

    # Step 6 — crisis check
    crisis = crisis_service.calculate_crisis_mode(forecast_6days)

    # Step 7 — farming snapshot from 6-day real data only
    temps = [((d.get("temp_max") or 0) + (d.get("temp_min") or 0)) / 2 for d in forecast_6days]
    humidities = [d.get("humidity", 0) for d in forecast_6days]
    rainfalls = [d.get("rainfall_mm") or 0 for d in forecast_6days]
    
    for d in forecast_6days:
        score = 100
        rain = d.get("rainfall_mm") or 0
        tmax = d.get("temp_max") or 0
        wnd = d.get("wind_kmh") or 0
        moist = d.get("soil_moisture")
        wcode = d.get("weather_code") or 0
        if rain > 40: score -= 50
        elif rain > 20: score -= 25
        elif rain > 10: score -= 10
        elif rain < 1: score -= 10
        if tmax > 36: score -= 30
        elif tmax > 33: score -= 10
        if wnd > 40: score -= 20
        elif wnd > 25: score -= 10
        if moist is not None:
            if moist > 0.42: score -= 30
            elif moist > 0.38: score -= 15
            elif moist < 0.10: score -= 20
            elif moist < 0.15: score -= 10
        if wcode in [95, 96, 99]: score -= 30
        d["farming_score"] = max(0, min(100, score))

    farming_scores = [d["farming_score"] for d in forecast_6days]

    avg_temp = round(sum(temps) / len(temps)) if temps else 0
    total_rainfall = round(sum(rainfalls))
    avg_humidity = round(sum(humidities) / len(humidities)) if humidities else 0
    avg_farming_score = round(sum(farming_scores) / len(farming_scores)) if farming_scores else 0

    dry_days = sum(1 for r in rainfalls if r < 2)
    flood_risk = "High" if any(r > 80 for r in rainfalls) else "Medium" if any(r > 50 for r in rainfalls) else "Low"
    drought_risk = "High" if dry_days >= 5 else "Medium" if dry_days >= 4 else "Low"

    # Step 8 — planting insight (plain language)
    planting_insight = get_planting_insight(forecast_6days)

    # Step 9 — AI crops (regional suggestion only, no land filtering)
    weather_ctx = {
        "avg_temp": avg_temp,
        "total_rainfall": total_rainfall,
        "avg_humidity": avg_humidity,
        "flood_risk": flood_risk,
        "drought_risk": drought_risk
    }
    crops = await get_map_crop_recommendation(
        detected_region, soil_type, weather_ctx, crisis.get("crisis_flag", False)
    )

    # Step 10 — assemble clean teaser response
    return {
        "success": True,
        "region": detected_region,
        "area": area,
        "soil_profile": {
            "dominant_soil": soil_type
        },
        "farming_snapshot": {
            "avg_temp": avg_temp,
            "total_rainfall_mm": total_rainfall,
            "avg_humidity": avg_humidity,
            "farming_score": avg_farming_score,
            "farming_score_label": get_farming_score_label(avg_farming_score)
        },
        "risk_levels": {
            "flood_risk": flood_risk,
            "drought_risk": drought_risk
        },
        "planting_insight": planting_insight,
        "suitable_crops": crops,
        "crisis_status": {
            "mode": crisis.get("mode", "NORMAL"),
            "crisis_flag": crisis.get("crisis_flag", False)
        }
    }
