"""
Log routes — food, workout, weight, sleep.
Each endpoint triggers the appropriate agent pipeline.
"""
from fastapi import APIRouter
from models.schemas import FoodLogRequest, WorkoutLogRequest, WeightLogRequest, SleepLogRequest
from tools.mongodb_tools import insert_health_log, award_xp, update_streak, log_agent_decision, get_recent_logs
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/food")
async def log_food(request: FoodLogRequest):
    """Log food → NutritionAgent analyzes → plan updated if needed."""
    from agents.runner import run_agent
    from agents.nutrition_agent import nutrition_agent

    # Save raw log first
    log_id = await insert_health_log({
        "user_id": request.user_id,
        "type": "food",
        "data": {
            "name": request.name,
            "calories": request.calories,
            "protein_g": request.protein_g,
            "carbs_g": request.carbs_g,
            "fat_g": request.fat_g,
            "meal_type": request.meal_type,
        },
    })

    # Run NutritionAgent
    agent_prompt = f"""
A food entry was logged. Analyze it and update the user's plan if needed.

user_id: {request.user_id}
Food: {request.name}
Calories: {request.calories} kcal | Protein: {request.protein_g}g | Carbs: {request.carbs_g}g | Fat: {request.fat_g}g
Meal: {request.meal_type}

Steps:
1. Call get_active_plan(user_id="{request.user_id}", plan_type="nutrition")
2. Call get_daily_nutrition_totals(user_id="{request.user_id}", date_str="{__import__('datetime').date.today().isoformat()}")
3. Assess if on track. If daily calories > plan target + 400: call create_plan with adjusted targets
4. Call log_agent_decision with your analysis
5. Call award_xp(user_id="{request.user_id}", xp_amount=10, reason="Food logged")
6. Call update_streak(user_id="{request.user_id}")
"""

    result = await run_agent(nutrition_agent, user_id=request.user_id, message=agent_prompt)
    logger.info(f"Food logged for {request.user_id} | tools={result['tools_used']}")

    return {
        "log_id": log_id,
        "agent_name": "NutritionAgent",
        "agent_response": result["response"],
        "tools_used": result["tools_used"],
    }


@router.post("/workout")
async def log_workout(request: WorkoutLogRequest):
    """Log workout → WorkoutAgent analyzes → plan adapted if needed."""
    from agents.runner import run_agent
    from agents.workout_agent import workout_agent

    log_id = await insert_health_log({
        "user_id": request.user_id,
        "type": "workout",
        "data": {
            "workout_type": request.workout_type,
            "duration_min": request.duration_min,
            "calories_burned": request.calories_burned,
            "notes": request.notes,
        },
    })

    agent_prompt = f"""
A workout was logged. Analyze it and update plan if needed.

user_id: {request.user_id}
Type: {request.workout_type} | Duration: {request.duration_min} min | Calories burned: {request.calories_burned or 'not recorded'}

Steps:
1. Call get_active_plan(user_id="{request.user_id}", plan_type="workout")
2. Call get_recent_logs(user_id="{request.user_id}", log_type="workout", limit=5) to check consistency
3. If user has missed 2+ workouts this week: update plan to easier intensity using create_plan
4. Call log_agent_decision with your analysis
5. Call award_xp(user_id="{request.user_id}", xp_amount=20, reason="Workout logged")
6. Call update_streak(user_id="{request.user_id}")
"""

    result = await run_agent(workout_agent, user_id=request.user_id, message=agent_prompt)
    logger.info(f"Workout logged for {request.user_id} | tools={result['tools_used']}")

    return {
        "log_id": log_id,
        "agent_name": "WorkoutAgent",
        "agent_response": result["response"],
        "tools_used": result["tools_used"],
    }


