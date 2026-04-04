from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import (
    auth, profile, weather, recommend,
    guide, planting, fertilize, planting_logs, pesticide, harvest, crisis, calendar, debug, chat, map
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
app.include_router(map.router)

app.mount("/", StaticFiles(directory="static", html=True), name="static")