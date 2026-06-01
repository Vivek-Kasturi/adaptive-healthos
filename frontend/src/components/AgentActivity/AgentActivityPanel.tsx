/**
 * AgentActivityPanel — bottom-right overlay showing live agent actions.
 * This is the #1 UI element judges need to see. It proves agentic behavior.
 */
import { useState, useEffect } from 'react'
import { getAgentDecisions } from '../../api/client'
import { AgentDecision } from '../../types'

interface Props {
  userId: string
}

const AGENT_COLORS: Record<string, string> = {
  OrchestratorAgent:    'text-purple-400',
  NutritionAgent:       'text-green-400',
  WorkoutAgent:         'text-blue-400',
  RecoveryAgent:        'text-yellow-400',
  ProgressAnalysisAgent:'text-pink-400',
  ForecastingAgent:     'text-cyan-400',
  AccountabilityAgent:  'text-orange-400',
}

export default function AgentActivityPanel({ userId }: Props) {
  const [decisions, setDecisions] = useState<AgentDecision[]>([])
  const [expanded, setExpanded] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const fetchDecisions = async () => {
    try {
      const res = await getAgentDecisions(userId)
      setDecisions(res.data.decisions || [])
    } catch {
      // Backend not ready yet — show placeholder
    }
  }

  useEffect(() => {
    fetchDecisions()
    const interval = setInterval(fetchDecisions, 3000) // Poll every 3s
    return () => clearInterval(interval)
  }, [userId])

  const colorFor = (name: string) => AGENT_COLORS[name] || 'text-gray-400'

  // Placeholder for when backend isn't up yet
  const displayDecisions = decisions.length > 0 ? decisions : [
    { agent_name: 'OrchestratorAgent', trigger: 'system', decision: 'Waiting for user activity...', actions_taken: [], timestamp: new Date().toISOString() },
  ]

  return (
    <div className="fixed bottom-4 right-4 w-80 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm font-semibold text-white">Agent Activity</span>
          </div>
          <span className="text-gray-500 text-xs">{expanded ? '▼' : '▲'}</span>
        </button>

        {/* Activity list */}
        {expanded && (
          <div className="px-4 pb-4 max-h-64 overflow-y-auto scrollbar-thin">
            <div className="space-y-3">
              {displayDecisions.slice(0, 5).map((d, i) => (
                <div key={i} className="border-l-2 border-gray-700 pl-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${colorFor(d.agent_name)}`}>
                      {d.agent_name}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-xs mt-0.5 leading-relaxed">
                    {d.decision}
                  </p>
                  {(d.actions_taken ?? []).length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(d.actions_taken ?? []).map((a, j) => (
                        <span key={j} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MongoDB badge */}
        <div className="px-4 py-2 bg-gray-800/50 flex items-center gap-2">
          <span className="text-xs text-gray-500">Stored in</span>
          <span className="text-xs text-green-500 font-medium">MongoDB Atlas</span>
          <span className="text-xs text-gray-600">via MCP</span>
        </div>
      </div>
    </div>
  )
}
