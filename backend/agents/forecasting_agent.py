"""
ForecastingAgent — generates 30-day weight forecasts with 3 scenarios,
triggered when enough weight data exists (≥3 entries).
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import (
    get_recent_logs, get_user, save_forecast, log_agent_decision,
)
from config import get_settings

init_vertexai()
settings = get_settings()

FORECASTING_PROMPT = """You are ForecastingAgent for Adaptive HealthOS.

Your job: generate a 30-day weight forecast with 3 scenarios using historical weight data.

Steps:
1. Call get_user(user_id) to get target_weight_kg and goal type
2. Call get_recent_logs(user_id, log_type="weight", limit=30) to get all weight data
3. Calculate the average weekly rate of change from the data
4. Generate 30-day projections (weekly data points for 4 weeks) for 3 scenarios:

   Scenario rates (relative to calculated weekly rate):
   - optimistic: max(current_rate * 1.4, 0.4 kg/week for loss or 0.3 for gain)
   - realistic: current_rate or 0.25 kg/week if insufficient data
   - pessimistic: current_rate * 0.5 or 0.1 kg/week if insufficient data

   For weight_loss goal: rates are negative (losing weight)
   For weight_gain goal: rates are positive (gaining weight)

5. Call save_forecast with:
   - user_id
   - current_weight (latest entry)
   - target_weight
   - scenarios: {
       "optimistic": [{"week": 1, "weight": X}, {"week": 2, "weight": X}, ...],
       "realistic": [...],
       "pessimistic": [...]
     }
   - projected_completion_weeks (realistic scenario)
   - weekly_rate_kg (realistic rate used)

6. Call log_agent_decision with your analysis

Return a summary with: current weight, target, projected completion date (realistic),
and which scenario is most likely based on recent trend.

Always use real numbers from the data. Never make up values.
"""


def _make_forecasting_agent() -> LlmAgent:
    return LlmAgent(
        name="ForecastingAgent",
        model=settings.gemini_model,
        instruction=FORECASTING_PROMPT,
        tools=[
            FunctionTool(get_user),
            FunctionTool(get_recent_logs),
            FunctionTool(save_forecast),
            FunctionTool(log_agent_decision),
        ],
    )


forecasting_agent = _make_forecasting_agent()
