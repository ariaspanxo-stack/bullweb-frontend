import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, Users, XCircle, Clock, CalendarPlus, AlertTriangle, Send, AlertOctagon, LayoutDashboard } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import superadminService from '@/services/superadmin/superadminService';
import { AlertsPanel } from '@/components/superadmin/AlertsPanel';
import { KpiCard } from '@/components/ui/superadmin/kpiCard';
import { StatusBadge } from '@/components/ui/superadmin/statusBadge';
import { SemaforoDot } from '@/components/ui/superadmin/semaforoDot';
import { PageHeader } from '@/components/ui/superadmin/pageHeader';
import { Button } from '@/components/ui/superadmin/button';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [reactivating, setReactivating] = useState(false);

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
    queryFn:  () => superadminService.listTenants(),
  });
  const tenants: any[] = (tenantsResp as any)?.tenants ?? (Array.isArray(tenantsResp) ? tenantsResp : []);

  // Envía la campaña de reactivación a los tenants pausados (SUSPENDED)
  async function handleReactivate() {
    setReactivating(true);
    try {
      const response = await superadminService.sendReactivationCampaign();
      toast.success(`Correos enviados a ${response.dispatched} tenants.`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al enviar campaña de reactivación');
    } finally {
      setReactivating(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Encabezado */}
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        sub="Vista global de la plataforma"
      />

      {/* Métricas */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900/60 border border-white/5 rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard icon={Building2}     label="Total clientes"   value={metrics?.totalTenants    ?? 0}    accent="brand" />
          <KpiCard icon={Clock}         label="Pruebas Activas"  value={metrics?.trialActive     ?? 0}    accent="amber" />
          <KpiCard icon={AlertOctagon}  label="Pruebas Vencidas" value={metrics?.trialExpired    ?? 0}    accent="rose"
            tooltip="Trials vencidos (incluye los que no tienen fecha de término)" />
          <KpiCard icon={Users}         label="Activos"          value={metrics?.activeTenants   ?? 0}    accent="emerald" />

          {/* Tarjeta Suspendidos con acción de reactivación */}
          <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-rose-500/10 text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Suspendidos</p>
                <p className="text-2xl font-bold text-white tabular-nums">{metrics?.suspendedTenants ?? 0}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReactivate}
              disabled={reactivating || (metrics?.suspendedTenants ?? 0) === 0}
              loading={reactivating}
            >
              <Send className="w-3.5 h-3.5" />
              {reactivating ? 'Enviando...' : 'Reactivar Pausados'}
            </Button>
          </div>

          <KpiCard icon={CalendarPlus}  label="Nuevos hoy"       value={metrics?.newToday        ?? 0}    accent="sky" />
          <KpiCard icon={TrendingUp}    label="MRR estimado"     value={metrics?.mrrFormatted    ?? '$0'} accent="brand" />
        </div>
      )}

      {/* KPI Revenue en riesgo */}
      {(metrics?.riskTenantCount ?? 0) > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-amber-400 uppercase tracking-wide font-semibold">⚠️ EN RIESGO</p>
            <p className="text-2xl font-bold text-amber-300 tabular-nums">
              ${(metrics!.revenueAtRisk ?? 0).toLocaleString('es-CL')} CLP
            </p>
            <p className="text-xs text-amber-500/80 mt-0.5">
              {metrics!.riskTenantCount} cliente{metrics!.riskTenantCount !== 1 ? 's' : ''} con trial venciendo en 7 días
            </p>
          </div>
        </div>
      )}

      {/* Distribución por plan */}
      {metrics?.planCounts && Object.keys(metrics.planCounts).length > 0 && (
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Distribución por plan</h2>
          <div className="space-y-2">
            {Object.entries(metrics.planCounts).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 uppercase font-medium">{plan}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-brand-500 h-2 rounded-full"
                    style={{ width: `${Math.min(((count as number) / (metrics.totalTenants || 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-300 w-6 text-right font-bold tabular-nums">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs secundarios: ARR, Conversión, Churn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ARR (Anual proyectado)</p>
          <p className="text-2xl font-bold text-sky-400 tabular-nums">
            ${((metrics?.arr ?? 0)).toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-gray-500 mt-1">MRR × 12</p>
        </div>
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Conversión Trial→Activo</p>
          <p className="text-2xl font-bold text-brand-400 tabular-nums">{metrics?.conversionRate ?? 0}%</p>
          <p className="text-xs text-gray-500 mt-1">activos / (activos + trial)</p>
        </div>
        <div className={`bg-gray-900/60 border rounded-xl p-5 ${(metrics?.churnRate ?? 0) > 5 ? 'border-rose-500/30' : 'border-white/5'}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Churn Rate</p>
          <p className={`text-2xl font-bold tabular-nums ${(metrics?.churnRate ?? 0) > 5 ? 'text-rose-400' : 'text-gray-200'}`}>
            {metrics?.churnRate ?? 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">suspendidos últimos 30d</p>
        </div>
      </div>

      {/* Gráfico MRR últimos 6 meses */}
      {(metrics?.mrrHistory?.length ?? 0) > 0 && (
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5 mb-6">
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
                contentStyle={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="mrr" stroke="#FF6B35" strokeWidth={2} dot={{ fill: '#FF6B35', r: 4 }} />
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
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">🩺 Salud por tenant</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/5 text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-4">Nombre</th>
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2 pr-4">Último login</th>
                  <th className="pb-2 pr-4 text-right">Órdenes 7d</th>
                  <th className="pb-2 pr-4">Trial vence</th>
                  <th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {healthList.slice(0, 20).map((t: any) => (
                  <tr
                    key={t.id}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => navigate('/superadmin/tenants')}
                  >
                    <td className="py-2.5 pr-4 font-medium text-white">{t.name}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={t.plan?.toUpperCase() ?? ''} kind="plan" />
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={t.status} kind="tenant" />
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">
                      {t.lastLogin ? new Date(t.lastLogin).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-gray-300 tabular-nums">{t.orders7d}</td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">
                      {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="py-2.5">
                      <SemaforoDot status={t.semaforo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Últimos clientes */}
      <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Últimos clientes registrados</h2>
        {!tenants || tenants.length === 0 ? (
          <p className="text-sm text-gray-500">No hay clientes registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/5">
                  <th className="pb-2 font-medium">Nombre</th>
                  <th className="pb-2 font-medium">Slug</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium text-right">Usuarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenants.slice(0, 8).map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-medium text-white">{t.name}</td>
                    <td className="py-2.5 text-gray-400 font-mono text-xs">{t.slug}</td>
                    <td className="py-2.5">
                      <StatusBadge status={t.plan?.toUpperCase() ?? ''} kind="plan" />
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={t.status} kind="tenant" />
                    </td>
                    <td className="py-2.5 text-right text-gray-400 tabular-nums">{t._count.users}</td>
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