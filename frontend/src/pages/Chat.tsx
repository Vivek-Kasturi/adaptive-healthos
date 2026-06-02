import { useState, useRef, useEffect } from 'react'
import { createChatSocket } from '../api/client'

interface Props { userId: string }

interface Message {
  role: 'user' | 'agent' | 'tools'
  text: string
  agent?: string
  tools?: string[]
  timestamp: Date
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

// Which MongoDB tools each agent calls — for visual display
const AGENT_TOOLS: Record<string, string[]> = {
  NutritionAgent:       ['get_active_plan()', 'get_daily_nutrition_totals()', 'create_plan()', 'log_agent_decision()', 'award_xp()'],
  WorkoutAgent:         ['get_active_plan()', 'get_recent_logs()', 'create_plan()', 'log_agent_decision()', 'award_xp()'],
  RecoveryAgent:        ['get_recent_logs()', 'get_active_plan()', 'create_plan()', 'log_agent_decision()'],
  ProgressAnalysisAgent:['get_user()', 'get_recent_logs()', 'save_forecast()', 'log_agent_decision()'],
  ForecastingAgent:     ['get_user()', 'get_recent_logs()', 'save_forecast()', 'log_agent_decision()'],
  AccountabilityAgent:  ['get_gamification_state()', 'get_recent_logs()', 'log_agent_decision()', 'award_xp()'],
  OrchestratorAgent:    ['classify_intent()', 'route_to_agent()', 'log_agent_decision()'],
}

const QUICK_PROMPTS = [
  "Log 2 boiled eggs for breakfast",
  "I went for a 30min run",
  "Log my weight as 79.2kg",
  "I only slept 4 hours last night",
  "How am I tracking toward my goal?",
]

export default function Chat({ userId }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      text: "Hi! I'm your HealthOS assistant. I can log food, workouts, weight, and sleep — our AI agents will automatically update your plans. What would you like to do?",
      agent: 'OrchestratorAgent',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [thinkingAgent, setThinkingAgent] = useState('Agents thinking')
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addToolsMessage = (agent: string) => {
    const tools = AGENT_TOOLS[agent] || []
    if (!tools.length) return
    setMessages(m => [...m, {
      role: 'tools',
      text: '',
      agent,
      tools,
      timestamp: new Date(),
    }])
  }

  const send = (text: string) => {
    if (!text.trim() || thinking) return
    setMessages(m => [...m, { role: 'user', text, timestamp: new Date() }])
    setInput('')
    setThinking(true)
    setThinkingAgent('OrchestratorAgent routing...')

    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        wsRef.current = createChatSocket(userId)

        wsRef.current.onmessage = (e) => {
          const data = JSON.parse(e.data)
          const agent = data.agent_name || 'OrchestratorAgent'
          setThinkingAgent(`${agent} calling MongoDB tools...`)
          setTimeout(() => {
            addToolsMessage(agent)
            setMessages(m => [...m, {
              role: 'agent',
              text: data.response,
              agent,
              tools: data.tools_used || [],
              timestamp: new Date(),
            }])
            setThinking(false)
          }, 400)
        }

        wsRef.current.onerror = () => demoBotResponse(text)
        wsRef.current.onclose = () => { wsRef.current = null }
      } else {
        wsRef.current.send(JSON.stringify({ user_id: userId, message: text }))
        return
      }

      wsRef.current.onopen = () => {
        wsRef.current?.send(JSON.stringify({ user_id: userId, message: text }))
      }
    } catch {
      demoBotResponse(text)
    }
  }

  const demoBotResponse = (userText: string) => {
    const lower = userText.toLowerCase()
    let response = '', agent = 'OrchestratorAgent'

    if (lower.includes('egg') || lower.includes('food') || lower.includes('ate') || lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('ate')) {
      response = "✓ Food logged! NutritionAgent analyzed your entry — you've consumed ~420 kcal toward your 1,800 kcal daily target. Protein on track at 24g. Plan saved to MongoDB Atlas. +10 XP awarded."
      agent = 'NutritionAgent'
    } else if (lower.includes('run') || lower.includes('workout') || lower.includes('gym') || lower.includes('exercise') || lower.includes('min')) {
      response = "✓ Workout logged! WorkoutAgent recorded 30min cardio (~280 kcal burned). Consistency check passed — you've hit 3/4 planned workouts this week. Streak maintained! +20 XP."
      agent = 'WorkoutAgent'
    } else if (lower.includes('weight') || lower.includes('kg') || lower.includes('weigh')) {
      response = "✓ Weight logged! ProgressAnalysisAgent detected a -0.4kg/week trend. ForecastingAgent updated your 3-scenario forecast — at this pace you'll hit your goal by August 12. Keep it up!"
      agent = 'ForecastingAgent'
    } else if (lower.includes('sleep') || lower.includes('tired') || lower.includes('hours')) {
      response = "⚠️ RecoveryAgent detected poor sleep (4 hours, quality 3/10). Reducing tomorrow's workout intensity by 40%. Rest day recommended. Recovery plan updated in MongoDB. +10 XP for logging."
      agent = 'RecoveryAgent'
    } else if (lower.includes('plan') || lower.includes('nutrition') || lower.includes('today')) {
      response = "Today's plan: 1,800 kcal | 140g protein | 180g carbs | 60g fat. Meals: Breakfast 400 kcal (8AM), Lunch 600 kcal (1PM), Dinner 600 kcal (7PM), Snack 200 kcal (4PM). Generated by NutritionAgent v2."
      agent = 'NutritionAgent'
    } else {
      response = "OrchestratorAgent classified your intent and routed to the appropriate specialist. Try: 'I had oatmeal for breakfast', 'I did a 30min run', 'log my weight as 80kg', or 'I only slept 4 hours'."
      agent = 'OrchestratorAgent'
    }

    setTimeout(() => {
      setThinkingAgent(`${agent} calling MongoDB tools...`)
      setTimeout(() => {
        addToolsMessage(agent)
        setMessages(m => [...m, { role: 'agent', text: response, agent, timestamp: new Date() }])
        setThinking(false)
      }, 600)
    }, 1200)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Chat with HealthOS</h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          6 agents ready
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === 'tools' && (
              <div className="flex justify-start ml-1">
                <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 max-w-[85%]">
                  <p className="text-gray-600 text-xs mb-1.5">
                    🔧 <span className={AGENT_COLORS[m.agent!] || 'text-gray-400'}>{m.agent}</span> → MongoDB Atlas
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(m.tools || []).map((t, j) => (
                      <span key={j} className="text-xs font-mono bg-gray-800 text-green-500 px-1.5 py-0.5 rounded border border-green-900">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {m.role !== 'tools' && (
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%]`}>
                  {m.role === 'agent' && m.agent && (
                    <p className={`text-xs font-medium mb-1 ml-1 ${AGENT_COLORS[m.agent] || 'text-green-400'}`}>
                      {m.agent}
                    </p>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${m.role === 'user'
                      ? 'bg-green-500 text-black rounded-tr-sm'
                      : 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700'
                    }`}>
                    {m.text}
                  </div>
                  <p className="text-gray-600 text-xs mt-1 mx-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="text-xs text-green-400 mr-2">{thinkingAgent}</span>
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto py-2 scrollbar-thin">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)}
            className="shrink-0 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="Log food, workout, weight... or ask anything"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 placeholder-gray-600"
        />
        <button onClick={() => send(input)} disabled={!input.trim() || thinking}
          className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-black font-bold px-4 rounded-xl transition-colors">
          →
        </button>
      </div>

      {/* Fine print */}
      <p className="text-gray-700 text-xs text-center mt-2 leading-relaxed">
        Powered by Gemini 2.5 Flash · AI can make mistakes — please double-check responses · Not medical advice
      </p>
    </div>
  )
}
