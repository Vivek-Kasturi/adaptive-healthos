import { useEffect, useState } from 'react'
import { getCurrentPlans, getTodaysFoodLogs, getRecentSleepLogs, getRecentWorkoutLogs, logFood, logWorkout } from '../api/client'
import { Plan } from '../types'

interface Props { userId: string }

// ── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_NUTRITION = {
  daily_calories: 1800,
  macros: { protein_g: 140, carbs_g: 180, fat_g: 60 },
  meal_schedule: [
    { meal: 'Breakfast', time: '7:30 AM',  calories: 400, example: 'Oatmeal + 2 eggs + fruit' },
    { meal: 'Lunch',     time: '12:30 PM', calories: 550, example: 'Chicken rice bowl + salad' },
    { meal: 'Snack',     time: '3:30 PM',  calories: 200, example: 'Greek yogurt + almonds' },
    { meal: 'Dinner',    time: '7:00 PM',  calories: 650, example: 'Salmon + vegetables + quinoa' },
  ],
}

const DEMO_LOGGED_TODAY = [
  { meal: 'Breakfast', name: 'Oatmeal + 2 boiled eggs', calories: 520, protein_g: 28, carbs_g: 58, fat_g: 14, time: '7:45 AM' },
  { meal: 'Lunch',     name: 'Grilled chicken rice bowl', calories: 610, protein_g: 45, carbs_g: 68, fat_g: 16, time: '12:40 PM' },
]

