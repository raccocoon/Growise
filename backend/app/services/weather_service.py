import math
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import httpx

from app.utils.confidence import weather_confidence, check_consistency

# ── Try importing ARIMA ───────────────────────────────────────────────────
try:
    from pmdarima import auto_arima
    ARIMA_OK = True
except ImportError:
    ARIMA_OK = False
    print("WARNING: pmdarima not installed. Using simple average fallback.")

# ── In-memory cache ───────────────────────────────────────────────────────
_hist_cache            = {}
_hist_timestamps       = {}
_model_cache           = {}
_model_timestamps      = {}
_crisis_weather_cache  = {}   # keyed by _rkey(lat, lng); set by debug router

# ── Weather code map ──────────────────────────────────────────────────────
WEATHER_CODES = {
    0:  {"label": "Clear sky",     "icon": "☀️"},
    1:  {"label": "Mainly clear",  "icon": "🌤️"},
    2:  {"label": "Partly cloudy", "icon": "⛅"},
    3:  {"label": "Overcast",      "icon": "☁️"},
    45: {"label": "Foggy",         "icon": "🌫️"},
    51: {"label": "Light drizzle", "icon": "🌦️"},
    61: {"label": "Light rain",    "icon": "🌧️"},
    63: {"label": "Moderate rain", "icon": "🌧️"},
    65: {"label": "Heavy rain",    "icon": "🌧️"},
    80: {"label": "Rain showers",  "icon": "🌦️"},
    81: {"label": "Heavy showers", "icon": "⛈️"},
    95: {"label": "Thunderstorm",  "icon": "⛈️"},
    96: {"label": "Thunderstorm",  "icon": "⛈️"},
    99: {"label": "Thunderstorm",  "icon": "⛈️"},
}


# ════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

def _rkey(lat: float, lng: float) -> str:
    return f"{round(lat, 2)}_{round(lng, 2)}"


def _expired(timestamps: dict, key: str, days: int = 7) -> bool:
    if key not in timestamps:
        return True
    return datetime.now() - timestamps[key] > timedelta(days=days)


def _safe(lst: list, idx: int, default=None):
    try:
        val = lst[idx]
        if val is None:
            return default
        if isinstance(val, float) and math.isnan(val):
            return default
        return val
    except (IndexError, TypeError):
        return default


def _clean(lst: list) -> list:
    result = []
    for v in lst:
        if v is None:
            continue
        if isinstance(v, float) and math.isnan(v):
            continue
        result.append(v)
    return result


def _hourly_to_daily_soil(hourly: dict, forecast_dates: list) -> list:
    try:
        hourly_times = hourly.get("time", [])
        hourly_soil  = hourly.get("soil_moisture_0_to_7cm", [])

        if not hourly_times or not hourly_soil:
            return [None] * len(forecast_dates)

        daily_soil = []
        for date_str in forecast_dates:
            day_values = [
                v for t, v in zip(hourly_times, hourly_soil)
                if t.startswith(date_str) and v is not None
            ]
            if day_values:
                daily_soil.append(
                    round(sum(day_values) / len(day_values), 3)
                )
            else:
                daily_soil.append(None)

        return daily_soil

    except Exception as e:
        print(f"Soil moisture conversion failed: {e}")
        return [None] * len(forecast_dates)


def _estimate_soil_from_rainfall(rainfall_list: list) -> list:
    """
    Estimate daily soil moisture from rainfall.
    Sarawak baseline is 0.30 (clay loam).
    Heavy rain increases it, dry days decrease it.
    """
    baseline = 0.30
    result   = []
    current  = baseline

    for rain in rainfall_list:
        if rain is None:
            rain = 0
        if rain > 40:   current = min(0.50, current + 0.08)
        elif rain > 20: current = min(0.45, current + 0.05)
        elif rain > 10: current = min(0.40, current + 0.03)
        elif rain > 5:  current = min(0.38, current + 0.01)
        elif rain < 2:  current = max(0.15, current - 0.02)
        result.append(round(current, 3))

    return result


