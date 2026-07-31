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

  // ========== SEGMENTOS ==========

  /**
   * Configuración de color para el segmento del cliente (calculado por el backend).
   * VIP: morado, FREQUENT: verde, REGULAR: azul, NEW: gris, AT_RISK: rojo, INACTIVE: naranjo.
   */
  export function getSegmentConfig(
    segment?: string | null
  ): { label: string; color: string } | null {
    if (!segment) return null;
    const configs: Record<string, { label: string; color: string }> = {
      VIP:      { label: 'VIP',       color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      FREQUENT: { label: 'Frecuente', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
      REGULAR:  { label: 'Regular',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      NEW:      { label: 'Nuevo',     color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
      AT_RISK:  { label: 'En Riesgo', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
      INACTIVE: { label: 'Inactivo',  color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    };
    return configs[segment] ?? null;
  }

  // ========== WHATSAPP ==========

  /**
   * Construye la URL de WhatsApp para un cliente chileno.
   * El teléfono se normaliza a dígitos (se quitan espacios/guiones) y se antepone 56 si falta.
   * Devuelve null si el cliente no tiene teléfono.
   */
  export function buildWhatsAppUrl(
    phone?: string | null,
    name?: string | null
  ): string | null {
    if (!phone) return null;
    let digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    if (!digits.startsWith('56')) digits = '56' + digits;
    const text = `Hola ${encodeURIComponent(name ?? '')}`.replace(/%20$/, '');
    return `https://wa.me/${digits}?text=${text}`;
  }

  // ========== FECHAS ==========

  /**
   * Formatea una fecha a dd-mm-yyyy. Devuelve fallback si es null/undefined.
   */
  export function formatDate(
    date?: string | Date | null,
    fallback = 'Nunca'
  ): string {
    if (!date) return fallback;
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  // BUG 13: generateDummyCustomers() eliminada (datos ficticios que no se usaban)
  // Si necesitas seed, usa el backend POST /api/customers o el panel de administración.

/** @deprecated solo se mantiene para no romper imports externos */
export function generateDummyCustomers(): never[] {
  return [];
}

