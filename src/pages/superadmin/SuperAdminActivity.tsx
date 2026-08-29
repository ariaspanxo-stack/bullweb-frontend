import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Search, ShoppingCart, Users, UserX, CalendarDays } from 'lucide-react';
import superadminService from '@/services/superadmin/superadminService';
import { StatusBadge } from '@/components/ui/superadmin/statusBadge';
import { Table, Thead, Tr, Th, Td } from '@/components/ui/superadmin/table';
import { PageHeader } from '@/components/ui/superadmin/pageHeader';
import { EmptyState } from '@/components/ui/superadmin/emptyState';
import { KpiCard } from '@/components/ui/superadmin/kpiCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function fmtDayLabel(d: string | Date) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

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
      <PageHeader
        icon={Activity}
        title="Actividad de Clientes"
        sub="Órdenes y engagement por tenant en tiempo real"
      />

      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingCart}  label="Órdenes hoy"         value={actLoading ? '…' : (kpis.totalToday   ?? 0)} accent="brand" />
        <KpiCard icon={CalendarDays}  label="Órdenes 7 días"      value={actLoading ? '…' : (kpis.totalWeek    ?? 0)} accent="sky" />
        <KpiCard icon={Users}         label="Tenants activos hoy" value={actLoading ? '…' : (kpis.activeToday  ?? 0)} accent="emerald" />
        <KpiCard icon={UserX}         label="Sin actividad 7d ⚠️" value={actLoading ? '…' : (kpis.inactiveWeek ?? 0)} accent={(kpis.inactiveWeek ?? 0) > 0 ? 'rose' : 'gray'} />
      </div>

      {/* ── Gráfico 14 días ── */}
      <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Órdenes por día — últimos 14 días</h2>
        {chartLoading ? (
          <div className="h-40 bg-gray-800 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chart14} barSize={18}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v: any) => [`${v} órdenes`, '']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chart14.map((entry, i) => (
                  <Cell key={i} fill={entry.count > 0 ? '#FF6B35' : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Alertas de inactividad ── */}
      {alertTenants.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-300">
              {alertTenants.length} tenant{alertTenants.length !== 1 ? 's' : ''} sin actividad en los últimos 7 días
            </h2>
          </div>
          <div className="space-y-2">
            {alertTenants.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{t.name}</span>
                  <StatusBadge status={t.plan?.toUpperCase() ?? ''} kind="plan" />
                </div>
                <a
                  href={`https://wa.me/?text=${WA_MSG(t.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 flex-shrink-0"
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
            className="w-full bg-gray-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
          />
        </div>
        <select
          value={tenantFilter}
          onChange={e => setTenantFilter(e.target.value)}
          className="bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
        >
          <option value="">Todos los tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {(search || tenantFilter) && (
          <button
            onClick={() => { setSearch(''); setTenantFilter(''); }}
            className="px-3 py-2 text-sm rounded-lg bg-gray-800 text-gray-400 hover:text-white border border-white/10 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Tabla de actividad ── */}
      {actLoading ? (
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-8 space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900/60 border border-white/5 rounded-xl">
          <EmptyState icon={Activity} title="Sin resultados" sub="Ajusta los filtros de búsqueda" />
        </div>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Tenant</Th>
              <Th>Plan</Th>
              <Th>Estado</Th>
              <Th className="text-right">Hoy</Th>
              <Th className="text-right">7 días</Th>
              <Th className="text-right">30 días</Th>
              <Th>Último pedido</Th>
              <Th className="text-right">Usuarios activos</Th>
              <Th>Tendencia</Th>
            </Tr>
          </Thead>
          <tbody>
            {filtered.map((t: any) => {
              const noActivity7d = t.week === 0 && (t.status === 'ACTIVE' || t.status === 'TRIAL');
              return (
                <Tr key={t.id} highlight={noActivity7d}>
                  <Td className="font-medium text-white">{t.name}</Td>
                  <Td>
                    <StatusBadge status={t.plan?.toUpperCase() ?? ''} kind="plan" />
                  </Td>
                  <Td>
                    <StatusBadge status={t.status} kind="tenant" />
                  </Td>
                  <Td className="text-right">
                    <span className={t.today > 0 ? 'text-brand-400 font-semibold tabular-nums' : 'text-gray-600 tabular-nums'}>
                      {t.today}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <span className={t.week > 0 ? 'text-white font-medium tabular-nums' : 'text-rose-400 font-semibold tabular-nums'}>
                      {t.week}
                      {noActivity7d && <span className="ml-1 text-xs text-amber-400">⚠️</span>}
                    </span>
                  </Td>
                  <Td className="text-right text-gray-300 tabular-nums">{t.month}</Td>
                  <Td className="text-xs text-gray-400">{fmtDate(t.lastOrder)}</Td>
                  <Td className="text-right text-gray-400 tabular-nums">{t.activeUsers}</Td>
                  <Td>
                    {t.trend === 'up'
                      ? <span className="flex items-center gap-1 text-xs text-emerald-400"><TrendingUp className="w-3 h-3" />Sube</span>
                      : t.trend === 'down'
                      ? <span className="flex items-center gap-1 text-xs text-rose-400"><TrendingDown className="w-3 h-3" />Baja</span>
                      : <span className="flex items-center gap-1 text-xs text-gray-500"><Minus className="w-3 h-3" />Estable</span>
                    }
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
