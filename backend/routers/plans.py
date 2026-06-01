from fastapi import APIRouter
from tools.mongodb_tools import get_active_plan

router = APIRouter()


@router.get("/current")
async def get_current_plans(user_id: str):
    nutrition = await get_active_plan(user_id, "nutrition")
    workout = await get_active_plan(user_id, "workout")
    recovery = await get_active_plan(user_id, "recovery")
    plans = [p for p in [nutrition, workout, recovery] if p]
    return {"plans": plans}
