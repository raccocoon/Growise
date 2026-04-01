import math

REGION_SOIL = {
    "Kuching":   "Clay Loam",
    "Miri":      "Loam",
    "Sibu":      "Peat Soil",
    "Bintulu":   "Sandy Loam",
    "Sri Aman":  "Clay",
    "Kapit":     "Loam",
    "Mukah":     "Peat Soil",
    "Lawas":     "Sandy Loam",
    "Sarikei":   "Clay Loam",
    "Serian":    "Clay Loam",
}

REGIONS = [
    {"name": "Kuching",  "lat": 1.5533, "lng": 110.3592},
    {"name": "Miri",     "lat": 4.3995, "lng": 113.9914},
    {"name": "Sibu",     "lat": 2.2885, "lng": 111.8295},
    {"name": "Bintulu",  "lat": 3.1667, "lng": 113.0333},
    {"name": "Sri Aman", "lat": 1.2333, "lng": 111.4667},
    {"name": "Kapit",    "lat": 2.0167, "lng": 112.9333},
    {"name": "Mukah",    "lat": 2.9000, "lng": 112.0833},
    {"name": "Lawas",    "lat": 4.8500, "lng": 115.4000},
    {"name": "Sarikei",  "lat": 2.1333, "lng": 111.5167},
]

def get_soil_type(lat: float, lng: float) -> str:
    nearest = min(
        REGIONS,
        key=lambda r: math.sqrt((lat - r["lat"])**2 + (lng - r["lng"])**2)
    )
    soil = REGION_SOIL.get(nearest["name"], "Loam")
    print(f"Soil lookup: {nearest['name']} → {soil}")
    return soil