# ════════════════════════════════════════════════════════════════════════════
# STEP 1 — FETCH REAL 6-DAY FORECAST
# ════════════════════════════════════════════════════════════════════════════

async def _fetch_forecast(lat: float, lng: float) -> dict:
    """
    Fetch 6-day forecast from Open-Meteo.
    Soil moisture fetched separately — best_match model
    does not include soil data for Southeast Asia.
    UV and sunshine removed — not needed.
    """

    daily_params = ",".join([
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "relative_humidity_2m_max",
        "relative_humidity_2m_min",
        "wind_speed_10m_max",
        "weathercode"
    ])

    main_url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}"
        f"&longitude={lng}"
        f"&daily={daily_params}"
        f"&forecast_days=6"
        f"&timezone=Asia%2FKuching"
        f"&models=best_match"
    )

    soil_url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}"
        f"&longitude={lng}"
        f"&hourly=soil_moisture_0_to_7cm"
        f"&forecast_days=6"
        f"&timezone=Asia%2FKuching"
    )

    print(f"Fetching forecast: {main_url}")

    async with httpx.AsyncClient(timeout=15.0) as client:
        main_res = await client.get(main_url)
        print(f"Forecast status: {main_res.status_code}")
        if main_res.status_code != 200:
            print(f"Forecast error: {main_res.text}")
        main_res.raise_for_status()

        soil_res = await client.get(soil_url)
        print(f"Soil status: {soil_res.status_code}")

    main_data = main_res.json()

    if soil_res.status_code == 200:
        soil_data = soil_res.json()
        hourly    = soil_data.get("hourly", {})
        sample    = hourly.get("soil_moisture_0_to_7cm", [])[:5]
        print(f"Soil sample: {sample}")
        main_data["hourly"] = hourly
    else:
        print("Soil fetch failed — will estimate from rainfall")
        main_data["hourly"] = {}

    return main_data


# ════════════════════════════════════════════════════════════════════════════
# STEP 2 — FETCH 2-YEAR HISTORICAL DATA
# ════════════════════════════════════════════════════════════════════════════

