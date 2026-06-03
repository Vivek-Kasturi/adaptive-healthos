"""
Demo runner — executes full scripted scenarios for the hackathon video.
POST /api/demo/seed-profiles — seeds all 3 demo profiles
POST /api/demo/run            — legacy single user demo
"""
from fastapi import APIRouter
import asyncio
import logging
from datetime import datetime, timedelta

router = APIRouter()
logger = logging.getLogger(__name__)


DEMO_PROFILES = [
    {
        "name": "Alex Chen",
        "email": "alex@demo.healthos",
        "tag": "Weight Loss",
        "profile": {"age": 28, "sex": "male",   "weight_kg": 82, "height_cm": 180, "activity_level": "moderate"},
        "goals":   {"type": "weight_loss",  "target_weight_kg": 72, "weekly_workout_days": 4},
        "weights": [82.0, 81.6, 81.2, 80.9, 80.6, 80.3, 80.1],
        "xp": 340, "level": 2, "streak": 7,
        "achievements": ["first_log", "week_streak"],
        "sleep_hrs": [7.5, 7.0, 6.5, 4.0, 7.5, 8.0, 7.0],
    },
    {
        "name": "Maya Patel",
        "email": "maya@demo.healthos",
        "tag": "Muscle Gain",
        "profile": {"age": 24, "sex": "female", "weight_kg": 58, "height_cm": 165, "activity_level": "very_active"},
        "goals":   {"type": "muscle_gain",  "target_weight_kg": 63, "weekly_workout_days": 5},
        "weights": [58.0, 58.2, 58.5, 58.7, 58.9, 59.1, 59.3],
        "xp": 580, "level": 3, "streak": 12,
        "achievements": ["first_log", "week_streak", "goal_25pct", "logged_10_workouts"],
        "sleep_hrs": [8.0, 7.5, 8.0, 8.5, 7.0, 8.0, 8.5],
    },
    {
        "name": "Sam Rivera",
        "email": "sam@demo.healthos",
        "tag": "Endurance",
        "profile": {"age": 32, "sex": "male",   "weight_kg": 74, "height_cm": 175, "activity_level": "active"},
        "goals":   {"type": "maintenance", "target_weight_kg": 72, "weekly_workout_days": 5},
        "weights": [74.0, 73.8, 73.6, 73.5, 73.4, 73.3, 73.2],
        "xp": 920, "level": 4, "streak": 21,
        "achievements": ["first_log", "week_streak", "month_streak", "logged_10_workouts", "perfect_week"],
        "sleep_hrs": [7.0, 7.5, 8.0, 7.5, 7.0, 7.5, 8.0],
    },
]

NUTRITION_PLANS = {
    "weight_loss": {
        "daily_calories": 1800,
        "macros": {"protein_g": 140, "carbs_g": 180, "fat_g": 60},
        "meal_schedule": [
            {"meal": "Breakfast", "time": "7:30 AM", "calories": 400, "example": "Oatmeal + 2 eggs + fruit"},
            {"meal": "Lunch",     "time": "12:30 PM","calories": 550, "example": "Chicken rice bowl + salad"},
            {"meal": "Snack",     "time": "3:30 PM", "calories": 200, "example": "Greek yogurt + almonds"},
            {"meal": "Dinner",    "time": "7:00 PM", "calories": 650, "example": "Salmon + vegetables + quinoa"},
        ],
        "logged_today": [
            {"meal": "Breakfast", "name": "Oatmeal + 2 boiled eggs", "calories": 520, "protein_g": 28, "carbs_g": 58, "fat_g": 14, "time": "7:45 AM"},
            {"meal": "Lunch",     "name": "Grilled chicken rice bowl", "calories": 610, "protein_g": 45, "carbs_g": 68, "fat_g": 16, "time": "12:40 PM"},
        ],
    },
    "muscle_gain": {
        "daily_calories": 2800,
        "macros": {"protein_g": 175, "carbs_g": 320, "fat_g": 80},
        "meal_schedule": [
            {"meal": "Breakfast",    "time": "7:00 AM", "calories": 700, "example": "Protein pancakes + banana + milk"},
            {"meal": "Pre-workout",  "time": "11:00 AM","calories": 400, "example": "Rice cakes + peanut butter"},
            {"meal": "Lunch",        "time": "1:30 PM", "calories": 750, "example": "Beef stir fry + rice + eggs"},
            {"meal": "Post-workout", "time": "4:30 PM", "calories": 450, "example": "Protein shake + oats"},
            {"meal": "Dinner",       "time": "7:30 PM", "calories": 500, "example": "Grilled chicken + sweet potato"},
        ],
        "logged_today": [
            {"meal": "Breakfast",    "name": "Protein pancakes + banana", "calories": 720, "protein_g": 42, "carbs_g": 85, "fat_g": 22, "time": "7:05 AM"},
            {"meal": "Pre-workout",  "name": "Rice cakes + peanut butter", "calories": 390, "protein_g": 12, "carbs_g": 48, "fat_g": 18, "time": "11:10 AM"},
            {"meal": "Lunch",        "name": "Beef stir fry + rice", "calories": 760, "protein_g": 52, "carbs_g": 78, "fat_g": 24, "time": "1:35 PM"},
        ],
    },
    "maintenance": {
        "daily_calories": 2400,
        "macros": {"protein_g": 150, "carbs_g": 280, "fat_g": 75},
        "meal_schedule": [
            {"meal": "Breakfast", "time": "6:00 AM", "calories": 550, "example": "Eggs + toast + avocado + OJ"},
            {"meal": "Lunch",     "time": "12:00 PM","calories": 700, "example": "Pasta + lean mince + salad"},
            {"meal": "Snack",     "time": "3:00 PM", "calories": 300, "example": "Fruit + trail mix"},
            {"meal": "Dinner",    "time": "6:30 PM", "calories": 850, "example": "Salmon + roasted veg + quinoa"},
        ],
        "logged_today": [
            {"meal": "Breakfast", "name": "Eggs + avocado toast", "calories": 560, "protein_g": 28, "carbs_g": 48, "fat_g": 28, "time": "6:10 AM"},
            {"meal": "Lunch",     "name": "Pasta bolognese + salad", "calories": 690, "protein_g": 42, "carbs_g": 78, "fat_g": 22, "time": "12:05 PM"},
            {"meal": "Snack",     "name": "Apple + trail mix", "calories": 295, "protein_g": 8, "carbs_g": 38, "fat_g": 14, "time": "3:15 PM"},
        ],
    },
}

