// Build: 2026-02-14T00:30:00Z - Restaurant Auth Fix v2 - FORCED REBUILD
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
console.log(__APP_VERSION__);
import App from './App.tsx'
import { applyBranding } from './utils/applyBranding'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration()],
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
  ],
});

// Clear any corrupted auth data on app load
if (typeof window !== 'undefined') {
  const authData = localStorage.getItem('auth-storage');
  if (authData) {
    try {
      JSON.parse(authData);
    } catch {
      console.warn('Corrupted auth-storage detected - clearing');
      localStorage.removeItem('auth-storage');
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Aplicar branding del tenant en segundo plano (no bloquea el render)
applyBranding();
