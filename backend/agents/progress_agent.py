"""
ProgressAnalysisAgent — analyzes weight trends, calculates progress toward goals,
generates insights and motivational feedback.
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import (
    get_recent_logs, get_user, get_active_plan,
    log_agent_decision, save_forecast,
)
from config import get_settings
import math

init_vertexai()
settings = get_settings()

PROGRESS_PROMPT = """You are ProgressAnalysisAgent for Adaptive HealthOS.

Your job: analyze weight trends, calculate goal progress, and provide data-driven insights.

Steps when analyzing progress:
1. Call get_user to retrieve goal (target_weight_kg, goal type)
2. Call get_recent_logs(log_type="weight", limit=14) to get weight history
3. Calculate:
   - Total change from first to last entry
   - Weekly rate (kg/week)
   - % progress toward goal
   - Projected goal completion date at current rate
4. Generate 3 forecast scenarios (optimistic/realistic/pessimistic) as weekly data points
5. Call save_forecast with the scenarios
6. Call log_agent_decision with your full analysis
7. Return a clear, motivational summary with numbers

Forecast scenario rates (kg/week):
- optimistic: current_rate * 1.3 (or 0.5 if no data)
- realistic: current_rate (or 0.3 if no data)
- pessimistic: current_rate * 0.6 (or 0.15 if no data)

Always provide specific numbers. Never be vague.
"""


def _make_progress_agent() -> LlmAgent:
    return LlmAgent(
        name="ProgressAnalysisAgent",
        model=settings.gemini_model,
        instruction=PROGRESS_PROMPT,
        tools=[
            FunctionTool(get_user),
            FunctionTool(get_recent_logs),
            FunctionTool(get_active_plan),
            FunctionTool(log_agent_decision),
            FunctionTool(save_forecast),
        ],
    )


progress_agent = _make_progress_agent()
