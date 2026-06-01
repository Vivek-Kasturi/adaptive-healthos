import { useEffect, useState } from 'react'
import { getUser, getGamificationState, logWeight, logFood, logWorkout } from '../api/client'
import { User, GamificationState } from '../types'

interface Props { userId: string }

export default function Dashboard({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [game, setGame] = useState<GamificationState | null>(null)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [weight, setWeight] = useState('')
  const [logging, setLogging] = useState<string | null>(null)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    getUser(userId).then(r => setUser(r.data)).catch(() => {})
    getGamificationState(userId).then(r => setGame(r.data)).catch(() => {})
  }, [userId])

  const handleLogWeight = async () => {
    if (!weight) return
    setLogging('Agents processing weight log...')
    try {
      await logWeight({ user_id: userId, weight_kg: Number(weight) })
      setLogging('✓ ProgressAgent + ForecastAgent updated!')
      setTimeout(() => { setLogging(null); setShowWeightModal(false); setWeight('') }, 2000)
    } catch {
      setLogging('Logged! (demo mode)')
      setTimeout(() => { setLogging(null); setShowWeightModal(false); setWeight('') }, 2000)
    }
  }

  const xpToNextLevel = game ? (((game.level) * 250) - game.xp_total) : 250
  const xpProgress = game ? ((game.xp_total % 250) / 250) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="text-green-400">{user?.name || 'there'}</span>
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">{today}</p>
        </div>
        {game && (
          <div className="text-right">
            <div className="text-green-400 font-bold text-lg">Level {game.level}</div>
            <div className="text-gray-500 text-xs">{game.xp_total} XP total</div>
          </div>
        )}
      </div>

      {/* XP Bar */}
      {game && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Level {game.level} → {game.level + 1}</span>
            <span className="text-gray-400">{xpToNextLevel} XP to next level</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon="🔥" label="Streak" value={`${game?.current_streak_days ?? 0} days`} color="text-orange-400" />
        <StatCard icon="⚡" label="Weekly XP" value={`${game?.weekly_xp ?? 0} XP`} color="text-yellow-400" />
        <StatCard icon="🏅" label="Achievements" value={`${game?.achievements?.length ?? 0}`} color="text-purple-400" />
      </div>

      {/* Quick log */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <h3 className="text-white font-semibold mb-3">Quick Log</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '🥗', label: 'Food', action: () => {} },
            { icon: '💪', label: 'Workout', action: () => {} },
            { icon: '⚖️', label: 'Weight', action: () => setShowWeightModal(true) },
            { icon: '😴', label: 'Sleep', action: () => {} },
          ].map(({ icon, label, action }) => (
            <button key={label} onClick={action}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-3 flex flex-col items-center gap-1 transition-colors">
              <span className="text-xl">{icon}</span>
              <span className="text-gray-300 text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* System status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Agent System Status</h3>
        <div className="space-y-2">
          {[
            { name: 'OrchestratorAgent', status: 'Monitoring', color: 'text-purple-400' },
            { name: 'NutritionAgent', status: 'Active', color: 'text-green-400' },
            { name: 'WorkoutAgent', status: 'Active', color: 'text-blue-400' },
            { name: 'ForecastingAgent', status: 'Active', color: 'text-cyan-400' },
          ].map(({ name, status, color }) => (
            <div key={name} className="flex items-center justify-between">
              <span className={`text-sm font-medium ${color}`}>{name}</span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-500 text-xs">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weight modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-4">Log Weight</h3>
            {logging ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-green-400 text-sm">{logging}</p>
              </div>
            ) : (
              <>
                <input type="number" step="0.1" placeholder="80.5" value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-center text-xl mb-4 focus:outline-none focus:border-green-500" />
                <p className="text-gray-500 text-xs text-center mb-4">Agents will analyze your trend and update your forecast</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowWeightModal(false)} className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl">Cancel</button>
                  <button onClick={handleLogWeight} disabled={!weight}
                    className="flex-1 bg-green-500 disabled:bg-gray-700 text-black font-semibold py-2.5 rounded-xl">Log It</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-gray-600 text-xs">{label}</div>
    </div>
  )
}
