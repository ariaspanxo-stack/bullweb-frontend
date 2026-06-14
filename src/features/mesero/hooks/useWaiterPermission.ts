// ═══════════════════════════════════════════════════════════════
// useWaiterPermission — verifica permisos del mesero logueado
// Los permisos vienen del JWT firmado al hacer login con PIN
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';

/** Lee los permisos del mesero desde localStorage (waiterInfo) */
function getWaiterPermissions(): string[] {
  try {
    const raw = localStorage.getItem('waiterInfo');
    if (!raw) return [];
    const info = JSON.parse(raw);
    return Array.isArray(info.permissions) ? info.permissions : [];
  } catch {
    return [];
  }
}

/**
 * Verifica si el mesero logueado tiene un permiso de waiter_app.
 * @param action  — clave de la acción (sin prefijo): 'charge', 'edit_order', etc.
 */
export function useWaiterPermission(action: string): boolean {
  return useMemo(
    () => getWaiterPermissions().includes(`waiter_app.${action}`),
    [action],
  );
}

/**
 * Devuelve los permisos completos del mesero logueado.
 */
export function useWaiterPermissions(): string[] {
  return useMemo(() => getWaiterPermissions(), []);
}
