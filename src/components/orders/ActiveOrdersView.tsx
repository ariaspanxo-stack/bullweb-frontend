import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posService } from '@/services/posService';
import { CheckCircle } from 'lucide-react';
import { isToday as isTodayFns, isYesterday, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActiveOrder {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  createdAt: string;
  total: number;
  customerName?: string;
  tables?: { number: string };
  table?: { number: string };
  customers?: { name: string; phone?: string };
  customer?: { name: string };
  users_orders_waiterIdTousers?: { name: string };
  waiter?: { name: string };
  order_items?: Array<{ quantity: number; products?: { name: string }; product?: { name: string } }>;
  items?: Array<{ quantity: number; products?: { name: string }; product?: { name: string } }>;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendiente',
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    dot: 'bg-amber-400',
    textColor: 'text-amber-700',
    timeBg: 'bg-amber-100 text-amber-800',
  },
  PREPARING: {
    label: 'En cocina',
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    dot: 'bg-orange-500 animate-pulse',
    textColor: 'text-orange-700',
    timeBg: 'bg-orange-100 text-orange-800',
  },
  READY: {
    label: 'Listo',
    border: 'border-green-400',
    bg: 'bg-green-50',
    dot: 'bg-green-500',
    textColor: 'text-green-700',
    timeBg: 'bg-green-100 text-green-800',
  },
  DELIVERED: {
    label: 'Entregado',
    border: 'border-purple-400',
    bg: 'bg-purple-50',
    dot: 'bg-purple-400',
    textColor: 'text-purple-700',
    timeBg: 'bg-purple-100 text-purple-800',
  },
} as const;

const TYPE_CONFIG: Record<string, { icon: string; label: string; bg: string }> = {
  DINE_IN:  { icon: '🍽️', label: 'Mesa',      bg: 'bg-indigo-100 text-indigo-700' },
  TAKEAWAY: { icon: '🥡',        label: 'Mostrador', bg: 'bg-purple-100 text-purple-700' },
  DELIVERY: { icon: '🚀',        label: 'Delivery',  bg: 'bg-blue-100 text-blue-700' },
};

function getOrderTitle(order: ActiveOrder): string {
  if (order.tables?.number) return `Mesa ${order.tables.number}`;
  if (order.table?.number)  return `Mesa ${order.table.number}`;
  if (order.customers?.name) return order.customers.name;
  if (order.customer?.name)  return order.customer.name;
  if (order.customerName)    return order.customerName;
  return order.type === 'TAKEAWAY' ? 'Para llevar' : order.type === 'DELIVERY' ? 'Delivery' : 'Mesa';
}

function shortNumber(orderNumber: string): string {
  const m = orderNumber.match(/(\d+)$/);
  return m ? `#${m[1].replace(/^0+/, '') || m[1]}` : `#${orderNumber}`;
}

function formatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function elapsedMins(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function isToday(createdAt: string): boolean {
  return isTodayFns(new Date(createdAt));
}

function KpiCard({ icon, value, label, color }: {
  icon: string; value: string | number; label: string; color: string;
}) {
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${color}`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <div className="text-3xl font-extrabold leading-none">{value}</div>
        <div className="text-xs font-semibold mt-1 opacity-70 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function ActiveOrderCard({ order, lateThresholdMinutes = 20 }: { order: ActiveOrder; lateThresholdMinutes?: number }) {
  const status = order.status as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const typeConfig = TYPE_CONFIG[order.type];
  const allItems = order.order_items ?? order.items ?? [];
  const waiterName = order.users_orders_waiterIdTousers?.name ?? order.waiter?.name ?? null;
  const mins = elapsedMins(order.createdAt);
  const isLate = mins > lateThresholdMinutes;

  return (
    <div className={`border-2 ${config.border} ${config.bg} rounded-xl p-4 flex flex-col gap-3`}>

      {/* Tipo + hora */}
      <div className="flex items-center justify-between">
        {typeConfig ? (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeConfig.bg}`}>
            {typeConfig.icon} {typeConfig.label}
          </span>
        ) : <span />}
        <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${config.timeBg}`}>
          {formatTime(order.createdAt)}
        </span>
      </div>

      {/* Titulo principal */}
      <div>
        <div className="text-2xl font-extrabold text-gray-900 leading-tight">
          {getOrderTitle(order)}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">Pedido {shortNumber(order.orderNumber)}</div>
        {waiterName && (
          <div className="text-xs text-gray-500 mt-0.5">{waiterName}</div>
        )}
      </div>

      {/* Estado + tiempo transcurrido */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isLate ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {mins < 1 ? 'Ahora' : `${mins} min`}
        </span>
      </div>

      {/* Items */}
      <div className="border-t border-gray-200 pt-2 space-y-0.5">
        {allItems.slice(0, 4).map((item, i) => (
          <div key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="font-bold w-5 text-right shrink-0">{item.quantity}x</span>
            <span className="truncate">{item.products?.name ?? item.product?.name ?? 'Producto'}</span>
          </div>
        ))}
        {allItems.length > 4 && (
          <div className="text-xs text-gray-400">+{allItems.length - 4} más...</div>
        )}
        {allItems.length === 0 && (
          <div className="text-xs text-gray-400 italic">Sin items</div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-2">
        <span className="text-base font-bold text-gray-900">
          ${order.total?.toLocaleString('es-CL')}
        </span>
        {isLate && (
          <span className="text-xs text-red-500 font-semibold">Demorado</span>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-xl p-4 bg-gray-100 animate-pulse h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="border-2 border-gray-200 rounded-xl p-4 animate-pulse space-y-3">
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded-full w-20" />
              <div className="h-5 bg-gray-200 rounded w-16" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="space-y-1">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OldOrdersSection({ orders, lateThresholdMinutes }: { orders: ActiveOrder[]; lateThresholdMinutes: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div className="h-px flex-1 bg-amber-200" />
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap">
          <span>⚠️</span>
          <span>
            {orders.length} orden{orders.length !== 1 ? 'es' : ''} de días anteriores
          </span>
          <span className="ml-1">{expanded ? '▲' : '▼'}</span>
        </div>
        <div className="h-px flex-1 bg-amber-200" />
      </button>

      {expanded && (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map(order => (
              <div key={order.id} className="relative">
                <div className="absolute -top-2 left-3 z-10 bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                  {isYesterday(new Date(order.createdAt))
                    ? 'Ayer'
                    : formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: es })}
                </div>
                <ActiveOrderCard order={order} lateThresholdMinutes={lateThresholdMinutes} />
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3 text-center">
            Estas órdenes quedaron abiertas. Ve a Restaurante para cerrarlas o cancélalas desde el detalle.
          </p>
        </>
      )}
    </div>
  );
}

export default function ActiveOrdersView({ lateThresholdMinutes = 20 }: { lateThresholdMinutes?: number } = {}) {
  const { data: allOrders = [], isLoading, error } = useQuery({
    queryKey: ['active-orders'],
    queryFn: () => posService.getActiveOrders(),
    refetchInterval: 5_000,
  });

  const todayOrders = useMemo(
    () => (allOrders as ActiveOrder[]).filter(o => isToday(o.createdAt)),
    [allOrders]
  );

  const oldOrders = useMemo(
    () => (allOrders as ActiveOrder[]).filter(o =>
      !isToday(o.createdAt) && ['PENDING', 'PREPARING'].includes(o.status)
    ),
    [allOrders]
  );

  const pending   = todayOrders.filter(o => o.status === 'PENDING').length;
  const preparing = todayOrders.filter(o => o.status === 'PREPARING').length;
  const ready     = todayOrders.filter(o => o.status === 'READY').length;

  const avgMins = useMemo(() => {
    const active = todayOrders.filter(o => ['PENDING','PREPARING'].includes(o.status));
    if (!active.length) return 0;
    return Math.round(active.reduce((acc, o) => acc + elapsedMins(o.createdAt), 0) / active.length);
  }, [todayOrders]);

  const gridOrders = todayOrders.filter(o => ['PENDING', 'PREPARING'].includes(o.status));

  if (isLoading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg font-medium text-red-500">Error al cargar pedidos activos</p>
        <p className="text-sm">{(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon="⏳" value={pending}          label="Pendientes"    color="bg-amber-50 text-amber-800" />
        <KpiCard icon="🔥" value={preparing}  label="En Cocina"     color="bg-orange-50 text-orange-800" />
        <KpiCard icon="✅" value={ready}            label="Listos"        color="bg-green-50 text-green-800" />
        <KpiCard icon="⏱" value={`${avgMins} min`} label="Tiempo Prom." color="bg-blue-50 text-blue-800" />
      </div>

      {gridOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <CheckCircle className="w-16 h-16 mb-4 text-green-300" />
          <p className="text-lg font-medium">No hay pedidos activos</p>
          <p className="text-sm">Todos los pedidos al dia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridOrders.map(order => (
            <ActiveOrderCard key={order.id} order={order} lateThresholdMinutes={lateThresholdMinutes} />
          ))}
        </div>
      )}

      {oldOrders.length > 0 && (
        <OldOrdersSection orders={oldOrders} lateThresholdMinutes={lateThresholdMinutes} />
      )}
    </div>
  );
}