const DEMO_WORKOUTS = [
  { workout_type: 'Strength — Push Day', duration_min: 45, calories_burned: 310, logged_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { workout_type: 'Cardio — 30min Run',  duration_min: 32, calories_burned: 285, logged_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { workout_type: 'Strength — Pull Day', duration_min: 48, calories_burned: 295, logged_at: new Date(Date.now() - 86400000 * 6).toISOString() },
]

const DEMO_PLANS: Plan[] = [
  { user_id: 'demo', type: 'nutrition', version: 2, created_by_agent: 'NutritionAgent', reason_for_update: 'Initial plan generated from your profile', is_active: true, created_at: new Date().toISOString(), content: DEMO_NUTRITION },
  {
    user_id: 'demo', type: 'workout', version: 1, created_by_agent: 'WorkoutAgent', reason_for_update: 'Initial plan generated from your profile', is_active: true, created_at: new Date().toISOString(),
    content: {
      weekly_schedule: [
        { day: 'Monday',    type: 'Strength', focus: 'Push — Chest, Shoulders, Triceps', duration_min: 45 },
        { day: 'Tuesday',   type: 'Cardio',   focus: '30–35min zone-2 run',              duration_min: 35 },
        { day: 'Wednesday', type: 'Rest',     focus: 'Active recovery / 20min walk',     duration_min: 20 },
        { day: 'Thursday',  type: 'Strength', focus: 'Pull — Back, Biceps',              duration_min: 45 },
        { day: 'Friday',    type: 'Strength', focus: 'Legs + Core',                      duration_min: 50 },
        { day: 'Saturday',  type: 'Cardio',   focus: '45min moderate run or cycling',    duration_min: 45 },
        { day: 'Sunday',    type: 'Rest',     focus: 'Full rest',                        duration_min: 0  },
      ]
    }
  },
  { user_id: 'demo', type: 'recovery', version: 1, created_by_agent: 'RecoveryAgent', reason_for_update: 'Adjusted after 4-hour sleep detected', is_active: true, created_at: new Date().toISOString(),
    content: {
      sleep_target_hours: 8.0,
      deload_week_every: 4,
      status: 'poor',
      recovery_tips: [
        "⚠️ Poor sleep detected — reduce today's workout intensity by 40%",
        'Avoid high-intensity training — opt for a 20min walk instead',
        'Hydrate more than usual to combat fatigue',
        'Aim for 8+ hours tonight to bounce back',
      ],
    }
  },
]

// ── Quick log modal ──────────────────────────────────────────────────────────

function QuickFoodLog({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [cal, setCal] = useState('')
  const [protein, setProtein] = useState('')
  const [meal, setMeal] = useState('Lunch')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!name || !cal) return
    setLoading(true)
    try {
      await logFood({ user_id: userId, name, calories: Number(cal), protein_g: Number(protein) || 0, carbs_g: 0, fat_g: 0, meal_type: meal.toLowerCase() })
    } catch {}
    setDone(true)
    setTimeout(() => { setOpen(false); setDone(false); setName(''); setCal(''); setProtein(''); onLogged() }, 1200)
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
      + Log Food
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-slate-900 font-bold text-lg mb-4">🥗 Log Food</h3>
        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-emerald-600 font-semibold">NutritionAgent updated your plan!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <select value={meal} onChange={e => setMeal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500">
              {['Breakfast','Lunch','Snack','Dinner'].map(m => <option key={m}>{m}</option>)}
            </select>
            <input placeholder="Food name (e.g. Chicken rice bowl)" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-400" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Calories" type="number" value={cal} onChange={e => setCal(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-400" />
              <input placeholder="Protein (g)" type="number" value={protein} onChange={e => setProtein(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-400" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setOpen(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={submit} disabled={loading || !name || !cal}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400">
                {loading ? 'Logging…' : 'Log It →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickWorkoutLog({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('Strength')
  const [dur, setDur] = useState('')
  const [cal, setCal] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!dur) return
    setLoading(true)
    try {
      await logWorkout({ user_id: userId, workout_type: type, duration_min: Number(dur), calories_burned: Number(cal) || 0 })
    } catch {}
    setDone(true)
    setTimeout(() => { setOpen(false); setDone(false); setDur(''); setCal(''); onLogged() }, 1200)
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
      + Log Workout
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-slate-900 font-bold text-lg mb-4">💪 Log Workout</h3>
        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-blue-600 font-semibold">WorkoutAgent updated your streak!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-500">
              {['Strength','Cardio','HIIT','Yoga','Run','Cycling','Rest Day'].map(t => <option key={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Duration (min)" type="number" value={dur} onChange={e => setDur(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-400" />
              <input placeholder="Calories burned" type="number" value={cal} onChange={e => setCal(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-400" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setOpen(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={submit} disabled={loading || !dur}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400">
                {loading ? 'Logging…' : 'Log It →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Plans({ userId }: Props) {
  const [plans, setPlans] = useState<Plan[]>(DEMO_PLANS)
  const [activeTab, setActiveTab] = useState<'nutrition' | 'workout' | 'recovery'>('nutrition')
  const [foodLogs, setFoodLogs] = useState<any[]>(DEMO_LOGGED_TODAY)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>(DEMO_WORKOUTS)
  const [lastSleep, setLastSleep] = useState<number>(4)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadData = () => {
    getCurrentPlans(userId).then(r => {
      if (!r.data.plans?.length) return
      const merged = DEMO_PLANS.map(demo => {
        const real = r.data.plans.find((p: any) => p.type === demo.type)
        if (!real) return demo
        let content: any = real.content || {}
        if (demo.type === 'nutrition') {
          if (!content.macros) content = { ...content, macros: { protein_g: content.protein_g ?? (demo.content as any).macros.protein_g, carbs_g: content.carbs_g ?? (demo.content as any).macros.carbs_g, fat_g: content.fat_g ?? (demo.content as any).macros.fat_g } }
          if (!content.daily_calories) content.daily_calories = real.daily_calories ?? (demo.content as any).daily_calories
          if (!content.meal_schedule?.length) content.meal_schedule = real.meal_schedule ?? (demo.content as any).meal_schedule
        }
        if (demo.type === 'workout' && !content.weekly_schedule?.length) content = { ...content, weekly_schedule: real.weekly_schedule ?? (demo.content as any).weekly_schedule }
        if (demo.type === 'recovery') {
          if (!content.sleep_target_hours) content.sleep_target_hours = real.sleep_target_hours ?? (demo.content as any).sleep_target_hours
          if (!content.recovery_tips?.length) content.recovery_tips = real.recovery_tips ?? (demo.content as any).recovery_tips
          content.status = real.status ?? content.status
        }
        return { ...demo, version: real.version ?? demo.version, created_by_agent: real.created_by_agent ?? demo.created_by_agent, reason_for_update: real.reason_for_update ?? demo.reason_for_update, created_at: real.created_at ?? demo.created_at, content } as typeof demo
      })
      setPlans(merged)
    }).catch(() => {})

    getTodaysFoodLogs(userId).then(r => {
      if (r.data.logs?.length) setFoodLogs(r.data.logs.map((l: any) => l.data || l))
    }).catch(() => {})

    getRecentWorkoutLogs(userId).then(r => {
      if (r.data.logs?.length) setRecentWorkouts(r.data.logs.map((l: any) => ({ ...(l.data || l), logged_at: l.logged_at })))
    }).catch(() => {})

    getRecentSleepLogs(userId).then(r => {
      if (r.data.logs?.length) {
        const latest = r.data.logs[0]
        setLastSleep(latest?.data?.hours ?? latest?.hours ?? 7)
      }
    }).catch(() => {})
  }

  useEffect(() => { loadData() }, [userId, refreshKey])

  const plan = plans.find(p => p.type === activeTab)
  const nutritionContent = plans.find(p => p.type === 'nutrition')?.content as any
  const totalCalories = nutritionContent?.daily_calories ?? 1800
  const loggedCalories = foodLogs.reduce((s, l) => s + (l.calories ?? 0), 0)
  const loggedProtein  = foodLogs.reduce((s, l) => s + (l.protein_g ?? 0), 0)
  const calPct = Math.min(100, Math.round((loggedCalories / totalCalories) * 100))
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const TAB_META: Record<string, { icon: string; label: string; agentColor: string; agentBg: string }> = {
    nutrition: { icon: '🥗', label: 'Nutrition', agentColor: 'text-emerald-700', agentBg: 'bg-emerald-50 border-emerald-200' },
    workout:   { icon: '💪', label: 'Workout',   agentColor: 'text-blue-700',    agentBg: 'bg-blue-50 border-blue-200'       },
    recovery:  { icon: '😴', label: 'Recovery',  agentColor: 'text-amber-700',   agentBg: 'bg-amber-50 border-amber-200'     },
  }

  const recoveryContent = plans.find(p => p.type === 'recovery')?.content as any
  const recoveryStatus = recoveryContent?.status ?? (lastSleep < 6 ? 'poor' : 'normal')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Your AI-Generated Plans</h2>
          <p className="text-slate-500 text-xs mt-0.5">Auto-updated by agents after each health log</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['nutrition', 'workout', 'recovery'] as const).map(t => (
          <button key={t} data-tab={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${activeTab === t
                ? 'bg-white text-slate-900 border border-slate-300 shadow-sm'
                : 'bg-slate-100 text-slate-500 border border-transparent hover:bg-white hover:border-slate-200'
              }`}>
            {TAB_META[t].icon} {TAB_META[t].label}
            {t === 'recovery' && recoveryStatus === 'poor' && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* ── NUTRITION TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'nutrition' && (
        <div className="space-y-4">
          {/* Calories summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-slate-900 font-bold">Today's Calories</h3>
                <p className="text-slate-400 text-xs">{today}</p>
              </div>
              <QuickFoodLog userId={userId} onLogged={() => setRefreshKey(k => k + 1)} />
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-black text-slate-900">{loggedCalories}</span>
              <span className="text-slate-400 text-sm mb-1">/ {totalCalories} kcal</span>
              <span className={`ml-auto text-sm font-bold ${calPct >= 90 ? 'text-emerald-600' : calPct >= 60 ? 'text-amber-600' : 'text-slate-400'}`}>{calPct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all duration-700 ${calPct > 110 ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(110, calPct)}%` }} />
            </div>
            {/* Macros row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Protein', logged: loggedProtein, target: nutritionContent?.macros?.protein_g ?? 140, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Carbs',   logged: foodLogs.reduce((s,l)=>s+(l.carbs_g??0),0), target: nutritionContent?.macros?.carbs_g ?? 180, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Fat',     logged: foodLogs.reduce((s,l)=>s+(l.fat_g??0),0),   target: nutritionContent?.macros?.fat_g ?? 60,  color: 'text-pink-600',  bg: 'bg-pink-50'  },
              ].map(m => (
                <div key={m.label} className={`${m.bg} rounded-xl p-2`}>
                  <div className={`text-base font-bold ${m.color}`}>{m.logged}g</div>
                  <div className="text-slate-400 text-xs">/ {m.target}g {m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Day-wise meal schedule */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 font-semibold">Today's Meal Plan</h3>
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full font-medium">by NutritionAgent</span>
            </div>
            <div className="space-y-3">
              {(nutritionContent?.meal_schedule ?? DEMO_NUTRITION.meal_schedule).map((slot: any, i: number) => {
                const logged = foodLogs.filter(l => (l.meal ?? '').toLowerCase() === slot.meal.toLowerCase())
                const loggedCal = logged.reduce((s: number, l: any) => s + (l.calories ?? 0), 0)
                const isDone = loggedCal > 0
                return (
                  <div key={i} className={`border rounded-xl p-3.5 transition-all ${isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full mt-0.5 ${isDone ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-800 text-sm font-semibold">{slot.meal}</span>
                            <span className="text-slate-400 text-xs">{slot.time}</span>
                            {isDone && <span className="text-emerald-600 text-xs font-medium">✓ Logged</span>}
                          </div>
                          <p className="text-slate-500 text-xs mt-0.5">{slot.example}</p>
                          {isDone && logged.map((l: any, j: number) => (
                            <p key={j} className="text-emerald-700 text-xs mt-1 font-medium">↳ {l.name} — {l.calories} kcal{l.protein_g ? `, ${l.protein_g}g protein` : ''}</p>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-sm font-bold ${isDone ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {isDone ? loggedCal : slot.calories} kcal
                        </span>
                        {isDone && loggedCal !== slot.calories && (
                          <p className={`text-xs ${loggedCal > slot.calories ? 'text-red-500' : 'text-emerald-500'}`}>
                            target {slot.calories}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {nutritionContent?.macros && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-slate-400 text-xs text-center">Daily targets · v{plans.find(p => p.type === 'nutrition')?.version} · Generated by NutritionAgent from your profile</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WORKOUT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'workout' && plan && (
        <div className="space-y-4">
          {/* Weekly plan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-slate-900 font-bold">Weekly Schedule</h3>
                <p className="text-slate-400 text-xs">by WorkoutAgent · v{plan.version}</p>
              </div>
              <QuickWorkoutLog userId={userId} onLogged={() => setRefreshKey(k => k + 1)} />
            </div>
            <div className="space-y-2">
              {((plan.content as any).weekly_schedule || []).map((day: any, i: number) => {
                const isToday = day.day === today.split(',')[0]
                return (
                  <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all
                    ${isToday ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : day.type === 'Rest' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${day.type === 'Strength' ? 'bg-blue-500' : day.type === 'Cardio' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>{day.day}</span>
                          {isToday && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">Today</span>}
                        </div>
                        <p className="text-slate-500 text-xs">{day.focus}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold ${day.type === 'Strength' ? 'text-blue-600' : day.type === 'Cardio' ? 'text-emerald-600' : 'text-slate-400'}`}>{day.type}</span>
                      {day.duration_min > 0 && <p className="text-slate-400 text-xs">{day.duration_min} min</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent workouts logged */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-slate-900 font-semibold mb-3">Recent Workouts Logged</h3>
            {recentWorkouts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No workouts logged yet. Use "+ Log Workout" above!</p>
            ) : (
              <div className="space-y-2">
                {recentWorkouts.slice(0, 5).map((w: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-slate-800 text-sm font-semibold">{w.workout_type}</p>
                      <p className="text-slate-400 text-xs">{w.logged_at ? new Date(w.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 font-bold text-sm">{w.duration_min} min</p>
                      {w.calories_burned > 0 && <p className="text-slate-400 text-xs">{w.calories_burned} kcal</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI update reason */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-amber-500 text-sm mt-0.5">🤖</span>
            <p className="text-slate-600 text-xs">{plan.reason_for_update}</p>
          </div>
        </div>
      )}

      {/* ── RECOVERY TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'recovery' && (
        <div className="space-y-4">
          {/* Status banner */}
          <div className={`rounded-2xl p-5 border ${recoveryStatus === 'poor' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{recoveryStatus === 'poor' ? '⚠️' : '✅'}</span>
              <div>
                <h3 className={`font-bold text-lg ${recoveryStatus === 'poor' ? 'text-red-700' : 'text-emerald-700'}`}>
                  {recoveryStatus === 'poor' ? 'Recovery Status: Poor' : 'Recovery Status: Good'}
                </h3>
                <p className={`text-sm mt-0.5 ${recoveryStatus === 'poor' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {recoveryStatus === 'poor'
                    ? `⚡ RecoveryAgent detected ${lastSleep}h sleep. Workout intensity reduced 40%.`
                    : 'RecoveryAgent: Sleep is on track. Keep up the routine!'}
                </p>
              </div>
            </div>
          </div>

          {/* Sleep metrics */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 font-semibold">Sleep Metrics</h3>
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full font-medium">by RecoveryAgent</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`rounded-xl p-3 text-center border ${lastSleep >= 7 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`text-2xl font-bold ${lastSleep >= 7 ? 'text-emerald-600' : 'text-red-600'}`}>{lastSleep}h</div>
                <div className="text-slate-500 text-xs mt-0.5">Last Night</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-slate-700">{recoveryContent?.sleep_target_hours ?? 7.5}h</div>
                <div className="text-slate-500 text-xs mt-0.5">Target</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${recoveryStatus === 'poor' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {recoveryStatus === 'poor' ? '-40%' : '100%'}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">Intensity</div>
              </div>
            </div>

            {/* Recovery tips */}
            <div className="space-y-2">
              {((recoveryContent?.recovery_tips) ?? [
                'Sleep 7–8 hours nightly for optimal recovery',
                'Hydrate — aim for 2.5–3L water daily',
                '10 minutes stretching post every workout',
              ]).map((tip: string, i: number) => (
                <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${tip.startsWith('⚠️') ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-sm mt-0.5 ${tip.startsWith('⚠️') ? 'text-red-500' : 'text-emerald-600 font-bold'}`}>
                    {tip.startsWith('⚠️') ? '' : '✓'}
                  </span>
                  <span className={`text-sm ${tip.startsWith('⚠️') ? 'text-red-700 font-medium' : 'text-slate-700'}`}>{tip.replace('⚠️ ', '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deload schedule */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700 font-semibold text-sm">Deload Week</p>
                <p className="text-slate-400 text-xs">Every {recoveryContent?.deload_week_every ?? 4} weeks</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${recoveryStatus === 'poor' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                {recoveryStatus === 'poor' ? 'Consider early deload' : 'On schedule'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
