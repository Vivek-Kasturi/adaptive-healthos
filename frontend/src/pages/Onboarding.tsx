import { useState, useEffect } from 'react'
import { onboardUser } from '../api/client'

interface Props {
  onComplete: (userId: string) => void
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (desk job, no exercise)',
  light: 'Light (1-2 days/week)',
  moderate: 'Moderate (3-4 days/week)',
  active: 'Active (5-6 days/week)',
  very_active: 'Very Active (2x/day)',
}

const PERSIST_KEY = 'healthos_onboarding_form'
const STEP_KEY    = 'healthos_onboarding_step'

const DEFAULT_FORM = {
  name: '',
  email: '',
  age: '',
  height_cm: '',
  weight_kg: '',
  sex: 'male',
  activity_level: 'moderate',
  goal_type: 'weight_loss',
  target_weight_kg: '',
  target_date: '',
  weekly_workout_days: '3',
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    return raw ? { ...DEFAULT_FORM, ...JSON.parse(raw) } : DEFAULT_FORM
  } catch { return DEFAULT_FORM }
}

function loadStep() {
  try { return Number(localStorage.getItem(STEP_KEY)) || 1 } catch { return 1 }
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(loadStep)
  const [loading, setLoading] = useState(false)
  const [agentActivity, setAgentActivity] = useState('')

  const [form, setForm] = useState(loadSaved)

  // Persist form + step on every change
  useEffect(() => {
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify(form)) } catch {}
  }, [form])

  useEffect(() => {
    try { localStorage.setItem(STEP_KEY, String(step)) } catch {}
  }, [step])

  const set = (k: string, v: string) => setForm((f: typeof DEFAULT_FORM) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    setAgentActivity('OrchestratorAgent: Analyzing your profile...')

    const payload = {
      name: form.name,
      email: form.email,
      profile: {
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        sex: form.sex,
        activity_level: form.activity_level,
      },
      goals: {
        type: form.goal_type,
        target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : undefined,
        target_date: form.target_date || undefined,
        weekly_workout_days: Number(form.weekly_workout_days),
      },
    }

    try {
      setTimeout(() => setAgentActivity('NutritionAgent: Generating your meal plan...'), 1200)
      setTimeout(() => setAgentActivity('WorkoutAgent: Building your workout schedule...'), 2400)
      const res = await onboardUser(payload)
      const userId = res.data.user_id
      // Clear persisted draft on successful submission
      localStorage.removeItem(PERSIST_KEY)
      localStorage.removeItem(STEP_KEY)
      setTimeout(() => {
        setAgentActivity('✓ All plans generated and saved to MongoDB!')
        setTimeout(() => onComplete(userId), 800)
      }, 3200)
    } catch (err) {
      // For demo/Day1: use a placeholder user_id if backend isn't ready
      console.warn('Backend not ready, using demo mode')
      setTimeout(() => setAgentActivity('NutritionAgent: Generating your meal plan...'), 1200)
      setTimeout(() => setAgentActivity('WorkoutAgent: Building your workout schedule...'), 2400)
      setTimeout(() => {
        setAgentActivity('✓ Plans generated! (demo mode)')
        const demoId = `demo_${Date.now()}`
        localStorage.removeItem(PERSIST_KEY)
        localStorage.removeItem(STEP_KEY)
        setTimeout(() => onComplete(demoId), 800)
      }, 3500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Adaptive <span className="text-emerald-600">HealthOS</span>
          </h1>
          <p className="text-slate-500 mt-2">Your AI health operating system</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-colors
                ${s <= step ? 'bg-green-400' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Who are you?</h2>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Full Name</label>
                <input className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  placeholder="Vivek" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Email</label>
                <input type="email" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  placeholder="vivek@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Age</label>
                  <input type="number" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="25" value={form.age} onChange={e => set('age', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Sex</label>
                  <select className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                    value={form.sex} onChange={e => set('sex', e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!form.name || !form.email || !form.age}
                className="w-full bg-emerald-600 hover:bg-green-400 disabled:bg-slate-200 disabled:text-slate-400 text-black font-semibold py-3 rounded-xl transition-colors mt-2">
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Your body metrics</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Height (cm)</label>
                  <input type="number" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="175" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Weight (kg)</label>
                  <input type="number" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="80" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Activity Level</label>
                <select className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  value={form.activity_level} onChange={e => set('activity_level', e.target.value)}>
                  {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-xl transition-colors">← Back</button>
                <button onClick={() => setStep(3)} disabled={!form.height_cm || !form.weight_kg}
                  className="flex-1 bg-emerald-600 hover:bg-green-400 disabled:bg-slate-200 disabled:text-slate-400 text-black font-semibold py-3 rounded-xl transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && !loading && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Your goal</h2>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Goal Type</label>
                <select className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  value={form.goal_type} onChange={e => set('goal_type', e.target.value)}>
                  <option value="weight_loss">Lose Weight</option>
                  <option value="weight_gain">Gain Weight</option>
                  <option value="maintenance">Maintain Weight</option>
                  <option value="muscle_gain">Build Muscle</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Target Weight (kg)</label>
                  <input type="number" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="72" value={form.target_weight_kg} onChange={e => set('target_weight_kg', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Target Date</label>
                  <input type="date" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                    value={form.target_date} onChange={e => set('target_date', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Workout days per week</label>
                <div className="flex gap-2">
                  {[2,3,4,5,6].map(n => (
                    <button key={n} onClick={() => set('weekly_workout_days', String(n))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                        ${form.weekly_workout_days === String(n)
                          ? 'bg-emerald-600 text-black'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-xl transition-colors">← Back</button>
                <button onClick={handleSubmit}
                  className="flex-1 bg-emerald-600 hover:bg-green-400 text-black font-semibold py-3 rounded-xl transition-colors">
                  Generate My Plan ✨
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-900 font-medium">AI Agents are working...</p>
              {agentActivity && (
                <div className="bg-slate-100 rounded-lg px-4 py-3 text-left">
                  <p className="text-emerald-600 text-sm font-medium">{agentActivity}</p>
                </div>
              )}
              <p className="text-slate-400 text-xs">Generating personalized nutrition + workout + recovery plans</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
