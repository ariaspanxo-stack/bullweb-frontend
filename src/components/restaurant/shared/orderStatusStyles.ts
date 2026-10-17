// ═══════════════════════════════════════════════════════════════
// orderStatusStyles — Fuente única de estilos por estado de orden
// Usado por OrderCardCompact (badge + borde) y los chips de MostradorTab / DeliveryTab.
// El verde de READY es color de estado informativo (exento de la regla WhatsApp).
// ═══════════════════════════════════════════════════════════════

export interface OrderStatusStyle {
  label:     string;
  badgeBg:   string;
  badgeText: string;
  border:    string;
  dot:       string;
}

export const STATUS_STYLES: Record<string, OrderStatusStyle> = {
  PENDING:   { label: 'Pendiente',      badgeBg: 'bg-red-100',   badgeText: 'text-red-700',   border: 'border-l-red-700',   dot: 'bg-red-500'   },
  PREPARING: { label: 'En preparación', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800', border: 'border-l-amber-800', dot: 'bg-amber-500' },
  READY:     { label: 'Listo',          badgeBg: 'bg-green-100', badgeText: 'text-green-700', border: 'border-l-green-700', dot: 'bg-green-500' },
  CANCELLED: { label: 'Cancelado',      badgeBg: 'bg-gray-100',  badgeText: 'text-gray-700',  border: 'border-l-gray-300',  dot: 'bg-gray-400'  },
};

// Umbrales (minutos) para colorear el tiempo transcurrido de una orden
export const TIME_WARN_MIN  = 15;
export const TIME_ALERT_MIN = 30;
