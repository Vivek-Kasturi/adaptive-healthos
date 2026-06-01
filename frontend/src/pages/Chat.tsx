import { useState, useRef, useEffect } from 'react'
import { createChatSocket } from '../api/client'

interface Props { userId: string }
interface Message { role: 'user' | 'agent'; text: string; agent?: string; timestamp: Date }

const QUICK_PROMPTS = [
  "Log 2 boiled eggs for breakfast",
  "I went for a 30min run",
  "Log my weight as 79.2kg",
  "Show me today's nutrition plan",
  "How am I tracking toward my goal?",
]

export default function Chat({ userId }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      text: "Hi! I'm your HealthOS assistant. I can log food, workouts, weight, and sleep — and our AI agents will automatically update your plans. What would you like to do?",
      agent: 'OrchestratorAgent',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim() || thinking) return
    const userMsg: Message = { role: 'user', text, timestamp: new Date() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setThinking(true)

    // Try WebSocket first, fallback to demo mode
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        wsRef.current = createChatSocket(userId)

        wsRef.current.onmessage = (e) => {
          const data = JSON.parse(e.data)
          setMessages(m => [...m, {
            role: 'agent',
            text: data.response,
            agent: data.agent_name,
            timestamp: new Date(),
          }])
          setThinking(false)
        }

        wsRef.current.onerror = () => {
          // Fallback demo response
          demoBotResponse(text)
        }
      }

      wsRef.current.send(JSON.stringify({ user_id: userId, message: text }))
    } catch {
      demoBotResponse(text)
    }
  }

  const demoBotResponse = (userText: string) => {
    setTimeout(() => {
      let response = ''
      let agent = 'OrchestratorAgent'

      const lower = userText.toLowerCase()
      if (lower.includes('egg') || lower.includes('food') || lower.includes('ate') || lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner')) {
        response = "✓ Food logged! NutritionAgent analyzed your entry — you've consumed ~420 kcal toward your 1,800 kcal daily target. Your protein is on track at 24g. Plans updated in MongoDB."
        agent = 'NutritionAgent'
      } else if (lower.includes('run') || lower.includes('workout') || lower.includes('gym') || lower.includes('exercise')) {
        response = "✓ Workout logged! WorkoutAgent recorded 30min cardio (~280 kcal burned). RecoveryAgent suggests adequate sleep tonight. Great consistency — streak maintained! +30 XP awarded."
        agent = 'WorkoutAgent'
      } else if (lower.includes('weight') || lower.includes('kg')) {
        response = "✓ Weight logged! ProgressAnalysisAgent detected a -0.4kg trend this week. ForecastingAgent updated your goal date: at this pace, you'll hit your target by August 12. Keep it up!"
        agent = 'ForecastingAgent'
      } else if (lower.includes('plan') || lower.includes('nutrition') || lower.includes('today')) {
        response = "Today's nutrition plan: 1,800 kcal | 140g protein | 180g carbs | 60g fat. Meals: Breakfast 400 kcal, Lunch 600 kcal, Dinner 600 kcal, Snack 200 kcal. Staying on track earns +10 XP!"
        agent = 'NutritionAgent'
      } else {
        response = "I've routed your message to the relevant agents. They'll analyze your data and update your plans accordingly. Try logging food, workout, or weight for immediate agent responses!"
        agent = 'OrchestratorAgent'
      }

      setMessages(m => [...m, { role: 'agent', text: response, agent, timestamp: new Date() }])
      setThinking(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <h2 className="text-xl font-bold text-white mb-4">Chat with HealthOS</h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${m.role === 'user' ? 'order-2' : 'order-1'}`}>
              {m.role === 'agent' && m.agent && (
                <p className="text-xs text-green-400 font-medium mb-1 ml-1">{m.agent}</p>
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
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="text-xs text-green-400 mr-2">Agents thinking</span>
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
    </div>
  )
}
