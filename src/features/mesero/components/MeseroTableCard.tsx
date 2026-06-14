// ═══════════════════════════════════════════════════════════════
// MESERO TABLE CARD — tarjeta individual de mesa
// ═══════════════════════════════════════════════════════════════

interface Props {
  table:   any;
  onClick: () => void;
}

const STATUS_CONFIG = {
  AVAILABLE: {
    bar:   'bg-green-400',
    badge: 'bg-green-100 text-green-700',
    label: 'Libre',
    bg:    'hover:border-green-300 hover:bg-green-50',
  },
  OCCUPIED: {
    bar:   'bg-red-400',
    badge: 'bg-red-100 text-red-700',
    label: 'Ocupada',
    bg:    'hover:border-red-300 hover:bg-red-50',
  },
  RESERVED: {
    bar:   'bg-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700',
    label: 'Reservada',
    bg:    'hover:border-yellow-300 hover:bg-yellow-50',
  },
} as const;

export function MeseroTableCard({ table, onClick }: Props) {
  const config = STATUS_CONFIG[table.status as keyof typeof STATUS_CONFIG]
    ?? STATUS_CONFIG.AVAILABLE;

  // Garzón asignado (viene de orders[0].users_orders_waiterIdTousers)
  const activeWaiter = table.orders?.[0]?.users_orders_waiterIdTousers?.name as string | undefined;

  return (
    <button
      onClick={onClick}
      className={`relative bg-white rounded-2xl border-2 border-gray-100
        overflow-hidden shadow-sm active:scale-95 transition-all
        w-full text-left ${config.bg}`}
    >
      {/* Barra de estado superior */}
      <div className={`h-1.5 w-full ${config.bar}`} />

      <div className="p-4">
        {/* Número de mesa grande */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl font-black text-gray-800">
            {table.number}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.badge}`}>
            {config.label}
          </span>
        </div>

        {/* Capacidad */}
        <div className="flex items-center gap-1 text-gray-400">
          <span className="text-sm">👥</span>
          <span className="text-xs">{table.capacity} personas</span>
        </div>

        {/* Sección */}
        {table.section && (
          <div className="text-xs text-gray-400 mt-1 truncate">
            📍 {table.section.name}
          </div>
        )}

        {/* Garzón asignado */}
        {activeWaiter && (
          <div className="text-xs text-blue-600 mt-1 truncate font-medium">
            👤 {activeWaiter.split(' ')[0].toUpperCase()}
          </div>
        )}
      </div>
    </button>
  );
}
