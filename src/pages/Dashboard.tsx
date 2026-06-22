import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie,
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
  BarChart3,
  Package,
  Users,
  Crown,
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

// Paleta armónica para el Donut de productos
const DONUT_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  const dateRange = getDateRange(timeRange);

  const { data: dashData, isLoading, isError } = useQuery({
    queryKey: ['dashboard', timeRange],
    queryFn: () => reportsService.getDashboard(dateRange),
    refetchInterval: 30000, // refetch cada 30 segundos
    staleTime: 10000,
  });

  // El backend devuelve campos adicionales no declarados en DashboardStats
  // (comparison, peakHour, topTables, salesLast7Days). Usamos un cast a any
  // solo para esos accesos, sin alterar la lógica de datos.
  const dashExtra = dashData as any;

  const stats = {
    totalSales: dashData?.totalSales ?? 0,
    totalOrders: dashData?.totalOrders ?? 0,
    avgTicket: dashData?.averageTicket ?? 0,
    topProduct: dashData?.topProducts?.[0]?.product?.name ?? '—',
  };

  const topProducts    = dashData?.topProducts    ?? [];
  const salesByHour    = dashData?.salesByHour    ?? [];
  const salesByWaiter  = dashData?.salesByWaiter   ?? [];
  const salesLast7Days = dashExtra?.salesLast7Days ?? [];
  const topTables      = dashExtra?.topTables      ?? [];
  const peakHour       = dashExtra?.peakHour       ?? null;
  const comparison     = dashExtra?.comparison      ?? null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Datos transformados para el BarChart de Ventas por Hora
  const hourlyChartData = salesByHour.map((h: any) => ({
    label: `${Number(h.hour).toString().padStart(2, '0')}:00`,
    sales: Number(h.sales),
    orders: Number(h.orders ?? 0),
  }));

  // Datos para el Donut de Top Productos (peso por ingresos)
  const productChartData = topProducts.slice(0, 8).map((p) => ({
    name: p.product?.name ?? 'Producto',
    value: Number(p.revenue ?? 0),
    quantity: p.quantity,
  }));

  // Tooltip personalizado del BarChart (mantiene formato CLP + personas)
  const HourTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-sm font-bold text-amber-600">{formatCurrency(data.sales)}</p>
        <p className="text-xs text-slate-500">{data.orders} {data.orders === 1 ? 'persona' : 'personas'}</p>
      </div>
    );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Resumen de actividad del negocio</p>
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

      {/* Selector de rango */}
      <div className="mb-6 flex gap-2">
        {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-100'
            }`}
          >
            {range === 'today' ? 'Hoy' : range === 'week' ? 'Esta Semana' : 'Este Mes'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {/* ============================================================ */}
        {/* TAREA 1: HERO CARD — Resumen del Día (3 métricas principales) */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 shadow-xl">
          {/* Decoración de fondo */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />

          <div className="relative p-6">
            <div className="mb-5 flex items-center gap-2 text-slate-300">
              <Crown size={18} className="text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Resumen ejecutivo</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ventas Totales */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-slate-400">
                  <DollarSign size={16} className="text-emerald-400" />
                  <p className="text-sm font-medium">Ventas Totales</p>
                </div>
                <h3 className="mt-2 text-3xl font-bold text-white">
                  {isLoading
                    ? <span className="animate-pulse bg-slate-700 h-9 w-40 rounded block" />
                    : formatCurrency(stats.totalSales)}
                </h3>
                {comparison?.growthSales != null && (
                  <span
                    className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      comparison.isPositive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {comparison.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {comparison.isPositive ? '+' : ''}{comparison.growthSales}% vs período ant.
                  </span>
                )}
              </div>

              {/* Órdenes Completadas */}
              <div className="flex flex-col md:border-l md:border-slate-700/60 md:pl-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShoppingCart size={16} className="text-blue-400" />
                  <p className="text-sm font-medium">Órdenes Completadas</p>
                </div>
                <h3 className="mt-2 text-3xl font-bold text-white">
                  {isLoading
                    ? <span className="animate-pulse bg-slate-700 h-9 w-20 rounded block" />
                    : stats.totalOrders}
                </h3>
                {comparison?.growthOrders != null && (
                  <span
                    className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      (comparison.growthOrders ?? 0) >= 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {(comparison.growthOrders ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {(comparison.growthOrders ?? 0) >= 0 ? '+' : ''}{comparison.growthOrders}% vs ant.
                  </span>
                )}
              </div>

              {/* Ticket Promedio */}
              <div className="flex flex-col md:border-l md:border-slate-700/60 md:pl-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <TrendingUp size={16} className="text-amber-400" />
                  <p className="text-sm font-medium">Ticket Promedio</p>
                </div>
                <h3 className="mt-2 text-3xl font-bold text-white">
                  {isLoading
                    ? <span className="animate-pulse bg-slate-700 h-9 w-32 rounded block" />
                    : formatCurrency(stats.avgTicket)}
                </h3>
                <p className="mt-2 text-xs text-slate-400">por orden</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas secundarias: Hora Pico + Mesa Destacada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hora Pico */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-purple-600" />
                <h3 className="text-base font-bold text-slate-800">Hora Pico</h3>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-800">
                {isLoading
                  ? <span className="animate-pulse bg-slate-200 h-8 w-20 rounded block" />
                  : peakHour ? peakHour.label : '—'}
              </p>
              {peakHour && (
                <p className="text-sm text-slate-500 mt-1">
                  {peakHour.orders} órdenes · {formatCurrency(peakHour.sales)}
                </p>
              )}
            </div>
          </div>

          {/* Mesa Destacada */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={18} className="text-rose-600" />
                <h3 className="text-base font-bold text-slate-800">Mesa Destacada</h3>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-800">
                {isLoading
                  ? <span className="animate-pulse bg-slate-200 h-8 w-24 rounded block" />
                  : topTables[0]?.name ?? '—'}
              </p>
              {topTables[0] && (
                <p className="text-sm text-slate-500 mt-1">
                  {topTables[0].orders} órdenes · {formatCurrency(topTables[0].revenue)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tendencia 7 Días */}
        {salesLast7Days.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">Tendencia últimos 7 días</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesLast7Days} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
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
                  stroke="url(#lineGradient)"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAREA 3: Top Productos — Donut + Lista (leyenda)             */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productos Más Vendidos */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-amber-600" />
                <h2 className="text-xl font-bold text-slate-800">Productos Más Vendidos</h2>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-slate-200 rounded-full" />
                    <div className="flex-1 h-4 bg-slate-200 rounded" />
                    <div className="w-20 h-4 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
                <p>Sin ventas en este período</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Donut Chart */}
                <div className="w-full md:w-1/2 flex justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={productChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {productChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number, _name: string, entry: any) => [
                          formatCurrency(Number(value)),
                          entry?.payload?.name ?? 'Producto',
                        ]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista = leyenda interactiva */}
                <div className="w-full md:w-1/2 space-y-2">
                  {topProducts.slice(0, 8).map((item, index) => (
                    <div
                      key={item.product?.id ?? index}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {item.product?.name ?? 'Producto'}
                        </p>
                        <p className="text-xs text-slate-500">{item.quantity} vendidos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(item.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* TAREA 2: Ventas por Hora — BarChart Premium                */}
          {/* ========================================================== */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">Ventas por Hora</h2>
              </div>
              <Clock size={20} className="text-slate-400" />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-slate-300" size={32} />
              </div>
            ) : salesByHour.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock size={40} className="mx-auto mb-2 opacity-30" />
                <p>Sin datos de horas en este período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={hourlyChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(Number(v))}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <RechartsTooltip content={<HourTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />
                  <Bar
                    dataKey="sales"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* Rendimiento por Mesero                                      */}
        {/* ============================================================ */}
        {salesByWaiter.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-800">Rendimiento por Mesero</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salesByWaiter.map((item: any, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-700 font-bold text-sm">
                      {(item.waiter?.name ?? 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{item.waiter?.name ?? 'Desconocido'}</p>
                    <p className="text-xs text-slate-500">{item.orders} órdenes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800 text-sm">{formatCurrency(item.sales)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Widget de estado de impresoras */}
        <div className="max-w-xs">
          <PrintStatusWidget />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;