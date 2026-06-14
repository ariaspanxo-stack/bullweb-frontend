/**
 * BULLWEB ENTERPRISE — Admin Analytics Page
 * Tab 1 "Negocio": KPIs de ventas, tendencia, productos, pagos, horas pico.
 * Tab 2 "Sistema":  actividad de auditoría, módulos, usuarios, severidad.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  RefreshCw, TrendingUp, TrendingDown, Database,
  ShieldAlert, Users2, Activity, DollarSign,
  ShoppingCart, Receipt, Clock, BarChart2, FileDown,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { AnalyticsReport, BusinessAnalyticsReport } from '@/services/adminService';
import { exportToExcel } from '@/utils/exportExcel';

// ── paleta ──────────────────────────────────────────────────────────────────
const SEV_COLORS: Record<string, string> = {
  INFO:     '#6366f1',
  WARNING:  '#f59e0b',
  CRITICAL: '#ef4444',
  DEBUG:    '#94a3b8',
};
const BAR_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#818cf8','#4f46e5','#3730a3','#ddd6fe'];
const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN:  'Salón',
  TAKEAWAY: 'Para llevar',
  DELIVERY: 'Delivery',
};

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function GrowthBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{value}%
    </span>
  );
}

// ── tooltip ───────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 bg-gray-100 animate-pulse rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}
      </div>
      <div className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-56 bg-gray-100 animate-pulse rounded-2xl" />
        <div className="h-56 bg-gray-100 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}

// ── KpiCard ────────────────────────────────────────────────────────────────────
function KpiCard({ icon, bg, label, value, growth, sub }: {
  icon: React.ReactNode; bg: string; label: string;
  value: string; growth?: number; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
        {growth !== undefined && <GrowthBadge value={growth} />}
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB NEGOCIO
// ═══════════════════════════════════════════════════════════════════════════════
function rangePresets() {
  const now = new Date();
  const iso  = (d: Date) => d.toISOString().slice(0, 10);
  const ago  = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days + 1); return iso(d); };
  return [
    { label: 'Hoy',     from: ago(1),  to: iso(now) },
    { label: '7 días',  from: ago(7),  to: iso(now) },
    { label: '30 días', from: ago(30), to: iso(now) },
    { label: '3 meses', from: ago(90), to: iso(now) },
  ];
}

function NegocioTab() {
  const presets = rangePresets();
  const [preset, setPreset] = useState(2);
  const qc = useQueryClient();

  const { dateFrom, dateTo } = { dateFrom: presets[preset].from, dateTo: presets[preset].to };

  const { data, isLoading, dataUpdatedAt } = useQuery<BusinessAnalyticsReport>({
    queryKey: ['admin-business-analytics', dateFrom, dateTo],
    queryFn:  () => adminService.getBusinessAnalytics({ dateFrom, dateTo }),
    staleTime: 60_000,
  });

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('es-CL') : '—';

  if (isLoading) return <Skeleton />;
  if (!data) return null;

  const { kpis, trend, topProducts, paymentMethods, byHour, orderTypes } = data;
  const trendFmt = trend.map(d => ({ ...d, date: fmtDate(d.date) }));
  const hoursMap = new Map(byHour.map(h => [h.hour, h]));
  const allHours = Array.from({ length: 24 }, (_, h) => hoursMap.get(h) ?? { hour: h, orders: 0, revenue: 0 });
  const totalPayments = paymentMethods.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header + selector período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analíticas de negocio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ventas, productos y métodos de pago</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((p, i) => (
            <button key={i} onClick={() => setPreset(i)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                preset === i ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 hover:bg-gray-50'
              }`}>{p.label}</button>
          ))}
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-business-analytics'] })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => exportToExcel([
              { name: 'Tendencia',  rows: trend.map(d => ({ 'Fecha': d.date, 'Ingresos (CLP)': d.revenue, 'Órdenes': d.orders, 'Ticket prom (CLP)': d.avgTicket ?? 0 })) },
              { name: 'Top Productos', rows: topProducts.map((p, i) => ({ 'Posición': i+1, 'Producto': p.name, 'Cantidad': p.quantity, 'Ingresos (CLP)': p.revenue })) },
              { name: 'Métodos de Pago', rows: paymentMethods.map(p => ({ 'Método': p.method, 'Monto (CLP)': p.amount, 'Total sin formato': p.amount })) },
              { name: 'Por Hora', rows: allHours.map(h => ({ 'Hora': `${h.hour}:00`, 'Órdenes': h.orders, 'Ingresos (CLP)': h.revenue })) },
              { name: 'Tipo de Orden', rows: orderTypes.map(t => ({ 'Tipo': ORDER_TYPE_LABELS[t.type] ?? t.type, 'Cantidad': t.count })) },
            ], `analiticas_negocio_${new Date().toISOString().slice(0,10)}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> Exportar Excel
          </button>
          <span className="text-xs text-gray-400 hidden sm:block">Act. {lastUpdate}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="w-5 h-5 text-indigo-600" />} bg="bg-indigo-50"
          label="Ingresos" value={fmtMoney(kpis.revenue)} growth={kpis.revenueGrowth}
          sub={`vs. ${fmtMoney(kpis.revenuePrev)} per. ant.`} />
        <KpiCard icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50"
          label="Órdenes" value={kpis.orders.toLocaleString('es-CL')} growth={kpis.ordersGrowth}
          sub={`vs. ${kpis.ordersPrev} per. ant.`} />
        <KpiCard icon={<Receipt className="w-5 h-5 text-violet-600" />} bg="bg-violet-50"
          label="Ticket Promedio" value={fmtMoney(kpis.avgTicket)}
          sub={`Ant. ${fmtMoney(kpis.avgTicketPrev)}`} />
        <KpiCard icon={<BarChart2 className="w-5 h-5 text-amber-600" />} bg="bg-amber-50"
          label="Tipo principal"
          value={orderTypes[0] ? (ORDER_TYPE_LABELS[orderTypes[0].type] ?? orderTypes[0].type) : '—'}
          sub={orderTypes[0] ? `${orderTypes[0].count} órdenes` : ''} />
      </div>

      {/* Tendencia */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          Tendencia de ingresos y órdenes
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trendFmt} margin={{ top: 5, right: 8, bottom: 0, left: 10 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(trendFmt.length / 8))} />
            <YAxis yAxisId="rev" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip formatter={(v: number, name: string) => [
              name === 'Ingresos' ? fmtMoney(v) : v, name,
            ]} />
            <Legend />
            <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Ingresos"
              stroke="#6366f1" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
            <Area yAxisId="ord" type="monotone" dataKey="orders"  name="Órdenes"
              stroke="#10b981" strokeWidth={2} fill="url(#gradOrders)"  dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top productos + métodos de pago */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Top 10 productos */}
        <div className="lg:col-span-3 bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-500" />
            Top 10 productos por ingreso
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos en el período</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => {
                const pct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-xs text-gray-400 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="truncate text-gray-700 font-medium">{p.name}</span>
                        <span className="text-gray-900 font-semibold shrink-0 ml-2">{fmtMoney(p.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 w-14 text-right">{p.quantity} uds.</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Métodos de pago */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-6 flex flex-col">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Métodos de pago
          </h2>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={paymentMethods} dataKey="amount" nameKey="name"
                    cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {paymentMethods.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {paymentMethods.map((pm, i) => (
                  <div key={pm.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600">{pm.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{fmtMoney(pm.amount)}</span>
                      <span className="text-gray-400 ml-1">
                        ({totalPayments > 0 ? Math.round((pm.amount / totalPayments) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Horas pico + tipos de orden */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Distribución por hora del día
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={allHours} margin={{ top: 5, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickFormatter={h => `${h}h`} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip labelFormatter={h => `${h}:00 hs`} formatter={(v: number, n: string) => [
                n === 'Ingresos' ? fmtMoney(v) : v, n,
              ]} />
              <Bar dataKey="orders" name="Órdenes" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-500" />
            Tipos de orden
          </h2>
          {orderTypes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3 mt-2">
              {orderTypes.map((ot, i) => {
                const totalOt = orderTypes.reduce((s, x) => s + x.count, 0);
                const pct = totalOt > 0 ? Math.round((ot.count / totalOt) * 100) : 0;
                return (
                  <div key={ot.type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{ORDER_TYPE_LABELS[ot.type] ?? ot.type}</span>
                      <span className="font-semibold text-gray-900">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{ot.count} órdenes · {fmtMoney(ot.revenue)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB SISTEMA
// ═══════════════════════════════════════════════════════════════════════════════
function SistemaTab() {
  const qc = useQueryClient();

  const { data, isLoading, dataUpdatedAt } = useQuery<AnalyticsReport>({
    queryKey: ['admin-analytics'],
    queryFn:  () => adminService.getAnalytics(),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('es-CL') : '—';

  if (isLoading) return <Skeleton />;
  if (!data) return null;

  const activity30 = data.activityLast30Days.map(d => ({ ...d, date: fmtDate(d.date) }));
  const activity7  = data.activityLast7Days.map(d  => ({ ...d, date: fmtDate(d.date) }));
  const topMod     = data.topModules.slice(0, 8);
  const topAct     = data.topActions.slice(0, 8);
  const sevData    = data.severityBreakdown;
  const newUsers   = data.newUsersLast30Days.map(d => ({ ...d, date: fmtDate(d.date) }));
  const totalSev   = sevData.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actividad del sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">Auditoría, módulos y seguridad — últimos 30 días</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Act. {lastUpdate}</span>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-analytics'] })}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total eventos</p>
            <p className="text-2xl font-bold text-gray-900">{data.totalAuditLogs.toLocaleString('es-CL')}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Promedio / día</p>
            <p className="text-2xl font-bold text-gray-900">{data.avgLogsPerDay}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Pico (eventos)</p>
            <p className="text-2xl font-bold text-gray-900">{data.peakDay ? data.peakDay.count : '—'}</p>
            {data.peakDay && <p className="text-xs text-gray-400">{fmtDate(data.peakDay.date)}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          Actividad — últimos 30 días
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={activity30} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" name="Eventos" stroke="#6366f1" strokeWidth={2}
              fill="url(#areaGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-500" />
            Módulos más activos (30 días)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topMod} layout="vertical" margin={{ left: 10, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="module" tick={{ fontSize: 10 }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Eventos" radius={[0, 4, 4, 0]}>
                {topMod.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border p-6 flex flex-col">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Severidad
          </h2>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sevData} dataKey="count" nameKey="severity" cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70} paddingAngle={3}
                  label={({ severity, percent }) => `${severity} ${(percent * 100).toFixed(0)}%`}>
                  {sevData.map((entry, i) => <Cell key={i} fill={SEV_COLORS[entry.severity] ?? '#94a3b8'} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} eventos`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {sevData.map(s => (
              <div key={s.severity} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: SEV_COLORS[s.severity] ?? '#94a3b8' }} />
                  <span className="text-gray-600">{s.severity}</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {s.count} <span className="text-gray-400 font-normal">
                    ({totalSev ? Math.round((s.count / totalSev) * 100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Acciones más frecuentes
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topAct} margin={{ top: 5, right: 8, bottom: 20, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="action" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Total" radius={[4, 4, 0, 0]}>
                {topAct.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users2 className="w-4 h-4 text-emerald-500" />
            Nuevos usuarios — 30 días
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={newUsers} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Nuevos" stroke="#10b981" strokeWidth={2}
                fill="url(#areaGreen)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          Detalle últimos 7 días
        </h2>
        <div className="grid grid-cols-7 gap-3">
          {activity7.map((d) => {
            const max = Math.max(...activity7.map(x => x.count), 1);
            const pct = Math.round((d.count / max) * 100);
            return (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-700">{d.count}</span>
                <div className="w-full bg-gray-100 rounded-md overflow-hidden" style={{ height: 80 }}>
                  <div className="bg-indigo-500 rounded-md transition-all"
                    style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                </div>
                <span className="text-[10px] text-gray-400 text-center">{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'negocio', label: 'Negocio',  icon: DollarSign },
  { id: 'sistema', label: 'Sistema',  icon: Activity },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Analytics() {
  const [tab, setTab] = useState<TabId>('negocio');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Selector de tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'negocio' ? <NegocioTab /> : <SistemaTab />}
    </div>
  );
}