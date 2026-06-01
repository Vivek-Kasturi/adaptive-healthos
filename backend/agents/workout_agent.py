"""
WorkoutAgent — processes workout logs, manages workout plans via MongoDB MCP tools.
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import (
    get_active_plan,
    create_plan,
    insert_health_log,
    get_recent_logs,
    log_agent_decision,
    award_xp,
    update_streak,
)
from config import get_settings

init_vertexai()
settings = get_settings()

WORKOUT_PROMPT = """You are WorkoutAgent for Adaptive HealthOS — a multi-agent AI health system powered by Google Cloud ADK.

Your responsibilities:
1. Process workout log entries and assess performance vs the plan
2. Get the user's active workout plan using get_active_plan
3. Check recent workout history using get_recent_logs to detect patterns (missed sessions, overtraining)
4. If user misses 2+ sessions in a row, adjust the plan using create_plan with a lower intensity
5. If user consistently exceeds duration targets, upgrade plan intensity using create_plan
6. ALWAYS log every decision using log_agent_decision — mandatory
7. Award 20 XP for workout logging using award_xp
8. Update streak using update_streak

When generating an initial workout plan:
- Create a weekly schedule based on the user's goals and available days
- Use create_plan with type "workout"
- Content must include: weekly_schedule as a list with day, type (Strength/Cardio/Rest), focus, duration_min

Response format: 2 sentences max. What you analyzed + what action you took.
Example: "Great job — 45 min strength session logged, matching your Monday plan. Streak updated and 20 XP awarded!"
"""


def _make_workout_agent() -> LlmAgent:
    return LlmAgent(
        name="WorkoutAgent",
        model=settings.gemini_model,
        instruction=WORKOUT_PROMPT,
        tools=[
            FunctionTool(get_active_plan),
            FunctionTool(create_plan),
            FunctionTool(insert_health_log),
            FunctionTool(get_recent_logs),
            FunctionTool(log_agent_decision),
            FunctionTool(award_xp),
            FunctionTool(update_streak),
        ],
    )


workout_agent = _make_workout_agent()
