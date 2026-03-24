"""
Feature 5 — When to Plant (Calendar Engine A)
Scores 30-day forecast to find best consecutive planting windows.
"""
from datetime import datetime
from typing import Optional, List, Dict, Tuple, Any


# Crisis-safe crops (from spec)
CRISIS_SAFE_CROPS = [
    "kangkung", "sawi", "bayam", "tapioca", "sweet corn"
]


def _day_score(day: dict) -> Tuple[int, bool]:
    """
    Calculate planting score for a day (starts at 100).
    Returns (score, is_blocked).
    """
    score = 100
    rainfall = day.get("rainfall_mm") or 0
    temp_max = day.get("temp_max")
    temp_min = day.get("temp_min")
    wind = day.get("wind_kmh") or 0
    soil = day.get("soil_moisture")
    weather_code = day.get("weather_code")

    # RAINFALL
    if rainfall > 40:
        score -= 50
    elif rainfall > 20:
        score -= 25
    elif rainfall > 10:
        score -= 10
    elif rainfall < 1:
        score -= 10

    # TEMPERATURE
    if temp_max is not None:
        if temp_max > 36:
            score -= 30
        elif temp_max > 33:
            score -= 10
    if temp_min is not None and temp_min < 20:
        score -= 15

    # WIND
    if wind > 40:
        score -= 20
    elif wind > 25:
        score -= 10

    # SOIL MOISTURE
    if soil is not None:
        if soil > 0.42:
            score -= 30
        elif soil > 0.38:
            score -= 15
        elif soil < 0.10:
            score -= 20
        elif soil < 0.15:
            score -= 10

    # THUNDERSTORM
    if weather_code is not None and weather_code in (95, 96, 99):
        score -= 30

    final_score = max(0, min(100, score))

    # HARD BLOCKER
    is_blocked = (
        rainfall > 40
        or (soil is not None and soil > 0.42)
        or (temp_max is not None and temp_max > 36)
        or (weather_code is not None and weather_code in (95, 96, 99))
    )

    return final_score, is_blocked


def _window_label(score: float) -> Tuple[str, str]:
    """Return (label, color) for window_score."""
    if score >= 80:
        return "Excellent", "green"
    if score >= 65:
        return "Good", "teal"
    if score >= 50:
        return "Acceptable", "yellow"
    return "", ""


def _best_time_of_day(
    window_days: List[dict],
    window_score: float
) -> Tuple[str, str]:
    """
    Determine best time of day for planting in this window.
    Returns (best_time, reason).
    """
    temps = [d.get("temp_max") for d in window_days if d.get("temp_max") is not None]
    rains = [d.get("rainfall_mm") or 0 for d in window_days]
    avg_temp_max = sum(temps) / len(temps) if temps else 0

    if avg_temp_max > 32:
        return "5:30 AM – 7:30 AM", "Before heat builds up"
    if any(r > 5 for r in rains):
        return "Wait for rain to stop + 1–2 hours", "Let excess water drain first"
    return (
        "6:00 AM – 8:00 AM or 4:00 PM – 6:00 PM",
        "Cooler temperatures reduce seedling stress"
    )


def _overlaps(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    """Check if two ranges overlap (inclusive)."""
    return not (a_end < b_start or b_end < a_start)


def get_planting_windows(
    forecast_30days: List[dict],
    planted_date: Optional[str] = None,
    crisis_mode: bool = False,
    crisis_safe_crops: Optional[List[str]] = None,
    crop_name: Optional[str] = None
) -> dict:
    """
    Find best 2–3 day consecutive planting windows from 30-day forecast.
    """
    if planted_date is not None:
        return {
            "windows": [],
            "daily_scores": [],
            "message": "Crop already planted — planting windows hidden"
        }

    crisis_safe = crisis_safe_crops or CRISIS_SAFE_CROPS

    if crisis_mode and crop_name:
        crop_lower = (crop_name or "").strip().lower()
        if crop_lower and crop_lower not in [c.lower() for c in crisis_safe]:
            return {
                "windows": [],
                "daily_scores": [],
                "message": "Planting delayed — crisis conditions active"
            }

    # Compute daily scores
    daily_scores = []
    for d in forecast_30days:
        score, blocked = _day_score(d)
        daily_scores.append({
            "date": d.get("date"),
            "day_number": d.get("day_number"),
            "score": score,
            "blocked": blocked,
            "zone": d.get("zone", "unknown"),
            "confidence": d.get("confidence"),
            "index": len(daily_scores)
        })

    # Find all valid 2–3 day windows
    candidates = []
    n = len(forecast_30days)

    for start in range(n):
        for length in (2, 3):
            end = start + length
            if end > n:
                continue

            window_days = forecast_30days[start:end]
            window_ds = daily_scores[start:end]

            if any(ds["blocked"] for ds in window_ds):
                continue
            if any(ds["score"] < 40 for ds in window_ds):
                continue

            avg_score = sum(ds["score"] for ds in window_ds) / length
            if crisis_mode and avg_score <= 70:
                continue

            label, color = _window_label(avg_score)
            if not label:
                continue

            best_time, best_reason = _best_time_of_day(window_days, avg_score)
            temps = [d.get("temp_max") for d in window_days if d.get("temp_max") is not None]
            rains = [d.get("rainfall_mm") or 0 for d in window_days]

            candidates.append({
                "start_idx": start,
                "end_idx": end - 1,
                "start_date": forecast_30days[start].get("date"),
                "end_date": forecast_30days[end - 1].get("date"),
                "window_score": round(avg_score, 1),
                "label": label,
                "color": color,
                "avg_temp": round(sum(temps) / len(temps), 1) if temps else None,
                "total_rainfall": round(sum(rains), 1),
                "best_time": best_time,
                "best_time_reason": best_reason,
                "message": f"Best window: {forecast_30days[start].get('date')} to {forecast_30days[end-1].get('date')} — {label} conditions"
            })

    # Remove overlapping windows, keep highest score
    candidates.sort(key=lambda w: w["window_score"], reverse=True)
    kept = []
    for c in candidates:
        overlaps = any(
            _overlaps(c["start_idx"], c["end_idx"], k["start_idx"], k["end_idx"])
            for k in kept
        )
        if not overlaps:
            kept.append(c)

    # Top 3 only
    top_windows = kept[:3]

    # Build final window objects (remove internal indices)
    result_windows = []
    for w in top_windows:
        result_windows.append({
            "start_date": w["start_date"],
            "end_date": w["end_date"],
            "window_score": w["window_score"],
            "label": w["label"],
            "color": w["color"],
            "avg_temp": w["avg_temp"],
            "total_rainfall": w["total_rainfall"],
            "best_time": w["best_time"],
            "best_time_reason": w["best_time_reason"],
            "message": w["message"]
        })

    return {
        "windows": result_windows,
        "daily_scores": daily_scores
    }
