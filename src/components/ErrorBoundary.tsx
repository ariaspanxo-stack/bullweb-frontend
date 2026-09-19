// Hotfix #187 — E1: ErrorBoundary con Sentry (red de seguridad anti-pantalla-blanca).
// Wrap objetivo: main.tsx (<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>).
// Patrón del SDK @sentry/react: componentDidCatch → Sentry.captureException con componentStack como extra.
import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback: pantalla centrada fondo #1B2B5E (brand), estilo consistente con el panel.
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen text-center px-4"
          style={{ backgroundColor: '#1B2B5E' }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Algo salió mal
          </h1>
          <p className="text-sm sm:text-base text-white/70 mb-8 max-w-md">
            Se produjo un error inesperado. Puedes intentarlo de nuevo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
