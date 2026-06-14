import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import superadminService from '@/services/superadmin/superadminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function fmtDayLabel(d: string | Date) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

const PLAN_STYLE: Record<string, string> = {
  STARTER:    'bg-gray-800 text-gray-300',
  PRO:        'bg-indigo-900/50 text-indigo-300',
  ENTERPRISE: 'bg-yellow-900/50 text-yellow-300',
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'text-emerald-400',
  TRIAL:     'text-amber-400',
  SUSPENDED: 'text-rose-400',
  CANCELLED: 'text-gray-500',
  PAST_DUE:  'text-yellow-400',
};

const WA_MSG = (name: string) =>
  encodeURIComponent(
    `Hola ${name}, notamos que llevas 7 días sin registrar pedidos en BullWeb Chile. ¿Podemos ayudarte?`
  );

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SuperAdminActivity() {
  const [search, setSearch]           = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  const { data: actData, isLoading: actLoading } = useQuery({
    queryKey: ['superadmin', 'activity'],
    queryFn:  superadminService.getTenantsActivity,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['superadmin', 'activity-chart'],
    queryFn:  superadminService.getActivityChart,
  });

  const tenants: any[] = actData?.tenants ?? [];
  const kpis            = actData?.kpis ?? {};

  // Completar hasta 14 días con 0s
  const chart14 = useMemo(() => {
    const map = new Map<string, number>();
    (chartData ?? []).forEach(d => {
      map.set(new Date(d.day).toDateString(), d.count);
    });
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      result.push({ label: fmtDayLabel(d), count: map.get(key) ?? 0 });
    }
    return result;
  }, [chartData]);

  // Filtrado
  const filtered = useMemo(() => {
    return tenants.filter(t => {
      if (tenantFilter && t.id !== tenantFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tenants, tenantFilter, search]);

  // Alertas: ACTIVE/TRIAL sin órdenes en 7d
  const alertTenants = useMemo(() =>
    tenants.filter(t => t.week === 0 && (t.status === 'ACTIVE' || t.status === 'TRIAL')),
  [tenants]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-400" />
          Actividad de Clientes
        </h1>
        <p className="text-sm text-gray-500 mt-1">Órdenes y engagement por tenant en tiempo real</p>
      </div>

      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Órdenes hoy',           value: kpis.totalToday,   color: 'text-orange-400' },
          { label: 'Órdenes 7 días',         value: kpis.totalWeek,    color: 'text-indigo-400' },
          { label: 'Tenants activos hoy',    value: kpis.activeToday,  color: 'text-emerald-400' },
          { label: 'Sin actividad 7d ⚠️',   value: kpis.inactiveWeek, color: 'text-rose-400', alert: (kpis.inactiveWeek ?? 0) > 0 },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{c.label}</p>
            <p className={`text-3xl font-black ${c.alert ? 'text-rose-400' : c.color}`}>
              {actLoading ? '…' : (c.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Gráfico 14 días ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Órdenes por día — últimos 14 días</h2>
        {chartLoading ? (
          <div className="h-40 bg-gray-800 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chart14} barSize={18}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v: any) => [`${v} órdenes`, '']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chart14.map((entry, i) => (
                  <Cell key={i} fill={entry.count > 0 ? '#ea580c' : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Alertas de inactividad ── */}
      {alertTenants.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-300">
              {alertTenants.length} tenant{alertTenants.length !== 1 ? 's' : ''} sin actividad en los últimos 7 días
            </h2>
          </div>
          <div className="space-y-2">
            {alertTenants.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-white">{t.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{t.plan}</span>
                </div>
                <a
                  href={`https://wa.me/?text=${WA_MSG(t.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1"
                >
                  📲 WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtros de tabla ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tenant…"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={tenantFilter}
          onChange={e => setTenantFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
        >
          <option value="">Todos los tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {(search || tenantFilter) && (
          <button
            onClick={() => { setSearch(''); setTenantFilter(''); }}
            className="px-3 py-2 text-sm rounded-lg bg-gray-800 text-gray-400 hover:text-white"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Tabla de actividad ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {actLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-600">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Sin resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800 bg-gray-900/70">
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Hoy</th>
                  <th className="px-4 py-3 font-medium text-right">7 días</th>
                  <th className="px-4 py-3 font-medium text-right">30 días</th>
                  <th className="px-4 py-3 font-medium">Último pedido</th>
                  <th className="px-4 py-3 font-medium text-right">Usuarios activos</th>
                  <th className="px-4 py-3 font-medium">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((t: any) => {
                  const noActivity7d = t.week === 0 && (t.status === 'ACTIVE' || t.status === 'TRIAL');
                  return (
                    <tr key={t.id} className={`hover:bg-gray-800/40 transition-colors ${noActivity7d ? 'bg-amber-950/10' : ''}`}>
                      <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${PLAN_STYLE[t.plan?.toUpperCase()] ?? 'bg-gray-800 text-gray-300'}`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${STATUS_STYLE[t.status] ?? 'text-gray-400'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={t.today > 0 ? 'text-orange-400 font-semibold' : 'text-gray-600'}>
                          {t.today}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={t.week > 0 ? 'text-white font-medium' : 'text-rose-400 font-semibold'}>
                          {t.week}
                          {noActivity7d && <span className="ml-1 text-xs text-amber-400">⚠️</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{t.month}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(t.lastOrder)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{t.activeUsers}</td>
                      <td className="px-4 py-3">
                        {t.trend === 'up'
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><TrendingUp className="w-3 h-3" />Sube</span>
                          : t.trend === 'down'
                          ? <span className="flex items-center gap-1 text-xs text-rose-400"><TrendingDown className="w-3 h-3" />Baja</span>
                          : <span className="flex items-center gap-1 text-xs text-gray-500"><Minus className="w-3 h-3" />Estable</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
