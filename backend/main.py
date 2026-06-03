from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress noisy-but-harmless ADK / OpenTelemetry async-cleanup errors
logging.getLogger("opentelemetry.context").setLevel(logging.CRITICAL)
logging.getLogger("opentelemetry").setLevel(logging.ERROR)

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


# Routers
from routers import users, logs, chat, plans, gamification, progress, demo

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(gamification.router, prefix="/api/gamification", tags=["gamification"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(demo.router, prefix="/api/demo", tags=["demo"])


@app.get("/api/forecasts/latest")
async def get_latest_forecast(user_id: str):
    """Latest weight forecast — delegates to ForecastingAgent if no forecast exists."""
    from tools.mongodb_tools import get_latest_forecast as _get_forecast
    forecast = await _get_forecast(user_id)
    return forecast or {
        "user_id": user_id,
        "scenarios": {"optimistic": [], "realistic": [], "pessimistic": []},
        "message": "Log at least 3 weight entries to generate a forecast.",
    }