@router.post("/weight")
async def log_weight(request: WeightLogRequest):
    """Log weight → ProgressAnalysisAgent analyzes trend → forecast updated."""
    log_id = await insert_health_log({
        "user_id": request.user_id,
        "type": "weight",
        "data": {"value_kg": request.weight_kg, "notes": request.notes},
    })

    # Analyze trend
    recent = await get_recent_logs(request.user_id, "weight", limit=7)
    weights = [r["data"]["value_kg"] for r in recent if "data" in r and "value_kg" in r["data"]]

    trend_msg = ""
    weekly_rate = 0.0
    if len(weights) >= 2:
        total_change = weights[-1] - weights[0]
        weekly_rate = round(total_change / max(len(weights) - 1, 1) * 7, 2)
        direction = "↓" if total_change < 0 else "↑"
        trend_msg = f" Trend: {direction}{abs(total_change):.1f}kg over {len(weights)} entries (~{abs(weekly_rate):.2f}kg/week)."

    await log_agent_decision({
        "user_id": request.user_id,
        "agent_name": "ProgressAnalysisAgent",
        "trigger": "weight_log",
        "input_context": {"weight_kg": request.weight_kg, "history_count": len(weights)},
        "decision": f"Weight {request.weight_kg}kg logged.{trend_msg}",
        "actions_taken": ["insert_health_log", "analyze_trend", "log_agent_decision"],
    })

    xp_result = await award_xp(request.user_id, 15, "Weight logged")
    streak = await update_streak(request.user_id)

    return {
        "log_id": log_id,
        "agent_name": "ProgressAnalysisAgent",
        "agent_response": f"Weight {request.weight_kg}kg logged!{trend_msg} +15 XP awarded.",
        "weekly_rate_kg": weekly_rate,
        "streak": streak,
        "xp": xp_result,
        "tools_used": ["insert_health_log", "log_agent_decision", "award_xp", "update_streak"],
    }


@router.post("/sleep")
async def log_sleep(request: SleepLogRequest):
    """Log sleep → RecoveryAgent analyzes → workout intensity adjusted if needed."""
    from agents.runner import run_agent
    from agents.recovery_agent import recovery_agent

    log_id = await insert_health_log({
        "user_id": request.user_id,
        "type": "sleep",
        "data": {
            "hours": request.hours,
            "quality_score": request.quality_score,
            "notes": request.notes or "",
        },
    })

    agent_prompt = (
        f"Analyze sleep log for user_id={request.user_id}. "
        f"Sleep: {request.hours} hours, quality: {request.quality_score}/10. "
        f"Check recent sleep history, assess recovery, adjust workout plan if needed. "
        f"Award 10 XP for logging sleep."
    )
    result = await run_agent(recovery_agent, user_id=request.user_id, message=agent_prompt)
    logger.info(f"Sleep logged for {request.user_id} | tools={result['tools_used']}")

    return {
        "log_id": log_id,
        "agent_name": "RecoveryAgent",
        "agent_response": result["response"],
        "tools_used": result["tools_used"],
    }


@router.get("/food/today")
async def get_todays_food(user_id: str):
    """Return today's food logs for the nutrition day-view."""
    from tools.mongodb_tools import get_db, _serialize
    from datetime import date
    db = get_db()
    today = date.today().isoformat()
    cursor = db.health_logs.find({
        "user_id": user_id,
        "type": "food",
        "logged_at": {"$regex": f"^{today}"}
    }).sort("logged_at", 1)
    docs = await cursor.to_list(length=20)
    return {"logs": [_serialize(d) for d in docs]}


@router.get("/sleep/recent")
async def get_recent_sleep(user_id: str):
    """Return last 7 sleep logs."""
    from tools.mongodb_tools import get_recent_logs
    logs = await get_recent_logs(user_id, "sleep", limit=7)
    return {"logs": logs}


@router.get("/workout/recent")
async def get_recent_workouts(user_id: str):
    """Return last 7 workout logs."""
    from tools.mongodb_tools import get_recent_logs
    logs = await get_recent_logs(user_id, "workout", limit=7)
    return {"logs": logs}
