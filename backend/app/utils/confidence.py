import math

CROP_REFERENCE = {
    "kangkung":     {"ideal_temp": 28, "ideal_rainfall": 40,
                     "suitable_soils": ["Clay Loam", "Loam", "Peat Soil"]},
    "bayam":        {"ideal_temp": 28, "ideal_rainfall": 35,
                     "suitable_soils": ["Loam", "Clay Loam"]},
    "sawi":         {"ideal_temp": 27, "ideal_rainfall": 40,
                     "suitable_soils": ["Loam", "Sandy Loam", "Clay Loam"]},
    "cili padi":    {"ideal_temp": 30, "ideal_rainfall": 50,
                     "suitable_soils": ["Loam", "Sandy Loam"]},
    "chili":        {"ideal_temp": 30, "ideal_rainfall": 55,
                     "suitable_soils": ["Loam", "Sandy Loam", "Clay Loam"]},
    "tomato":       {"ideal_temp": 27, "ideal_rainfall": 50,
                     "suitable_soils": ["Loam", "Clay Loam", "Sandy Loam"]},
    "cucumber":     {"ideal_temp": 29, "ideal_rainfall": 55,
                     "suitable_soils": ["Sandy Loam", "Loam"]},
    "terung":       {"ideal_temp": 30, "ideal_rainfall": 55,
                     "suitable_soils": ["Loam", "Clay Loam"]},
    "pumpkin":      {"ideal_temp": 30, "ideal_rainfall": 60,
                     "suitable_soils": ["Loam", "Sandy Loam"]},
    "pineapple":    {"ideal_temp": 30, "ideal_rainfall": 80,
                     "suitable_soils": ["Sandy Loam", "Loam"]},
    "ginger":       {"ideal_temp": 28, "ideal_rainfall": 70,
                     "suitable_soils": ["Loam", "Clay Loam"]},
    "tapioca":      {"ideal_temp": 30, "ideal_rainfall": 60,
                     "suitable_soils": ["Sandy Loam", "Loam", "Clay"]},
    "paddy":        {"ideal_temp": 28, "ideal_rainfall": 120,
                     "suitable_soils": ["Clay", "Clay Loam", "Peat Soil"]},
    "sweet corn":   {"ideal_temp": 29, "ideal_rainfall": 60,
                     "suitable_soils": ["Loam", "Sandy Loam", "Clay Loam"]},
    "black pepper": {"ideal_temp": 27, "ideal_rainfall": 90,
                     "suitable_soils": ["Clay Loam", "Loam"]},
    "durian":       {"ideal_temp": 29, "ideal_rainfall": 100,
                     "suitable_soils": ["Loam", "Clay Loam"]},
    "sago":         {"ideal_temp": 28, "ideal_rainfall": 100,
                     "suitable_soils": ["Peat Soil", "Clay"]},
}

def build_label(score: int) -> dict:
    try:
        score = max(0, min(100, score))
        if score >= 90:
            return {"score": score, "label": "High", "color": "green"}
        elif score >= 70:
            return {"score": score, "label": "Good", "color": "teal"}
        elif score >= 50:
            return {"score": score, "label": "Medium", "color": "yellow"}
        elif score >= 30:
            return {"score": score, "label": "Low", "color": "orange"}
        else:
            return {"score": score, "label": "Indicative", "color": "grey"}
    except:
        return {"score": 50, "label": "Medium", "color": "yellow"}

def weather_confidence(
    day_number: int,
    arima_upper: float = None,
    arima_lower: float = None,
    prediction: float = None,
    seasonal_norm: float = None,
    variables_consistent: bool = None
) -> dict:
    try:
        base = 100 * math.exp(-0.05 * max(0, day_number - 6))

        if arima_upper is not None and arima_lower is not None:
            width = arima_upper - arima_lower
            if width < 2:    base += 10
            elif width < 5:  base += 5
            elif width > 10: base -= 10

        if prediction is not None and seasonal_norm is not None:
            deviation = abs(prediction - seasonal_norm)
            if deviation < 10:   base += 15
            elif deviation < 20: base += 5
            elif deviation > 40: base -= 15

        if variables_consistent is not None:
            base += 10 if variables_consistent else -10

        return build_label(round(base))
    except:
        return {"score": 50, "label": "Medium", "color": "yellow"}

def crop_confidence(
    soil_type: str,
    crop_suitable_soils: list,
    avg_temp: float,
    crop_ideal_temp: float,
    avg_rainfall: float,
    crop_ideal_rainfall: float
) -> dict:
    try:
        soil_lower = soil_type.lower()
        if any(soil_lower == s.lower() for s in crop_suitable_soils):
            soil_match = 1.0
        elif any(soil_lower in s.lower() or s.lower() in soil_lower
                 for s in crop_suitable_soils):
            soil_match = 0.5
        else:
            soil_match = 0.0

        temp_match = max(0.0, 1.0 - abs(avg_temp - crop_ideal_temp) / 10)
        rain_match = max(0.0, 1.0 - abs(avg_rainfall - crop_ideal_rainfall) / 100)

        score = round((soil_match + temp_match + rain_match) / 3 * 100)
        return build_label(score)
    except:
        return {"score": 50, "label": "Medium", "color": "yellow"}

def harvest_confidence(
    days_until_harvest: int,
    stress_delay_days: float = 0
) -> dict:
    try:
        score = max(0, 100 - days_until_harvest * 2)
        if stress_delay_days > 3:
            score = max(0, score - 10)
        return build_label(score)
    except:
        return {"score": 50, "label": "Medium", "color": "yellow"}

def check_consistency(
    rainfall: float,
    humidity: float,
    temp_max: float
) -> bool:
    try:
        if rainfall > 20 and humidity < 60: return False
        if temp_max > 35 and rainfall > 30: return False
        if rainfall > 20 and humidity > 75: return True
        if rainfall < 5 and humidity < 70:  return True
        return True
    except:
        return True
