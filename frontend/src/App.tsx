import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Plans from './pages/Plans'
import Progress from './pages/Progress'
import Achievements from './pages/Achievements'
import System from './pages/System'
import Layout from './components/Layout'
import AutoDemoRunner from './components/AutoDemoRunner'
import { getUserByEmail, getDemoUser, loginUser, setPassword } from './api/client'

const IS_AUTO_DEMO = new URLSearchParams(window.location.search).get('autodemo') === '1'

type Screen = 'login' | 'onboarding' | 'app'

function LoginScreen({ onComplete }: { onComplete: (id: string, name: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    setError('')
    try {
      const res = await getDemoUser()
      onComplete(res.data.user_id || String(res.data._id), res.data.name || 'Alex (Demo)')
    } catch {
      setError('No demo user found. Run POST /api/demo/run first.')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      if (password) {
        // Password login
        const res = await loginUser(email.trim(), password)
        onComplete(String(res.data.user_id), res.data.name || email)
      } else {
        // Check if account exists first
        const res = await getUserByEmail(email.trim())
        const hasPassword = res.data.has_password
        if (hasPassword) {
          // Needs password — show password field
          setNeedsPassword(true)
          setError('This account has a password. Please enter it below.')
          setLoading(false)
          return
        }
        // No password set — log in directly
        const id = res.data._id || res.data.user_id || res.data.id
        onComplete(String(id), res.data.name || email)
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('No account found with that email. Create one below.')
      } else if (err?.response?.status === 401) {
        setError('Incorrect password. Try again.')
      } else {
        setError('Could not connect to backend.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">🧬</span>
            <h1 className="text-3xl font-bold text-white">
              Adaptive <span className="text-green-400">HealthOS</span>
            </h1>
          </div>
          <p className="text-gray-400">Your AI-powered health operating system</p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2 py-1 rounded-full">Gemini 2.5 Flash</span>
            <span className="text-xs bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-1 rounded-full">MongoDB Atlas</span>
            <span className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-1 rounded-full">6 AI Agents</span>
            <span className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-2 py-1 rounded-full">Google Cloud ADK</span>
          </div>
        </div>

        {/* Demo button */}
        <div className="bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-500/40 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">🎬</span>
            <div>
              <h2 className="text-white font-bold">Try Demo Mode</h2>
              <p className="text-gray-400 text-sm">See all 6 agents with pre-loaded health data</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 mb-4 flex-wrap">
            <span className="bg-gray-800 px-2 py-1 rounded">225 XP earned</span>
            <span className="bg-gray-800 px-2 py-1 rounded">Full plans ready</span>
            <span className="bg-gray-800 px-2 py-1 rounded">Progress tracked</span>
            <span className="bg-gray-800 px-2 py-1 rounded">All 6 agents fired</span>
          </div>
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {demoLoading
              ? <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Loading demo...</>
              : '▶ Load Demo Account'
            }
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs">or use your account</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Email login */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-semibold">Find my account</h3>
          <p className="text-gray-500 text-xs">Each user has their own profile, plans, and health data stored in MongoDB Atlas.</p>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); setNeedsPassword(false) }}
            onKeyDown={e => e.key === 'Enter' && !needsPassword && handleEmailLogin()}
            placeholder="your@email.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
          />
          {(needsPassword || password) && (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                placeholder="Password"
                autoFocus={needsPassword}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs hover:text-gray-300"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
          {error && <p className={`text-xs ${error.includes('password') && !error.includes('Incorrect') ? 'text-yellow-400' : 'text-red-400'}`}>{error}</p>}
          <button
            onClick={handleEmailLogin}
            disabled={loading || !email.trim()}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Checking...' : password ? 'Sign in →' : 'Continue with email →'}
          </button>
        </div>

        {/* New user */}
        <p className="text-center text-gray-600 text-sm">
          New user?{' '}
          <button
            onClick={() => onComplete('__new__', '')}
            className="text-green-400 hover:text-green-300 underline"
          >
            Create your account
          </button>
        </p>

        {/* Fine print */}
        <p className="text-gray-700 text-xs text-center leading-relaxed pt-2">
          AI-powered by Gemini 2.5 Flash · Claude is AI and can make mistakes — please double-check responses ·
          Not medical advice · Google Cloud Rapid Agent Hackathon 2026
        </p>
      </div>
    </div>
  )
}

function App() {
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem('healthos_user_id')
  )
  const [userName, setUserName] = useState<string>(
    localStorage.getItem('healthos_user_name') || ''
  )
  const [screen, setScreen] = useState<Screen>(userId ? 'app' : 'login')

  const handleLogin = (id: string, name: string) => {
    if (id === '__new__') { setScreen('onboarding'); return }
    localStorage.setItem('healthos_user_id', id)
    localStorage.setItem('healthos_user_name', name)
    setUserId(id)
    setUserName(name)
    setScreen('app')
  }

  const handleOnboarded = (id: string) => {
    localStorage.setItem('healthos_user_id', id)
    setUserId(id)
    setScreen('app')
  }

  const handleLogout = () => {
    localStorage.removeItem('healthos_user_id')
    localStorage.removeItem('healthos_user_name')
    setUserId(null)
    setUserName('')
    setScreen('login')
  }

  if (screen === 'login' && !IS_AUTO_DEMO) return <LoginScreen onComplete={handleLogin} />
  if (screen === 'onboarding') return <Onboarding onComplete={handleOnboarded} />

  return (
    <Layout userId={userId || 'demo'} userName={userName} onLogout={handleLogout}>
      {IS_AUTO_DEMO && (
        <AutoDemoRunner
          onLogin={handleLogin}
          userId={userId || ''}
        />
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"    element={<Dashboard    userId={userId!} />} />
        <Route path="/chat"         element={<Chat         userId={userId!} />} />
        <Route path="/plans"        element={<Plans        userId={userId!} />} />
        <Route path="/progress"     element={<Progress     userId={userId!} />} />
        <Route path="/achievements" element={<Achievements userId={userId!} />} />
        <Route path="/system"       element={<System />} />
      </Routes>
    </Layout>
  )
}

export default App
