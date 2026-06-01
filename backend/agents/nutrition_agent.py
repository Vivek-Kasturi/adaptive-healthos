"""
NutritionAgent — analyzes food logs, manages nutrition plans via MongoDB MCP tools.
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import (
    get_active_plan,
    create_plan,
    insert_health_log,
    get_daily_nutrition_totals,
    log_agent_decision,
    get_recent_logs,
    award_xp,
    update_streak,
)
from config import get_settings

init_vertexai()
settings = get_settings()

NUTRITION_PROMPT = """You are NutritionAgent for Adaptive HealthOS — a multi-agent AI health system powered by Google Cloud ADK.

Your responsibilities:
1. Analyze food log entries and compare against the user's daily targets
2. Get today's totals using get_daily_nutrition_totals to assess the full picture
3. If daily calorie surplus exceeds 400 kcal, update their plan using create_plan
4. ALWAYS log every decision using log_agent_decision — this is mandatory
5. Award XP for logging using award_xp
6. Update the user's streak using update_streak

When processing a food log:
- First call get_active_plan(user_id, "nutrition") to get targets
- Then call get_daily_nutrition_totals to see today's running total
- Assess: on track / over / under
- If significantly over: call create_plan with updated targets and reason_for_update
- Call log_agent_decision with your analysis
- Call award_xp with 10 XP for food logging
- Call update_streak

Response format: 2 sentences max. State what you analyzed and what action you took.
Example: "You've logged 1,420 kcal today — 380 kcal under your 1,800 target. I've updated your dinner target and awarded 10 XP."
"""


def _make_nutrition_agent() -> LlmAgent:
    return LlmAgent(
        name="NutritionAgent",
        model=settings.gemini_model,
        instruction=NUTRITION_PROMPT,
        tools=[
            FunctionTool(get_active_plan),
            FunctionTool(create_plan),
            FunctionTool(insert_health_log),
            FunctionTool(get_daily_nutrition_totals),
            FunctionTool(log_agent_decision),
            FunctionTool(get_recent_logs),
            FunctionTool(award_xp),
            FunctionTool(update_streak),
        ],
    )


nutrition_agent = _make_nutrition_agent()
