// ═══════════════════════════════════════════════════════════════
// MESERO TABLE CARD — tarjeta individual de mesa
// ═══════════════════════════════════════════════════════════════

import { User, Clock, DollarSign, Users } from 'lucide-react';

interface Props {
  table:   any;
  onClick: () => void;
}

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
}

export function MeseroTableCard({ table, onClick }: Props) {
  const isOccupied = table.status === 'OCCUPIED' || (table.orders?.length ?? 0) > 0;

  // Garzón asignado (viene de orders[0].users_orders_waiterIdTousers)
  const activeOrder = table.orders?.[0];
  const activeWaiter = activeOrder?.users_orders_waiterIdTousers?.name as string | undefined;

  // Total de la cuenta activa
  const billTotal: number | undefined = activeOrder?.total ?? activeOrder?.totalAmount;

  // Tiempo transcurrido (si existe createdAt en la orden)
  const elapsedMin = activeOrder?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000))
    : undefined;

  // ── Contenedor según estado ──────────────────────────────────
  const containerClasses = isOccupied
    ? 'bg-orange-50 border border-orange-400 border-l-4 border-l-orange-500'
    : 'bg-emerald-50 border border-emerald-200';

  // ── Color del número de mesa ─────────────────────────────────
  const numberClasses = isOccupied ? 'text-orange-700' : 'text-emerald-700';

  return (
    <button
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden shadow-sm
        active:scale-95 transition-all w-full text-left ${containerClasses}`}
    >
      <div className="p-4">
        {/* Número de mesa + estado */}
        <div className="flex items-start justify-between mb-3">
          <span className={`text-3xl font-black ${numberClasses}`}>
            {table.number}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            isOccupied
              ? 'bg-orange-200 text-orange-800'
              : 'bg-emerald-200 text-emerald-800'
          }`}>
            {isOccupied ? 'Ocupada' : 'Libre'}
          </span>
        </div>

        {/* Capacidad */}
        <div className="flex items-center gap-1 text-gray-500">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs">{table.capacity} personas</span>
        </div>

        {/* Sección */}
        {table.section && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            📍 {table.section.name}
          </div>
        )}

        {/* Garzón asignado */}
        {activeWaiter && (
          <div className="text-xs text-gray-600 mt-1 truncate font-medium flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {activeWaiter.split(' ')[0].toUpperCase()}
          </div>
        )}

        {/* Tiempo transcurrido (mesa ocupada) */}
        {isOccupied && elapsedMin !== undefined && (
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {elapsedMin} min
          </div>
        )}

        {/* Total de la cuenta en chip (mesa ocupada) */}
        {isOccupied && billTotal !== undefined && (
          <div className="mt-3 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-gray-700" />
            <span className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-full">
              {formatCLP(billTotal)}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
