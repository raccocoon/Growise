from datetime import datetime, timedelta, date
from typing import Optional
from app.utils.confidence import weather_confidence


# ════════════════════════════════════════════════════════════════════════════
# GROWTH STAGE MAPPING
# ════════════════════════════════════════════════════════════════════════════

def get_growth_stage(days_since: int) -> dict:
    """
    Map days since planting to growth stage and fertilizer info.
    """
    if days_since <= 0:
        return {
            "stage":      "not_planted",
            "interval":   None,
            "fertilizer": None,
            "amount":     None,
            "skip":       True,
            "skip_reason": "Crop not yet planted"
        }
    elif days_since <= 7:
        return {
            "stage":      "seedling",
            "interval":   None,
            "fertilizer": None,
            "amount":     None,
            "skip":       True,
            "skip_reason": "Seedling stage — too early to fertilize"
        }
    elif days_since <= 21:
        return {
            "stage":    "vegetative",
            "interval": 7,
            "fertilizer": "NPK 15-15-15 or Urea",
            "amount":   "20g per sqm",
            "skip":     False,
            "skip_reason": None
        }
    elif days_since <= 40:
        return {
            "stage":    "flowering",
            "interval": 10,
            "fertilizer": "NPK 10-30-10 (phosphorus-rich)",
            "amount":   "5g per plant",
            "skip":     False,
            "skip_reason": None
        }
    elif days_since <= 60:
        return {
            "stage":    "fruiting",
            "interval": 10,
            "fertilizer": "NPK 10-10-30 (potassium-rich)",
            "amount":   "5g per plant",
            "skip":     False,
            "skip_reason": None
        }
    else:
        return {
            "stage":      "maturity",
            "interval":   None,
            "fertilizer": None,
            "amount":     None,
            "skip":       True,
            "skip_reason": "Maturity stage — stop fertilizing"
        }


# ════════════════════════════════════════════════════════════════════════════
# LAND SIZE CONVERSION
# ════════════════════════════════════════════════════════════════════════════

def to_sqm(land_size: float, unit: str) -> float:
    if unit == "acre":     return land_size * 4046.86
    if unit == "hectare":  return land_size * 10000
    if unit == "sqft":     return land_size * 0.0929
    return land_size  # assume sqm


def estimate_plants(sqm: float, crop_name: str) -> int:
    """
    Estimate number of plants based on land size.
    Uses average spacing per crop type.
    """
    spacing_map = {
        "kangkung":    0.09,
        "bayam":       0.09,
        "sawi":        0.09,
        "chili":       0.25,
        "cili padi":   0.25,
        "tomato":      0.30,
        "cucumber":    0.50,
        "terung":      0.40,
        "pumpkin":     1.00,
        "pineapple":   0.50,
        "ginger":      0.20,
        "tapioca":     1.00,
        "paddy":       0.04,
        "sweet corn":  0.25,
        "black pepper":1.00,
        "durian":      9.00,
        "bitter gourd":0.50,
        "long bean":   0.30,
        "lady finger": 0.30,
    }
    spacing = spacing_map.get(crop_name.lower(), 0.25)
    return max(1, int(sqm / spacing))


# ════════════════════════════════════════════════════════════════════════════
# WEATHER CHECK
# ════════════════════════════════════════════════════════════════════════════

def check_weather(day: dict) -> dict:
    """
    Check if weather conditions allow fertilizing today.
    Returns should_fertilize bool and reason if skipped.
    """
    rainfall  = day.get("rainfall_mm")     or 0
    rain_prob = day.get("rain_probability")
    soil      = day.get("soil_moisture")

    if rainfall > 10:
        return {
            "should_fertilize": False,
            "skip_reason": f"Heavy rain {rainfall}mm — fertilizer washes away"
        }

    if rain_prob is not None and rain_prob > 60:
        return {
            "should_fertilize": False,
            "skip_reason": f"Rain probability {rain_prob}% — will wash away"
        }

    if soil is not None and soil > 0.40:
        return {
            "should_fertilize": False,
            "skip_reason": f"Soil too wet ({soil}) — roots cannot absorb"
        }

    if soil is not None and soil < 0.10:
        return {
            "should_fertilize": False,
            "skip_reason": f"Soil too dry ({soil}) — fertilizer burns roots"
        }

    return {"should_fertilize": True, "skip_reason": None}


# ════════════════════════════════════════════════════════════════════════════
# MAIN FUNCTION
# ════════════════════════════════════════════════════════════════════════════

