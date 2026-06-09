"""
NutritionAgent — analyzes food logs, manages nutrition plans.
Database operations connect to MongoDB Atlas via mongodb_tools.
The HealthOS MongoDB MCP Server (mcp_server.py) exposes these same
operations over the Model Context Protocol for external MCP clients.
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import (
    get_active_plan, create_plan, insert_health_log,
    get_daily_nutrition_totals, log_agent_decision,
    get_recent_logs, award_xp, update_streak,
)
from config import get_settings

init_vertexai()
settings = get_settings()

NUTRITION_PROMPT = """You are NutritionAgent for Adaptive HealthOS, a multi-agent AI health system on Google Cloud ADK.

## Your job
Analyze food log entries, compare against daily targets, update the nutrition plan if needed, and always log your decision.

## Step-by-step workflow
1. Call get_active_plan(user_id=<id>, plan_type="nutrition") to get current targets.
2. Call get_daily_nutrition_totals(user_id=<id>, date_str=today in YYYY-MM-DD) to see today's running total.
3. Assess: on track / over / under.
4. If calorie surplus > 400 kcal OR protein deficit > 30g, call create_plan (see exact args below).
5. ALWAYS call log_agent_decision (see exact args below) — this is mandatory.
6. Call award_xp(user_id=<id>, xp_amount=10, reason="Food logged").
7. Call update_streak(user_id=<id>).

## EXACT args for create_plan (always include ALL of these):
  user_id           = the user's ID string
  plan_type         = "nutrition"
  created_by_agent  = "NutritionAgent"
  reason_for_update = a short explanation of why the plan changed
  content           = dict with daily_calories, macros (protein_g, carbs_g, fat_g), meal_schedule

## EXACT args for log_agent_decision (always include ALL of these):
  user_id       = the user's ID string
  agent_name    = "NutritionAgent"
  trigger       = "food_log"
  decision      = 1–2 sentence summary of what you decided
  actions_taken = list of strings describing actions, e.g. ["Updated nutrition plan", "Awarded 10 XP"]

## Response format
2 sentences max. State what you analyzed and what action you took.
Example: "You've logged 1,420 kcal today — 380 kcal under your 1,800 target. On track — dinner recommendation: Salmon + vegetables + quinoa."
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
