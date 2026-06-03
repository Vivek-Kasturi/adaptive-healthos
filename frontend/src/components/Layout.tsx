import { Link, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import AgentActivityPanel from './AgentActivity/AgentActivityPanel'

const NAV = [
  { path: '/dashboard',    label: 'Dashboard',   icon: '🏠' },
  { path: '/chat',         label: 'Chat',         icon: '💬' },
  { path: '/plans',        label: 'Plans',        icon: '📋' },
  { path: '/progress',     label: 'Progress',     icon: '📈' },
  { path: '/achievements', label: 'Achievements', icon: '🏆' },
  { path: '/system',       label: 'For Judges',   icon: '⚙️' },
]

interface LayoutProps {
  children: ReactNode
  userId: string
  userName?: string
  onLogout?: () => void
}

export default function Layout({ children, userId, userName, onLogout }: LayoutProps) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col py-6 px-3 fixed h-full shadow-sm">
        <div className="mb-8 px-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🧬</span>
            <div>
              <span className="text-emerald-600 font-bold text-base">Adaptive </span>
              <span className="text-slate-800 font-bold text-base">HealthOS</span>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 pl-7">Multi-Agent System</p>
          {userName && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <p className="text-slate-600 text-xs truncate">👤 {userName}</p>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${pathname === path
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 pt-4 border-t border-slate-200 space-y-1">
          <p className="text-slate-400 text-xs">Powered by</p>
          <p className="text-slate-700 text-xs font-semibold">Gemini 2.5 Flash</p>
          <p className="text-slate-500 text-xs">+ MongoDB Atlas MCP</p>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-slate-600 text-xs mt-2 transition-colors block"
            >
              ← Switch account
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen flex flex-col">
        <div className="flex-1 p-6 pb-4">
          {children}
        </div>

        {/* Fine print footer — visible on every page */}
        <footer className="px-6 py-3 border-t border-slate-200 bg-white">
          <p className="text-slate-400 text-xs text-center leading-relaxed">
            ⚠️ Adaptive HealthOS uses AI and can make mistakes. Please double-check all responses. This is not medical advice. · Google Cloud Rapid Agent Hackathon 2026
          </p>
        </footer>
      </main>

      {/* Agent Activity Panel — always visible bottom-right */}
      <AgentActivityPanel userId={userId} />
    </div>
  )
}
