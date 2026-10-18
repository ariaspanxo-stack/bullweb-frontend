// ═══════════════════════════════════════════════════════════════
// orderStatusStyles — Fuente única de estilos por estado de orden y de mesa
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

// Hotfix #255: estilos por estado de MESA (MesasTab). Sin verde: libre es neutro.
export interface TableStatusStyle {
  label:  string;
  border: string;
  bg:     string;
  number: string;
}

export const TABLE_STYLES: Record<string, TableStatusStyle> = {
  AVAILABLE: { label: 'Libre',     border: 'border-slate-200',    bg: 'bg-white',     number: 'text-slate-700'  },
  OCCUPIED:  { label: 'Ocupada',   border: 'border-l-orange-500', bg: 'bg-orange-50', number: 'text-orange-700' },
  RESERVED:  { label: 'Reservada', border: 'border-l-violet-500', bg: 'bg-violet-50', number: 'text-violet-700' },
  CLEANING:  { label: 'Limpieza',  border: 'border-l-slate-400',  bg: 'bg-slate-100', number: 'text-slate-500'  },
};

// Umbrales (minutos) para colorear el tiempo de una mesa ocupada
export const TABLE_TIME_WARN_MIN  = 60;
export const TABLE_TIME_ALERT_MIN = 120;
