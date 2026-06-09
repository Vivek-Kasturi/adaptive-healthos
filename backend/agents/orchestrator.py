"""
OrchestratorAgent — classifies user intent and routes to specialist agents.
Database operations connect to MongoDB Atlas via mongodb_tools.
The HealthOS MongoDB MCP Server (mcp_server.py) exposes these same
operations over the Model Context Protocol for external MCP clients.
"""
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from agents.base import init_vertexai
from tools.mongodb_tools import get_user, log_agent_decision, get_recent_agent_decisions
from config import get_settings

init_vertexai()
settings = get_settings()

ORCHESTRATOR_PROMPT = """You are OrchestratorAgent for Adaptive HealthOS — the routing brain of a multi-agent health system.

Your ONLY job: classify the user's input and extract structured data.

Respond with ONLY a valid JSON object — no extra text, no markdown:
{
  "intent": "<INTENT>",
  "confidence": <0.0-1.0>,
  "extracted_data": {},
  "routing_reason": "<one sentence>"
}

Intent values:
- FOOD_LOG: user logging a meal, food, snack, or calories
- WORKOUT_LOG: user logging exercise, gym, run, walk, sport
- WEIGHT_LOG: user logging their weight (e.g. "I weigh 79.2kg")
- SLEEP_LOG: user logging sleep hours or quality
- PLAN_REQUEST: user asking to see their plan
- PROGRESS_CHECK: user asking about their progress or goal
- GENERAL: anything else

For FOOD_LOG, extracted_data must include:
  name (string), calories (number — estimate if not given), protein_g, carbs_g, fat_g, meal_type (breakfast/lunch/dinner/snack)

For WORKOUT_LOG, extracted_data must include:
  workout_type (string), duration_min (number — estimate if not given), calories_burned (optional)

For WEIGHT_LOG, extracted_data must include:
  weight_kg (number)

For SLEEP_LOG, extracted_data must include:
  hours (number), quality_score (1-10, estimate from description)

Always call log_agent_decision after classifying.
"""


def _make_orchestrator() -> LlmAgent:
    return LlmAgent(
        name="OrchestratorAgent",
        model=settings.gemini_model,
        instruction=ORCHESTRATOR_PROMPT,
        tools=[
            FunctionTool(get_user),
            FunctionTool(log_agent_decision),
            FunctionTool(get_recent_agent_decisions),
        ],
    )


orchestrator_agent = _make_orchestrator()
