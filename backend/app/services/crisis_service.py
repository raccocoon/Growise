from datetime import datetime


CRISIS_SAFE_CROPS = [
    "kangkung",
    "sawi",
    "bayam",
    "tapioca",
    "sweet corn"
]


def calculate_crisis_mode(forecast_6days: list) -> dict:
    """
    Calculate crisis risk score from first 6 days of forecast.
    Returns crisis flag, warning flag, mode, score and triggers.
    """

    if not forecast_6days:
        return _normal_result()

    risk_score = 0
    triggers   = []

    # ── Rain score ─────────────────────────────────────────────
    rainfalls = [
        d.get("rainfall_mm") or 0
        for d in forecast_6days
    ]
    max_rain = max(rainfalls) if rainfalls else 0

    if max_rain > 80:
        risk_score += 40
        triggers.append(
            f"Extreme rain {max_rain}mm detected (+40)"
        )
    elif max_rain > 50:
        risk_score += 25
        triggers.append(
            f"Heavy rain {max_rain}mm detected (+25)"
        )

    # Consecutive rain days
    consec = 0
    for r in rainfalls:
        if r > 5:
            consec += 1
        else:
            break

    if consec >= 3:
        risk_score += 15
        triggers.append(
            f"{consec} consecutive rain days (+15)"
        )

    # ── Temperature score ───────────────────────────────────────
    temps = [
        ((d.get("temp_max") or 0) + (d.get("temp_min") or 0)) / 2
        for d in forecast_6days
        if d.get("temp_max") is not None
    ]
    avg_temp = round(sum(temps) / len(temps), 1) if temps else 0

    if avg_temp > 37:
        risk_score += 30
        triggers.append(f"Avg temp {avg_temp}°C extremely high (+30)")
    elif avg_temp > 35:
        risk_score += 20
        triggers.append(f"Avg temp {avg_temp}°C very high (+20)")

    # ── Humidity score ──────────────────────────────────────────
    hums = [
        d.get("humidity") or 0
        for d in forecast_6days
        if d.get("humidity") is not None
    ]
    avg_hum = round(sum(hums) / len(hums), 1) if hums else 0

    if avg_hum > 90:
        risk_score += 20
        triggers.append(f"Avg humidity {avg_hum}% very high (+20)")
    elif avg_hum > 85:
        risk_score += 10
        triggers.append(f"Avg humidity {avg_hum}% high (+10)")

    # ── Classification ──────────────────────────────────────────
    if risk_score >= 60:
        mode         = "CRISIS"
        crisis_flag  = True
        warning_flag = False
    elif risk_score >= 40:
        mode         = "WARNING"
        crisis_flag  = False
        warning_flag = True
    else:
        mode         = "NORMAL"
        crisis_flag  = False
        warning_flag = False

    return {
        "crisis_flag":       crisis_flag,
        "warning_flag":      warning_flag,
        "mode":              mode,
        "risk_score":        risk_score,
        "triggers":          triggers,
        "avg_temp":          avg_temp,
        "avg_humidity":      avg_hum,
        "max_rainfall":      max_rain,
        "consecutive_rain":  consec,
        "crisis_safe_crops": CRISIS_SAFE_CROPS,
        "calculated_at":     datetime.now().isoformat()
    }


def _normal_result() -> dict:
    return {
        "crisis_flag":       False,
        "warning_flag":      False,
        "mode":              "NORMAL",
        "risk_score":        0,
        "triggers":          [],
        "avg_temp":          0,
        "avg_humidity":      0,
        "max_rainfall":      0,
        "consecutive_rain":  0,
        "crisis_safe_crops": CRISIS_SAFE_CROPS,
        "calculated_at":     datetime.now().isoformat()
    }
