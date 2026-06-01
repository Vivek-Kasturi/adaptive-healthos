"""
Demo runner — executes a full scripted scenario for the hackathon video.
One endpoint triggers the entire multi-agent pipeline with realistic data.
Record your screen, hit this endpoint, watch the agents work.
"""
from fastapi import APIRouter
import asyncio
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/run")
async def run_demo(user_id: str = "demo_user"):
    """
    Full demo scenario — fires all 6 agents in sequence with realistic data.
    Designed for the 3-minute hackathon video recording.

    Sequence:
    1. Onboard a demo user (NutritionAgent + WorkoutAgent)
    2. Log 3 days of meals (NutritionAgent adapts plan)
    3. Log 2 workouts (WorkoutAgent tracks consistency)
    4. Log weight 3x (ProgressAnalysisAgent + ForecastingAgent)
    5. Log poor sleep (RecoveryAgent reduces intensity)
    6. Chat: "How am I doing?" (OrchestratorAgent → ProgressAnalysisAgent)
    7. AccountabilityAgent check-in
    """
    from tools.mongodb_tools import (
        create_user, insert_health_log, award_xp, update_streak,
        get_recent_logs, log_agent_decision,
    )
    from agents.runner import run_agent, run_orchestrator_pipeline
    from agents.nutrition_agent import nutrition_agent
    from agents.workout_agent import workout_agent
    from agents.recovery_agent import recovery_agent
    from agents.progress_agent import progress_agent
    from agents.accountability_agent import accountability_agent

    steps = []

    # ── Step 1: Create demo user ────────────────────────────────────────────
    user_data = {
        "name": "Alex (Demo)",
        "email": f"{user_id}@demo.healthos",
        "profile": {
            "age": 28, "sex": "male", "weight_kg": 82,
            "height_cm": 180, "activity_level": "moderate"
        },
        "goals": {
            "type": "weight_loss", "target_weight_kg": 75,
            "weekly_workout_days": 4
        },
    }
    actual_user_id = await create_user(user_data)
    steps.append({"step": 1, "action": "User created", "user_id": actual_user_id})
    logger.info(f"Demo: user created {actual_user_id}")

    # ── Step 2: Generate initial plans (NutritionAgent + WorkoutAgent) ──────
    nutrition_result = await run_agent(
        nutrition_agent,
        user_id=actual_user_id,
        message=(
            f"Generate initial nutrition plan for user_id={actual_user_id}. "
            f"Goal: weight_loss. Daily calories: 2200. "
            f"Call create_plan with daily_calories=2200, protein_g=165, carbs_g=220, fat_g=73. "
            f"Then call log_agent_decision."
        )
    )
    steps.append({
        "step": 2, "action": "NutritionAgent: initial plan",
        "tools": nutrition_result["tools_used"]
    })

    workout_result = await run_agent(
        workout_agent,
        user_id=actual_user_id,
        message=(
            f"Generate initial workout plan for user_id={actual_user_id}. "
            f"4 days/week. Goal: weight_loss. "
            f"Call create_plan with a weekly_schedule for Mon/Tue/Thu/Fri. "
            f"Then call log_agent_decision."
        )
    )
    steps.append({
        "step": 3, "action": "WorkoutAgent: initial plan",
        "tools": workout_result["tools_used"]
    })
    await award_xp(actual_user_id, 100, "Welcome XP")

    # ── Step 3: Log 3 meals ─────────────────────────────────────────────────
    meals = [
        {"name": "Oatmeal + eggs", "calories": 520, "protein_g": 28, "carbs_g": 58, "fat_g": 14, "meal_type": "breakfast"},
        {"name": "Chicken rice bowl", "calories": 680, "protein_g": 45, "carbs_g": 72, "fat_g": 16, "meal_type": "lunch"},
        {"name": "Salmon + quinoa", "calories": 590, "protein_g": 42, "carbs_g": 48, "fat_g": 18, "meal_type": "dinner"},
    ]
    for meal in meals:
        await insert_health_log({"user_id": actual_user_id, "type": "food", "data": meal})
    await award_xp(actual_user_id, 30, "Meals logged")
    steps.append({"step": 4, "action": "3 meals logged", "total_calories": 1790})

    # ── Step 4: Log 2 workouts ───────────────────────────────────────────────
    workouts = [
        {"workout_type": "Strength - Push Day", "duration_min": 48, "calories_burned": 320},
        {"workout_type": "Cardio - 5km Run", "duration_min": 32, "calories_burned": 285},
    ]
    for w in workouts:
        await insert_health_log({"user_id": actual_user_id, "type": "workout", "data": w})
    await award_xp(actual_user_id, 40, "Workouts logged")
    steps.append({"step": 5, "action": "2 workouts logged"})

    # ── Step 5: Log 3 weight entries ─────────────────────────────────────────
    for weight in [82.0, 81.4, 81.1]:
        await insert_health_log({
            "user_id": actual_user_id,
            "type": "weight",
            "data": {"value_kg": weight}
        })
    await award_xp(actual_user_id, 45, "Weight tracked")
    steps.append({"step": 6, "action": "Weight trend: 82.0 → 81.1kg (-0.9kg)"})

    # ── Step 6: ProgressAnalysisAgent ───────────────────────────────────────
    progress_result = await run_agent(
        progress_agent,
        user_id=actual_user_id,
        message=f"Analyze progress for user_id={actual_user_id}. Generate forecast toward 75kg goal."
    )
    steps.append({
        "step": 7, "action": "ProgressAnalysisAgent: forecast generated",
        "insight": progress_result["response"][:150],
        "tools": progress_result["tools_used"]
    })

    # ── Step 7: Log poor sleep → RecoveryAgent adapts ───────────────────────
    await insert_health_log({
        "user_id": actual_user_id,
        "type": "sleep",
        "data": {"hours": 5.0, "quality_score": 3, "notes": "Stressed, couldn't sleep"}
    })
    recovery_result = await run_agent(
        recovery_agent,
        user_id=actual_user_id,
        message=(
            f"user_id={actual_user_id} logged only 5 hours of sleep, quality 3/10. "
            f"Assess recovery. Reduce tomorrow's workout intensity. Award 10 XP."
        )
    )
    steps.append({
        "step": 8, "action": "RecoveryAgent: poor sleep detected, plan adjusted",
        "tools": recovery_result["tools_used"]
    })

    # ── Step 8: Chat "How am I doing?" ───────────────────────────────────────
    chat_result = await run_orchestrator_pipeline(
        user_id=actual_user_id,
        message="How am I doing with my weight loss goal? Give me a progress update."
    )
    steps.append({
        "step": 9, "action": f"Chat: OrchestratorAgent → {chat_result['agent_name']}",
        "response": chat_result["final_response"][:200],
    })

    # ── Step 9: AccountabilityAgent check-in ─────────────────────────────────
    acct_result = await run_agent(
        accountability_agent,
        user_id=actual_user_id,
        message=f"Perform accountability check-in for user_id={actual_user_id}."
    )
    steps.append({
        "step": 10, "action": "AccountabilityAgent: proactive check-in",
        "message": acct_result["response"][:200],
        "tools": acct_result["tools_used"]
    })

    return {
        "demo_user_id": actual_user_id,
        "status": "Demo complete — all 6 agents executed",
        "agents_fired": [
            "NutritionAgent", "WorkoutAgent", "ProgressAnalysisAgent",
            "RecoveryAgent", "OrchestratorAgent", "AccountabilityAgent"
        ],
        "steps": steps,
        "message": (
            f"Demo user '{actual_user_id}' created with full health history. "
            f"Open the frontend and use this user_id to see the populated dashboard."
        )
    }


@router.get("/status/{user_id}")
async def demo_status(user_id: str):
    """Quick summary of a demo user's state — for verifying demo ran correctly."""
    from tools.mongodb_tools import (
        get_gamification_state, get_recent_logs, get_active_plan, get_latest_forecast
    )
    gamification = await get_gamification_state(user_id)
    weights = await get_recent_logs(user_id, "weight", limit=5)
    workouts = await get_recent_logs(user_id, "workout", limit=5)
    nutrition_plan = await get_active_plan(user_id, "nutrition")
    workout_plan = await get_active_plan(user_id, "workout")
    forecast = await get_latest_forecast(user_id)

    return {
        "user_id": user_id,
        "gamification": gamification,
        "weight_entries": len(weights),
        "workout_entries": len(workouts),
        "has_nutrition_plan": nutrition_plan is not None,
        "has_workout_plan": workout_plan is not None,
        "has_forecast": forecast is not None,
    }
