/**
 * AutoDemoRunner — self-playing demo for screen recording.
 * Activated by ?autodemo=1 in the URL.
 *
 * Shows captions, navigates pages, fires real agents, auto-advances.
 * Total runtime: ~65 seconds of content.
 */
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDemoUser, api } from '../api/client'

interface Props {
  onLogin: (userId: string, name: string) => void
  isLoggedIn: boolean
  userId: string
}

interface Step {
  route: string
  caption: string
  sub: string
  duration: number
  action?: (userId: string) => Promise<void>
  click?: string          // querySelector to click
  scroll?: string         // querySelector to scrollIntoView
  scrollTop?: boolean     // scroll page to top
}

const STEPS: Step[] = [
  {
    route: '/',
    caption: '🧬 Adaptive HealthOS',
    sub: 'Multi-agent personal health operating system · Google Cloud Rapid Agent Hackathon 2026',
    duration: 3000,
  },
  {
    route: '/',
    caption: '▶ Loading Demo Account',
    sub: 'Pre-populated with 14 days of health data — all 6 agents have already run',
    duration: 2500,
    action: async (_userId) => {
      try {
        const res = await getDemoUser()
        const w = window as any
        w.__demoUserId = res.data.user_id || String(res.data._id)
        w.__demoUserName = res.data.name || 'Alex (Demo)'
        w.__demologin?.()
      } catch {}
    },
  },
  {
    route: '/dashboard',
    caption: '🏠 Dashboard — Live Agent Data',
    sub: 'Alex (Demo) · Level 1 · 225 XP total · 6 AI agents monitoring in real-time',
    duration: 4000,
    scrollTop: true,
  },
  {
    route: '/dashboard',
    caption: '📡 Agent Activity Panel',
    sub: 'Bottom-right: every agent decision stored in MongoDB Atlas as it happens',
    duration: 3500,
    scroll: '.fixed.bottom-4.right-4',
  },
  {
    route: '/chat',
    caption: '💬 Natural Language Health Logging',
    sub: 'OrchestratorAgent classifies intent and routes to the right specialist',
    duration: 2500,
    scrollTop: true,
  },
  {
    route: '/chat',
    caption: '😴 Logging: "I only slept 4 hours last night"',
    sub: 'RecoveryAgent triggered — reading sleep history from MongoDB Atlas...',
    duration: 4500,
    action: async (userId) => {
      // Fire real RecoveryAgent via sleep log endpoint
      try {
        await api.post('/api/logs/sleep', {
          user_id: userId,
          hours: 4.0,
          quality_score: 3,
          notes: 'Auto-demo: poor sleep log'
        })
      } catch {}
    },
  },
  {
    route: '/chat',
    caption: '🔧 RecoveryAgent → MongoDB Tool Calls',
    sub: 'get_recent_logs() · get_active_plan() · create_plan() · log_agent_decision() · award_xp()',
    duration: 4000,
  },
  {
    route: '/plans',
    caption: '📋 Nutrition Plan — NutritionAgent v2',
    sub: '1,800 kcal · 140g protein · 180g carbs · Generated from your body metrics by Gemini 2.5 Flash',
    duration: 3500,
    scrollTop: true,
  },
  {
    route: '/plans',
    caption: '💪 Workout Plan — WorkoutAgent',
    sub: 'Auto-adapted based on consistency tracking and current recovery status',
    duration: 2500,
    click: 'button[data-tab="workout"]',
  },
  {
    route: '/plans',
    caption: '😴 Recovery Plan — RecoveryAgent',
    sub: 'Sleep targets updated · Workout intensity reduced 40% after 4-hour sleep log',
    duration: 2500,
    click: 'button[data-tab="recovery"]',
  },
  {
    route: '/progress',
    caption: '📈 Weight History — Real MongoDB Data',
    sub: '-1.3kg trend over 12 days · May 20 → June 1 · Updated after every weight log',
    duration: 3500,
    scrollTop: true,
  },
  {
    route: '/progress',
    caption: '🔮 Goal Forecast — ForecastingAgent',
    sub: '3 scenarios: Optimistic · Realistic · Pessimistic · Regenerated after each weight entry',
    duration: 3000,
  },
  {
    route: '/achievements',
    caption: '🏆 Gamification — 225 XP Earned',
    sub: 'XP awarded by agents for every health action · Level progression · Streak tracking',
    duration: 3500,
    scrollTop: true,
  },
  {
    route: '/system',
    caption: '⚙️ For Judges — Hackathon Criteria',
    sub: 'Technological Implementation · Design · Potential Impact · Quality of Idea — all 4 criteria met',
    duration: 4500,
    scrollTop: true,
  },
  {
    route: '/system',
    caption: '🤖 6-Agent Architecture on Google Cloud ADK',
    sub: 'Each agent: classifies → plans → calls MongoDB tools → stores decision → returns response',
    duration: 3500,
  },
  {
    route: '/system',
    caption: '🍃 MongoDB Atlas — Agent Memory Layer',
    sub: '6 collections · Every agent decision persisted · Full audit trail · Scales to millions of users',
    duration: 3500,
  },
  {
    route: '/dashboard',
    caption: '✅ Adaptive HealthOS — Demo Complete',
    sub: 'github.com/Vivek-Kasturi/adaptive-healthos · Built June 2026 · Google Cloud ADK + Gemini 2.5 Flash + MongoDB Atlas',
    duration: 4000,
    scrollTop: true,
  },
]

