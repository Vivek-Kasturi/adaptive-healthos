"""
HealthOS MongoDB MCP Server
Exposes MongoDB operations as MCP tools for ADK agents via the
Model Context Protocol. Run as a subprocess by MCPToolset.

Usage: python mcp_server.py
"""
import sys
import os

# Ensure imports work when spawned as a subprocess from any working directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server.fastmcp import FastMCP
from tools.mongodb_tools import (
    get_user,
    insert_health_log,
    get_recent_logs,
    get_active_plan,
    create_plan,
    log_agent_decision,
    award_xp,
    update_streak,
    get_daily_nutrition_totals,
    get_recent_agent_decisions,
    get_latest_forecast,
    get_gamification_state,
)
from typing import Optional

mcp = FastMCP("healthos-mongodb")


# ── USER ─────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_user_profile(user_id: str) -> dict:
    """Get user profile, goals, and preferences from MongoDB."""
    result = await get_user(user_id)
    return result or {"error": "User not found"}


# ── PLANS ─────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_active_plan(user_id: str, plan_type: str) -> dict:
    """Get the active plan for a user. plan_type: 'nutrition', 'workout', or 'recovery'."""
    from tools.mongodb_tools import get_active_plan as _get
    result = await _get(user_id, plan_type)
    return result or {"message": f"No active {plan_type} plan found"}


@mcp.tool()
async def create_plan(
    user_id: str,
    plan_type: str,
    content: dict,
    created_by_agent: str = "",
    reason_for_update: str = "",
) -> dict:
    """Create or update a plan in MongoDB. Returns the new plan_id."""
    from tools.mongodb_tools import create_plan as _create
    plan_id = await _create(
        user_id, plan_type, content,
        created_by_agent=created_by_agent,
        reason_for_update=reason_for_update,
    )
    return {"plan_id": plan_id, "status": "saved", "plan_type": plan_type}


# ── HEALTH LOGS ───────────────────────────────────────────────────────────────

@mcp.tool()
async def insert_health_log(user_id: str, log_type: str, data: dict) -> dict:
    """Insert a health log entry (food, workout, weight, sleep) into MongoDB."""
    from tools.mongodb_tools import insert_health_log as _insert
    log_id = await _insert({"user_id": user_id, "type": log_type, "data": data})
    return {"log_id": log_id, "status": "logged"}


@mcp.tool()
async def get_recent_logs(user_id: str, log_type: str, limit: int = 7) -> list:
    """Get recent health logs of a specific type from MongoDB."""
    from tools.mongodb_tools import get_recent_logs as _get
    return await _get(user_id, log_type, limit=limit)


@mcp.tool()
async def get_daily_nutrition_totals(user_id: str, date_str: str) -> dict:
    """Get today's calorie and macro totals for a user. date_str format: YYYY-MM-DD."""
    from tools.mongodb_tools import get_daily_nutrition_totals as _get
    result = await _get(user_id, date_str)
    return result or {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}


# ── AGENT DECISIONS ───────────────────────────────────────────────────────────

@mcp.tool()
async def log_agent_decision(
    user_id: str,
    agent_name: str,
    trigger: str,
    decision: str,
    actions_taken: list,
) -> dict:
    """Persist an agent decision to MongoDB agent_decisions collection."""
    from tools.mongodb_tools import log_agent_decision as _log
    doc_id = await _log({
        "user_id": user_id,
        "agent_name": agent_name,
        "trigger": trigger,
        "decision": decision,
        "actions_taken": actions_taken,
    })
    return {"decision_id": doc_id, "status": "logged"}


@mcp.tool()
async def get_recent_agent_decisions(user_id: str, limit: int = 5) -> list:
    """Get recent agent decisions from MongoDB for a user."""
    from tools.mongodb_tools import get_recent_agent_decisions as _get
    return await _get(user_id, limit=limit)


# ── GAMIFICATION ──────────────────────────────────────────────────────────────

@mcp.tool()
async def award_xp(user_id: str, xp_amount: int, reason: str) -> dict:
    """Award XP to a user and update their gamification state in MongoDB."""
    from tools.mongodb_tools import award_xp as _award
    result = await _award(user_id, xp_amount, reason)
    return result or {"status": "xp awarded", "xp_amount": xp_amount}


@mcp.tool()
async def update_streak(user_id: str) -> dict:
    """Update the user's daily streak in MongoDB."""
    from tools.mongodb_tools import update_streak as _update
    result = await _update(user_id)
    return result or {"status": "streak updated"}


# ── FORECASTING ───────────────────────────────────────────────────────────────

@mcp.tool()
async def get_latest_forecast(user_id: str) -> dict:
    """Get the latest goal forecast from MongoDB."""
    from tools.mongodb_tools import get_latest_forecast as _get
    result = await _get(user_id)
    return result or {"message": "No forecast yet. Log weight entries to generate one."}


if __name__ == "__main__":
    mcp.run()
