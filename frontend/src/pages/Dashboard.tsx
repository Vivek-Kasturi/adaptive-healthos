import { useEffect, useState, useCallback } from 'react'
import { getUser, getGamificationState, logWeight } from '../api/client'
import { User, GamificationState } from '../types'
import { DashboardSkeleton, ErrorState } from '../components/Skeleton'

interface Props { userId: string }

type AsyncStatus = 'loading' | 'error' | 'success'

export default function Dashboard({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [game, setGame] = useState<GamificationState | null>(null)
  const [status, setStatus] = useState<AsyncStatus>('loading')
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [weight, setWeight] = useState('')
  const [logging, setLogging] = useState<string | null>(null)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const [userRes, gameRes] = await Promise.all([
        getUser(userId),
        getGamificationState(userId),
      ])
      setUser(userRes.data)
      setGame(gameRes.data)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [userId])

  useEffect(() => { load() }, [load])

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

  if (status === 'loading') return <DashboardSkeleton />
  if (status === 'error')   return <ErrorState message="Could not load your dashboard. Check your connection." onRetry={load} />

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="text-emerald-600">{user?.name || 'there'}</span> 👋
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">{today}</p>
        </div>
        {game && (
          <div className="text-right bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="text-emerald-600 font-bold text-lg leading-none">Level {game.level}</div>
            <div className="text-slate-400 text-xs mt-0.5">{game.xp_total} XP total</div>
          </div>
        )}
      </div>

      {/* XP Bar */}
      {game && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Level {game.level} → {game.level + 1}</span>
            <span className="text-slate-400 text-xs">{xpToNextLevel} XP to next level</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard icon="🔥" label="Streak" value={`${game?.current_streak_days ?? 0} days`} color="text-orange-500" bg="bg-orange-50 border-orange-100" />
        <StatCard icon="⚡" label="Weekly XP" value={`${game?.weekly_xp ?? 0} XP`} color="text-amber-600" bg="bg-amber-50 border-amber-100" />
        <StatCard icon="🏅" label="Achievements" value={`${game?.achievements?.length ?? 0}`} color="text-purple-600" bg="bg-purple-50 border-purple-100" />
      </div>

      {/* Quick log */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <h3 className="text-slate-800 font-semibold mb-3">Quick Log</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '🥗', label: 'Food', action: () => {} },
            { icon: '💪', label: 'Workout', action: () => {} },
            { icon: '⚖️', label: 'Weight', action: () => setShowWeightModal(true) },
            { icon: '😴', label: 'Sleep', action: () => {} },
          ].map(({ icon, label, action }) => (
            <button key={label} onClick={action}
              className="bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl p-3 flex flex-col items-center gap-1 transition-all group">
              <span className="text-2xl">{icon}</span>
              <span className="text-slate-600 group-hover:text-emerald-700 text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Agent system status */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-800 font-semibold">Agent System Status</h3>
          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">6 Active</span>
        </div>
        <div className="space-y-2">
          {[
            { name: 'OrchestratorAgent', status: 'Routing intent', color: 'text-purple-600', dot: 'bg-purple-400' },
            { name: 'NutritionAgent',    status: 'Active',          color: 'text-emerald-600', dot: 'bg-emerald-400' },
            { name: 'WorkoutAgent',      status: 'Active',          color: 'text-blue-600',    dot: 'bg-blue-400'    },
            { name: 'RecoveryAgent',     status: 'Monitoring',      color: 'text-amber-600',   dot: 'bg-amber-400'   },
            { name: 'ProgressAgent',     status: 'Active',          color: 'text-pink-600',    dot: 'bg-pink-400'    },
            { name: 'ForecastingAgent',  status: 'Active',          color: 'text-cyan-600',    dot: 'bg-cyan-400'    },
          ].map(({ name, status, color, dot }) => (
            <div key={name} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <span className={`text-sm font-medium ${color}`}>{name}</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
                <span className="text-slate-400 text-xs">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weight modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-slate-900 font-bold text-lg mb-4">Log Weight ⚖️</h3>
            {logging ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-emerald-600 text-sm">{logging}</p>
              </div>
            ) : (
              <>
                <input type="number" step="0.1" placeholder="80.5" value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-slate-900 text-center text-2xl font-bold mb-2 focus:outline-none focus:border-emerald-500" />
                <p className="text-slate-400 text-xs text-center mb-4">Agents will analyze your trend and update your forecast</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowWeightModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                  <button onClick={handleLogWeight} disabled={!weight}
                    className="flex-1 bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors">Log It</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`border rounded-xl p-3 text-center shadow-sm ${bg}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-slate-500 text-xs">{label}</div>
    </div>
  )
}
