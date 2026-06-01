from fastapi import APIRouter
from tools.mongodb_tools import get_gamification_state

router = APIRouter()


@router.get("/{user_id}")
async def get_gamification(user_id: str):
    state = await get_gamification_state(user_id)
    return state or {
        "xp_total": 0, "level": 1,
        "current_streak_days": 0, "longest_streak_days": 0,
        "achievements": [], "weekly_xp": 0,
    }
