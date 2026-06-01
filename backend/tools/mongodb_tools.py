"""
MongoDB tool functions — called by agents via MongoDB MCP server.
Each function here maps to a tool that agents can invoke.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

_client: Optional[AsyncIOMotorClient] = None


def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client[settings.mongodb_db_name]


# ── USER TOOLS ──────────────────────────────────────────────────────────────

async def get_user(user_id: str) -> Optional[Dict]:
    """Get full user profile including goals and preferences."""
    db = get_db()
    return await db.users.find_one({"_id": user_id}, {"_id": 0})


async def create_user(user_data: Dict) -> str:
    """Create a new user. Returns user_id."""
    db = get_db()
    user_data["created_at"] = datetime.utcnow()
    result = await db.users.insert_one(user_data)
    return str(result.inserted_id)


async def update_user(user_id: str, update_data: Dict) -> bool:
    """Update user profile fields."""
    db = get_db()
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    return result.modified_count > 0


# ── LOG TOOLS ────────────────────────────────────────────────────────────────

async def insert_health_log(log_data: Dict) -> str:
    """Insert any health log entry (food, workout, weight, sleep)."""
    db = get_db()
    log_data["timestamp"] = datetime.utcnow()
    log_data["agent_processed"] = False
    result = await db.health_logs.insert_one(log_data)
    return str(result.inserted_id)


async def get_recent_logs(user_id: str, log_type: str, limit: int = 7) -> List[Dict]:
    """Get recent logs of a specific type for a user."""
    db = get_db()
    cursor = db.health_logs.find(
        {"user_id": user_id, "type": log_type},
        sort=[("timestamp", -1)],
        limit=limit
    )
    return await cursor.to_list(length=limit)


async def get_daily_nutrition_totals(user_id: str, date_str: str) -> Dict:
    """Aggregate calories and macros for a user on a given date."""
    db = get_db()
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "type": "food",
                "timestamp": {
                    "$gte": date_obj,
                    "$lt": date_obj.replace(hour=23, minute=59, second=59)
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "total_calories": {"$sum": "$data.calories"},
                "total_protein": {"$sum": "$data.protein_g"},
                "total_carbs": {"$sum": "$data.carbs_g"},
                "total_fat": {"$sum": "$data.fat_g"},
                "entry_count": {"$sum": 1}
            }
        }
    ]
    results = await db.health_logs.aggregate(pipeline).to_list(1)
    return results[0] if results else {
        "total_calories": 0, "total_protein": 0,
        "total_carbs": 0, "total_fat": 0, "entry_count": 0
    }


# ── PLAN TOOLS ───────────────────────────────────────────────────────────────

async def get_active_plan(user_id: str, plan_type: str) -> Optional[Dict]:
    """Get the current active plan of a given type."""
    db = get_db()
    return await db.plans.find_one(
        {"user_id": user_id, "type": plan_type, "is_active": True},
        {"_id": 0}
    )


async def create_plan(plan_data: Dict) -> str:
    """Create a new plan. Deactivates previous plans of same type."""
    db = get_db()
    await db.plans.update_many(
        {"user_id": plan_data["user_id"], "type": plan_data["type"]},
        {"$set": {"is_active": False}}
    )
    plan_data["created_at"] = datetime.utcnow()
    plan_data["is_active"] = True
    result = await db.plans.insert_one(plan_data)
    return str(result.inserted_id)


# ── AGENT DECISION TOOLS ──────────────────────────────────────────────────────

async def log_agent_decision(decision_data: Dict) -> str:
    """Record an agent decision for audit trail and UI display."""
    db = get_db()
    decision_data["timestamp"] = datetime.utcnow()
    result = await db.agent_decisions.insert_one(decision_data)
    return str(result.inserted_id)


async def get_recent_agent_decisions(user_id: str, limit: int = 5) -> List[Dict]:
    """Get recent agent decisions for display in Agent Activity Panel."""
    db = get_db()
    cursor = db.agent_decisions.find(
        {"user_id": user_id},
        sort=[("timestamp", -1)],
        limit=limit
    )
    return await cursor.to_list(length=limit)


# ── GAMIFICATION TOOLS ────────────────────────────────────────────────────────

async def get_gamification_state(user_id: str) -> Optional[Dict]:
    """Get user's XP, level, streak, achievements."""
    db = get_db()
    return await db.gamification.find_one({"user_id": user_id}, {"_id": 0})


async def award_xp(user_id: str, xp_amount: int, reason: str) -> Dict:
    """Award XP and update level. Returns new total XP and level."""
    db = get_db()
    result = await db.gamification.find_one_and_update(
        {"user_id": user_id},
        {
            "$inc": {"xp_total": xp_amount, "weekly_xp": xp_amount},
            "$set": {"last_updated": datetime.utcnow()}
        },
        upsert=True,
        return_document=True
    )
    new_xp = result.get("xp_total", xp_amount)
    new_level = max(1, new_xp // 250)
    await db.gamification.update_one(
        {"user_id": user_id},
        {"$set": {"level": new_level}}
    )
    return {"xp_total": new_xp, "level": new_level, "xp_awarded": xp_amount, "reason": reason}


async def update_streak(user_id: str) -> Dict:
    """Check and update daily streak. Returns streak count."""
    db = get_db()
    today = datetime.utcnow().date().isoformat()
    state = await db.gamification.find_one({"user_id": user_id})

    if not state:
        await db.gamification.insert_one({
            "user_id": user_id,
            "xp_total": 0,
            "level": 1,
            "current_streak_days": 1,
            "longest_streak_days": 1,
            "last_active_date": today,
            "achievements": [],
            "weekly_xp": 0
        })
        return {"current_streak_days": 1, "is_new_day": True}

    last_active = state.get("last_active_date")
    if last_active == today:
        return {"current_streak_days": state.get("current_streak_days", 1), "is_new_day": False}

    new_streak = state.get("current_streak_days", 0) + 1
    longest = max(new_streak, state.get("longest_streak_days", 0))
    await db.gamification.update_one(
        {"user_id": user_id},
        {"$set": {
            "current_streak_days": new_streak,
            "longest_streak_days": longest,
            "last_active_date": today
        }}
    )
    return {"current_streak_days": new_streak, "is_new_day": True}


# ── FORECAST TOOLS ────────────────────────────────────────────────────────────

async def save_forecast(forecast_data: Dict) -> str:
    """Save a new forecast, replacing the previous one."""
    db = get_db()
    forecast_data["generated_at"] = datetime.utcnow()
    await db.forecasts.delete_many({"user_id": forecast_data["user_id"]})
    result = await db.forecasts.insert_one(forecast_data)
    return str(result.inserted_id)


async def get_latest_forecast(user_id: str) -> Optional[Dict]:
    """Get the most recent forecast for a user."""
    db = get_db()
    return await db.forecasts.find_one(
        {"user_id": user_id},
        sort=[("generated_at", -1)],
        projection={"_id": 0}
    )
