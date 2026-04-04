from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from app.routers import (
    auth, profile, weather, recommend,
    guide, planting, fertilize, planting_logs, pesticide, harvest, crisis, calendar, debug, chat
)

app = FastAPI(
    title="GroWise API",
    description="Smart Agricultural Advisory System for Sarawak",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(weather.router)
app.include_router(recommend.router)
app.include_router(guide.router)
app.include_router(planting.router)
app.include_router(fertilize.router)
app.include_router(planting_logs.router)
app.include_router(pesticide.router)
app.include_router(harvest.router)
app.include_router(crisis.router)
app.include_router(calendar.router)
app.include_router(debug.router)
app.include_router(chat.router)

from app.routers import map as map_router
app.include_router(map_router.router)

# Serve React frontend from frontend/dist (relative to the backend/ folder)
_FRONTEND = Path(__file__).parent.parent.parent / "frontend" / "dist"
_FALLBACK  = _FRONTEND / "index.html"

if _FRONTEND.exists():
    app.mount("/assets", StaticFiles(directory=str(_FRONTEND / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        candidate = _FRONTEND / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_FALLBACK))
else:
    # Fall back to old static folder if frontend not built yet
    app.mount("/", StaticFiles(directory="static", html=True), name="static")