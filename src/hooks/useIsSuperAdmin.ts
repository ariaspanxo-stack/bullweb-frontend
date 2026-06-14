import { useAuthStore } from '@/store/authStore';

/**
 * Devuelve true si el usuario autenticado tiene el rol "Super Admin".
 * El rol es identificado por role.name === 'Super Admin'
 * (igual que el middleware requireSuperAdmin en el backend).
 */
export function useIsSuperAdmin(): boolean {
  const user = useAuthStore(s => s.user);
  if (!user) return false;
  return (user.role?.name ?? '') === 'Super Admin';
}
