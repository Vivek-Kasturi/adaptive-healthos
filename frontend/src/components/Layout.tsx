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
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 fixed h-full">
        <div className="mb-8 px-3">
          <h1 className="text-green-400 font-bold text-lg leading-tight">Adaptive</h1>
          <h1 className="text-white font-bold text-lg leading-tight">HealthOS</h1>
          <p className="text-gray-500 text-xs mt-1">Multi-Agent System</p>
          {userName && (
            <p className="text-gray-400 text-xs mt-2 truncate">👤 {userName}</p>
          )}
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === path
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 pt-4 border-t border-gray-800 space-y-2">
          <p className="text-gray-600 text-xs">Powered by</p>
          <p className="text-gray-400 text-xs font-medium">Gemini 2.5 Flash</p>
          <p className="text-gray-400 text-xs">+ MongoDB MCP</p>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-400 text-xs mt-2 transition-colors"
            >
              ← Switch account
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen">
        <div className="p-6 pb-32">
          {children}
        </div>
      </main>

      {/* Agent Activity Panel — always visible bottom-right */}
      <AgentActivityPanel userId={userId} />
    </div>
  )
}
