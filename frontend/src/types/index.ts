export interface UserProfile {
  age: number
  height_cm: number
  weight_kg: number
  sex: 'male' | 'female' | 'other'
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
}

export interface UserGoals {
  type: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain'
  target_weight_kg?: number
  target_date?: string
  weekly_workout_days: number
}

export interface User {
  _id: string
  name: string
  email: string
  profile: UserProfile
  goals: UserGoals
  created_at: string
}

export interface Plan {
  user_id: string
  type: 'nutrition' | 'workout' | 'recovery'
  version: number
  created_by_agent: string
  reason_for_update: string
  content: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface AgentDecision {
  agent_name: string
  trigger: string
  decision: string
  actions_taken: string[]
  timestamp: string
}

export interface GamificationState {
  xp_total: number
  level: number
  current_streak_days: number
  longest_streak_days: number
  achievements: Achievement[]
  weekly_xp: number
}

export interface Achievement {
  id: string
  name: string
  unlocked_at: string
}

export interface Forecast {
  current_weight_kg: number
  target_weight_kg: number
  projected_completion_date: string
  weekly_trend_kg: number
  confidence: 'low' | 'medium' | 'high'
  scenarios: {
    optimistic: string
    realistic: string
    pessimistic: string
  }
  generated_at: string
}

export interface HealthLog {
  _id: string
  user_id: string
  type: 'food' | 'workout' | 'weight' | 'sleep'
  timestamp: string
  data: Record<string, unknown>
  agent_processed: boolean
  agent_response?: string
}
