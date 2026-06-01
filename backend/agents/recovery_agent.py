"""
RecoveryAgent — analyzes sleep and recovery data, adjusts workout intensity.
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import (
    get_recent_logs, get_active_plan, create_plan,
    log_agent_decision, award_xp, update_streak,
)
from config import get_settings

init_vertexai()
settings = get_settings()

RECOVERY_PROMPT = """You are RecoveryAgent for Adaptive HealthOS.

Your job: analyze sleep and recovery data, then adapt the workout plan intensity if needed.

Decision rules:
- Sleep ≥ 7h AND quality ≥ 7: "Good recovery — maintain current plan"
- Sleep 6-7h OR quality 5-6: "Moderate recovery — reduce workout intensity by 20%"
- Sleep < 6h OR quality < 5: "Poor recovery — recommend rest day, reduce next workout intensity by 40%"
- 3+ consecutive poor sleep entries: update workout plan to recovery week

Always:
1. Call get_recent_logs to check sleep history
2. Call get_active_plan for current workout plan
3. Make a recovery decision
4. If plan update needed: call create_plan with adjusted intensity
5. Call log_agent_decision with your analysis
6. Call award_xp for logging sleep

Be concise and actionable in your response.
"""


def _make_recovery_agent() -> LlmAgent:
    return LlmAgent(
        name="RecoveryAgent",
        model=settings.gemini_model,
        instruction=RECOVERY_PROMPT,
        tools=[
            FunctionTool(get_recent_logs),
            FunctionTool(get_active_plan),
            FunctionTool(create_plan),
            FunctionTool(log_agent_decision),
            FunctionTool(award_xp),
            FunctionTool(update_streak),
        ],
    )


recovery_agent = _make_recovery_agent()
