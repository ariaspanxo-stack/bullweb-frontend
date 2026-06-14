// ═══════════════════════════════════════════════════════════════
// MESERO ACTIVE ORDERS — vista "Mis Órdenes" (Fase 2)
// Lista de mesas ocupadas con estado de cada plato en tiempo real
// ═══════════════════════════════════════════════════════════════

import { RefreshCw, Loader2 } from 'lucide-react';
import { ElapsedTime } from './ElapsedTime';
import type { TableWithOrder } from '../hooks/useMeseroActiveOrders';
import { useWaiterPermission } from '../hooks/useWaiterPermission';
import { PermissionBlocked }   from './PermissionBlocked';

// ── Helpers ──────────────────────────────────────────────────
const formatPrice = (val: any) => {
  const n = Number(val);
  if (isNaN(n)) return '$0';
  return `$${n.toLocaleString('es-CL')}`;
};

// ── Constantes de estado ─────────────────────────────────────
const ORDER_STATUS: Record<string, {
  label: string; bar: string; badge: string; text: string;
}> = {
  PENDING: {
    label: 'Pendiente',
    bar:   'bg-blue-400',
    badge: 'bg-blue-100  text-blue-700',
    text:  'text-blue-600',
  },
  PREPARING: {
    label: 'Preparando',
    bar:   'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    text:  'text-amber-600',
  },
  READY: {
    label: 'Listo',
    bar:   'bg-green-500',
    badge: 'bg-green-100 text-green-700',
    text:  'text-green-600',
  },
};

const ITEM_ICON: Record<string, string> = {
  PENDING:   '🕐',
  PREPARING: '👨‍🍳',
  READY:     '✅',
};

// ── Sub-componente: estado de un ítem ─────────────────────────
function OrderItemStatus({ item }: { item: any }) {
  const icon = ITEM_ICON[item.status] ?? '🕐';
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm w-5 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-sm text-gray-700 truncate">
        {item.quantity > 1 && (
          <span className="font-medium">{item.quantity}× </span>
        )}
        {item.product?.name ?? item.name ?? 'Producto'}
      </span>
      {item.notes && (
        <span className="text-xs text-amber-600 truncate max-w-[100px]">
          {item.notes}
        </span>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  tables:         TableWithOrder[];
  loading:        boolean;
  readyCount:     number;
  preparingCount: number;
  onSelectTable:  (table: TableWithOrder) => void;
  onRefresh:      () => void;
}

// ── Componente principal ──────────────────────────────────────
export function MeseroActiveOrders({
  tables, loading, readyCount, preparingCount, onSelectTable, onRefresh,
}: Props) {

  const canView = useWaiterPermission('view_orders');

  // Ordenar: READY primero, luego PREPARING, luego PENDING
  const STATUS_ORDER: Record<string, number> = { READY: 0, PREPARING: 1, PENDING: 2 };
  const sortedTables = [...tables].sort((a, b) => {
    const sa = STATUS_ORDER[a.activeOrder?.status ?? 'PENDING'] ?? 3;
    const sb = STATUS_ORDER[b.activeOrder?.status ?? 'PENDING'] ?? 3;
    return sa - sb;
  });

  if (!canView) {
    return (
      <PermissionBlocked message="No tienes permiso para ver las órdenes activas" />
    );
  }

  // ── Pantalla vacía / cargando ────────────────────────────
  if (loading && tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        <p className="text-sm">Cargando órdenes…</p>
      </div>
    );
  }

  if (!loading && tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-gray-400">
        <span className="text-5xl">📋</span>
        <p className="font-medium">Sin órdenes activas</p>
        <p className="text-sm">No hay mesas ocupadas en este momento</p>
        <button
          onClick={onRefresh}
          className="mt-2 flex items-center gap-2 text-orange-500 text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>
    );
  }

  // ── Contenido ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Barra de estadísticas */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex-1 text-center">
          <div className="text-xl font-bold text-gray-800">{tables.length}</div>
          <div className="text-xs text-gray-500">Mesas</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="flex-1 text-center">
          <div className={`text-xl font-bold ${preparingCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {preparingCount}
          </div>
          <div className="text-xs text-gray-500">Preparando</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="flex-1 text-center">
          <div className={`text-xl font-bold ${readyCount > 0 ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}>
            {readyCount}
          </div>
          <div className="text-xs text-gray-500">Listos</div>
        </div>
        <button
          onClick={onRefresh}
          className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-orange-500
                     hover:bg-orange-50 transition-colors"
          aria-label="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Lista de tarjetas */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {sortedTables.map(table => {
          const order   = table.activeOrder!;
          const status  = ORDER_STATUS[order.status] ?? ORDER_STATUS.PENDING;
          const items   = order.order_items ?? order.orderItems ?? order.items ?? [];
          // total desde subtotales de ítems (orders.total = 0 hasta el cobro)
          const total   = items.reduce((s: number, i: any) => s + Number(i.subtotal ?? 0), 0)
                          || Number(order.total) || 0;
          const readyQ  = items.filter((i: any) => i.status === 'READY').length;
          const isReady = order.status === 'READY';
          const billRequested = (order.notes ?? '').includes('CUENTA SOLICITADA');
          const MAX_VISIBLE = 4;

          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
              className="w-full text-left bg-white rounded-xl shadow-sm border
                         border-gray-100 overflow-hidden active:scale-[0.99]
                         transition-transform"
            >
              {/* Barra de estado (color) */}
              <div className={`h-1 w-full ${status.bar}`} />

              <div className="p-3">
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-gray-800 leading-none">
                      {table.number}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${status.badge} ${isReady ? 'animate-pulse' : ''}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {table.section?.name && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {table.section.name}
                      </span>
                    )}
                    <ElapsedTime createdAt={order.createdAt} />
                  </div>
                </div>

                {/* Barra de progreso */}
                {items.length > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                      <span>{readyQ}/{items.length} platos</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
                        style={{ width: items.length ? `${(readyQ / items.length) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {items.slice(0, MAX_VISIBLE).map((item: any) => (
                    <OrderItemStatus key={item.id} item={item} />
                  ))}
                  {items.length > MAX_VISIBLE && (
                    <p className="text-xs text-gray-400 pt-1 pl-7">
                      +{items.length - MAX_VISIBLE} más…
                    </p>
                  )}
                </div>

                {/* Cuenta solicitada */}
                {billRequested && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-semibold
                                  text-red-600 bg-red-50 rounded-lg px-2 py-1">
                    🧾 Cuenta solicitada
                  </div>
                )}

                {/* Total */}
                <div className="mt-2 flex justify-end">
                  <span className="text-sm font-bold text-gray-800">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
