/**
 * AutoDemoRunner — self-playing 3-minute hackathon demo.
 * ?autodemo=1 — mounted at App top-level so it survives all screen transitions.
 *
 * Onboarding is shown as a self-contained visual overlay (no dependency on
 * the real Onboarding component state), so typing is always visible.
 *
 * TTS voiceover: each step calls /api/demo/tts on the backend, which runs
 * macOS `say` — perfectly synced because the browser triggers it.
 * Pass ?voice=Samantha&rate=165 in the URL to control voice/speed.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDemoProfiles, api } from '../api/client'

interface Props {
  onLogin: (userId: string, name: string) => void
  userId: string
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── TTS: fires macOS say via backend — perfectly synced with browser steps ──
const DEMO_VOICE = new URLSearchParams(window.location.search).get('voice') ?? 'Samantha'
const DEMO_RATE  = parseInt(new URLSearchParams(window.location.search).get('rate') ?? '165', 10)

async function speak(text: string) {
  try {
    await fetch('/api/demo/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: DEMO_VOICE, rate: DEMO_RATE }),
    })
  } catch { /* non-fatal — TTS is optional */ }
}

// ── Timeout wrapper — prevents any API call from hanging the demo ──────────
async function timed<T>(promise: Promise<T>, ms = 8000): Promise<T | undefined> {
  try {
    return await Promise.race([
      promise,
      wait(ms).then(() => { throw new Error('demo-timeout') }),
    ])
  } catch { return undefined }
}

