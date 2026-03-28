from datetime import datetime
from collections import Counter
from typing import Any, Dict, List


def get_pesticide_events(
    forecast_30days: List[dict],
    planted_date: str,
    farming_method: str = "conventional",
) -> Dict[str, Any]:
    if planted_date is None or (isinstance(planted_date, str) and not planted_date.strip()):
        return {
            "events": [],
            "daily": [],
            "summary": {},
            "error": "No planted date provided",
        }

    fm = (farming_method or "conventional").strip().lower()
    if fm not in ("organic", "conventional"):
        fm = "conventional"

    try:
        planted = datetime.strptime(planted_date.strip(), "%Y-%m-%d").date()
    except ValueError:
        return {
            "events": [],
            "daily": [],
            "summary": {},
            "error": "Invalid planted_date format. Use YYYY-MM-DD",
        }

    risk_priority = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

    def product_advice(dominant: str) -> str:
        org = fm == "organic"
        if dominant == "fungal":
            return (
                "Neem oil — 5ml per litre water, spray on leaves"
                if org
                else "Fungicide (mancozeb or copper-based) — follow label dosage"
            )
        if dominant == "mite":
            return (
                "Neem oil — concentrated 10ml per litre, focus undersides"
                if org
                else "Miticide (abamectin-based) — spray leaf undersides"
            )
        return (
            "Garlic and chili spray or yellow sticky traps"
            if org
            else "Insecticide (cypermethrin-based) — spray in cool morning"
        )

    events: List[dict] = []
    daily: List[dict] = []
    dominant_types_elevated: List[str] = []
    severities_elevated: List[str] = []

    # Spray cooldown periods by risk type
    cooldown_periods = {
        "fungal": 7,
        "mite": 4, 
        "insect": 5
    }

    # Track last spray dates by risk type
    last_spray_dates = {}

    for day in forecast_30days:
        day_date = datetime.strptime(day["date"], "%Y-%m-%d").date()
        days_since = (day_date - planted).days

        base = {
            "date": day["date"],
            "day_number": day.get("day_number"),
            "zone": day.get("zone"),
            "confidence": day.get("confidence"),
            "confidence_label": day.get("confidence_label"),
            "days_since_planting": days_since,
        }

        if days_since < 7:
            msg = "Seedling stage — too early to spray pesticide."
            daily.append(
                {
                    **base,
                    "status": "too_early",
                    "reason": "Seedling stage — too fragile for pesticide",
                    "has_event": False,
                    "message": msg,
                }
            )
            continue

        humidity = day.get("humidity") or 0
        rain_prob = day.get("rain_probability") or 0
        temp_max = day.get("temp_max") or 0
        wind_kmh = day.get("wind_kmh") or 0

        if humidity > 80 and rain_prob > 50:
            fungal_risk = "HIGH"
        elif humidity > 70 and rain_prob > 30:
            fungal_risk = "MEDIUM"
        else:
            fungal_risk = "LOW"

        if temp_max > 32 and humidity < 55:
            mite_risk = "HIGH"
        elif temp_max > 28 and humidity < 65:
            mite_risk = "MEDIUM"
        else:
            mite_risk = "LOW"

        if temp_max > 28 and rain_prob < 50:
            insect_risk = "HIGH"
        elif temp_max > 25 and rain_prob < 60:
            insect_risk = "MEDIUM"
        else:
            insect_risk = "LOW"

        all_risks = [fungal_risk, mite_risk, insect_risk]
        overall_risk = max(all_risks, key=lambda r: risk_priority[r])

        if fungal_risk == overall_risk:
            dominant_type = "fungal"
        elif mite_risk == overall_risk:
            dominant_type = "mite"
        else:
            dominant_type = "insect"

        if overall_risk == "LOW":
            daily.append(
                {
                    **base,
                    "fungal_risk": fungal_risk,
                    "mite_risk": mite_risk,
                    "insect_risk": insect_risk,
                    "overall_risk": overall_risk,
                    "dominant_type": dominant_type,
                    "status": "no_spray",
                    "has_event": False,
                    "message": "All pest risks low — no spraying needed today.",
                }
            )
            continue

        dominant_types_elevated.append(dominant_type)
        severities_elevated.append(overall_risk)

        rain_ok = rain_prob < 50
        wind_ok = wind_kmh < 15
        temp_ok = 22 <= temp_max <= 34
        spray_window_ok = rain_ok and wind_ok and temp_ok

        failed_conditions: List[str] = []
        if not rain_ok:
            failed_conditions.append(
                f"Rain probability {rain_prob}% — spray may wash off"
            )
        if not wind_ok:
            failed_conditions.append(
                f"Wind {wind_kmh} km/h — spray may drift"
            )
        if not temp_ok:
            failed_conditions.append(
                f"Temperature {temp_max}°C outside safe range 22-34°C"
            )

        if spray_window_ok:
            status = "spray"
            has_event = True
        else:
            status = "delay"
            has_event = False

        product = product_advice(dominant_type)
        if temp_max > 30:
            best_spray_time = "6:00 AM – 8:00 AM only"
        else:
            best_spray_time = "6:00 AM – 8:00 AM or 4:00 PM – 6:00 PM"

        if status == "spray":
            # ADD 2: Check cooldown before final spray recommendation
            # ADD 3: If multiple risks exist, use shortest cooldown among them
            # Get all elevated risks for this day
            elevated_risks = []
            if fungal_risk in ["HIGH", "MEDIUM"]:
                elevated_risks.append("fungal")
            if mite_risk in ["HIGH", "MEDIUM"]:
                elevated_risks.append("mite")
            if insect_risk in ["HIGH", "MEDIUM"]:
                elevated_risks.append("insect")
            
            # Use shortest cooldown among all elevated risks
            required_cooldown = min(cooldown_periods.get(risk, 5) for risk in elevated_risks) if elevated_risks else 5
            
            # Check if we recently sprayed any of the elevated risk types
            cooldown_active = False
            cooldown_details = []
            for risk_type in elevated_risks:
                last_spray_date = last_spray_dates.get(risk_type)
                if last_spray_date:
                    days_since_last_spray = (day_date - last_spray_date).days
                    risk_cooldown = cooldown_periods.get(risk_type, 5)
                    if days_since_last_spray < risk_cooldown:
                        cooldown_active = True
                        cooldown_details.append(f"{risk_type} ({days_since_last_spray}/{risk_cooldown} days)")
            
            if cooldown_active:
                # Override: skip due to cooldown
                status = "cooldown_skip"
                has_event = False
                message = (
                    f"SKIP - recently sprayed, still under protection period. "
                    f"Active cooldowns: {', '.join(cooldown_details)}."
                )
                failed_conditions = [f"Cooldown period active for: {', '.join(cooldown_details)}"]
            else:
                # Cooldown passed, allow spray and update last spray dates for all elevated risks
                for risk_type in elevated_risks:
                    last_spray_dates[risk_type] = day_date
                message = f"Spray {product}. Best time: {best_spray_time}."
        else:
            issues = ", ".join(failed_conditions)
            message = (
                f"Risk detected ({dominant_type}) but conditions not safe. "
                f"Issues: {issues}. Check next day."
            )

        event = {
            "date": day["date"],
            "day_number": day.get("day_number"),
            "type": "pesticide",
            "zone": day.get("zone"),
            "confidence": day.get("confidence"),
            "confidence_label": day.get("confidence_label"),
            "days_since_planting": days_since,
            "fungal_risk": fungal_risk,
            "mite_risk": mite_risk,
            "insect_risk": insect_risk,
            "overall_risk": overall_risk,
            "dominant_type": dominant_type,
            "status": status,
            "spray_window_ok": spray_window_ok,
            "failed_conditions": [] if spray_window_ok else failed_conditions,
            "product_advice": product,
            "best_spray_time": best_spray_time,
            "has_event": has_event,
            "weather_snapshot": {
                "humidity": humidity,
                "rain_probability": rain_prob,
                "temp_max": temp_max,
                "wind_kmh": wind_kmh,
            },
            "message": message,
        }

        daily.append(dict(event))
        if has_event:
            events.append(event)

    total_spray = sum(1 for d in daily if d.get("status") == "spray")
    delay_days = sum(1 for d in daily if d.get("status") == "delay")
    cooldown_skip_days = sum(1 for d in daily if d.get("status") == "cooldown_skip")
    no_spray_days = sum(1 for d in daily if d.get("status") == "no_spray")

    next_ev = next((e for e in events if e.get("has_event")), None)

    dominant_risk_type = None
    if dominant_types_elevated:
        dominant_risk_type = Counter(dominant_types_elevated).most_common(1)[0][0]

    dominant_risk_level = None
    if severities_elevated:
        dominant_risk_level = Counter(severities_elevated).most_common(1)[0][0]

    # Determine monthly situation
    if total_spray > 0:
        monthly_situation = "spray_available"
        monthly_message = f"{total_spray} spray window(s) found. Next spray: {next_ev['date'] if next_ev else 'None'}."
    elif delay_days > 0 and total_spray == 0:
        # Find most common failed condition from all delay days
        all_failed_conditions = []
        for d in daily:
            if d.get("status") == "delay" and d.get("failed_conditions"):
                all_failed_conditions.extend(d["failed_conditions"])
        most_common_issue = Counter(all_failed_conditions).most_common(1)[0][0] if all_failed_conditions else "Unknown"
        monthly_situation = "no_window"
        monthly_message = (
            "Pest risk detected but no safe spray window found in the next 30 days. "
            f"Main issue: {most_common_issue}. "
            "Watch crops closely for visible symptoms."
        )
    elif cooldown_skip_days > 0 and total_spray == 0:
        monthly_situation = "no_window"
        monthly_message = (
            f"Pest risk detected but {cooldown_skip_days} spray opportunity(ies) skipped due to "
            "protection period. Risk management active - monitor crops closely."
        )
    elif all(d.get("status") == "too_early" for d in daily):
        first_window_date = (planted + timedelta(days=7)).strftime("%d %b %Y")
        monthly_situation = "too_early"
        monthly_message = (
            "Crop still in seedling stage. "
            f"First spray window opens around {first_window_date}."
        )
    else:
        monthly_situation = "no_risk"
        monthly_message = (
            "No pest risk detected for the next 30 days. "
            "Conditions look good — no action needed."
        )

    # Add what_to_watch based on dominant risk
    dominant_risk_overall = Counter(severities_elevated).most_common(1)[0][0] if severities_elevated else "LOW"
    if dominant_risk_overall == "HIGH":
        if dominant_risk_type == "fungal":
            what_to_watch = "Watch for white powder or dark spots on leaves. Yellow or wilting leaves after heavy rain."
        elif dominant_risk_type == "mite":
            what_to_watch = "Check leaf undersides for tiny moving dots. Bronze or silver discoloration on leaves."
        elif dominant_risk_type == "insect":
            what_to_watch = "Look for holes in leaves, sticky residue, or visible insects under leaves."
        else:
            what_to_watch = "Monitor for any unusual pest activity or plant stress."
    elif dominant_risk_overall == "MEDIUM":
        if dominant_risk_type == "fungal":
            what_to_watch = "Watch for early signs of leaf spots or mold. Check after rain periods."
        elif dominant_risk_type == "mite":
            what_to_watch = "Check for fine webbing or leaf discoloration. Use magnifying glass if needed."
        elif dominant_risk_type == "insect":
            what_to_watch = "Look for chewing damage or curling leaves. Check undersides regularly."
        else:
            what_to_watch = "Monitor plants regularly for any developing issues."
    else:  # LOW or None
        what_to_watch = "No specific symptoms to watch for right now."

    summary = {
        "total_spray_days": total_spray,
        "delay_days": delay_days,
        "cooldown_skip_days": cooldown_skip_days,
        "no_spray_days": no_spray_days,
        "next_spray_date": next_ev["date"] if next_ev else None,
        "next_product_advice": next_ev["product_advice"] if next_ev else None,
        "dominant_risk_type": dominant_risk_type,
        "dominant_risk_level": dominant_risk_level,
        "farming_method": fm,
        "monthly_situation": monthly_situation,
        "monthly_message": monthly_message,
        "what_to_watch": what_to_watch,
    }

    return {"events": events, "daily": daily, "summary": summary}
