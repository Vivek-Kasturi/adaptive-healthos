from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class UserProfile(BaseModel):
    age: int
    height_cm: float
    weight_kg: float
    sex: Literal["male", "female", "other"]
    activity_level: Literal["sedentary", "light", "moderate", "active", "very_active"]


class UserGoals(BaseModel):
    type: Literal["weight_loss", "weight_gain", "maintenance", "muscle_gain"]
    target_weight_kg: Optional[float] = None
    target_date: Optional[str] = None
    weekly_workout_days: int = 3


class OnboardingRequest(BaseModel):
    name: str
    email: str
    profile: UserProfile
    goals: UserGoals


class FoodLogRequest(BaseModel):
    user_id: str
    name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]


class WorkoutLogRequest(BaseModel):
    user_id: str
    workout_type: str
    duration_min: int
    calories_burned: Optional[float] = None
    notes: Optional[str] = None


class WeightLogRequest(BaseModel):
    user_id: str
    weight_kg: float
    notes: Optional[str] = None


class SleepLogRequest(BaseModel):
    user_id: str
    hours: float
    quality_score: int = 7
    notes: Optional[str] = None


class ChatRequest(BaseModel):
    user_id: str
    message: str


class AgentResponse(BaseModel):
    agent_name: str
    action: str
    result: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
