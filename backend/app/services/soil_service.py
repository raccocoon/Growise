import httpx

async def get_soil_type(lat: float, lng: float) -> str:
    try:
        url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
        params = {
            "lon":      lng,
            "lat":      lat,
            "property": ["clay", "sand", "silt"],
            "depth":    "0-5cm",
            "value":    "mean"
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)

        if response.status_code != 200:
            return "Loam"

        data   = response.json()
        layers = data.get("properties", {}).get("layers", [])

        clay = sand = silt = 0

        for layer in layers:
            name  = layer.get("name", "")
            value = layer.get("depths", [{}])[0] \
                        .get("values", {}).get("mean", 0)

            if value:
                value = value / 10

            if name == "clay": clay = value
            if name == "sand": sand = value
            if name == "silt": silt = value

        return classify_soil(clay, sand, silt)

    except Exception:
        return "Loam"


def classify_soil(clay: float, sand: float, silt: float) -> str:
    if sand >= 70:   return "Sandy"
    elif clay >= 40: return "Clay"
    elif clay >= 25: return "Clay Loam"
    elif silt >= 50: return "Silt Loam"
    else:            return "Loam"