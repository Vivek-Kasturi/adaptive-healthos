import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getProgressSummary, getLatestForecast } from '../api/client'
import { Forecast } from '../types'

interface Props { userId: string }

// Demo data — replaced by real data when backend is up
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

  useEffect(() => {
    getProgressSummary(userId).then(r => {
      if (r.data.weight_history?.length) setWeightData(r.data.weight_history)
    }).catch(() => {})
    getLatestForecast(userId).then(r => {
      // Only replace forecast if the required fields are present — avoid NaN
      if (r.data?.current_weight_kg && r.data?.target_weight_kg) setForecast(r.data)
    }).catch(() => {})
  }, [userId])

  const startWeight  = weightData[0]?.weight ?? DEMO_WEIGHT_DATA[0].weight
  const latestWeight = weightData[weightData.length - 1]?.weight ?? DEMO_WEIGHT_DATA[DEMO_WEIGHT_DATA.length - 1].weight
  const targetWeight = forecast.target_weight_kg ?? DEMO_FORECAST.target_weight_kg
  const totalLost    = Math.max(0, startWeight - latestWeight)
  const remaining    = Math.max(0, latestWeight - targetWeight)
  const progressPct  = Math.min(100, Math.max(0, Math.round((totalLost / Math.max(startWeight - targetWeight, 0.1)) * 100)))

  // Safe date formatter for forecast scenarios
  const safeDate = (d: any) => {
    if (!d || Array.isArray(d) || d === '') return 'Calculating...'
    const parsed = new Date(d)
    return isNaN(parsed.getTime())
      ? 'Calculating...'
      : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white">Progress</h2>
        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
          ↓ {forecast.weekly_trend_kg} kg/week
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <div className="text-green-400 text-xl font-bold">-{totalLost.toFixed(1)}kg</div>
          <div className="text-gray-500 text-xs">Lost so far</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <div className="text-yellow-400 text-xl font-bold">{remaining.toFixed(1)}kg</div>
          <div className="text-gray-500 text-xs">To goal</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <div className="text-blue-400 text-xl font-bold">{progressPct}%</div>
          <div className="text-gray-500 text-xs">Progress</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Start: {startWeight}kg</span>
          <span>Goal: {targetWeight}kg</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
            style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Weight chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Weight History</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={weightData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#4ade80' }}
            />
            <ReferenceLine y={forecast.target_weight_kg} stroke="#ef4444" strokeDasharray="4 4"
              label={{ value: 'Goal', fill: '#ef4444', fontSize: 11 }} />
            <Line type="monotone" dataKey="weight" stroke="#4ade80" strokeWidth={2.5}
              dot={{ fill: '#4ade80', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Goal Forecast</h3>
          <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">
            by ForecastingAgent
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-4">Based on your current {forecast.weekly_trend_kg}kg/week trend:</p>
        <div className="space-y-2">
          {[
            { label: 'Optimistic', date: forecast.scenarios.optimistic, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Realistic', date: forecast.scenarios.realistic, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Pessimistic', date: forecast.scenarios.pessimistic, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map(({ label, date, color, bg }) => (
            <div key={label} className={`flex justify-between items-center ${bg} rounded-lg px-3 py-2.5`}>
              <span className="text-gray-400 text-sm">{label}</span>
              <span className={`font-semibold text-sm ${color}`}>
                {safeDate(date)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3 text-center">Updated automatically after every weight log</p>
      </div>
    </div>
  )
}
