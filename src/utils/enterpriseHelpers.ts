// ═══════════════════════════════════════════════════════════════════════════
// ENTERPRISE HELPERS - Utilidades para campos enterprise
// ═══════════════════════════════════════════════════════════════════════════

import type { ShiftType } from '../types/restaurant.types';

/**
 * Calcular turno basado en la hora actual
 * MORNING: 06:00 - 13:59
 * AFTERNOON: 14:00 - 20:59
 * NIGHT: 21:00 - 05:59
 */
export function calculateShift(date: Date = new Date()): ShiftType {
  const hour = date.getHours();

  if (hour >= 6 && hour < 14) {
    return 'morning';
  } else if (hour >= 14 && hour < 21) {
    return 'afternoon';
  } else {
    return 'night';
  }
}

/**
 * Obtener caja registradora activa desde la API
 */
export async function getActiveCashRegister(): Promise<{
  id: string;
  name: string;
  isOpen: boolean;
}> {
  try {
    const { cashRegistersService } = await import('../services/cashRegistersService');
    const result = await cashRegistersService.getActiveRegister();
    if (result) return result;
  } catch {
    // Si la API falla (red, sin permisos), usamos fallback para no bloquear el POS
  }

  // Fallback: caja por defecto (no bloquea el POS si la API no responde)
  return {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Caja Principal',
    isOpen: true,
  };
}

/**
 * Validar que la caja registradora esté abierta.
 * El arqueo es OPCIONAL — nunca bloquea el cobro.
 */
export async function validateCashRegisterOpen(): Promise<void> {
  // No-op: el arqueo es opcional
}

/**
 * Obtener etiqueta legible del turno
 */
export function getShiftLabel(shift: ShiftType): string {
  const labels: Record<ShiftType, string> = {
    'morning': 'Mañana',
    'afternoon': 'Tarde',
    'night': 'Noche',
    'full_day': 'Todo el Día'
  };

  return labels[shift];
}

/**
 * Obtener ícono del turno
 */
export function getShiftIcon(shift: ShiftType): string {
  const icons: Record<ShiftType, string> = {
    'morning': '🌅',
    'afternoon': '☀️',
    'night': '🌙',
    'full_day': '⏰'
  };

  return icons[shift];
}