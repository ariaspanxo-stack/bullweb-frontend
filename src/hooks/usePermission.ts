import { useAuthStore } from '@/store/authStore';

/**
 * Hook centralizado para verificar permisos del usuario autenticado.
 *
 * - Si el usuario tiene 'admin.manage' se considera superadmin y tiene todos los permisos.
 * - Acepta un string o array de strings (OR logic: basta con tener uno).
 *
 * @example
 *   const canManage = usePermission('delivery.manage');
 *   const canView   = usePermission(['delivery.view', 'pos.access']);
 */
export function usePermission(permission: string | string[]): boolean {
  const user = useAuthStore((s) => s.user);
  const permissions: string[] = user?.role?.permissions ?? [];

  // Superadmin implícito: admin.manage cubre todo
  if (permissions.includes('admin.manage')) return true;

  if (Array.isArray(permission)) {
    return permission.some((p) => permissions.includes(p));
  }
  return permissions.includes(permission);
}
