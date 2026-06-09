import { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getProgressSummary, getLatestForecast } from '../api/client'
import { Forecast } from '../types'
import { ProgressSkeleton, ErrorState, EmptyState } from '../components/Skeleton'

interface Props { userId: string }

type AsyncStatus = 'loading' | 'error' | 'success'

const DEMO_WEIGHT_DATA = [
  { date: 'May 20', weight: 80.0 },
  { date: 'May 22', weight: 79.8 },
  { date: 'May 24', weight: 79.5 },
  { date: 'May 26', weight: 79.6 },
  { date: 'May 28', weight: 79.2 },
  { date: 'May 30', weight: 79.0 },
  { date: 'Jun 1',  weight: 78.7 },
]

const DEMO_FORECAST: Forecast = {
  current_weight_kg: 78.7,
  target_weight_kg: 72,
  projected_completion_date: '2026-08-12',
  weekly_trend_kg: -0.4,
  confidence: 'medium',
  scenarios: { optimistic: '2026-07-28', realistic: '2026-08-12', pessimistic: '2026-09-05' },
  generated_at: new Date().toISOString(),
}

export default function Progress({ userId }: Props) {
  const [weightData, setWeightData] = useState(DEMO_WEIGHT_DATA)
  const [forecast, setForecast] = useState<Forecast>(DEMO_FORECAST)
  const [status, setStatus] = useState<AsyncStatus>('loading')

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const [summaryRes, forecastRes] = await Promise.allSettled([
        getProgressSummary(userId),
        getLatestForecast(userId),
      ])
      if (summaryRes.status === 'fulfilled' && summaryRes.value.data.weight_history?.length) {
        setWeightData(summaryRes.value.data.weight_history)
      }
      if (forecastRes.status === 'fulfilled' && forecastRes.value.data?.current_weight_kg) {
        setForecast(forecastRes.value.data)
      }
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const startWeight  = weightData[0]?.weight ?? DEMO_WEIGHT_DATA[0].weight
  const latestWeight = weightData[weightData.length - 1]?.weight ?? DEMO_WEIGHT_DATA[DEMO_WEIGHT_DATA.length - 1].weight
  const targetWeight = forecast.target_weight_kg ?? DEMO_FORECAST.target_weight_kg
  const totalLost    = Math.max(0, startWeight - latestWeight)
  const remaining    = Math.max(0, latestWeight - targetWeight)
  const progressPct  = Math.min(100, Math.max(0, Math.round((totalLost / Math.max(startWeight - targetWeight, 0.1)) * 100)))

  const safeDate = (d: any) => {
    if (!d || Array.isArray(d) || d === '') return 'Calculating...'
    const parsed = new Date(d)
    return isNaN(parsed.getTime()) ? 'Calculating...' : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (status === 'loading') return <ProgressSkeleton />
  if (status === 'error')   return <ErrorState message="Could not load your progress data." onRetry={load} />
  if (!weightData.length)   return <EmptyState icon="📊" title="No data yet" body="Log your first weight entry to start tracking progress." />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Progress</h2>
          <p className="text-slate-500 text-xs mt-0.5">Weight trend · Updated by AI agents after every log</p>
        </div>
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium shadow-sm">
          ↓ {forecast.weekly_trend_kg} kg/week
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <div className="text-emerald-600 text-2xl font-bold">-{totalLost.toFixed(1)}kg</div>
          <div className="text-slate-500 text-xs mt-0.5">Lost so far</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <div className="text-amber-600 text-2xl font-bold">{remaining.toFixed(1)}kg</div>
          <div className="text-slate-500 text-xs mt-0.5">To goal</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <div className="text-blue-600 text-2xl font-bold">{progressPct}%</div>
          <div className="text-slate-500 text-xs mt-0.5">Progress</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Start: <strong>{startWeight}kg</strong></span>
          <span>Goal: <strong>{targetWeight}kg</strong></span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-slate-400 text-xs text-center mt-2">{progressPct}% of your goal reached</p>
      </div>

      {/* Weight chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-slate-800 font-semibold mb-4">Weight History</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weightData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['dataMin - 0.5', 'dataMax + 0.5']} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              labelStyle={{ color: '#64748b', fontWeight: 600 }}
              itemStyle={{ color: '#059669' }}
            />
            <ReferenceLine y={forecast.target_weight_kg} stroke="#ef4444" strokeDasharray="4 4"
              label={{ value: 'Goal', fill: '#ef4444', fontSize: 11 }} />
            <Line type="monotone" dataKey="weight" stroke="#059669" strokeWidth={2.5}
              dot={{ fill: '#059669', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-800 font-semibold">Goal Forecast</h3>
          <span className="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-1 rounded-full font-medium">
            by ForecastingAgent
          </span>
        </div>
        <p className="text-slate-500 text-sm mb-4">Based on your current <strong>{forecast.weekly_trend_kg}kg/week</strong> trend:</p>
        <div className="space-y-2">
          {[
            { label: 'Optimistic',  date: forecast.scenarios.optimistic,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Realistic',   date: forecast.scenarios.realistic,   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'   },
            { label: 'Pessimistic', date: forecast.scenarios.pessimistic, color: 'text-red-600',     bg: 'bg-red-50 border-red-200'       },
          ].map(({ label, date, color, bg }) => (
            <div key={label} className={`flex justify-between items-center border rounded-xl px-4 py-3 ${bg}`}>
              <span className="text-slate-600 text-sm font-medium">{label}</span>
              <span className={`font-bold text-sm ${color}`}>{safeDate(date)}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-3 text-center">Updated automatically after every weight log by ForecastingAgent</p>
      </div>
    </div>
  )
}
