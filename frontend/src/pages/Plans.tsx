import { useEffect, useState } from 'react'
import { getCurrentPlans } from '../api/client'
import { Plan } from '../types'

interface Props { userId: string }

const DEMO_PLANS: Plan[] = [
  {
    user_id: 'demo',
    type: 'nutrition',
    version: 2,
    created_by_agent: 'NutritionAgent',
    reason_for_update: 'Initial plan generated from your profile',
    is_active: true,
    created_at: new Date().toISOString(),
    content: {
      daily_calories: 1800,
      macros: { protein_g: 140, carbs_g: 180, fat_g: 60 },
      meal_schedule: [
        { meal: 'Breakfast', calories: 400, time: '8:00 AM', example: 'Oats + eggs + fruit' },
        { meal: 'Lunch', calories: 600, time: '1:00 PM', example: 'Chicken rice bowl + salad' },
        { meal: 'Dinner', calories: 600, time: '7:00 PM', example: 'Salmon + vegetables + quinoa' },
        { meal: 'Snack', calories: 200, time: '4:00 PM', example: 'Greek yogurt + almonds' },
      ]
    }
  },
  {
    user_id: 'demo',
    type: 'workout',
    version: 1,
    created_by_agent: 'WorkoutAgent',
    reason_for_update: 'Initial plan generated from your profile',
    is_active: true,
    created_at: new Date().toISOString(),
    content: {
      weekly_schedule: [
        { day: 'Monday', type: 'Strength', focus: 'Push (Chest, Shoulders, Triceps)', duration_min: 45 },
        { day: 'Tuesday', type: 'Cardio', focus: '30min run or cycling', duration_min: 30 },
        { day: 'Wednesday', type: 'Rest', focus: 'Active recovery / walk', duration_min: 20 },
        { day: 'Thursday', type: 'Strength', focus: 'Pull (Back, Biceps)', duration_min: 45 },
        { day: 'Friday', type: 'Strength', focus: 'Legs + Core', duration_min: 50 },
        { day: 'Saturday', type: 'Cardio', focus: 'Long run or sport', duration_min: 45 },
        { day: 'Sunday', type: 'Rest', focus: 'Full rest', duration_min: 0 },
      ]
    }
  },
  {
    user_id: 'demo',
    type: 'recovery',
    version: 1,
    created_by_agent: 'RecoveryAgent',
    reason_for_update: 'Initial recovery targets set',
    is_active: true,
    created_at: new Date().toISOString(),
    content: {
      sleep_target_hours: 7.5,
      deload_week_every: 4,
      recovery_tips: ['Sleep 7-8 hours', 'Drink 2.5L water daily', 'Stretch 10min post-workout'],
    }
  }
]

export default function Plans({ userId }: Props) {
  const [plans, setPlans] = useState<Plan[]>(DEMO_PLANS)
  const [activeTab, setActiveTab] = useState<'nutrition' | 'workout' | 'recovery'>('nutrition')

  useEffect(() => {
    getCurrentPlans(userId).then(r => {
      if (r.data.plans?.length) setPlans(r.data.plans)
    }).catch(() => {})
  }, [userId])

  const plan = plans.find(p => p.type === activeTab)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Your AI-Generated Plans</h2>
        <span className="text-xs text-gray-500 bg-gray-900 border border-gray-700 px-3 py-1 rounded-full">
          Auto-updated by agents
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['nutrition', 'workout', 'recovery'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors
              ${activeTab === t
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600'
              }`}>
            {t === 'nutrition' ? '🥗' : t === 'workout' ? '💪' : '😴'} {t}
          </button>
        ))}
      </div>

      {plan && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          {/* Plan header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-bold capitalize">{plan.type} Plan</h3>
              <p className="text-gray-500 text-xs mt-0.5">v{plan.version} · Created by {plan.created_by_agent}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-right">
              <p className="text-green-400 text-xs font-medium">AI Updated</p>
              <p className="text-gray-500 text-xs">{new Date(plan.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Update reason */}
          <div className="bg-gray-800 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
            <span className="text-yellow-400 text-xs mt-0.5">🤖</span>
            <p className="text-gray-400 text-xs">{plan.reason_for_update}</p>
          </div>

          {/* Nutrition plan content */}
          {plan.type === 'nutrition' && (plan.content as any).macros && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', value: (plan.content as any).daily_calories, unit: 'kcal', color: 'text-orange-400' },
                  { label: 'Protein', value: (plan.content as any).macros.protein_g, unit: 'g', color: 'text-blue-400' },
                  { label: 'Carbs', value: (plan.content as any).macros.carbs_g, unit: 'g', color: 'text-yellow-400' },
                  { label: 'Fat', value: (plan.content as any).macros.fat_g, unit: 'g', color: 'text-pink-400' },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                    <div className="text-gray-500 text-xs">{unit}</div>
                    <div className="text-gray-400 text-xs">{label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {((plan.content as any).meal_schedule || []).map((meal: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5">
                    <div>
                      <span className="text-white text-sm font-medium">{meal.meal}</span>
                      <span className="text-gray-500 text-xs ml-2">{meal.time}</span>
                      <p className="text-gray-400 text-xs mt-0.5">{meal.example}</p>
                    </div>
                    <span className="text-orange-400 text-sm font-medium">{meal.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workout plan content */}
          {plan.type === 'workout' && (plan.content as any).weekly_schedule && (
            <div className="space-y-2">
              {((plan.content as any).weekly_schedule || []).map((day: any, i: number) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2.5
                  ${day.type === 'Rest' ? 'bg-gray-800/50' : 'bg-gray-800'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${day.type === 'Strength' ? 'bg-blue-400' : day.type === 'Cardio' ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <div>
                      <span className="text-white text-sm font-medium">{day.day}</span>
                      <p className="text-gray-400 text-xs">{day.focus}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${day.type === 'Strength' ? 'text-blue-400' : day.type === 'Cardio' ? 'text-green-400' : 'text-gray-500'}`}>{day.type}</span>
                    {day.duration_min > 0 && <p className="text-gray-500 text-xs">{day.duration_min}min</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recovery plan content */}
          {plan.type === 'recovery' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{(plan.content as any).sleep_target_hours}h</div>
                  <div className="text-gray-400 text-xs">Sleep Target</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">Week {(plan.content as any).deload_week_every}</div>
                  <div className="text-gray-400 text-xs">Deload Every</div>
                </div>
              </div>
              <div className="space-y-2">
                {((plan.content as any).recovery_tips || []).map((tip: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-green-400 text-sm">✓</span>
                    <span className="text-gray-300 text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
