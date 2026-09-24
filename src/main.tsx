// Build: 2026-02-14T00:30:00Z - Restaurant Auth Fix v2 - FORCED REBUILD
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
console.log(__APP_VERSION__);
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { applyBranding } from './utils/applyBranding'

// ── Hotfix #202: auto-sanación de sesiones tras deploy ────────────────────
// Un deploy reemplaza el build en el servidor; una sesión con el entry viejo
// (HTTP cache / precache del SW) puede pedir chunks que ya no existen y Vite
// emite 'vite:preloadError' al fallar un import dinámico. Recargamos UNA vez
// (máx. 1 por minuto, guard anti-loop vía sessionStorage) para que el
// navegador tome el HTML fresco con sus chunks nuevos.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'bullweb:preload-reloaded-at';
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY) ?? '0'); } catch { /* sin storage */ }
  if (Date.now() - last > 60_000) {
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* sin storage */ }
    window.location.reload();
  }
});

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
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Aplicar branding del tenant en segundo plano (no bloquea el render)
applyBranding();
