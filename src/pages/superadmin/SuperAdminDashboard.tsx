import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, Users, XCircle, Clock, CalendarPlus, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import superadminService from '@/services/superadmin/superadminService';
import { AlertsPanel } from '@/components/superadmin/AlertsPanel';

function MetricCard({ icon: Icon, label, value, color, tooltip }: {
  icon: React.ElementType; label: string; value: string | number; color: string; tooltip?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4" title={tooltip}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

const SEMAFORO: Record<string, { label: string; dot: string }> = {
  green:  { label: 'Activo',   dot: 'bg-emerald-400' },
  yellow: { label: 'Sin act.', dot: 'bg-yellow-400'  },
  red:    { label: 'Crítico',  dot: 'bg-red-500'     },
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['superadmin', 'metrics'],
    queryFn:  superadminService.getMetrics,
    refetchInterval: 60_000,
  });

  const { data: healthData } = useQuery({
    queryKey: ['superadmin', 'tenants-health'],
    queryFn:  superadminService.getTenantHealth,
    refetchInterval: 120_000,
  });
  const healthList: any[] = Array.isArray(healthData) ? healthData : [];

  const { data: tenantsResp } = useQuery({
    queryKey: ['superadmin', 'tenants'],
    queryFn:  superadminService.listTenants,
  });
  const tenants: any[] = (tenantsResp as any)?.tenants ?? (Array.isArray(tenantsResp) ? tenantsResp : []);

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Vista global de la plataforma</p>
      </div>

      {/* Métricas */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <MetricCard icon={Building2}    label="Total clientes" value={metrics?.totalTenants    ?? 0}   color="bg-indigo-600" />
          <MetricCard icon={Clock}        label="En trial"       value={metrics?.trialTenants    ?? 0}   color="bg-amber-500" />
          <MetricCard icon={Users}        label="Activos"        value={metrics?.activeTenants   ?? 0}   color="bg-emerald-600" />
          <MetricCard icon={XCircle}      label="Suspendidos"    value={metrics?.suspendedTenants ?? 0}  color="bg-rose-600" />
          <MetricCard icon={CalendarPlus} label="Nuevos hoy"     value={metrics?.newToday        ?? 0}   color="bg-sky-600" />
          <MetricCard icon={TrendingUp}   label="MRR estimado"   value={metrics?.mrrFormatted    ?? '$0'} color="bg-teal-600" />
        </div>
      )}

      {/* KPI Revenue en riesgo */}
      {(metrics?.riskTenantCount ?? 0) > 0 && (
        <div className="bg-orange-950/30 border border-orange-700 rounded-xl p-5 mb-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-orange-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-orange-400 uppercase tracking-wide font-semibold">⚠️ EN RIESGO</p>
            <p className="text-2xl font-bold text-orange-300">
              ${(metrics!.revenueAtRisk ?? 0).toLocaleString('es-CL')} CLP
            </p>
            <p className="text-xs text-orange-500 mt-0.5">
              {metrics!.riskTenantCount} cliente{metrics!.riskTenantCount !== 1 ? 's' : ''} con trial venciendo en 7 días
            </p>
          </div>
        </div>
      )}

      {/* Distribución por plan */}
      {metrics?.planCounts && Object.keys(metrics.planCounts).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Distribución por plan</h2>
          <div className="space-y-2">
            {Object.entries(metrics.planCounts).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 uppercase font-medium">{plan}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${Math.min(((count as number) / (metrics.totalTenants || 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-300 w-6 text-right font-bold">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs secundarios: ARR, Conversión, Churn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ARR (Anual proyectado)</p>
          <p className="text-2xl font-bold text-blue-400">
            ${((metrics?.arr ?? 0)).toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-gray-600 mt-1">MRR × 12</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Conversión Trial→Activo</p>
          <p className="text-2xl font-bold text-orange-400">{metrics?.conversionRate ?? 0}%</p>
          <p className="text-xs text-gray-600 mt-1">activos / (activos + trial)</p>
        </div>
        <div className={`bg-gray-900 border rounded-xl p-5 ${(metrics?.churnRate ?? 0) > 5 ? 'border-rose-700' : 'border-gray-800'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Churn Rate</p>
          <p className={`text-2xl font-bold ${(metrics?.churnRate ?? 0) > 5 ? 'text-rose-400' : 'text-gray-200'}`}>
            {metrics?.churnRate ?? 0}%
          </p>
          <p className="text-xs text-gray-600 mt-1">suspendidos últimos 30d</p>
        </div>
      </div>

      {/* Gráfico MRR últimos 6 meses */}
      {(metrics?.mrrHistory?.length ?? 0) > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">📈 MRR últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={(metrics!.mrrHistory as any[]).map((m: any) => ({
                mes: new Date(m.month + '-02').toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
                mrr: m.mrr,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: any) => [`$${Number(v).toLocaleString('es-CL')} CLP`, 'MRR']}
                contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="mrr" stroke="#ea580c" strokeWidth={2} dot={{ fill: '#ea580c', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Panel de alertas inteligentes */}
      <div className="mb-6">
        <AlertsPanel />
      </div>

      {/* Tabla salud por tenant */}
      {healthList.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">🩺 Salud por tenant</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800 text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-4">Nombre</th>
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2 pr-4">Último login</th>
                  <th className="pb-2 pr-4 text-right">Órdenes 7d</th>
                  <th className="pb-2 pr-4">Trial vence</th>
                  <th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {healthList.slice(0, 20).map((t: any) => {
                  const sem = SEMAFORO[t.semaforo] ?? SEMAFORO.green;
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-800/40 cursor-pointer transition-colors"
                      onClick={() => navigate('/superadmin/tenants')}
                    >
                      <td className="py-2.5 pr-4 font-medium text-white">{t.name}</td>
                      <td className="py-2.5 pr-4">
                        <span className="bg-indigo-900/40 text-indigo-300 text-xs px-2 py-0.5 rounded-full uppercase">{t.plan}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.status === 'ACTIVE'    ? 'bg-emerald-900/50 text-emerald-300' :
                          t.status === 'SUSPENDED' ? 'bg-rose-900/50 text-rose-300' :
                                                     'bg-amber-900/50 text-amber-300'
                        }`}>{t.status}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">
                        {t.lastLogin ? new Date(t.lastLogin).toLocaleDateString('es-CL') : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-gray-300">{t.orders7d}</td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">
                        {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('es-CL') : '—'}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${sem.dot}`} />
                          <span className="text-xs text-gray-400">{sem.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Últimos clientes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Últimos clientes registrados</h2>
        {!tenants || tenants.length === 0 ? (
          <p className="text-sm text-gray-600">No hay clientes registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 font-medium">Nombre</th>
                  <th className="pb-2 font-medium">Slug</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium text-right">Usuarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tenants.slice(0, 8).map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-2.5 font-medium text-white">{t.name}</td>
                    <td className="py-2.5 text-gray-400 font-mono text-xs">{t.slug}</td>
                    <td className="py-2.5">
                      <span className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-0.5 rounded-full">{t.plan}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        t.status === 'ACTIVE'    ? 'bg-emerald-900/50 text-emerald-300' :
                        t.status === 'SUSPENDED' ? 'bg-rose-900/50 text-rose-300' :
                                                   'bg-amber-900/50 text-amber-300'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-400">{t._count.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

