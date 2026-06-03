/**
 * AgentActivityPanel — bottom-right overlay showing live agent decisions.
 * Proves agentic behavior to judges.
 */
import { useState, useEffect } from 'react'
import { getAgentDecisions } from '../../api/client'
import { AgentDecision } from '../../types'

interface Props { userId: string }

const AGENT_COLORS: Record<string, string> = {
  OrchestratorAgent:    'text-purple-600',
  NutritionAgent:       'text-emerald-600',
  WorkoutAgent:         'text-blue-600',
  RecoveryAgent:        'text-amber-600',
  ProgressAnalysisAgent:'text-pink-600',
  ForecastingAgent:     'text-cyan-600',
  AccountabilityAgent:  'text-orange-600',
}

const AGENT_DOT: Record<string, string> = {
  OrchestratorAgent:    'bg-purple-400',
  NutritionAgent:       'bg-emerald-400',
  WorkoutAgent:         'bg-blue-400',
  RecoveryAgent:        'bg-amber-400',
  ProgressAnalysisAgent:'bg-pink-400',
  ForecastingAgent:     'bg-cyan-400',
  AccountabilityAgent:  'bg-orange-400',
}

export default function AgentActivityPanel({ userId }: Props) {
  const [decisions, setDecisions] = useState<AgentDecision[]>([])
  const [expanded, setExpanded] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const fetchDecisions = async () => {
    try {
      const res = await getAgentDecisions(userId)
      const d = res.data.decisions || []
      if (d.length > 0) setIsLive(true)
      setDecisions(d)
    } catch {}
  }

  useEffect(() => {
    fetchDecisions()
    const interval = setInterval(fetchDecisions, 3000)
    return () => clearInterval(interval)
  }, [userId])

  const displayDecisions = decisions.length > 0 ? decisions : [
    { agent_name: 'OrchestratorAgent', trigger: 'system', decision: 'Waiting for user activity...', actions_taken: [], timestamp: new Date().toISOString() },
  ]

  return (
    <div className="fixed bottom-4 right-4 w-80 z-50">
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-sm font-semibold text-slate-800">Agent Activity</span>
            {isLive && <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">LIVE</span>}
          </div>
          <span className="text-slate-400 text-xs">{expanded ? '▼' : '▲'}</span>
        </button>

        {/* Activity list */}
        {expanded && (
          <div className="px-4 py-3 max-h-64 overflow-y-auto scrollbar-thin space-y-3">
            {displayDecisions.slice(0, 5).map((d, i) => (
              <div key={i} className={`border-l-2 pl-3 ${AGENT_DOT[d.agent_name] ? `border-${AGENT_DOT[d.agent_name].replace('bg-', '')}` : 'border-slate-300'}`}
                style={{ borderLeftColor: undefined }}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${AGENT_COLORS[d.agent_name] || 'text-slate-600'}`}>
                    {d.agent_name}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                  {d.decision}
                </p>
                {(d.actions_taken ?? []).length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(d.actions_taken ?? []).map((a, j) => (
                      <span key={j} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MongoDB badge */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <span className="text-slate-400 text-xs">Persisted in</span>
          <span className="text-emerald-600 text-xs font-semibold">MongoDB Atlas</span>
          <span className="text-slate-300 text-xs">via MCP</span>
        </div>
      </div>
    </div>
  )
}
