from fastapi import APIRouter
from tools.mongodb_tools import get_gamification_state, award_xp

router = APIRouter()


@router.get("/{user_id}")
async def get_gamification(user_id: str):
    state = await get_gamification_state(user_id)
    return state or {
        "xp_total": 0, "level": 1,
        "current_streak_days": 0, "longest_streak_days": 0,
        "achievements": [], "weekly_xp": 0,
    }


@router.post("/award-xp")
async def award_xp_endpoint(body: dict):
    """Award XP to a user — called by the demo runner to show live XP updates."""
    uid    = body.get("user_id", "")
    amount = int(body.get("xp_amount", 0))
    reason = body.get("reason", "Demo XP")
    if not uid or amount <= 0:
        return {"ok": False}
    result = await award_xp(uid, amount, reason)
    return {"ok": True, "result": result}