// ── DOM helpers ────────────────────────────────────────────────────────────
function getCenter(sel: string) {
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
function getRect(sel: string) {
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}
async function typeInto(sel: string, text: string, delay = 58) {
  const el = document.querySelector(sel) as HTMLInputElement | null
  if (!el) return
  el.focus()
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  for (const ch of text) {
    setter?.call(el, el.value + ch)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    await wait(delay)
  }
}
function clickEl(sel: string) { (document.querySelector(sel) as HTMLElement | null)?.click() }

// ── Cursor ─────────────────────────────────────────────────────────────────
interface CS { x: number; y: number; visible: boolean; clicking: boolean }

function DemoCursor({ s }: { s: CS }) {
  if (!s.visible) return null
  return (
    <div className="fixed z-[500] pointer-events-none"
      style={{ left: s.x - 12, top: s.y - 12, transition: 'left 0.45s ease, top 0.45s ease' }}>
      <div className={`w-6 h-6 rounded-full border-2 border-white shadow-xl transition-transform duration-150
        ${s.clicking ? 'scale-75 bg-emerald-700' : 'scale-100 bg-emerald-500'}`} />
      {s.clicking && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
    </div>
  )
}

// ── Spotlight ──────────────────────────────────────────────────────────────
function Spotlight({ r }: { r: { x: number; y: number; w: number; h: number } | null }) {
  if (!r) return null
  return (
    <div className="fixed z-[490] pointer-events-none rounded-xl"
      style={{ left: r.x - 8, top: r.y - 8, width: r.w + 16, height: r.h + 16,
        border: '2px solid rgba(16,185,129,0.85)',
        boxShadow: '0 0 0 3px rgba(16,185,129,0.3), 0 0 24px rgba(16,185,129,0.35)',
        transition: 'all 0.4s ease' }} />
  )
}

// ── XP pop ─────────────────────────────────────────────────────────────────
function XpPop({ amount }: { amount: number }) {
  return (
    <div className="fixed top-20 right-10 z-[510] pointer-events-none animate-bounce">
      <div className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-full shadow-xl text-base">
        +{amount} XP ⚡
      </div>
    </div>
  )
}

// ── Onboarding visual overlay (self-contained — no real form submission) ───
interface OBProps {
  step: number
  fields: { name: string; email: string; age: string; height: string; weight: string; goal: string; target: string }
}
function OnboardingOverlay({ step, fields }: OBProps) {
  const steps = ['Personal Info', 'Body Metrics', 'Goal']
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50 z-[480] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-slate-900">Adaptive <span className="text-emerald-600">HealthOS</span></h1>
          <p className="text-slate-500 mt-1 text-sm">Your AI health operating system</p>
          <div className="flex justify-center gap-2 mt-4">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 w-16 rounded-full transition-colors ${i < step ? 'bg-emerald-500' : i === step - 1 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Step 1 — Who are you?</h2>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Full Name</label>
                <div id="ob-name" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm min-h-[40px]">{fields.name}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Email</label>
                <div id="ob-email" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm min-h-[40px]">{fields.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Age</label>
                  <div id="ob-age" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm min-h-[40px]">{fields.age}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Sex</label>
                  <div className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm">Male</div>
                </div>
              </div>
              <button className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl">Continue →</button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Step 2 — Body Metrics</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Height (cm)</label>
                  <div id="ob-height" className="w-full bg-slate-50 border border-emerald-400 rounded-xl px-3 py-2.5 text-slate-900 text-sm min-h-[40px] ring-2 ring-emerald-100">{fields.height}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Weight (kg)</label>
                  <div id="ob-weight" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm min-h-[40px]">{fields.weight}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Activity Level</label>
                <div className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm">Moderate (3–4 days/week)</div>
              </div>
              <button className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl">Continue →</button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Step 3 — Your Goal</h2>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Goal Type</label>
                <div className="w-full bg-slate-50 border border-emerald-400 rounded-xl px-3 py-2.5 text-slate-900 text-sm ring-2 ring-emerald-100">{fields.goal}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Target Weight (kg)</label>
                  <div id="ob-target" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm min-h-[40px]">{fields.target}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Workout days/week</label>
                  <div className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm">4</div>
                </div>
              </div>
              <button className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl">✨ Generate My Plan</button>
            </div>
          )}
          {step === 4 && (
            <div className="py-8 text-center space-y-5">
              <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-900 font-bold text-lg">AI Agents Generating Your Plans...</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-left space-y-2">
                <p className="text-emerald-700 text-sm font-medium">🧠 OrchestratorAgent: Analyzing your profile...</p>
                <p className="text-emerald-700 text-sm font-medium">🥗 NutritionAgent: Calculating 1,800 kcal/day target...</p>
                <p className="text-blue-700 text-sm font-medium">💪 WorkoutAgent: Designing 4-day weekly schedule...</p>
                <p className="text-amber-700 text-sm font-medium">😴 RecoveryAgent: Setting sleep + recovery targets...</p>
              </div>
              <p className="text-slate-400 text-xs">Powered by Gemini 2.5 Flash on Google Cloud ADK</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Profile switcher ────────────────────────────────────────────────────────
const PROFILES = [
  { name: 'Alex Chen',  tag: 'Weight Loss',   emoji: '⚖️', xp: 340, level: 2, goal: '82kg → 72kg', ring: 'border-emerald-300 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
  { name: 'Maya Patel', tag: 'Muscle Gain',   emoji: '💪', xp: 580, level: 3, goal: '58kg → 63kg', ring: 'border-blue-300 bg-blue-50',       badge: 'bg-blue-100 text-blue-800'       },
  { name: 'Sam Rivera', tag: 'Marathon Prep', emoji: '🏃', xp: 920, level: 4, goal: 'Endurance',    ring: 'border-purple-300 bg-purple-50',   badge: 'bg-purple-100 text-purple-800'   },
]
function ProfileOverlay({ active }: { active: number }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[480] p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg">
        <h2 className="text-slate-900 font-bold text-lg mb-1">👥 Multiple User Profiles</h2>
        <p className="text-slate-500 text-sm mb-5">Each profile has independent plans, history, and AI agents — all stored in MongoDB Atlas.</p>
        <div className="space-y-3">
          {PROFILES.map((p, i) => (
            <div key={i} className={`border-2 rounded-xl p-4 transition-all duration-300 ${active === i ? p.ring + ' shadow-md scale-[1.02]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.badge}`}>{p.tag}</span>
                    {active === i && <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">● Viewing</span>}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">Goal: {p.goal}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-800 text-sm">Level {p.level}</div>
                  <div className="text-slate-400 text-xs">{p.xp} XP</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AutoDemoRunner({ onLogin, userId }: Props) {
  const navigate  = useNavigate()
  const navRef    = useRef(navigate)
  const ranRef    = useRef(false)
  const uidRef    = useRef(userId)
  const profsRef  = useRef<any[]>([])

  const TOTAL = 24
  const [stepIdx, setStepIdx]   = useState(0)
  const [caption, setCaption]   = useState('🔐 Login — Secure, Per-User Data')
  const [sub, setSub]           = useState('Each user has their own profile, plans, and agents stored in MongoDB Atlas')
  const [progress, setProgress] = useState(0)
  const [done, setDone]         = useState(false)

  // Overlays
  const [obStep, setObStep]     = useState(0)   // 0=hidden, 1-4=onboarding steps
  const [obFields, setObFields] = useState({ name: '', email: '', age: '', height: '', weight: '', goal: '', target: '' })
  const [profOverlay, setProfOverlay] = useState(false)
  const [activeProfIdx, setActiveProfIdx] = useState(0)
  const [xpPop, setXpPop]       = useState<number | null>(null)
  const [cursor, setCursor]     = useState<CS>({ x: 728, y: 400, visible: false, clicking: false })
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => { navRef.current = navigate }, [navigate])
  useEffect(() => { uidRef.current = userId },   [userId])
  useEffect(() => {
    const w = window as any
    w.__demologin = (id: string, name: string) => onLogin(id, name)
    return () => { delete w.__demologin }
  }, [onLogin])

  // Helpers
  const step = (i: number, cap: string, s: string) => {
    setStepIdx(i); setCaption(cap); setSub(s)
    setProgress(Math.round((i / TOTAL) * 100))
  }
  const showXp = (n: number) => { setXpPop(n); setTimeout(() => setXpPop(null), 2200) }

  const moveTo = async (sel: string, delay = 400) => {
    await wait(delay)
    const c = getCenter(sel)
    if (c) setCursor(s => ({ ...s, x: c.x, y: c.y, visible: true, clicking: false }))
    await wait(350)
  }
  const cursorClick = async (sel: string) => {
    await moveTo(sel, 250)
    setCursor(s => ({ ...s, clicking: true }))
    await wait(220); clickEl(sel)
    setCursor(s => ({ ...s, clicking: false }))
    await wait(250)
  }
  const spot = (sel: string, ms = 2200) => {
    const r = getRect(sel)
    if (r) { setSpotlight(r); setTimeout(() => setSpotlight(null), ms) }
  }

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const run = async () => {

      // ── 0. Login page ────────────────────────────────────────────────────
      navRef.current('/')
      step(0, '🔐 Login Page — Secure, Per-User Access', 'Each user has independent profiles, plans, and agent history stored in MongoDB Atlas')
      setCursor(s => ({ ...s, visible: true, x: 728, y: 380 }))
      await wait(2500)

      // point at demo button
      await moveTo('#demo-login-btn', 400)
      spot('#demo-section', 2800)
      step(1, '🎬 Demo Account — 14 Days of Pre-loaded Data', 'Alex Chen · Weight Loss · All 6 agents already run · Pre-populated MongoDB collections')
      await wait(1000)

      // ── 1. Onboarding overlay — visual only ──────────────────────────────
      // Step 1: personal info
      step(2, '📝 New User — Step 1: Personal Info', 'Typing name and email... OrchestratorAgent will personalise your plan from this data')
      setObStep(1)
      await wait(800)

      // Type name
      spot('#ob-name', 3000)
      await moveTo('#ob-name', 400)
      for (const ch of 'Jordan Lee') {
        setObFields(f => ({ ...f, name: f.name + ch }))
        await wait(65)
      }
      await wait(300)
      await moveTo('#ob-email', 250)
      spot('#ob-email', 2500)
      for (const ch of 'jordan@demo.com') {
        setObFields(f => ({ ...f, email: f.email + ch }))
        await wait(58)
      }
      await wait(300)
      await moveTo('#ob-age', 250)
      spot('#ob-age', 1500)
      for (const ch of '26') {
        setObFields(f => ({ ...f, age: f.age + ch }))
        await wait(120)
      }
      await wait(600)

      // Step 2: metrics
      step(3, '📐 Step 2 — Body Metrics', 'Height + weight + activity level → NutritionAgent calculates your exact daily calorie target')
      setObStep(2)
      await wait(700)
      spot('#ob-height', 3000)
      await moveTo('#ob-height', 400)
      for (const ch of '178') {
        setObFields(f => ({ ...f, height: f.height + ch }))
        await wait(110)
      }
      await wait(300)
      await moveTo('#ob-weight', 250)
      spot('#ob-weight', 2000)
      for (const ch of '85') {
        setObFields(f => ({ ...f, weight: f.weight + ch }))
        await wait(130)
      }
      await wait(700)

      // Step 3: goal
      step(4, '🎯 Step 3 — Goal Setting', 'WorkoutAgent designs your weekly schedule based on goal type and available training days')
      setObStep(3)
      await wait(700)
      setObFields(f => ({ ...f, goal: 'Lose Weight' }))
      await wait(500)
      spot('#ob-target', 2500)
      await moveTo('#ob-target', 400)
      for (const ch of '75') {
        setObFields(f => ({ ...f, target: f.target + ch }))
        await wait(130)
      }
      await wait(700)

      // Generating plans
      step(5, '🤖 AI Agents Generating Your Plans...', 'NutritionAgent · WorkoutAgent · RecoveryAgent — all running on Google Cloud ADK + Gemini 2.5 Flash')
      setObStep(4)
      speak("OrchestratorAgent fires NutritionAgent and WorkoutAgent simultaneously. Gemini 2.5 Flash generates your personalized meal and workout plans, saved directly to MongoDB Atlas.")
      await wait(10000)
      setObStep(0)

      // ── 2. Load Alex demo ────────────────────────────────────────────────
      step(6, '🏠 Dashboard — Alex Chen (Weight Loss)', 'Level 2 · 340 XP · 7-day streak · 6 agents active · All data persisted in MongoDB Atlas')
      try {
        const res = await getDemoProfiles()
        profsRef.current = res.data.profiles ?? []
        const alex = profsRef.current.find((p: any) => p.email === 'alex@demo.healthos') ?? profsRef.current[0]
        if (alex) { ;(window as any).__demologin?.(alex.user_id, alex.name); await wait(1200) }
      } catch {
        try { const r = await api.get('/api/users/demo-user'); ;(window as any).__demologin?.(r.data.user_id, r.data.name) } catch {}
      }
      navRef.current('/dashboard')
      await wait(700); window.scrollTo({ top: 0 })
      speak("Meet Alex Chen — 14 days of real health data. Level 2, 340 XP, a 7-day streak, and all 6 agents live, connected to MongoDB Atlas.")
      await wait(1800)
      spot('.bg-white.border.border-slate-200.rounded-xl.p-4.shadow-sm', 2500)
      await wait(7000)

      // Agent panel
      step(7, '📡 Agent Activity Panel — Every Decision Logged', 'Live panel shows real agent decisions → stored in MongoDB Atlas agent_decisions collection')
      await moveTo('.fixed.bottom-4.right-4', 800)
      spot('.fixed.bottom-4.right-4', 3000)
      speak("The Agent Activity Panel logs every agent decision to MongoDB — tool calls, reasoning, and actions. Fully auditable.")
      await wait(9000)

      // ── 3. Chat — food log ───────────────────────────────────────────────
      navRef.current('/chat')
      step(8, '💬 Chat — Logging Breakfast', 'Watch the cursor type in real-time... NutritionAgent updates your daily calorie count instantly')
      await wait(900); window.scrollTo({ top: 0 })
      await moveTo('#chat-input', 600)
      spot('#chat-input', 6000)
      await typeInto('#chat-input', 'I had oatmeal with 2 boiled eggs for breakfast', 62)
      await wait(600)
      await timed(api.post('/api/logs/food', { user_id: uidRef.current, name: 'Oatmeal + 2 boiled eggs', calories: 520, protein_g: 28, carbs_g: 58, fat_g: 14, meal_type: 'breakfast' }))
      await cursorClick('#chat-send')
      step(9, '🥗 NutritionAgent → MongoDB Tool Calls', 'get_active_plan() · get_daily_nutrition_totals() · log_agent_decision() · award_xp() — all live')
      speak("OrchestratorAgent routes to NutritionAgent, which reads your active plan, calculates today's totals, logs the decision, and awards XP — all in under 3 seconds. Real agentic behavior, not a chatbot.")
      showXp(10)
      await wait(11000)

      // ── 4. Chat — sleep log ───────────────────────────────────────────────
      step(10, '😴 Chat — Poor Sleep Detected', 'Typing sleep log... RecoveryAgent will reduce workout intensity 40% and update recovery plan')
      await moveTo('#chat-input', 500)
      spot('#chat-input', 6000)
      await typeInto('#chat-input', 'I only slept 4 hours last night, feeling exhausted', 62)
      await wait(600)
      await timed(api.post('/api/logs/sleep', { user_id: uidRef.current, hours: 4, quality_score: 3 }))
      await cursorClick('#chat-send')
      step(11, '⚠️ RecoveryAgent → Intensity Reduced 40%', 'get_recent_logs() · get_active_plan() · create_plan() → Recovery plan updated in MongoDB Atlas')
      speak("Cross-agent reactivity. Logging 4 hours of sleep triggers RecoveryAgent, which cuts workout intensity by 40 percent, regenerates the recovery plan, and saves updated tips to Atlas — automatically.")
      showXp(10)
      await wait(11000)

      // ── 5. Chat — workout log ────────────────────────────────────────────
      step(12, '💪 Chat — Logging a Workout', 'WorkoutAgent checks your streak, awards 20 XP, and verifies consistency with your plan')
      await moveTo('#chat-input', 400)
      spot('#chat-input', 5500)
      await typeInto('#chat-input', 'Just finished a 35 minute run this morning', 62)
      await wait(600)
      await timed(api.post('/api/logs/workout', { user_id: uidRef.current, workout_type: 'Cardio — 35min Run', duration_min: 35, calories_burned: 310 }))
      await cursorClick('#chat-send')
      step(13, '🏃 WorkoutAgent → Streak Updated!', 'get_active_plan() · log_agent_decision() · award_xp() · update_streak() — 8-day streak!')
      speak("WorkoutAgent extends Alex's streak to 8 days. AccountabilityAgent awards 20 XP and logs the full tool trace to MongoDB — workout type, duration, and calories, all timestamped.")
      showXp(20)
      await wait(10000)

      // ── 6. Nutrition page ─────────────────────────────────────────────────
      navRef.current('/plans')
      step(14, '🥗 Nutrition — Day-Wise Meals + Live Calorie Tracking', "Today's meal schedule with planned vs logged calories. Macros tracked per meal in real-time.")
      await wait(1000); window.scrollTo({ top: 0 })
      speak("The Plans page shows 3 AI-generated plans — nutrition, workout, and recovery — each versioned and attributed to the exact agent that created it.")
      await moveTo('.bg-white.border.border-slate-200.rounded-2xl', 1200)
      spot('.bg-white.border.border-slate-200.rounded-2xl', 2500)
      await wait(9000)

      // ── 7. Workout tab ────────────────────────────────────────────────────
      await cursorClick('button[data-tab="workout"]')
      step(15, '💪 Workout — Weekly Plan + Today Highlighted', "Today's session shown with a blue ring. Recent logged workouts pulled from MongoDB.")
      speak("The workout plan is personalized to 4 days per week — push, pull, legs, cardio — based on Alex's goal and activity level.")
      spot('button[data-tab="workout"]', 1200)
      await wait(8000)

      // ── 8. Recovery tab ───────────────────────────────────────────────────
      await cursorClick('button[data-tab="recovery"]')
      step(16, '😴 Recovery — ⚠️ POOR Status from Sleep Log', 'RecoveryAgent: 4h sleep → intensity -40% → updated recovery tips saved in MongoDB Atlas')
      speak("The Recovery tab shows the key proof: poor sleep detected, intensity cut 40 percent. RecoveryAgent's auditable live decision — with agent attribution, reason, and timestamp.")
      spot('button[data-tab="recovery"]', 1200)
      await wait(9000)

      // ── 9. Progress ───────────────────────────────────────────────────────
      navRef.current('/progress')
      step(17, '📈 Progress — Weight Trend + 3-Scenario Forecast', 'ForecastingAgent: Optimistic Aug 1 · Realistic Aug 12 · Pessimistic Sep 5 — auto-updates after every log')
      await wait(700); window.scrollTo({ top: 0 })
      speak("Progress shows the weight trend chart and ForecastingAgent's 3-scenario projection — optimistic, realistic, and pessimistic goal completion dates — recalculated after every weight log.")
      await wait(9000)

      // ── 10. Achievements ──────────────────────────────────────────────────
      navRef.current('/achievements')
      step(18, '🏆 Achievements — XP Awarded Live', 'Every agent action awards XP. Watch it update as agents run — persisted in MongoDB gamification collection')
      await wait(700); window.scrollTo({ top: 0 })
      speak("Every agent action awards XP. Achievements unlock at health milestones. The entire gamification state lives in MongoDB and updates live across sessions.")
      await timed(api.post('/api/gamification/award-xp', { user_id: uidRef.current, xp_amount: 50, reason: 'Demo complete' }))
      showXp(50)
      await wait(8000)

      // ── 11. Profile switcher ──────────────────────────────────────────────
      setProfOverlay(true); setActiveProfIdx(0)
      step(19, '👥 3 Independent Profiles — Each Fully Isolated', 'Alex · Maya · Sam — different goals, plans, agents, and MongoDB data. Watch the switch.')
      speak("HealthOS supports fully isolated user profiles. Each has completely independent agents, plans, and MongoDB data.")
      await wait(5500)
      setActiveProfIdx(1)
      step(20, '💪 Maya Patel — Muscle Gain Mode', 'Level 3 · 580 XP · 2,800 kcal/day · 5x heavy lifting/week — completely separate agent state')
      speak("Maya Patel — muscle gain mode. Level 3, 580 XP. 2,800 calories a day, 5-day heavy lifting split.")
      await wait(6500)
      setActiveProfIdx(2)
      step(21, '🏃 Sam Rivera — Marathon Training Mode', 'Level 4 · 920 XP · 21-day streak · 100km long run Saturdays — WorkoutAgent tailored for endurance')
      speak("Sam Rivera — marathon training. Level 4, 920 XP, a 21-day streak. Same architecture, zero data overlap between users.")
      await wait(6500)
      setProfOverlay(false)

      // ── 12. Load Maya ─────────────────────────────────────────────────────
      const maya = profsRef.current.find((p: any) => p.email === 'maya@demo.healthos')
      if (maya) { ;(window as any).__demologin?.(maya.user_id, maya.name); await wait(800) }
      navRef.current('/dashboard')
      step(22, '💪 Maya\'s Dashboard — Different Plans, Same Agents', '2,800 kcal/day · 5x/week strength · Independent MongoDB data from Alex')
      await wait(3500)

      // ── 13. System/Judges page ────────────────────────────────────────────
      navRef.current('/system')
      step(23, '⚙️ For Judges — All 4 Criteria Met', 'Technological Implementation · Design · Potential Impact · Quality of Idea — 100 pts total')
      await wait(700); window.scrollTo({ top: 0 })
      speak("The System page maps directly to the judging criteria. Gemini 2.5 Flash for Google Cloud AI. Google ADK for real agentic behavior. MongoDB Atlas as the MCP data layer. All meaningfully integrated — not decorative.")
      await moveTo('.bg-white.border.border-slate-200.rounded-2xl.p-6', 1200)
      spot('.bg-white.border.border-slate-200.rounded-2xl.p-6', 2500)
      await wait(10000)

      // ── End ───────────────────────────────────────────────────────────────
      const sam = profsRef.current.find((p: any) => p.email === 'sam@demo.healthos')
      if (sam) { ;(window as any).__demologin?.(sam.user_id, sam.name); await wait(800) }
      navRef.current('/dashboard')
      step(24, '✅ Adaptive HealthOS — Demo Complete', 'Gemini 2.5 Flash + Google Cloud ADK + MongoDB Atlas · github.com/Vivek-Kasturi/adaptive-healthos')
      await wait(700); window.scrollTo({ top: 0 })
      setCursor(s => ({ ...s, visible: false }))
      speak("Adaptive HealthOS — where AI agents don't just respond. They act.")
      await wait(8000)

      setDone(true)
    }

    run()
  }, []) // eslint-disable-line

  if (done) return null

  return (
    <>
      {/* Onboarding visual overlay */}
      {obStep > 0 && <OnboardingOverlay step={obStep} fields={obFields} />}

      {/* Profile switcher */}
      {profOverlay && <ProfileOverlay active={activeProfIdx} />}

      {/* Cursor */}
      <DemoCursor s={cursor} />

      {/* Spotlight */}
      <Spotlight r={spotlight} />

      {/* XP pop */}
      {xpPop && <XpPop amount={xpPop} />}

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[460] h-1 bg-slate-100">
        <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>

      {/* REC badge */}
      <div className="fixed top-3 right-4 z-[460] flex items-center gap-1.5 bg-white border border-red-300 rounded-full px-3 py-1.5 shadow-md">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-slate-700 text-xs font-bold tracking-wider">REC</span>
        <span className="text-slate-400 text-xs ml-1">{stepIdx}/{TOTAL}</span>
      </div>

      {/* Caption bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[460] bg-white/97 backdrop-blur border-t border-slate-200 shadow-lg">
        <div className="px-6 py-4 max-w-5xl mx-auto">
          <p className="text-slate-900 font-bold text-lg leading-snug">{caption}</p>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">{sub}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-medium shrink-0">
              {stepIdx} / {TOTAL}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