def get_fertilize_events(
    forecast_30days: list,
    planted_date:    str,
    crop_name:       str,
    land_size:       float,
    land_size_unit:  str,
    crisis_mode:     bool = False
) -> dict:
    """
    Generate fertilizing schedule for 30-day calendar.
    Returns events per day and summary stats.
    """

    # Pre-condition checks
    if not planted_date:
        return {
            "events":      [],
            "daily":       [],
            "summary":     {},
            "error":       "No planted date provided"
        }

    if crisis_mode:
        return {
            "events":      [],
            "daily":       _build_daily_empty(forecast_30days),
            "summary":     {},
            "crisis_mode": True,
            "crisis_note": "All fertilizing suspended — rain washes nutrients away"
        }

    # Parse planted date
    try:
        planted = datetime.strptime(planted_date, "%Y-%m-%d").date()
    except ValueError:
        return {
            "events":  [],
            "daily":   [],
            "summary": {},
            "error":   "Invalid planted_date format. Use YYYY-MM-DD"
        }

    # Convert land size
    sqm    = to_sqm(land_size, land_size_unit)
    plants = estimate_plants(sqm, crop_name)

    events = []
    daily  = []

    for day in forecast_30days:
        day_date    = datetime.strptime(day["date"], "%Y-%m-%d").date()
        days_since  = (day_date - planted).days
        stage_info  = get_growth_stage(days_since)

        day_entry = {
            "date":          day["date"],
            "day_number":    day["day_number"],
            "zone":          day["zone"],
            "confidence":    day["confidence"],
            "days_since_planting": days_since,
            "growth_stage":  stage_info["stage"],
            "has_event":     False,
            "event":         None
        }

        # Skip if stage does not fertilize
        if stage_info["skip"]:
            day_entry["skip_reason"] = stage_info["skip_reason"]
            daily.append(day_entry)
            continue

        # Check if today is a fertilize day
        interval = stage_info["interval"]
        if days_since <= 0 or days_since % interval != 0:
            daily.append(day_entry)
            continue

        # Check weather
        weather_check = check_weather(day)

        # Calculate amount
        if "per sqm" in (stage_info["amount"] or ""):
            grams = round(20 * sqm)
            amount_str = f"{grams}g total ({stage_info['amount']})"
        else:
            grams = round(5 * plants)
            amount_str = f"{grams}g total ({stage_info['amount']} × {plants} plants)"

        event = {
            "date":               day["date"],
            "day_number":         day["day_number"],
            "type":               "fertilize",
            "crop_name":          crop_name,
            "growth_stage":       stage_info["stage"],
            "days_since_planting": days_since,
            "fertilizer_type":    stage_info["fertilizer"],
            "amount":             amount_str,
            "amount_grams":       grams,
            "best_time":          "Early morning after light watering",
            "should_fertilize":   weather_check["should_fertilize"],
            "skip_reason":        weather_check["skip_reason"],
            "zone":               day["zone"],
            "confidence":         day["confidence"],
            "confidence_label":   day["confidence_label"],
            "weather_snapshot": {
                "rainfall_mm":      day.get("rainfall_mm"),
                "rain_probability": day.get("rain_probability"),
                "soil_moisture":    day.get("soil_moisture"),
                "humidity":         day.get("humidity")
            },
            "message": _build_message(
                crop_name,
                stage_info["stage"],
                stage_info["fertilizer"],
                amount_str,
                weather_check["should_fertilize"],
                weather_check["skip_reason"]
            )
        }

        matching_day = next(
            (d for d in forecast_30days if d["date"] == event["date"]),
            None
        )
        if matching_day and "confidence" in matching_day:
            event["confidence"] = matching_day["confidence"]
            event["confidence_label"] = matching_day.get("confidence_label", "Medium")
            event["confidence_color"] = matching_day.get("confidence_color", "yellow")
        else:
            event["confidence"] = 50
            event["confidence_label"] = "Medium"
            event["confidence_color"] = "yellow"

        events.append(event)
        day_entry["has_event"]   = True
        day_entry["event"]       = event
        daily.append(day_entry)

    # Summary
    total_events    = len(events)
    skipped         = sum(1 for e in events if not e["should_fertilize"])
    confirmed       = total_events - skipped
    next_event      = next(
        (e for e in events if e["should_fertilize"]),
        None
    )

    summary = {
        "total_fertilize_days": total_events,
        "confirmed_days":       confirmed,
        "skipped_days":         skipped,
        "next_fertilize_date":  next_event["date"] if next_event else None,
        "next_fertilizer_type": next_event["fertilizer_type"] if next_event else None,
        "land_sqm":             round(sqm, 1),
        "estimated_plants":     plants,
        "crop_name":            crop_name
    }

    return {
        "events":  events,
        "daily":   daily,
        "summary": summary
    }


def _build_daily_empty(forecast_30days: list) -> list:
    return [
        {
            "date":        d["date"],
            "day_number":  d["day_number"],
            "zone":        d["zone"],
            "confidence":  d["confidence"],
            "has_event":   False,
            "event":       None
        }
        for d in forecast_30days
    ]


def _build_message(
    crop:          str,
    stage:         str,
    fertilizer:    str,
    amount:        str,
    should:        bool,
    skip_reason:   Optional[str]
) -> str:
    if not should:
        return f"Fertilizing scheduled but skipped — {skip_reason}"
    return (
        f"Apply {fertilizer} ({amount}) to your {crop}. "
        f"Growth stage: {stage}. Best time: early morning."
    )