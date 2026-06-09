import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'

// ── Sentry error tracking ─────────────────────────────────────────────────────
// Add VITE_SENTRY_DSN=https://xxx@sentry.io/xxx to your .env to enable.
// Silently no-ops when unset so local dev is unaffected.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE ?? 'production',
    release: 'adaptive-healthos@1.0.0',
    // Capture 100% of errors
    sampleRate: 1.0,
    // Trace 100% of transactions (reduce in high-traffic prod)
    tracesSampleRate: 1.0,
    // Replay 10% of sessions, 100% of sessions that hit an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,   // health UI text is not PII
        blockAllMedia: false,
      }),
    ],
    beforeSend(event) {
      // Strip any auth headers that might appear in request context
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>)['Authorization']
      }
      return event
    },
  })
}

// Tag every Sentry event with the logged-in userId if available
const storedUserId = localStorage.getItem('healthos_user_id')
if (storedUserId) {
  Sentry.setUser({ id: storedUserId })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
