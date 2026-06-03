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
import { getUserByEmail, getDemoUser, loginUser } from './api/client'

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
        const res = await loginUser(email.trim(), password)
        onComplete(String(res.data.user_id), res.data.name || email)
      } else {
        const res = await getUserByEmail(email.trim())
        if (res.data.has_password) {
          setNeedsPassword(true)
          setError('This account has a password. Please enter it below.')
          setLoading(false)
          return
        }
        const id = res.data._id || res.data.user_id || res.data.id
        onComplete(String(id), res.data.name || email)
      }
    } catch (err: any) {
      if (err?.response?.status === 404) setError('No account found with that email.')
      else if (err?.response?.status === 401) setError('Incorrect password. Try again.')
      else setError('Could not connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-4xl">🧬</span>
            <div>
              <h1 className="text-3xl font-black text-slate-900 leading-none">
                Adaptive <span className="text-emerald-600">HealthOS</span>
              </h1>
            </div>
          </div>
          <p className="text-slate-500 text-sm">Your AI-powered personal health operating system</p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="text-xs bg-purple-100 border border-purple-200 text-purple-700 px-2.5 py-1 rounded-full font-medium">Gemini 2.5 Flash</span>
            <span className="text-xs bg-emerald-100 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-medium">MongoDB Atlas</span>
            <span className="text-xs bg-blue-100 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-medium">6 AI Agents</span>
            <span className="text-xs bg-amber-100 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-medium">Google Cloud ADK</span>
          </div>
        </div>

        {/* Demo button */}
        <div id="demo-section" className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">🎬</span>
            <div>
              <h2 className="text-slate-900 font-bold">Try Demo Mode</h2>
              <p className="text-slate-500 text-sm">See all 6 agents with 14 days of pre-loaded health data</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-slate-500 mb-4 flex-wrap">
            <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">225 XP earned</span>
            <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">Full plans ready</span>
            <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">Progress tracked</span>
            <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">All 6 agents fired</span>
          </div>
          <button
            id="demo-login-btn"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {demoLoading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading demo...</>
              : '▶ Load Demo Account'
            }
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-slate-400 text-xs">or use your account</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Email login */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <h3 className="text-slate-800 font-semibold">Sign in</h3>
          <p className="text-slate-400 text-xs">Each user has their own profile and health data stored in MongoDB Atlas.</p>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); setNeedsPassword(false) }}
            onKeyDown={e => e.key === 'Enter' && !needsPassword && handleEmailLogin()}
            placeholder="your@email.com"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm pr-16"
              />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs hover:text-slate-600">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
          {error && <p className={`text-xs ${error.includes('password') && !error.includes('Incorrect') ? 'text-amber-600' : 'text-red-500'}`}>{error}</p>}
          <button onClick={handleEmailLogin} disabled={loading || !email.trim()}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
            {loading ? 'Checking...' : password ? 'Sign in →' : 'Continue →'}
          </button>
        </div>

        {/* New user */}
        <p className="text-center text-slate-500 text-sm">
          New user?{' '}
          <button onClick={() => onComplete('__new__', '')} className="text-emerald-600 hover:text-emerald-700 underline font-medium">
            Create your account
          </button>
        </p>

        {/* Fine print */}
        <p className="text-slate-400 text-xs text-center leading-relaxed pt-1">
          ⚠️ AI-powered by Gemini 2.5 Flash · Can make mistakes — please double-check responses · Not medical advice
        </p>
      </div>
    </div>
  )
}

function App() {
  // Auto-demo always starts fresh — clears any stale session from previous runs
  if (IS_AUTO_DEMO) {
    localStorage.removeItem('healthos_user_id')
    localStorage.removeItem('healthos_user_name')
  }
  const [userId, setUserId] = useState<string | null>(
    IS_AUTO_DEMO ? null : localStorage.getItem('healthos_user_id')
  )
  const [userName, setUserName] = useState<string>(
    IS_AUTO_DEMO ? '' : (localStorage.getItem('healthos_user_name') || '')
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

  // ── Auto-demo: keep AutoDemoRunner mounted through ALL screen transitions ──
  // Without this, navigating login→onboarding unmounts the runner mid-flow.
  if (IS_AUTO_DEMO) {
    const appRoutes = (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"    element={<Dashboard    userId={userId || 'demo'} />} />
        <Route path="/chat"         element={<Chat         userId={userId || 'demo'} />} />
        <Route path="/plans"        element={<Plans        userId={userId || 'demo'} />} />
        <Route path="/progress"     element={<Progress     userId={userId || 'demo'} />} />
        <Route path="/achievements" element={<Achievements userId={userId || 'demo'} />} />
        <Route path="/system"       element={<System />} />
      </Routes>
    )
    return (
      <>
        {/* Always mounted — survives login/onboarding/app transitions */}
        <AutoDemoRunner onLogin={handleLogin} userId={userId || ''} />
        {screen === 'login'      && <LoginScreen onComplete={handleLogin} />}
        {screen === 'onboarding' && <Onboarding  onComplete={handleOnboarded} />}
        {screen === 'app'        && (
          <Layout userId={userId || 'demo'} userName={userName} onLogout={handleLogout}>
            {appRoutes}
          </Layout>
        )}
      </>
    )
  }

  if (screen === 'login')      return <LoginScreen onComplete={handleLogin} />
  if (screen === 'onboarding') return <Onboarding  onComplete={handleOnboarded} />

  return (
    <Layout userId={userId || 'demo'} userName={userName} onLogout={handleLogout}>
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