WORKOUT_PLANS = {
    "weight_loss": {
        "weekly_schedule": [
            {"day": "Monday",    "type": "Strength", "focus": "Push — Chest, Shoulders, Triceps", "duration_min": 45},
            {"day": "Tuesday",   "type": "Cardio",   "focus": "30–35min zone-2 run",              "duration_min": 35},
            {"day": "Wednesday", "type": "Rest",     "focus": "Active recovery / 20min walk",     "duration_min": 20},
            {"day": "Thursday",  "type": "Strength", "focus": "Pull — Back, Biceps",              "duration_min": 45},
            {"day": "Friday",    "type": "Strength", "focus": "Legs + Core",                      "duration_min": 50},
            {"day": "Saturday",  "type": "Cardio",   "focus": "45min moderate run or cycling",    "duration_min": 45},
            {"day": "Sunday",    "type": "Rest",     "focus": "Full rest",                        "duration_min": 0 },
        ]
    },
    "muscle_gain": {
        "weekly_schedule": [
            {"day": "Monday",    "type": "Strength", "focus": "Chest + Triceps (heavy)",          "duration_min": 60},
            {"day": "Tuesday",   "type": "Strength", "focus": "Back + Biceps (heavy)",            "duration_min": 60},
            {"day": "Wednesday", "type": "Strength", "focus": "Legs — Squat focused",             "duration_min": 65},
            {"day": "Thursday",  "type": "Rest",     "focus": "Active recovery / stretching",     "duration_min": 20},
            {"day": "Friday",    "type": "Strength", "focus": "Shoulders + Arms",                 "duration_min": 55},
            {"day": "Saturday",  "type": "Cardio",   "focus": "20min LISS + mobility",            "duration_min": 30},
            {"day": "Sunday",    "type": "Rest",     "focus": "Full rest",                        "duration_min": 0 },
        ]
    },
    "maintenance": {
        "weekly_schedule": [
            {"day": "Monday",    "type": "Cardio",   "focus": "10km run — zone 2",                "duration_min": 60},
            {"day": "Tuesday",   "type": "Strength", "focus": "Full body + core",                 "duration_min": 50},
            {"day": "Wednesday", "type": "Cardio",   "focus": "Tempo run — 8km",                 "duration_min": 50},
            {"day": "Thursday",  "type": "Rest",     "focus": "Yoga / mobility",                  "duration_min": 30},
            {"day": "Friday",    "type": "Cardio",   "focus": "Easy 6km + strides",               "duration_min": 40},
            {"day": "Saturday",  "type": "Cardio",   "focus": "Long run — 16–18km",              "duration_min": 100},
            {"day": "Sunday",    "type": "Rest",     "focus": "Full rest",                        "duration_min": 0 },
        ]
    },
}

