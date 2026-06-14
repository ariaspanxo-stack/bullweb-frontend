// ═══════════════════════════════════════════════════════════════
// MESERO HISTORIAL — historial de órdenes del mesero logueado
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, ShoppingBag, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { meseroService, type MeseroHistorialOrder } from '../meseroService';

type Rango = 'hoy' | '7d' | '30d';

export function MeseroHistorial() {

  const { user }  = useAuthStore();
  const [rango, setRango] = useState<Rango>('hoy');

  const dateFrom = (() => {
    const now = new Date();
    if (rango === 'hoy') return startOfDay(now).toISOString();
    if (rango === '7d')  return startOfDay(subDays(now, 7)).toISOString();
    return startOfDay(subDays(now, 30)).toISOString();
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['mesero-historial', user?.id, rango],
    queryFn:  () => meseroService.getMyOrders({ waiterId: user!.id, dateFrom }),
    enabled:  !!user?.id,
    staleTime: 60_000,
  });

  const orders = data?.orders ?? [];

  // Totales del período
  const totalVentas = orders.reduce((s, o) => s + Number(o.total), 0);

  // Agrupar por día
  const grouped = orders.reduce(
    (acc: Record<string, MeseroHistorialOrder[]>, order) => {
      const day = format(new Date(order.createdAt), 'yyyy-MM-dd');
      if (!acc[day]) acc[day] = [];
      acc[day].push(order);
      return acc;
    },
    {}
  );
  const days = Object.keys(grouped).sort().reverse();

  const dayLabel = (dateStr: string) => {
    const today     = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (dateStr === today)     return 'Hoy';
    if (dateStr === yesterday) return 'Ayer';
    return format(new Date(dateStr + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* Header con KPIs y selector de rango */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 pt-4 pb-3">

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-orange-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Total vendido</p>
            <p className="font-black text-orange-600">{formatCLP(totalVentas)}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Órdenes</p>
            <p className="font-black text-gray-800">{orders.length}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(['hoy', '7d', '30d'] as Rango[]).map(r => (
            <button
              key={r}
              onClick={() => setRango(r)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors
                ${rango === r ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {r === 'hoy' ? 'Hoy' : r === '7d' ? '7 días' : '30 días'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Cargando historial...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <History className="w-12 h-12 text-gray-200" />
            <p className="font-semibold text-gray-400">Sin órdenes en este período</p>
            <p className="text-xs text-gray-300">Las órdenes cobradas aparecerán aquí</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-4">
            {days.map(day => (
              <div key={day}>

                {/* Separador de día */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {dayLabel(day)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {grouped[day].length} orden{grouped[day].length !== 1 ? 'es' : ''}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {grouped[day].map(order => (
                    <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100">

                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">
                            {order.tables?.name ?? `Mesa ${order.tables?.number ?? ''}`}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-300" />
                            <p className="text-xs text-gray-400">
                              {format(new Date(order.createdAt), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                        <p className="font-black text-gray-800 text-base">
                          {formatCLP(Number(order.total))}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ShoppingBag className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {order.order_items
                            .slice(0, 3)
                            .map(i => `${i.quantity}× ${i.products?.name ?? 'Ítem'}`)
                            .join(', ')}
                          {order.order_items.length > 3 && ` +${order.order_items.length - 3} más`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}
