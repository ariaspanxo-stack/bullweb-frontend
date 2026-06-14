import { Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface PermissionGuardProps {
  permission: string | string[];
  children: React.ReactNode;
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const user = useAuthStore(state => state.user);
  const userPermissions = (user?.role?.permissions ?? []) as string[];
  const isAdmin = userPermissions.includes('ALL_PERMISSIONS');

  const hasAccess = isAdmin || (
    Array.isArray(permission)
      ? permission.some(p => userPermissions.includes(p))
      : userPermissions.includes(permission)
  );

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
        <Lock className="w-14 h-14 mb-4 text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-500 mb-2">Acceso restringido</h2>
        <p className="text-sm text-gray-400">No tienes permisos para ver esta sección.</p>
        <p className="text-xs text-gray-300 mt-1">
          Contacta al administrador si crees que es un error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
