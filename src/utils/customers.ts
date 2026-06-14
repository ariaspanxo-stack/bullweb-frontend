import type { CustomerTag } from '../pages/Restaurant/types';

// ========== UTILIDADES DE UI ==========

/**
 * Obtener configuración de color para un tag
 */
export function getTagConfig(tag: CustomerTag): { label: string; color: string } {
  const configs: Record<CustomerTag, { label: string; color: string }> = {
    new:      { label: 'Nuevo',     color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'   },
    frequent: { label: 'Frecuente', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
    vip:      { label: 'VIP',       color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    inactive: { label: 'Inactivo',  color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'   },
  };
  return configs[tag] ?? { label: tag, color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' };
}

/** BUG 14: Formatea número chileno para mostrar en tabla */
export function formatPhone(phone?: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  const local  = digits.startsWith('56') ? digits.slice(2) : digits;
  if (local.length === 9 && local.startsWith('9')) {
    return `+56 ${local[0]} ${local.slice(1, 5)} ${local.slice(5)}`;
  }
  return phone;
}

// BUG 13: generateDummyCustomers() eliminada (datos ficticios que no se usaban)
// Si necesitas seed, usa el backend POST /api/customers o el panel de administración.

/** @deprecated solo se mantiene para no romper imports externos */
export function generateDummyCustomers(): never[] {
  return [];
}

