import { useEffect, useState } from 'react'
import { getGamificationState } from '../api/client'
import { GamificationState } from '../types'

interface Props { userId: string }

const ALL_ACHIEVEMENTS = [
  { id: 'first_log', name: 'First Step', desc: 'Log your first health entry', icon: '👣', xp: 50 },
  { id: 'week_streak', name: '7-Day Warrior', desc: 'Maintain a 7-day streak', icon: '🔥', xp: 100 },
  { id: 'month_streak', name: '30-Day Champion', desc: 'Maintain a 30-day streak', icon: '👑', xp: 500 },
  { id: 'goal_25pct', name: '25% There', desc: 'Reach 25% of your goal', icon: '🎯', xp: 150 },
  { id: 'goal_50pct', name: 'Halfway Hero', desc: 'Reach 50% of your goal', icon: '⚡', xp: 300 },
  { id: 'goal_reached', name: 'Goal Crusher', desc: 'Reach your target weight', icon: '🏆', xp: 1000 },
  { id: 'logged_10_workouts', name: 'Gym Rat', desc: 'Log 10 workouts', icon: '💪', xp: 200 },
  { id: 'perfect_week', name: 'Perfect Week', desc: 'Hit all daily goals in a week', icon: '⭐', xp: 250 },
]

const DEMO_STATE: GamificationState = {
  xp_total: 340,
  level: 2,
  current_streak_days: 5,
  longest_streak_days: 7,
  achievements: [
    { id: 'first_log', name: 'First Step', unlocked_at: '2026-06-01' },
    { id: 'week_streak', name: '7-Day Warrior', unlocked_at: '2026-05-28' },
  ],
  weekly_xp: 120,
}

export default function Achievements({ userId }: Props) {
  const [game, setGame] = useState<GamificationState>(DEMO_STATE)

  useEffect(() => {
    getGamificationState(userId).then(r => { if (r.data) setGame(r.data) }).catch(() => {})
  }, [userId])

  const unlockedIds = new Set(game.achievements.map(a => a.id))
  const xpToNext = game.level * 250 - game.xp_total
  const xpProgress = ((game.xp_total % 250) / 250) * 100

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-6">Achievements</h2>

      {/* Level card */}
      <div className="bg-gradient-to-br from-green-900/40 to-gray-900 border border-green-500/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">Current Level</p>
            <h3 className="text-4xl font-black text-green-400">{game.level}</h3>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Total XP</p>
            <p className="text-white font-bold text-2xl">{game.xp_total}</p>
          </div>
        </div>
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>Level {game.level}</span>
          <span>{xpToNext} XP to Level {game.level + 1}</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
            style={{ width: `${xpProgress}%` }} />
        </div>
      </div>

      {/* Streak + weekly */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-orange-400 text-2xl font-bold">{game.current_streak_days}</div>
          <div className="text-gray-400 text-xs">Day Streak</div>
          <div className="text-gray-600 text-xs mt-1">Best: {game.longest_streak_days} days</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">⚡</div>
          <div className="text-yellow-400 text-2xl font-bold">{game.weekly_xp}</div>
          <div className="text-gray-400 text-xs">This Week's XP</div>
          <div className="text-gray-600 text-xs mt-1">{game.achievements.length} achievements</div>
        </div>
      </div>

      {/* Achievement grid */}
      <div>
        <h3 className="text-white font-semibold mb-3">All Achievements</h3>
        <div className="space-y-2">
          {ALL_ACHIEVEMENTS.map(a => {
            const unlocked = unlockedIds.has(a.id)
            const unlockedData = game.achievements.find(u => u.id === a.id)
            return (
              <div key={a.id} className={`flex items-center gap-3 rounded-xl p-3 border transition-all
                ${unlocked
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-gray-900 border-gray-800 opacity-50'
                }`}>
                <span className={`text-2xl ${!unlocked ? 'grayscale' : ''}`}>{a.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                      {a.name}
                    </span>
                    {unlocked && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">✓ Unlocked</span>}
                  </div>
                  <p className="text-gray-500 text-xs">{a.desc}</p>
                  {unlocked && unlockedData && (
                    <p className="text-gray-600 text-xs mt-0.5">
                      {new Date(unlockedData.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-bold ${unlocked ? 'text-yellow-400' : 'text-gray-600'}`}>
                  +{a.xp} XP
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
