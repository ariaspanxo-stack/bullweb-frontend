import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { FullPageSpinner } from '@/components/ui/Spinner';

// ============================================================================
// TIPOS
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

// ============================================================================
// PANTALLA DE SERVIDOR CAÍDO
// ============================================================================

function ServerDownScreen() {
  const { loadUser } = useAuthStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔌</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Servidor no disponible</h1>
        <p className="text-gray-500 mb-6">
          No se pudo conectar con el servidor. Por favor intenta nuevamente en unos momentos.
        </p>
        <button
          onClick={() => loadUser()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Reintentar conexión
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PROTECTED ROUTE
// ============================================================================

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  // App.tsx ya llama loadUser() al montar — no duplicar aquí
  const { isAuthenticated, isLoading, user, serverDown } = useAuthStore();

  // Mostrar spinner mientras se carga el usuario
  if (isLoading) {
    return <FullPageSpinner label="Verificando autenticación..." />;
  }

  // Servidor caído sin sesión previa → mostrar pantalla de error en lugar de /login
  if (serverDown) {
    return <ServerDownScreen />;
  }

  // Si no está autenticado, redirigir a login con la ruta actual
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se requieren roles específicos, verificar que el usuario los tenga
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = user?.role?.name;
    
    if (!userRole || !requiredRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Usuario autenticado y con permisos correctos
  return <>{children}</>;
}
