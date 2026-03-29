from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.gee_service import analyze_polygon

router = APIRouter(prefix="/api/land-analysis", tags=["Land Analysis"])


class PolygonRequest(BaseModel):
    coordinates: List[List[float]]  # [[lng, lat], [lng, lat], ...]
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@router.post("")
async def analyze_land(req: PolygonRequest):
    """
    Analyze farmland within a drawn polygon using Google Earth Engine.
    Returns evapotranspiration, elevation, wind speed, and rainfall data.
    """
    if len(req.coordinates) < 3:
        raise HTTPException(status_code=400, detail="Polygon must have at least 3 points")

    try:
        results = analyze_polygon(req.coordinates, req.start_date, req.end_date)
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GEE analysis failed: {str(e)}")
