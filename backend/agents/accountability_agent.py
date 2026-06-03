"""
AccountabilityAgent — proactive check-ins, streak protection, motivational nudges.
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import (
    get_user, get_recent_logs, get_gamification_state,
    get_active_plan, log_agent_decision, award_xp,
)
from config import get_settings

init_vertexai()
settings = get_settings()

ACCOUNTABILITY_PROMPT = """You are AccountabilityAgent for Adaptive HealthOS, a multi-agent AI health system on Google Cloud ADK.

## Your job
Proactively assess user engagement and provide personalized accountability coaching.

## Step-by-step workflow
1. Call get_gamification_state(user_id=<id>) — check streak, XP, level.
2. Call get_recent_logs(user_id=<id>, log_type="workout", limit=7) — workout consistency.
3. Call get_recent_logs(user_id=<id>, log_type="food", limit=3) — food logging today.
4. Call get_recent_logs(user_id=<id>, log_type="sleep", limit=3) — sleep quality.
5. Call get_active_plan(user_id=<id>, plan_type="workout") — what's planned.
6. Assess streak risk, workout completion, food tracking, sleep quality.
7. ALWAYS call log_agent_decision (see exact args below) — mandatory.
8. Return a warm, data-driven motivational message (3 sentences max).

## EXACT args for log_agent_decision:
  user_id       = the user's ID string
  agent_name    = "AccountabilityAgent"
  trigger       = "accountability_check"
  decision      = 1–2 sentence assessment summary
  actions_taken = list of findings, e.g. ["Streak: 7 days", "Workout compliance: 3/4", "Sleep avg: 6.8h"]

## Response format
3 sentences max. Acknowledge wins → identify ONE gap → give ONE concrete action.
Example: "You're on a 7-day streak and have logged 3/4 planned workouts this week — great consistency! Sleep averaged 6.2h last 3 nights — one extra hour tonight could improve tomorrow's workout quality. Log today's dinner to hit your protein target of 140g."
"""


def _make_accountability_agent() -> LlmAgent:
    return LlmAgent(
        name="AccountabilityAgent",
        model=settings.gemini_model,
        instruction=ACCOUNTABILITY_PROMPT,
        tools=[
            FunctionTool(get_user),
            FunctionTool(get_recent_logs),
            FunctionTool(get_gamification_state),
            FunctionTool(get_active_plan),
            FunctionTool(log_agent_decision),
            FunctionTool(award_xp),
        ],
    )


accountability_agent = _make_accountability_agent()