RECOVERY_PLANS = {
    "normal": {
        "sleep_target_hours": 7.5,
        "deload_week_every": 4,
        "recovery_tips": [
            "Sleep 7–8 hours nightly for optimal recovery",
            "Hydrate — aim for 2.5–3L water daily",
            "10 minutes of stretching post every workout",
        ],
        "status": "normal",
        "message": "Recovery is on track. Keep up the sleep routine!",
    },
    "poor_sleep": {
        "sleep_target_hours": 8.0,
        "deload_week_every": 4,
        "recovery_tips": [
            "⚠️ Poor sleep detected — reduce today's workout intensity by 40%",
            "Avoid high-intensity training within 2 hrs of bedtime",
            "Consider a 20-minute nap if possible",
            "Hydrate more than usual — dehydration worsens fatigue",
        ],
        "status": "poor",
        "message": "RecoveryAgent: 4 hours sleep detected. Workout intensity reduced 40%. Rest day strongly recommended.",
    },
}


async def _seed_single_profile(profile_data: dict) -> str:
    """Seed one demo profile with realistic health history."""
    from tools.mongodb_tools import (
        get_db, create_user, insert_health_log, award_xp,
        update_streak, log_agent_decision,
    )
    from agents.runner import run_agent
    from agents.nutrition_agent import nutrition_agent
    from agents.workout_agent import workout_agent
    from agents.recovery_agent import recovery_agent
    from agents.progress_agent import progress_agent

    db = get_db()
    goal_type = profile_data["goals"]["type"]

    # Clean up old demo user with same email
    await db.users.delete_many({"email": profile_data["email"]})

    user_payload = {
        "name": profile_data["name"],
        "email": profile_data["email"],
        "profile": profile_data["profile"],
        "goals": profile_data["goals"],
    }
    user_id = await create_user(user_payload)

    # ── Nutrition plan ────────────────────────────────────────────────────
    np = NUTRITION_PLANS[goal_type]
    await run_agent(
        nutrition_agent, user_id=user_id,
        message=(
            f"Generate nutrition plan for user_id={user_id}. Goal: {goal_type}. "
            f"daily_calories={np['daily_calories']}, "
            f"protein_g={np['macros']['protein_g']}, carbs_g={np['macros']['carbs_g']}, fat_g={np['macros']['fat_g']}. "
            f"Call create_plan then log_agent_decision."
        )
    )

    # ── Workout plan ──────────────────────────────────────────────────────
    wp = WORKOUT_PLANS[goal_type]
    days_list = ", ".join([d["day"] for d in wp["weekly_schedule"] if d["type"] != "Rest"])
    await run_agent(
        workout_agent, user_id=user_id,
        message=(
            f"Generate workout plan for user_id={user_id}. Goal: {goal_type}. "
            f"Active days: {days_list}. "
            f"Call create_plan then log_agent_decision."
        )
    )

    # ── Historical health logs (7 days) ───────────────────────────────────
    base_date = datetime.utcnow()
    for i, (w, s) in enumerate(zip(profile_data["weights"], profile_data["sleep_hrs"])):
        day = base_date - timedelta(days=6 - i)
        # weight
        await insert_health_log({
            "user_id": user_id,
            "type": "weight",
            "data": {"value_kg": w},
            "logged_at": day.isoformat(),
        })
        # sleep
        quality = 8 if s >= 7 else (5 if s >= 6 else 3)
        await insert_health_log({
            "user_id": user_id,
            "type": "sleep",
            "data": {"hours": s, "quality_score": quality},
            "logged_at": day.isoformat(),
        })

    # ── Today's food logs ─────────────────────────────────────────────────
    for meal in np["logged_today"]:
        await insert_health_log({
            "user_id": user_id,
            "type": "food",
            "data": meal,
        })

    # ── Workouts (last 4 days) ────────────────────────────────────────────
    workout_examples = {
        "weight_loss": [
            ("Strength — Push Day", 45, 310),
            ("Cardio — 30min Run",  32, 285),
            ("Strength — Pull Day", 48, 295),
        ],
        "muscle_gain": [
            ("Chest + Triceps",     62, 340),
            ("Back + Biceps",       58, 320),
            ("Leg Day — Squats",    68, 380),
        ],
        "maintenance": [
            ("10km Zone-2 Run",     62, 520),
            ("Full Body Strength",  52, 350),
            ("Tempo Run 8km",       50, 460),
        ],
    }
    for idx, (wtype, dur, cal) in enumerate(workout_examples[goal_type]):
        day = base_date - timedelta(days=3 - idx)
        await insert_health_log({
            "user_id": user_id,
            "type": "workout",
            "data": {"workout_type": wtype, "duration_min": dur, "calories_burned": cal},
            "logged_at": day.isoformat(),
        })

    # ── XP, level, streak ─────────────────────────────────────────────────
    await award_xp(user_id, profile_data["xp"], "Demo profile seeded")
    for _ in range(profile_data["streak"]):
        await update_streak(user_id)

    # ── Progress analysis ─────────────────────────────────────────────────
    await run_agent(
        progress_agent, user_id=user_id,
        message=f"Analyze progress for user_id={user_id}. Generate forecast."
    )

    # ── Recovery plan (poor sleep version for Alex) ───────────────────────
    rec_key = "poor_sleep" if profile_data["email"] == "alex@demo.healthos" else "normal"
    rec = RECOVERY_PLANS[rec_key]
    await run_agent(
        recovery_agent, user_id=user_id,
        message=(
            f"Set recovery plan for user_id={user_id}. "
            f"sleep_target_hours={rec['sleep_target_hours']}. "
            f"Status: {rec['status']}. "
            + ("4 hours sleep logged yesterday. Reduce intensity." if rec_key == "poor_sleep" else "")
            + " Call create_plan then log_agent_decision."
        )
    )

    logger.info(f"Seeded demo profile: {profile_data['name']} ({user_id})")
    return user_id


