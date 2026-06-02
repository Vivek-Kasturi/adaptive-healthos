import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Users ──────────────────────────────────────────────────────────────────

export const onboardUser = (data: {
  name: string
  email: string
  profile: object
  goals: object
}) => api.post('/api/users/onboard', data)

export const getUser = (userId: string) =>
  api.get(`/api/users/${userId}`)

export const getUserByEmail = (email: string) =>
  api.get(`/api/users/by-email?email=${encodeURIComponent(email)}`)

export const getDemoUser = () =>
  api.get('/api/users/demo-user')

export const loginUser = (email: string, password: string) =>
  api.post('/api/users/login', { email, password })

export const setPassword = (userId: string, newPassword: string) =>
  api.post('/api/users/set-password', { user_id: userId, new_password: newPassword })

// ── Logs ───────────────────────────────────────────────────────────────────

export const logFood = (data: object) => api.post('/api/logs/food', data)
export const logWorkout = (data: object) => api.post('/api/logs/workout', data)
export const logWeight = (data: object) => api.post('/api/logs/weight', data)
export const logSleep = (data: object) => api.post('/api/logs/sleep', data)

// ── Plans ──────────────────────────────────────────────────────────────────

export const getCurrentPlans = (userId: string) =>
  api.get(`/api/plans/current?user_id=${userId}`)

// ── Progress ───────────────────────────────────────────────────────────────

export const getProgressSummary = (userId: string) =>
  api.get(`/api/progress/summary?user_id=${userId}`)

// ── Forecasts ──────────────────────────────────────────────────────────────

export const getLatestForecast = (userId: string) =>
  api.get(`/api/forecasts/latest?user_id=${userId}`)

// ── Gamification ───────────────────────────────────────────────────────────

export const getGamificationState = (userId: string) =>
  api.get(`/api/gamification/${userId}`)

// ── Agent Decisions ────────────────────────────────────────────────────────

export const getAgentDecisions = (userId: string) =>
  api.get(`/api/agent-decisions/${userId}`)

// ── Health Check ───────────────────────────────────────────────────────────

export const healthCheck = () => api.get('/health')

// ── WebSocket helper ───────────────────────────────────────────────────────

export const createChatSocket = (userId: string): WebSocket => {
  const wsUrl = (BASE_URL.replace('http', 'ws'))
  return new WebSocket(`${wsUrl}/ws/chat/${userId}`)
}
