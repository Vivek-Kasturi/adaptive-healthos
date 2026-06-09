import React from 'react'
import * as Sentry from '@sentry/react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  eventId: string | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, eventId: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, eventId: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack ?? '' } },
    })
    this.setState({ eventId: eventId ?? null })
    console.error('[HealthOS ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, eventId: null })
  }

  handleGoHome = () => {
    this.handleReset()
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-5">
          {/* Icon */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">🧬</span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-none">
                Adaptive <span className="text-emerald-600">HealthOS</span>
              </h1>
            </div>
          </div>

          {/* Pulse icon */}
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center text-4xl">
              💔
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              HealthOS hit an unexpected error. Your data is safe — this is just a UI hiccup.
            </p>
          </div>

          {/* Error detail */}
          {this.state.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
              <p className="text-red-500 text-xs font-semibold uppercase tracking-wide mb-1">Error detail</p>
              <p className="text-red-700 text-xs font-mono break-all leading-relaxed">
                {this.state.error.message || 'Unknown error'}
              </p>
              {this.state.eventId && (
                <p className="text-red-400 text-xs mt-2 border-t border-red-200 pt-2">
                  🔍 Sentry ID: <span className="font-mono">{this.state.eventId}</span>
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={this.handleReset}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
            >
              ↺ Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            This error has been automatically reported to our team.
            <br />
            <span className="text-slate-300">AI-powered by Gemini 2.5 Flash · Not medical advice</span>
          </p>
        </div>
      </div>
    )
  }
}