@router.post("/seed-profiles")
async def seed_demo_profiles():
    """Seed all 3 demo profiles with realistic health data. Run once before demo."""
    results = []
    for p in DEMO_PROFILES:
        try:
            uid = await _seed_single_profile(p)
            results.append({"name": p["name"], "email": p["email"], "user_id": uid, "tag": p["tag"], "status": "seeded"})
        except Exception as e:
            logger.error(f"Failed to seed {p['name']}: {e}")
            results.append({"name": p["name"], "email": p["email"], "status": "error", "error": str(e)})
    return {"profiles_seeded": len([r for r in results if r["status"] == "seeded"]), "results": results}


@router.post("/run")
async def run_demo(user_id: str = "demo_user"):
    """Legacy: single user demo run. Prefer /seed-profiles for new demos."""
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

    # Create demo user (cleans up old one with same email)
    from tools.mongodb_tools import get_db
    db = get_db()
    await db.users.delete_many({"email": f"{user_id}@demo.healthos"})

    user_data = {
        "name": "Alex (Demo)",
        "email": f"{user_id}@demo.healthos",
        "profile": {"age": 28, "sex": "male", "weight_kg": 82, "height_cm": 180, "activity_level": "moderate"},
        "goals": {"type": "weight_loss", "target_weight_kg": 72, "weekly_workout_days": 4},
    }
    actual_user_id = await create_user(user_data)

    await run_agent(nutrition_agent, user_id=actual_user_id,
        message=f"Generate nutrition plan for user_id={actual_user_id}. daily_calories=1800, protein_g=140, carbs_g=180, fat_g=60. Call create_plan then log_agent_decision.")
    await run_agent(workout_agent, user_id=actual_user_id,
        message=f"Generate workout plan for user_id={actual_user_id}. 4 days/week. Call create_plan then log_agent_decision.")

    for meal in NUTRITION_PLANS["weight_loss"]["logged_today"]:
        await insert_health_log({"user_id": actual_user_id, "type": "food", "data": meal})
    for w in [82.0, 81.4, 81.1, 80.9, 80.6, 80.3, 80.1]:
        await insert_health_log({"user_id": actual_user_id, "type": "weight", "data": {"value_kg": w}})
    for wt, dur, cal in [("Strength Push", 45, 310), ("Cardio 30min run", 32, 285)]:
        await insert_health_log({"user_id": actual_user_id, "type": "workout", "data": {"workout_type": wt, "duration_min": dur, "calories_burned": cal}})

    await insert_health_log({"user_id": actual_user_id, "type": "sleep", "data": {"hours": 4.0, "quality_score": 3}})
    await run_agent(recovery_agent, user_id=actual_user_id,
        message=f"user_id={actual_user_id} slept 4 hours. Reduce workout intensity. Call create_plan then log_agent_decision.")
    await run_agent(progress_agent, user_id=actual_user_id,
        message=f"Analyze progress for user_id={actual_user_id}. Generate forecast toward 72kg goal.")
    await award_xp(actual_user_id, 340, "Demo user seeded")

    return {
        "demo_user_id": actual_user_id,
        "status": "Demo user created with full health history",
        "tip": "Call POST /api/demo/seed-profiles to seed all 3 demo profiles",
    }


@router.get("/status/{user_id}")
async def demo_status(user_id: str):
    from tools.mongodb_tools import get_gamification_state, get_recent_logs, get_active_plan, get_latest_forecast
    return {
        "user_id": user_id,
        "gamification": await get_gamification_state(user_id),
        "weight_entries": len(await get_recent_logs(user_id, "weight", limit=5)),
        "has_nutrition_plan": await get_active_plan(user_id, "nutrition") is not None,
        "has_forecast": await get_latest_forecast(user_id) is not None,
    }
