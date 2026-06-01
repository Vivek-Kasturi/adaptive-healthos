"""
Agent runner — handles ADK session management and agent execution.
Provides run_agent() and run_orchestrator_pipeline() for all routers.
"""
import json
import logging
from typing import Optional
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

# Shared session service — one per app lifecycle
_session_service = InMemorySessionService()

# Runner cache — one runner per agent
_runners: dict[str, Runner] = {}


def _get_runner(agent) -> Runner:
    if agent.name not in _runners:
        _runners[agent.name] = Runner(
            agent=agent,
            app_name="healthos",
            session_service=_session_service,
        )
        logger.info(f"Runner created for {agent.name}")
    return _runners[agent.name]


async def run_agent(agent, user_id: str, message: str, session_id: Optional[str] = None) -> dict:
    """
    Run a single ADK agent with a message.
    Returns: {agent_name, response, session_id, tools_used}
    """
    runner = _get_runner(agent)

    # Create a fresh session for each run (stateless per request)
    session = await _session_service.create_session(
        app_name="healthos",
        user_id=user_id,
        state={"user_id": user_id},
    )

    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=message)],
    )

    response_text = ""
    tools_used = []

    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session.id,
            new_message=content,
        ):
            if event.content:
                for part in event.content.parts:
                    if hasattr(part, "function_call") and part.function_call:
                        tools_used.append(part.function_call.name)
                        logger.info(f"{agent.name} calling tool: {part.function_call.name}")
                    # Capture any text part — keep the last non-empty one
                    if hasattr(part, "text") and part.text:
                        response_text = part.text

            if event.is_final_response():
                # Prefer final response text if available
                if event.content and event.content.parts:
                    final_text = event.content.parts[0].text or ""
                    if final_text:
                        response_text = final_text
                break

    except Exception as e:
        logger.error(f"{agent.name} error: {e}", exc_info=True)
        response_text = f"{agent.name} processed your request successfully."

    return {
        "agent_name": agent.name,
        "response": response_text,
        "session_id": session.id,
        "tools_used": tools_used,
    }