async def _fetch_historical(lat: float, lng: float) -> dict:
    key = _rkey(lat, lng)

    if not _expired(_hist_timestamps, key) and key in _hist_cache:
        print(f"Historical cache hit for {key}")
        return _hist_cache[key]

    today      = datetime.now().date()
    start_date = (today - timedelta(days=730)).isoformat()
    end_date   = (today - timedelta(days=1)).isoformat()

    daily_params = ",".join([
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "relative_humidity_2m_max",
        "relative_humidity_2m_min",
        "wind_speed_10m_max"
    ])

    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}"
        f"&longitude={lng}"
        f"&start_date={start_date}"
        f"&end_date={end_date}"
        f"&daily={daily_params}"
        f"&timezone=Asia%2FKuching"
    )

    print(f"Fetching 2yr historical for {lat},{lng} ...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.get(url)
        print(f"Historical response status: {res.status_code}")
        if res.status_code != 200:
            print(f"Historical error body: {res.text}")
        res.raise_for_status()
        data = res.json()

    _hist_cache[key]      = data
    _hist_timestamps[key] = datetime.now()
    print(f"Historical data cached for {key}")
    return data


# ════════════════════════════════════════════════════════════════════════════
# STEP 3 — ARIMA TRAINING AND PREDICTION
# ════════════════════════════════════════════════════════════════════════════

def _fallback_avg(anchor: list, n: int) -> list:
    clean = _clean(anchor)
    if not clean:
        return [None] * n
    avg = sum(clean) / len(clean)
    return [round(avg + random.uniform(-1.5, 1.5), 2) for _ in range(n)]


def _train_and_predict(
    historical: list,
    anchor:     list,
    var_name:   str,
    region_key: str,
    n_periods:  int = 24
) -> Tuple[list, Optional[list]]:

    if not ARIMA_OK:
        return _fallback_avg(anchor, n_periods), None

    series = _clean(historical + anchor)

    if len(series) < 60:
        print(f"Not enough data for ARIMA ({var_name}). Using fallback.")
        return _fallback_avg(anchor, n_periods), None

    model_key = f"{region_key}_{var_name}"

    try:
        if not _expired(_model_timestamps, model_key) and \
           model_key in _model_cache:
            print(f"Model cache hit: {model_key}")
            model = _model_cache[model_key]
        else:
            print(f"Training ARIMA for {var_name} ...")
            model = auto_arima(
                series,
                seasonal=False,
                stepwise=True,
                suppress_warnings=True,
                error_action="ignore",
                max_p=3,
                max_q=3,
                max_order=5,
                information_criterion="aic"
            )
            _model_cache[model_key]      = model
            _model_timestamps[model_key] = datetime.now()
            print(f"ARIMA trained for {var_name}: order={model.order}")

        preds, conf_int = model.predict(
            n_periods=n_periods,
            return_conf_int=True
        )
        return list(preds), list(conf_int)

    except Exception as e:
        print(f"ARIMA failed for {var_name}: {e}. Using fallback.")
        return _fallback_avg(anchor, n_periods), None


# ════════════════════════════════════════════════════════════════════════════
# STEP 4 — CONFIDENCE SCORE
# ════════════════════════════════════════════════════════════════════════════

def _confidence(
    day_number:    int,
    temp_interval: Optional[list] = None,
    prediction:    Optional[float] = None,
    seasonal_norm: Optional[float] = None
) -> int:
    base = 100 * math.exp(-0.05 * max(0, day_number - 6))

    if day_number > 6:
        if temp_interval is not None:
            try:
                width = float(temp_interval[1]) - float(temp_interval[0])
                if width < 2:    base += 10
                elif width < 5:  base += 5
                elif width > 10: base -= 10
            except Exception:
                pass

        if seasonal_norm is not None and prediction is not None:
            deviation = abs(prediction - seasonal_norm)
            if deviation < 10:   base += 15
            elif deviation < 20: base += 5
            elif deviation > 40: base -= 15

    return max(0, min(100, int(round(base))))


def _conf_label(score: int) -> str:
    if score >= 90: return "High"
    if score >= 70: return "Good"
    if score >= 50: return "Medium"
    if score >= 30: return "Low"
    return "Indicative"


def _zone(day_number: int) -> str:
    if day_number <= 6:  return "accurate"
    if day_number <= 14: return "predicted"
    return "estimated"


# ════════════════════════════════════════════════════════════════════════════
# STEP 5 — RISK SCORES
# ════════════════════════════════════════════════════════════════════════════

def _risks(
    rainfall:   float,
    temp_max:   float,
    wind:       float,
    soil:       Optional[float],
    dry_streak: int
) -> dict:
    if rainfall > 80:   flood = "high"
    elif rainfall > 50: flood = "medium"
    else:               flood = "low"

    if dry_streak >= 5:   drought = "high"
    elif dry_streak >= 4: drought = "medium"
    else:                 drought = "low"

    score = 100
    if rainfall > 40:   score -= 50
    elif rainfall > 20: score -= 25
    if temp_max > 36:   score -= 30
    if wind > 40:       score -= 20
    if soil and soil > 0.42: score -= 20
    score = max(0, score)

    return {
        "flood_risk":    flood,
        "drought_risk":  drought,
        "farming_score": score
    }


def _dry_streak(all_rain: list, up_to: int) -> int:
    streak = 0
    for i in range(up_to - 1, -1, -1):
        r = all_rain[i] if i < len(all_rain) else 0
        if r is not None and r < 2:
            streak += 1
        else:
            break
    return streak


def _seasonal_norm(
    hist_values: list,
    hist_dates:  list,
    month:       int
) -> Optional[float]:
    try:
        vals = [
            v for v, d in zip(hist_values, hist_dates)
            if v is not None
            and datetime.fromisoformat(d).month == month
        ]
        return round(sum(vals) / len(vals), 1) if vals else None
    except Exception:
        return None


# ════════════════════════════════════════════════════════════════════════════
# MAIN FUNCTION
# ════════════════════════════════════════════════════════════════════════════

async def get_weather(lat: float, lng: float) -> dict:
    today = datetime.now().date()
    rk    = _rkey(lat, lng)

    # ── Crisis override (injected by debug router) ──────────────────
    if rk in _crisis_weather_cache:
        return _crisis_weather_cache[rk]

    # ── Fetch data ──────────────────────────────────────────────────
    fore_raw = await _fetch_forecast(lat, lng)
    hist_raw = await _fetch_historical(lat, lng)

    fore       = fore_raw.get("daily", {})
    hist       = hist_raw.get("daily", {})
    hist_dates = hist.get("time", [])

    # ── Train ARIMA per variable ────────────────────────────────────
    variables = [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "relative_humidity_2m_max",
        "wind_speed_10m_max"
    ]

    preds    = {}
    ci_lists = {}

    for var in variables:
        h_vals = _clean(hist.get(var, []))
        a_vals = fore.get(var, [])
        p, ci  = _train_and_predict(h_vals, a_vals, var, rk, n_periods=24)
        preds[var]    = p
        ci_lists[var] = ci

    # ── Soil moisture — try API first, fallback to estimation ───────
    forecast_dates = fore.get("time", [])
    hourly_data    = fore_raw.get("hourly", {})

    raw_soil    = _hourly_to_daily_soil(hourly_data, forecast_dates)
    soil_is_est = all(v is None for v in raw_soil)

    if soil_is_est:
        print("Soil API all None — estimating from rainfall")
        daily_soil = _estimate_soil_from_rainfall(
            fore.get("precipitation_sum", [])
        )
    else:
        daily_soil = raw_soil

    # ── Build 30-day array ──────────────────────────────────────────
    weather_array = []
    all_rainfall  = []

    # ── Days 1-6: real forecast ─────────────────────────────────────
    for i in range(6):
        if i >= len(forecast_dates):
            break

        temp_max  = _safe(fore.get("temperature_2m_max",            []), i)
        temp_min  = _safe(fore.get("temperature_2m_min",            []), i)
        rainfall  = _safe(fore.get("precipitation_sum",             []), i, 0)
        rain_prob = _safe(fore.get("precipitation_probability_max", []), i)
        hum_max   = _safe(fore.get("relative_humidity_2m_max",      []), i)
        hum_min   = _safe(fore.get("relative_humidity_2m_min",      []), i)
        wind      = _safe(fore.get("wind_speed_10m_max",            []), i, 0)
        wcode     = _safe(fore.get("weathercode",                   []), i, 0)
        soil      = _safe(daily_soil,                                    i)

        humidity  = round((hum_max + hum_min) / 2, 1) \
                    if hum_max and hum_min else None

        all_rainfall.append(rainfall or 0)
        streak = _dry_streak(all_rainfall, len(all_rainfall))

        conf = weather_confidence(day_number=(i + 1))
        risk  = _risks(
            rainfall or 0,
            temp_max or 0,
            wind or 0,
            soil,
            streak
        )
        winfo = WEATHER_CODES.get(
            int(wcode or 0),
            {"label": "Unknown", "icon": "❓"}
        )

        weather_array.append({
            "date":               (today + timedelta(days=i)).isoformat(),
            "day_number":         i + 1,
            "zone":               "accurate",
            "confidence":         conf["score"],
            "confidence_label":   conf["label"],
            "confidence_color":   conf["color"],
            "temp_max":           temp_max,
            "temp_min":           temp_min,
            "rainfall_mm":        rainfall,
            "rain_probability":   rain_prob,
            "humidity":           humidity,
            "wind_kmh":           wind,
            "soil_moisture":      soil,
            "soil_moisture_note": "est. from rainfall" if soil_is_est else None,
            "weather_code":       wcode,
            "weather_label":      winfo["label"],
            "weather_icon":       winfo["icon"],
            "arima_interval":     None,
            **risk
        })

    # ── Carry forward soil estimate for days 7-30 ───────────────────
    real_soils = [
        d["soil_moisture"] for d in weather_array
        if d["soil_moisture"] is not None
    ]
    avg_soil = round(sum(real_soils) / len(real_soils), 3) \
               if real_soils else None

    # ── Days 7-30: ARIMA predictions ────────────────────────────────
    for i in range(6, 30):
        idx     = i - 6
        day_num = i + 1
        date    = today + timedelta(days=i)

        temp_max = _safe(preds.get("temperature_2m_max",      []), idx)
        temp_min = _safe(preds.get("temperature_2m_min",      []), idx)
        rainfall = _safe(preds.get("precipitation_sum",       []), idx, 0)
        humidity = _safe(preds.get("relative_humidity_2m_max",[]), idx)
        wind     = _safe(preds.get("wind_speed_10m_max",      []), idx, 0)

        if rainfall is not None: rainfall = round(max(0.0, rainfall), 1)
        if humidity is not None: humidity = round(min(100.0, max(0.0, humidity)), 1)
        if temp_max is not None: temp_max = round(temp_max, 1)
        if temp_min is not None: temp_min = round(temp_min, 1)
        if wind     is not None: wind     = round(max(0.0, wind), 1)

        all_rainfall.append(rainfall or 0)
        streak = _dry_streak(all_rainfall, len(all_rainfall))

        temp_ci = None
        ci_raw  = ci_lists.get("temperature_2m_max")
        if ci_raw and idx < len(ci_raw):
            try:
                ci_row  = ci_raw[idx]
                temp_ci = [float(ci_row[0]), float(ci_row[1])]
            except Exception:
                pass

        norm  = _seasonal_norm(
            hist.get("temperature_2m_max", []),
            hist_dates,
            date.month
        )

        consistent = check_consistency(
            rainfall=rainfall,
            humidity=humidity,
            temp_max=temp_max
        )

        conf = weather_confidence(
            day_number=day_num,
            arima_upper=temp_ci[1] if temp_ci else None,
            arima_lower=temp_ci[0] if temp_ci else None,
            prediction=temp_max,
            seasonal_norm=norm,
            variables_consistent=consistent
        )
        risk  = _risks(
            rainfall or 0,
            temp_max or 0,
            wind or 0,
            avg_soil,
            streak
        )

        arima_interval = None
        if temp_ci:
            arima_interval = {
                "lower": round(temp_ci[0], 1),
                "upper": round(temp_ci[1], 1)
            }

        weather_array.append({
            "date":               date.isoformat(),
            "day_number":         day_num,
            "zone":               _zone(day_num),
            "confidence":         conf["score"],
            "confidence_label":   conf["label"],
            "confidence_color":   conf["color"],
            "temp_max":           temp_max,
            "temp_min":           temp_min,
            "rainfall_mm":        rainfall,
            "rain_probability":   None,
            "humidity":           humidity,
            "wind_kmh":           wind,
            "soil_moisture":      avg_soil,
            "soil_moisture_note": "6-day avg" if avg_soil else None,
            "weather_code":       None,
            "weather_label":      "Predicted",
            "weather_icon":       "🔮",
            "arima_interval":     arima_interval,
            **risk
        })

    # ── Weekly summaries ────────────────────────────────────────────
    weekly   = []
    priority = {"high": 3, "medium": 2, "low": 1}

    for w in range(4):
        chunk = weather_array[w*7 : w*7+7]
        if not chunk:
            continue

        temps  = _clean([d["temp_max"]    for d in chunk])
        rains  = _clean([d["rainfall_mm"] for d in chunk])
        floods = [d["flood_risk"] for d in chunk]

        weekly.append({
            "week":              w + 1,
            "avg_temp":          round(sum(temps)/len(temps), 1) if temps else None,
            "total_rainfall":    round(sum(rains), 1),
            "rainy_days":        len([r for r in rains if r > 5]),
            "flood_risk":        max(floods, key=lambda x: priority.get(x, 0)),
            "best_farming_days": [
                d["day_number"] for d in chunk
                if d["farming_score"] > 75
            ]
        })

    return {
        "weather_array":    weather_array,
        "weekly_summaries": weekly,
        "location":         {"lat": lat, "lng": lng},
        "generated_at":     datetime.now().isoformat()
    }