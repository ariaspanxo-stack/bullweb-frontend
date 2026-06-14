// ═══════════════════════════════════════════════════════════════
// WAITER PROTECTED ROUTE — guarda las rutas de la app mesero
// Verifica que haya un waiterToken válido y no expirado.
// Si no hay token, redirige a /mesero/login preservando ?tenant=
// ═══════════════════════════════════════════════════════════════

import { Navigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

function buildLoginUrl(): string {
  const tenant = localStorage.getItem('waiterTenant');
  return tenant ? `/mesero/login?tenant=${tenant}` : '/mesero/login';
}

export function WaiterProtectedRoute({ children }: Props) {
  const token = localStorage.getItem('waiterToken');
  const info  = localStorage.getItem('waiterInfo');

  if (!token || !info) {
    return <Navigate to={buildLoginUrl()} replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('waiterToken');
      localStorage.removeItem('waiterInfo');
      return <Navigate to={buildLoginUrl()} replace />;
    }
  } catch {
    return <Navigate to="/mesero/login" replace />;
  }

  return <>{children}</>;
}