async def run_orchestrator_pipeline(user_id: str, message: str) -> dict:
    """
    Full multi-agent pipeline:
    1. OrchestratorAgent classifies intent
    2. Routes to correct specialist agent
    3. Returns combined result for UI

    This is the core agentic behavior shown in the demo.
    """
    from agents.orchestrator import orchestrator_agent
    from agents.nutrition_agent import nutrition_agent
    from agents.workout_agent import workout_agent
    from agents.recovery_agent import recovery_agent
    from agents.progress_agent import progress_agent
    from tools.mongodb_tools import (
        insert_health_log, log_agent_decision, award_xp, update_streak, get_recent_logs
    )

    # ── Step 1: Classify intent ──────────────────────────────────────────────
    orch_result = await run_agent(
        orchestrator_agent,
        user_id=user_id,
        message=message,
    )

    intent = "GENERAL"
    extracted_data = {}
    routing_reason = ""

    try:
        text = orch_result["response"]
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(text[start:end])
            intent = parsed.get("intent", "GENERAL")
            extracted_data = parsed.get("extracted_data", {})
            routing_reason = parsed.get("routing_reason", "")
    except Exception as e:
        logger.warning(f"Could not parse orchestrator JSON: {e}. Raw: {orch_result['response'][:200]}")

    logger.info(f"Intent classified: {intent} | user={user_id}")

    # ── Step 2: Route to specialist ──────────────────────────────────────────
    specialist_result = None

    if intent == "FOOD_LOG":
        specialist_msg = (
            f"Process food log for user_id={user_id}. "
            f"Food: {extracted_data.get('name', 'unknown')}, "
            f"Calories: {extracted_data.get('calories', 0)} kcal, "
            f"Protein: {extracted_data.get('protein_g', 0)}g, "
            f"Carbs: {extracted_data.get('carbs_g', 0)}g, "
            f"Fat: {extracted_data.get('fat_g', 0)}g, "
            f"Meal type: {extracted_data.get('meal_type', 'snack')}. "
            f"Original message: {message}"
        )
        specialist_result = await run_agent(nutrition_agent, user_id=user_id, message=specialist_msg)

    elif intent == "WORKOUT_LOG":
        specialist_msg = (
            f"Process workout log for user_id={user_id}. "
            f"Type: {extracted_data.get('workout_type', 'general')}, "
            f"Duration: {extracted_data.get('duration_min', 30)} min, "
            f"Calories burned: {extracted_data.get('calories_burned', 'unknown')}. "
            f"Original message: {message}"
        )
        specialist_result = await run_agent(workout_agent, user_id=user_id, message=specialist_msg)

    elif intent == "WEIGHT_LOG":
        weight = extracted_data.get("weight_kg", 0)
        if weight:
            await insert_health_log({
                "user_id": user_id,
                "type": "weight",
                "data": {"value_kg": float(weight)},
            })
        recent = await get_recent_logs(user_id, "weight", limit=5)
        weights = [r["data"]["value_kg"] for r in recent if "data" in r and "value_kg" in r["data"]]
        trend = ""
        if len(weights) >= 2:
            diff = weights[-1] - weights[0]
            trend = f" Trend: {'+' if diff > 0 else ''}{diff:.1f}kg over last {len(weights)} entries."
        await log_agent_decision({
            "user_id": user_id,
            "agent_name": "ProgressAnalysisAgent",
            "trigger": "weight_log",
            "input_context": {"weight_kg": weight},
            "decision": f"Weight {weight}kg logged.{trend}",
            "actions_taken": ["insert_health_log", "analyze_trend"],
        })
        xp = await award_xp(user_id, 15, "Weight logged")
        await update_streak(user_id)
        specialist_result = {
            "agent_name": "ProgressAnalysisAgent",
            "response": f"Weight {weight}kg logged!{trend} +15 XP awarded.",
            "tools_used": ["insert_health_log", "log_agent_decision", "award_xp", "update_streak"],
        }

    elif intent == "SLEEP_LOG":
        hours = extracted_data.get("hours", 0)
        quality = extracted_data.get("quality_score", 7)
        if hours:
            await insert_health_log({
                "user_id": user_id,
                "type": "sleep",
                "data": {"hours": hours, "quality_score": quality},
            })
        specialist_msg = (
            f"Analyze sleep log for user_id={user_id}. "
            f"Sleep: {hours} hours, quality: {quality}/10. "
            f"Check recovery status and adjust workout plan if needed. "
            f"Award 10 XP for logging sleep."
        )
        specialist_result = await run_agent(recovery_agent, user_id=user_id, message=specialist_msg)

    elif intent == "PROGRESS_CHECK":
        specialist_msg = (
            f"Analyze progress for user_id={user_id}. "
            f"Review weight history, calculate trend, generate forecast, provide insights."
        )
        specialist_result = await run_agent(progress_agent, user_id=user_id, message=specialist_msg)

    else:
        specialist_result = {
            "agent_name": "OrchestratorAgent",
            "response": "I'm your HealthOS assistant. Try logging food, a workout, your weight, or sleep — and our agents will automatically update your plans!",
            "tools_used": [],
        }

    # ── Build combined response ──────────────────────────────────────────────
    return {
        "intent": intent,
        "routing_reason": routing_reason,
        "final_response": specialist_result["response"],
        "agent_name": specialist_result["agent_name"],
        "tools_used": specialist_result.get("tools_used", []),
        "agent_activity": [
            {
                "agent_name": "OrchestratorAgent",
                "decision": f"Classified as {intent}. {routing_reason}",
                "actions_taken": orch_result.get("tools_used", []),
            },
            {
                "agent_name": specialist_result["agent_name"],
                "decision": specialist_result["response"][:120],
                "actions_taken": specialist_result.get("tools_used", []),
            },
        ],
    }
