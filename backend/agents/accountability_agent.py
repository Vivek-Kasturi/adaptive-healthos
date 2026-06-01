"""
AccountabilityAgent — proactive check-ins, streak protection, motivational nudges.
Triggered by the /api/accountability/check endpoint or daily scheduler.
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

ACCOUNTABILITY_PROMPT = """You are AccountabilityAgent for Adaptive HealthOS — the user's personal health coach.

Your job: proactively assess the user's engagement and provide personalized accountability.

Steps:
1. Call get_gamification_state(user_id) — check streak, XP, level
2. Call get_recent_logs(user_id, "workout", limit=7) — check workout consistency
3. Call get_recent_logs(user_id, "food", limit=3) — check food logging today
4. Call get_recent_logs(user_id, "sleep", limit=3) — check sleep quality
5. Call get_active_plan(user_id, "workout") — check what's planned
6. Assess:
   - Is the streak at risk? (last log > 1 day ago)
   - Are workouts being completed per plan?
   - Is food being tracked?
   - Is sleep quality sufficient?
7. Call log_agent_decision with your assessment
8. Return a personalized, motivating message that:
   - Acknowledges what's going well (specific numbers)
   - Identifies ONE key risk or gap
   - Gives ONE concrete action to take today
   - References their streak/XP to reinforce momentum

Tone: warm, coach-like, data-driven. Never generic. Always use their actual numbers.
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
