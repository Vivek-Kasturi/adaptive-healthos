from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Adaptive HealthOS backend")
    logger.info(f"Project: {settings.google_cloud_project}")
    logger.info(f"Model: {settings.gemini_model}")

    # Test MongoDB connection on startup
    try:
        client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
        await client.admin.command("ping")
        logger.info("✓ MongoDB connection verified")
        app.state.mongo_client = client
        app.state.db = client[settings.mongodb_db_name]
    except Exception as e:
        logger.error(f"✗ MongoDB connection failed: {e}")
        raise

    yield

    # Shutdown
    app.state.mongo_client.close()
    logger.info("MongoDB connection closed")


app = FastAPI(
    title="Adaptive HealthOS API",
    description="Multi-agent personal health operating system",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check — verifies MongoDB is reachable."""
    try:
        db = app.state.db
        await db.command("ping")
        mongo_status = "connected"
    except Exception as e:
        mongo_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "service": "adaptive-healthos-api",
        "version": "1.0.0",
        "mongodb": mongo_status,
        "gemini_model": settings.gemini_model,
        "project": settings.google_cloud_project,
    }


@app.get("/")
async def root():
    return {"message": "Adaptive HealthOS API", "docs": "/docs"}


@app.get("/api/agent-decisions")
async def get_agent_decisions(user_id: str, limit: int = 10):
    """Recent agent decisions — polled by AgentActivityPanel (query param)."""
    from tools.mongodb_tools import get_recent_agent_decisions
    decisions = await get_recent_agent_decisions(user_id, limit=limit)
    return {"decisions": decisions}


@app.get("/api/agent-decisions/{user_id}")
async def get_agent_decisions_path(user_id: str, limit: int = 10):
    """Recent agent decisions — path param version."""
    from tools.mongodb_tools import get_recent_agent_decisions
    decisions = await get_recent_agent_decisions(user_id, limit=limit)
    return {"decisions": decisions}


@app.get("/api/progress/summary")
async def get_progress_summary(user_id: str):
    """Progress summary — weight trend + log counts."""
    from tools.mongodb_tools import get_recent_logs
    weights = await get_recent_logs(user_id, "weight", limit=14)
    workouts = await get_recent_logs(user_id, "workout", limit=30)
    food_logs = await get_recent_logs(user_id, "food", limit=30)
    weight_values = [r["data"]["value_kg"] for r in weights if "data" in r and "value_kg" in r["data"]]
    trend = 0.0
    if len(weight_values) >= 2:
        trend = round(weight_values[-1] - weight_values[0], 2)
    return {
        "weight_trend_kg": trend,
        "weight_entries": len(weight_values),
        "latest_weight": weight_values[-1] if weight_values else None,
        "workout_count_30d": len(workouts),
        "food_log_count_30d": len(food_logs),
    }


@app.get("/api/forecasts/latest")
async def get_latest_forecast(user_id: str):
    """Latest weight forecast — stub until ForecastingAgent is built Day 3."""
    from tools.mongodb_tools import get_latest_forecast
    forecast = await get_latest_forecast(user_id)
    return forecast or {
        "user_id": user_id,
        "scenarios": {
            "optimistic": [],
            "realistic": [],
            "pessimistic": [],
        },
        "message": "Log weight entries to generate a forecast.",
    }


# Routers
from routers import users, logs, chat, plans, gamification

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(gamification.router, prefix="/api/gamification", tags=["gamification"])
