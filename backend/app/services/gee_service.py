import ee
import datetime

# Initialize Earth Engine
ee.Initialize(project='putrahack')


def analyze_polygon(coordinates: list, start_date: str = None, end_date: str = None) -> dict:
    """
    Analyze a polygon area using Google Earth Engine datasets.
    Returns evapotranspiration, elevation, wind speed, and rainfall stats + tile URLs.
    """
    if not start_date:
        end = datetime.date.today()
        start = end - datetime.timedelta(days=30)
        start_date = start.isoformat()
        end_date = end.isoformat()

    # Build the polygon geometry
    polygon = ee.Geometry.Polygon([coordinates])

    results = {}

    # 1. Evapotranspiration — MODIS MOD16A2 (8-day composite, kg/m²/8day)
    try:
        et_collection = (
            ee.ImageCollection('MODIS/061/MOD16A2GF')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .select('ET')
        )
        et_image = et_collection.mean().clip(polygon)
        et_stats = et_image.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon,
            scale=500,
            maxPixels=1e9
        ).getInfo()

        et_vis = {'min': 0, 'max': 150, 'palette': ['#f7fcb1', '#addd8e', '#31a354', '#006837']}
        et_map = et_image.getMapId(et_vis)

        results['evapotranspiration'] = {
            'stats': {
                'mean': round(et_stats.get('ET_mean', 0) or 0, 2),
                'min': round(et_stats.get('ET_min', 0) or 0, 2),
                'max': round(et_stats.get('ET_max', 0) or 0, 2),
                'unit': 'kg/m²/8day'
            },
            'tile_url': et_map['tile_fetcher'].url_format,
            'description': 'Water loss from soil and plant surfaces. Higher values indicate more active vegetation.'
        }
    except Exception as e:
        results['evapotranspiration'] = {'error': str(e)}

    # 2. Elevation — SRTM 30m DEM
    try:
        elevation = ee.Image('USGS/SRTMGL1_003').clip(polygon)
        elev_stats = elevation.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon,
            scale=30,
            maxPixels=1e9
        ).getInfo()

        slope = ee.Terrain.slope(elevation)
        slope_stats = slope.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=polygon,
            scale=30,
            maxPixels=1e9
        ).getInfo()

        elev_vis = {'min': 0, 'max': 500, 'palette': ['#2d5f2d', '#6db56d', '#f5deb3', '#d2691e', '#8b4513', '#ffffff']}
        elev_map = elevation.getMapId(elev_vis)

        results['elevation'] = {
            'stats': {
                'mean': round(elev_stats.get('elevation_mean', 0) or 0, 2),
                'min': round(elev_stats.get('elevation_min', 0) or 0, 2),
                'max': round(elev_stats.get('elevation_max', 0) or 0, 2),
                'slope_mean': round(slope_stats.get('slope', 0) or 0, 2),
                'unit': 'meters'
            },
            'tile_url': elev_map['tile_fetcher'].url_format,
            'description': 'Terrain elevation and slope. Low-lying areas are more flood-prone.'
        }
    except Exception as e:
        results['elevation'] = {'error': str(e)}

    # 3. Wind Speed — ERA5-Land Daily
    try:
        wind_u = (
            ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .select('u_component_of_wind_10m')
        )
        wind_v = (
            ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .select('v_component_of_wind_10m')
        )

        # Calculate wind speed magnitude: sqrt(u² + v²)
        def calc_wind_speed(img):
            u = img.select('u_component_of_wind_10m')
            v_img = wind_v.filterDate(
                img.date(), img.date().advance(1, 'day')
            ).first()
            if v_img is None:
                return img
            v = ee.Image(v_img).select('v_component_of_wind_10m')
            speed = u.pow(2).add(v.pow(2)).sqrt().rename('wind_speed')
            return speed

        # Simpler approach: combine u and v
        wind_combined = (
            ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .select(['u_component_of_wind_10m', 'v_component_of_wind_10m'])
        )

        def compute_speed(img):
            u = img.select('u_component_of_wind_10m')
            v = img.select('v_component_of_wind_10m')
            speed = u.pow(2).add(v.pow(2)).sqrt().rename('wind_speed')
            return speed

        wind_speed_col = wind_combined.map(compute_speed)
        wind_image = wind_speed_col.mean().clip(polygon)

        wind_stats = wind_image.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon,
            scale=11132,
            maxPixels=1e9
        ).getInfo()

        wind_vis = {'min': 0, 'max': 10, 'palette': ['#3288bd', '#66c2a5', '#abdda4', '#fee08b', '#f46d43', '#d53e4f']}
        wind_map = wind_image.getMapId(wind_vis)

        results['wind_speed'] = {
            'stats': {
                'mean': round(wind_stats.get('wind_speed_mean', 0) or 0, 2),
                'min': round(wind_stats.get('wind_speed_min', 0) or 0, 2),
                'max': round(wind_stats.get('wind_speed_max', 0) or 0, 2),
                'unit': 'm/s'
            },
            'tile_url': wind_map['tile_fetcher'].url_format,
            'description': 'Average wind speed at 10m height. High winds can damage crops and increase water loss.'
        }
    except Exception as e:
        results['wind_speed'] = {'error': str(e)}

    # 4. Rainfall — CHIRPS Daily
    try:
        precip = (
            ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .select('precipitation')
        )
        total_precip = precip.sum().clip(polygon)
        mean_precip = precip.mean().clip(polygon)

        precip_total_stats = total_precip.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon,
            scale=5566,
            maxPixels=1e9
        ).getInfo()

        precip_daily_stats = mean_precip.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=polygon,
            scale=5566,
            maxPixels=1e9
        ).getInfo()

        rain_vis = {'min': 0, 'max': 300, 'palette': ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494']}
        rain_map = total_precip.getMapId(rain_vis)

        results['rainfall'] = {
            'stats': {
                'total': round(precip_total_stats.get('precipitation_mean', 0) or 0, 2),
                'min': round(precip_total_stats.get('precipitation_min', 0) or 0, 2),
                'max': round(precip_total_stats.get('precipitation_max', 0) or 0, 2),
                'daily_avg': round(precip_daily_stats.get('precipitation_mean', 0) or 0, 2),
                'unit': 'mm'
            },
            'tile_url': rain_map['tile_fetcher'].url_format,
            'description': 'Total rainfall over the selected period. Critical for irrigation planning.'
        }
    except Exception as e:
        results['rainfall'] = {'error': str(e)}

    # 5. NDVI — Vegetation Health (Sentinel-2)
    try:
        s2 = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
        )
        ndvi = s2.map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI')).mean().clip(polygon)
        ndvi_stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon, scale=10, maxPixels=1e9
        ).getInfo()

        ndvi_vis = {'min': -0.2, 'max': 0.8, 'palette': ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850', '#006837']}
        ndvi_map = ndvi.getMapId(ndvi_vis)

        mean_val = ndvi_stats.get('NDVI_mean', 0) or 0
        if mean_val > 0.6:
            health = 'Excellent — Dense healthy vegetation'
        elif mean_val > 0.4:
            health = 'Good — Moderate vegetation cover'
        elif mean_val > 0.2:
            health = 'Fair — Sparse vegetation or early growth'
        else:
            health = 'Poor — Bare soil or stressed vegetation'

        results['ndvi'] = {
            'stats': {
                'mean': round(mean_val, 3),
                'min': round(ndvi_stats.get('NDVI_min', 0) or 0, 3),
                'max': round(ndvi_stats.get('NDVI_max', 0) or 0, 3),
                'health': health,
                'unit': 'index (-1 to 1)'
            },
            'tile_url': ndvi_map['tile_fetcher'].url_format,
            'description': 'Vegetation health index. Green = healthy crops, Red = bare soil or stressed plants.'
        }
    except Exception as e:
        results['ndvi'] = {'error': str(e)}

    # 6. Soil Moisture — ERA5-Land
    try:
        soil_moisture = (
            ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .select('volumetric_soil_water_layer_1')
        )
        sm_image = soil_moisture.mean().clip(polygon)
        sm_stats = sm_image.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon, scale=11132, maxPixels=1e9
        ).getInfo()

        sm_vis = {'min': 0.1, 'max': 0.5, 'palette': ['#fff7bc', '#fec44f', '#d95f0e', '#41b6c4', '#225ea8', '#0c2c84']}
        sm_map = sm_image.getMapId(sm_vis)

        sm_mean = sm_stats.get('volumetric_soil_water_layer_1_mean', 0) or 0
        if sm_mean > 0.4:
            moisture_status = 'Waterlogged — Risk of root rot'
        elif sm_mean > 0.3:
            moisture_status = 'Wet — Good for most crops'
        elif sm_mean > 0.2:
            moisture_status = 'Moderate — May need irrigation'
        else:
            moisture_status = 'Dry — Irrigation needed'

        results['soil_moisture'] = {
            'stats': {
                'mean': round(sm_mean, 3),
                'min': round(sm_stats.get('volumetric_soil_water_layer_1_min', 0) or 0, 3),
                'max': round(sm_stats.get('volumetric_soil_water_layer_1_max', 0) or 0, 3),
                'status': moisture_status,
                'unit': 'm³/m³'
            },
            'tile_url': sm_map['tile_fetcher'].url_format,
            'description': 'Soil water content in top layer. Blue = wet, Yellow = dry.'
        }
    except Exception as e:
        results['soil_moisture'] = {'error': str(e)}

    # 7. Land Surface Temperature — MODIS
    try:
        lst = (
            ee.ImageCollection('MODIS/061/MOD11A1')
            .filterDate(start_date, end_date)
            .filterBounds(polygon)
            .select('LST_Day_1km')
        )
        # Convert from Kelvin * 0.02 to Celsius
        lst_celsius = lst.map(lambda img: img.multiply(0.02).subtract(273.15).rename('LST_C'))
        lst_image = lst_celsius.mean().clip(polygon)
        lst_stats = lst_image.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon, scale=1000, maxPixels=1e9
        ).getInfo()

        lst_vis = {'min': 20, 'max': 45, 'palette': ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']}
        lst_map = lst_image.getMapId(lst_vis)

        results['land_surface_temp'] = {
            'stats': {
                'mean': round(lst_stats.get('LST_C_mean', 0) or 0, 1),
                'min': round(lst_stats.get('LST_C_min', 0) or 0, 1),
                'max': round(lst_stats.get('LST_C_max', 0) or 0, 1),
                'unit': '°C'
            },
            'tile_url': lst_map['tile_fetcher'].url_format,
            'description': 'Daytime land surface temperature. Hotspots may indicate stressed or bare areas.'
        }
    except Exception as e:
        results['land_surface_temp'] = {'error': str(e)}

    # 8. NDWI — Water/Flood Detection (Sentinel-2)
    try:
        ndwi = s2.map(lambda img: img.normalizedDifference(['B3', 'B8']).rename('NDWI')).mean().clip(polygon)
        ndwi_stats = ndwi.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=polygon, scale=10, maxPixels=1e9
        ).getInfo()

        ndwi_vis = {'min': -0.5, 'max': 0.5, 'palette': ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#66bd63', '#1a9850', '#0000ff']}
        ndwi_map = ndwi.getMapId(ndwi_vis)

        ndwi_mean = ndwi_stats.get('NDWI_mean', 0) or 0
        if ndwi_mean > 0.3:
            water_status = 'Standing water detected — Flood risk'
        elif ndwi_mean > 0.0:
            water_status = 'High moisture / Waterlogged areas'
        elif ndwi_mean > -0.2:
            water_status = 'Normal moisture levels'
        else:
            water_status = 'Dry conditions'

        results['ndwi'] = {
            'stats': {
                'mean': round(ndwi_mean, 3),
                'min': round(ndwi_stats.get('NDWI_min', 0) or 0, 3),
                'max': round(ndwi_stats.get('NDWI_max', 0) or 0, 3),
                'status': water_status,
                'unit': 'index (-1 to 1)'
            },
            'tile_url': ndwi_map['tile_fetcher'].url_format,
            'description': 'Water detection index. Blue = water/wet areas, Red = dry land. Helps spot flooding.'
        }
    except Exception as e:
        results['ndwi'] = {'error': str(e)}

    return results