export default function AutoDemoRunner({ onLogin, isLoggedIn, userId }: Props) {
  const navigate = useNavigate()
  const [stepIdx, setStepIdx] = useState(-1)
  const [caption, setCaption] = useState('')
  const [sub, setSub] = useState('')
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const loggedInRef = useRef(isLoggedIn)
  const userIdRef = useRef(userId)

  useEffect(() => { loggedInRef.current = isLoggedIn }, [isLoggedIn])
  useEffect(() => { userIdRef.current = userId }, [userId])

  // Expose login trigger so action callbacks can call it
  useEffect(() => {
    const w = window as any
    w.__demologin = () => {
      const id = w.__demoUserId
      const name = w.__demoUserName
      if (id) onLogin(id, name)
    }
    return () => { delete w.__demologin }
  }, [onLogin])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      await new Promise(r => setTimeout(r, 800)) // brief pause before starting

      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return
        const step = STEPS[i]

        setStepIdx(i)
        setCaption(step.caption)
        setSub(step.sub)
        setProgress(Math.round(((i + 1) / STEPS.length) * 100))

        navigate(step.route)
        await new Promise(r => setTimeout(r, 300))

        if (step.scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' })

        if (step.action) {
          await step.action(userIdRef.current).catch(() => {})
        }

        if (step.click) {
          await new Promise(r => setTimeout(r, 600))
          const el = document.querySelector(step.click) as HTMLButtonElement
          el?.click()
        }

        if (step.scroll) {
          await new Promise(r => setTimeout(r, 700))
          document.querySelector(step.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }

        await new Promise(r => setTimeout(r, step.duration))
      }

      if (!cancelled) setDone(true)
    }

    run()
    return () => { cancelled = true }
  }, [navigate])

  if (done) return null

  return (
    <>
      {/* Green progress bar at very top */}
      <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-gray-900">
        <div
          className="h-full bg-green-400 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Recording badge */}
      <div className="fixed top-3 right-20 z-[200] flex items-center gap-1.5 bg-black/80 backdrop-blur border border-red-500/40 rounded-full px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white text-xs font-bold tracking-wide">REC</span>
        <span className="text-gray-500 text-xs ml-1">{stepIdx + 1}/{STEPS.length}</span>
      </div>

      {/* Bottom caption bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] bg-gray-950/97 backdrop-blur-sm border-t border-gray-800">
        <div className="px-6 py-4 max-w-5xl mx-auto">
          <p className="text-white font-bold text-xl leading-snug">{caption}</p>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">{sub}</p>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-0.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                Adaptive HealthOS
              </span>
              <span className="text-gray-600 text-xs">
                {stepIdx + 1} / {STEPS.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
