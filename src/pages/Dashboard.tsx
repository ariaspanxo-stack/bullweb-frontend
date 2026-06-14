import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  ShoppingCart, 
  DollarSign,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
} from 'lucide-react';
import { reportsService } from '@/services/reportsService';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { PrintStatusWidget } from '@/components/dashboard/PrintStatusWidget';

type TimeRange = 'today' | 'week' | 'month';

const getDateRange = (range: TimeRange) => {
  const now = new Date();
  switch (range) {
    case 'today':
      return { dateFrom: startOfDay(now).toISOString(), dateTo: endOfDay(now).toISOString() };
    case 'week':
      return { dateFrom: startOfDay(subDays(now, 7)).toISOString(), dateTo: endOfDay(now).toISOString() };
    case 'month':
      return { dateFrom: startOfDay(subDays(now, 30)).toISOString(), dateTo: endOfDay(now).toISOString() };
  }
};

export const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  const dateRange = getDateRange(timeRange);

  const { data: dashData, isLoading, isError } = useQuery({
    queryKey: ['dashboard', timeRange],
    queryFn: () => reportsService.getDashboard(dateRange),
    refetchInterval: 30000, // refetch cada 30 segundos
    staleTime: 10000,
  });

  const stats = {
    totalSales: dashData?.totalSales ?? 0,
    totalOrders: dashData?.totalOrders ?? 0,
    avgTicket: dashData?.averageTicket ?? 0,
    topProduct: dashData?.topProducts?.[0]?.product?.name ?? '—',
  };

  const topProducts   = dashData?.topProducts   ?? [];
  const salesByHour   = dashData?.salesByHour   ?? [];
  const salesByWaiter = dashData?.salesByWaiter  ?? [];
  const salesLast7Days = dashData?.salesLast7Days ?? [];
  const topTables      = dashData?.topTables      ?? [];
  const peakHour       = dashData?.peakHour       ?? null;
  const comparison     = dashData?.comparison      ?? null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen de actividad del negocio</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Actualizando...</span>
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle size={18} />
            <span className="text-sm">Error al cargar datos</span>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {range === 'today' ? 'Hoy' : range === 'week' ? 'Esta Semana' : 'Este Mes'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        {/* Ventas Totales */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium">Ventas Totales</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {isLoading ? <span className="animate-pulse bg-gray-200 h-8 w-32 rounded block" /> : formatCurrency(stats.totalSales)}
              </h3>
              {comparison?.growthSales != null && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 ${
                  comparison.isPositive ? 'text-green-600' : 'text-red-500'
                }`}>
                  {comparison.isPositive
                    ? <TrendingUp size={12} />
                    : <TrendingDown size={12} />}
                  {comparison.isPositive ? '+' : ''}{comparison.growthSales}% vs período ant.
                </span>
              )}
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <DollarSign className="text-blue-600" size={22} />
            </div>
          </div>
        </div>

        {/* Órdenes */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium">Órdenes Completadas</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {isLoading ? <span className="animate-pulse bg-gray-200 h-8 w-16 rounded block" /> : stats.totalOrders}
              </h3>
              {comparison?.growthOrders != null && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 ${
                  (comparison.growthOrders ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {(comparison.growthOrders ?? 0) >= 0
                    ? <TrendingUp size={12} />
                    : <TrendingDown size={12} />}
                  {(comparison.growthOrders ?? 0) >= 0 ? '+' : ''}{comparison.growthOrders}% vs ant.
                </span>
              )}
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <ShoppingCart className="text-green-600" size={22} />
            </div>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium">Ticket Promedio</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {isLoading ? <span className="animate-pulse bg-gray-200 h-8 w-24 rounded block" /> : formatCurrency(stats.avgTicket)}
              </h3>
              <p className="text-gray-500 text-xs mt-1">por orden</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <TrendingUp className="text-orange-600" size={22} />
            </div>
          </div>
        </div>

        {/* Hora Pico */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium">Hora Pico</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {isLoading
                  ? <span className="animate-pulse bg-gray-200 h-8 w-16 rounded block" />
                  : peakHour ? peakHour.label : '—'
                }
              </h3>
              {peakHour && (
                <p className="text-gray-500 text-xs mt-1">
                  {peakHour.orders} órd · {formatCurrency(peakHour.sales)}
                </p>
              )}
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Clock className="text-purple-600" size={22} />
            </div>
          </div>
        </div>

        {/* Mesa Más Rentable */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-rose-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium">Mesa Destacada</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {isLoading
                  ? <span className="animate-pulse bg-gray-200 h-8 w-16 rounded block" />
                  : topTables[0]?.name ?? '—'
                }
              </h3>
              {topTables[0] && (
                <p className="text-gray-500 text-xs mt-1">
                  {topTables[0].orders} órd · {formatCurrency(topTables[0].revenue)}
                </p>
              )}
            </div>
            <div className="bg-rose-100 p-3 rounded-full">
              <UtensilsCrossed className="text-rose-600" size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Tendencia 7 Días */}
      {salesLast7Days.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tendencia últimos 7 días</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesLast7Days} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <RechartsTooltip
                formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos Más Vendidos */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Productos Más Vendidos</h2>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1 h-4 bg-gray-200 rounded" />
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
              <p>Sin ventas en este período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.slice(0, 8).map((item, index) => (
                <div 
                  key={item.product?.id ?? index}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{item.product?.name ?? 'Producto'}</p>
                    <p className="text-sm text-gray-600">{item.quantity} vendidos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ventas por Hora */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Ventas por Hora</h2>
            <Clock size={20} className="text-gray-400" />
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-4 bg-gray-200 rounded" />
                  <div className="flex-1 h-4 bg-gray-200 rounded" />
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : salesByHour.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock size={40} className="mx-auto mb-2 opacity-30" />
              <p>Sin datos de horas en este período</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {salesByHour.map((item: any, index) => {
                const maxSales = Math.max(...salesByHour.map((h: any) => Number(h.sales)));
                const pct = maxSales > 0 ? (Number(item.sales) / maxSales) * 100 : 0;
                const hour = Number(item.hour);
                const label = `${hour.toString().padStart(2,'0')}:00`;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 text-xs font-mono text-gray-500 text-right">{label}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-medium text-gray-800">
                      {formatCurrency(Number(item.sales))}
                    </div>
                    <div className="w-10 text-right text-xs text-gray-500">
                      {item.orders}p
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ventas por Mesero */}
      {salesByWaiter.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Rendimiento por Mesero</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesByWaiter.map((item: any, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-sm">
                    {(item.waiter?.name ?? 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{item.waiter?.name ?? 'Desconocido'}</p>
                  <p className="text-xs text-gray-500">{item.orders} órdenes</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800 text-sm">{formatCurrency(item.sales)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Widget de estado de impresoras */}
      <div className="mt-6 max-w-xs">
        <PrintStatusWidget />
      </div>
    </div>
  );
};

export default Dashboard;
