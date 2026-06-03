import { useEffect, useState } from 'react'
import { getGamificationState } from '../api/client'
import { GamificationState } from '../types'

interface Props { userId: string }

const ALL_ACHIEVEMENTS = [
  { id: 'first_log',          name: 'First Step',      desc: 'Log your first health entry',    icon: '👣', xp: 50   },
  { id: 'week_streak',        name: '7-Day Warrior',   desc: 'Maintain a 7-day streak',        icon: '🔥', xp: 100  },
  { id: 'month_streak',       name: '30-Day Champion', desc: 'Maintain a 30-day streak',       icon: '👑', xp: 500  },
  { id: 'goal_25pct',         name: '25% There',       desc: 'Reach 25% of your goal',         icon: '🎯', xp: 150  },
  { id: 'goal_50pct',         name: 'Halfway Hero',    desc: 'Reach 50% of your goal',         icon: '⚡', xp: 300  },
  { id: 'goal_reached',       name: 'Goal Crusher',    desc: 'Reach your target weight',       icon: '🏆', xp: 1000 },
  { id: 'logged_10_workouts', name: 'Gym Rat',         desc: 'Log 10 workouts',                icon: '💪', xp: 200  },
  { id: 'perfect_week',       name: 'Perfect Week',    desc: 'Hit all daily goals in a week',  icon: '⭐', xp: 250  },
]

const DEMO_STATE: GamificationState = {
  xp_total: 340, level: 2, current_streak_days: 5, longest_streak_days: 7,
  achievements: [
    { id: 'first_log',   name: 'First Step',    unlocked_at: '2026-06-01' },
    { id: 'week_streak', name: '7-Day Warrior', unlocked_at: '2026-05-28' },
  ],
  weekly_xp: 120,
}

export default function Achievements({ userId }: Props) {
  const [game, setGame] = useState<GamificationState>(DEMO_STATE)

  useEffect(() => {
    getGamificationState(userId).then(r => {
      if (r.data) setGame({
        xp_total: r.data.xp_total ?? 0,
        level: r.data.level ?? 1,
        current_streak_days: r.data.current_streak_days ?? 0,
        longest_streak_days: r.data.longest_streak_days ?? 0,
        weekly_xp: r.data.weekly_xp ?? 0,
        achievements: Array.isArray(r.data.achievements) ? r.data.achievements : [],
      })
    }).catch(() => {})
  }, [userId])

  const achievements  = Array.isArray(game.achievements) ? game.achievements : []
  const xpTotal       = game.xp_total ?? 0
  const level         = game.level ?? 1
  const unlockedIds   = new Set(achievements.map((a: any) => String(a.id || a)))
  const xpToNext      = Math.max(0, level * 250 - xpTotal)
  const xpProgress    = ((xpTotal % 250) / 250) * 100

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Achievements</h2>

      {/* Level card */}
      <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-slate-500 text-sm">Current Level</p>
            <p className="text-4xl font-black text-emerald-600">{level}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-sm">Total XP</p>
            <p className="text-2xl font-bold text-slate-800">{xpTotal}</p>
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${xpProgress}%` }} />
        </div>
        <p className="text-slate-400 text-xs text-right">{xpToNext} XP to Level {level + 1}</p>
      </div>

      {/* Streak + stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-orange-500">{game.current_streak_days}</div>
          <div className="text-slate-500 text-xs mt-0.5">Current Streak</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{game.longest_streak_days}</div>
          <div className="text-slate-500 text-xs mt-0.5">Best Streak</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{game.weekly_xp}</div>
          <div className="text-slate-500 text-xs mt-0.5">This Week</div>
        </div>
      </div>

      {/* Achievements grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-800 font-semibold">All Achievements</h3>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
            {unlockedIds.size} / {ALL_ACHIEVEMENTS.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ALL_ACHIEVEMENTS.map(a => {
            const unlocked = unlockedIds.has(a.id)
            const unlockedEntry = achievements.find((u: any) => String(u.id || u) === a.id)
            return (
              <div key={a.id}
                className={`border rounded-xl p-3.5 transition-all ${unlocked
                  ? 'bg-white border-emerald-200 shadow-sm'
                  : 'bg-slate-50 border-slate-200 opacity-60'
                }`}>
                <div className="flex items-start gap-2.5">
                  <span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${unlocked ? 'text-slate-900' : 'text-slate-500'}`}>{a.name}</p>
                    <p className="text-slate-400 text-xs leading-snug mt-0.5">{a.desc}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-xs font-medium ${unlocked ? 'text-emerald-600' : 'text-slate-400'}`}>+{a.xp} XP</span>
                      {unlocked && unlockedEntry?.unlocked_at && (
                        <span className="text-slate-400 text-xs">
                          {new Date(unlockedEntry.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {!unlocked && <span className="text-slate-300 text-xs">🔒 Locked</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
