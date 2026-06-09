import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl">🧬</span>
          <h1 className="text-3xl font-black text-slate-900 leading-none">
            Adaptive <span className="text-emerald-600">HealthOS</span>
          </h1>
        </div>

        {/* 404 visual */}
        <div className="relative py-8">
          <div className="text-[7rem] font-black text-slate-100 leading-none select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white border-2 border-emerald-200 shadow-lg flex items-center justify-center text-4xl">
              🔍
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Page not found</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Our agents searched everywhere but couldn't find this page.
            <br />
            It may have been moved or never existed.
          </p>
        </div>

        {/* Agent status badge */}
        <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-500">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          OrchestratorAgent: <span className="font-medium text-slate-700">route not recognized</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>

        <p className="text-slate-400 text-xs">
          AI-powered by Gemini 2.5 Flash · Not medical advice
        </p>
      </div>
    </div>
  )
}
