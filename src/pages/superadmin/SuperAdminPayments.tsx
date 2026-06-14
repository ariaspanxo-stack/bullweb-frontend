import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CreditCard, RefreshCw, TrendingUp, AlertTriangle, Plus, Download, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService from '@/services/superadmin/superadminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMonthLabel(d: string | Date) {
  return new Date(d).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
}

const STATUS_STYLE: Record<string, string> = {
  PAID:     'bg-emerald-900/50 text-emerald-300',
  FAILED:   'bg-rose-900/50 text-rose-300',
  PENDING:  'bg-amber-900/50 text-amber-300',
  OVERDUE:  'bg-red-900/60 text-red-300',
  REFUNDED: 'bg-gray-700 text-gray-400',
};

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado', FAILED: 'Fallido', PENDING: 'Pendiente',
  OVERDUE: 'Vencido', REFUNDED: 'Reembolsado',
};

const PLAN_STYLE: Record<string, string> = {
  STARTER:    'bg-gray-800 text-gray-300',
  PRO:        'bg-indigo-900/50 text-indigo-300',
  ENTERPRISE: 'bg-yellow-900/50 text-yellow-300',
};

const WA_MSG = (name: string, month: string, amount: number) =>
  encodeURIComponent(
    `Hola ${name}, tu suscripción BullWeb de ${month} está pendiente. Monto: ${fmtCLP(amount)} CLP`
  );

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, color, alert }: {
  title: string; value: string | number; subtitle?: string;
  color: 'teal'|'blue'|'purple'|'green'|'red'; alert?: boolean;
}) {
  const C: Record<string, string> = {
    teal:   'bg-teal-900/30 border-teal-800/50 text-teal-300',
    blue:   'bg-blue-900/30 border-blue-800/50 text-blue-300',
    purple: 'bg-purple-900/30 border-purple-800/50 text-purple-300',
    green:  'bg-emerald-900/30 border-emerald-800/50 text-emerald-300',
    red:    'bg-rose-900/30 border-rose-800/50 text-rose-300',
  };
  const cls = C[color].split(' ');
  return (
    <div className={`${cls[0]} border ${cls[1]} rounded-xl p-5`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{title}</p>
      <p className={`text-2xl font-bold ${alert ? 'text-rose-400' : cls[2]}`}>
        {alert && <AlertTriangle className="inline w-4 h-4 mr-1 mb-0.5" />}
        {value}
      </p>
      {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Modal historial tenant ───────────────────────────────────────────────────

function TenantPaymentsModal({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'tenant-payments', tenant.id],
    queryFn:  () => superadminService.getTenantPayments(tenant.id),
  });
  const payments = data?.payments ?? [];
  const totalPaid = data?.totalPaid ?? 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">{tenant.name}</h2>
            <p className="text-xs text-gray-500">Historial de pagos · Total pagado: <span className="text-emerald-400 font-semibold">{fmtCLP(totalPaid)}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />)}</div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center text-gray-600"><CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Sin pagos registrados</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-700 bg-gray-800/70">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-medium text-white tabular-nums">{fmtCLP(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] ?? 'bg-gray-800 text-gray-400'}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.concept || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate" title={p.notes ?? undefined}>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SuperAdminPayments() {
  const queryClient = useQueryClient();
  const now         = new Date();

  const [selMonth,     setSelMonth]     = useState(now.getMonth() + 1);     // 1-12
  const [selYear,      setSelYear]      = useState(now.getFullYear());
  const [useMonthFlt,  setUseMonthFlt]  = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [page,         setPage]         = useState(1);
  const [showModal,    setShowModal]    = useState(false);
  const [detailTenant, setDetailTenant] = useState<any | null>(null);
  const [modalTenants, setModalTenants] = useState<any[]>([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [form, setForm] = useState({
    tenantId: '', amount: '', plan: '', method: 'transferencia',
    invoiceNumber: '', notes: '', status: 'PAID', concept: '',
  });

  // Mes en formato YYYY-MM para el API
  const monthParam = useMonthFlt ? `${selYear}-${String(selMonth).padStart(2,'0')}` : undefined;

  const { data: summary, isLoading: sumLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['superadmin', 'payments', 'summary'],
    queryFn:  superadminService.getPaymentsSummary,
  });

  const { data: chartData } = useQuery({
    queryKey: ['superadmin', 'payments', 'chart'],
    queryFn:  superadminService.getPaymentsChart,
  });

  const { data: pageData, isLoading: payLoading, refetch: refetchPay } = useQuery({
    queryKey: ['superadmin', 'payments', { month: monthParam, statusFilter, page }],
    queryFn:  () => superadminService.getPayments({ month: monthParam, status: statusFilter || undefined, page }),
  });

  const payments    = pageData?.payments    ?? [];
  const totalPages  = pageData?.totalPages  ?? 1;
  const totalAmount = pageData?.totalAmount ?? 0;

  // Gráfico 6 meses
  const chart6 = useMemo(() => {
    if (!chartData) return [];
    return chartData.map(d => ({
      label:       fmtMonthLabel(d.month),
      paid:        d.totalAmount,
      overdue:     d.overdue,
    }));
  }, [chartData]);

  // Filtro por tenant en la tabla (client-side)
  const filteredPayments = useMemo(() => {
    if (!tenantSearch) return payments;
    const q = tenantSearch.toLowerCase();
    return payments.filter((p: any) => p.tenant?.name?.toLowerCase().includes(q) || p.tenant?.slug?.toLowerCase().includes(q));
  }, [payments, tenantSearch]);

  // Tenants con estado OVERDUE/PENDING para alertas
  const overduePayments = useMemo(() =>
    payments.filter((p: any) => p.status === 'OVERDUE' || p.status === 'PENDING'),
  [payments]);

  function handleRefresh() { refetchSummary(); refetchPay(); }

  // Cargar tenants al abrir modal
  useEffect(() => {
    if (!showModal) return;
    superadminService.listTenants({ limit: 500 }).then((r: any) => {
      const list = r?.tenants ?? (Array.isArray(r) ? r : []);
      setModalTenants(list.filter((t: any) => !t.isTest));
    }).catch(console.error);
  }, [showModal]);

  async function handleTenantChange(tenantId: string) {
    const tenant = modalTenants.find((t: any) => t.id === tenantId);
    if (!tenant) return;
    try {
      const plans = await superadminService.getPlans();
      const pc = plans.find((p: any) => p.plan.toUpperCase() === (tenant.plan ?? '').toUpperCase());
      setForm(f => ({ ...f, tenantId, plan: tenant.plan, amount: pc?.priceCLP?.toString() ?? '' }));
    } catch {
      setForm(f => ({ ...f, tenantId, plan: tenant.plan }));
    }
  }

  async function handleSubmitPayment() {
    if (!form.tenantId || !form.amount) return;
    setSubmitting(true);
    try {
      await superadminService.createSubscriptionPayment({
        tenantId:      form.tenantId,
        amount:        form.amount,
        plan:          form.plan,
        method:        form.method,
        invoiceNumber: form.invoiceNumber || undefined,
        notes:         form.notes        || undefined,
        status:        form.status,
        concept:       form.concept      || undefined,
      });
      setShowModal(false);
      setForm({ tenantId: '', amount: '', plan: '', method: 'transferencia', invoiceNumber: '', notes: '', status: 'PAID', concept: '' });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'payments'] });
      toast.success('Pago registrado correctamente');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  }

  // Exportar CSV
  function exportCSV() {
    const headers = ['Tenant', 'Slug', 'Plan', 'Monto', 'Estado', 'Fecha', 'Concepto', 'Notas'];
    const rows = filteredPayments.map((p: any) => [
      p.tenant?.name ?? '', p.tenant?.slug ?? '', p.tenant?.plan ?? '',
      p.amount, p.status,
      fmtDate(p.paidAt ?? p.createdAt),
      p.concept ?? '', p.notes ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pagos_${monthParam ?? 'todos'}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Modal historial tenant */}
      {detailTenant && (
        <TenantPaymentsModal tenant={detailTenant} onClose={() => setDetailTenant(null)} />
      )}

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-teal-400" />
            Pagos y Facturación
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control financiero de todos los tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />Exportar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />Registrar pago
          </button>
          <button onClick={handleRefresh} className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      {sumLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title={summary.recentMonthLabel ?? 'Últ. mes'} value={fmtCLP(summary.thisMonth.amount)} subtitle={`${summary.thisMonth.count} pagos`} color="teal" />
          <MetricCard title="Mes anterior"      value={fmtCLP(summary.lastMonth.amount)}  subtitle={`${summary.lastMonth.count} pagos`}  color="blue" />
          <MetricCard title="Total histórico"   value={fmtCLP(summary.allTime.amount)}    subtitle={`${summary.allTime.count} pagos`}    color="purple" />
          <MetricCard title="Proyección anual"  value={fmtCLP(summary.annualProjection)}  subtitle="MRR × 12 por planes activos"          color="green" />
          <MetricCard title="Fallidos este mes" value={summary.failedThisMonth}            color="red" alert={summary.failedThisMonth > 0} />
        </div>
      )}

      {/* Gráfico 6 meses */}
      {chart6.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Ingresos por mes — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chart6} barSize={18} barGap={4}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: string) => [
                  name === 'paid' ? fmtCLP(Number(v)) : `${v} vencidos`,
                  name === 'paid' ? 'Ingresos PAID' : 'OVERDUE',
                ]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
              <Bar dataKey="paid"    fill="#10b981" name="paid"    radius={[4,4,0,0]} />
              <Bar dataKey="overdue" fill="#f43f5e" name="overdue" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alertas de cobro pendiente */}
      {overduePayments.length > 0 && (
        <div className="bg-rose-900/20 border border-rose-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-rose-300">
              {overduePayments.length} pago{overduePayments.length !== 1 ? 's' : ''} pendiente/vencido
            </h2>
          </div>
          <div className="space-y-2">
            {overduePayments.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-white">{p.tenant?.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{fmtCLP(p.amount)}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                </div>
                <a
                  href={`https://wa.me/?text=${WA_MSG(p.tenant?.name ?? '', MONTHS[(selMonth - 1) % 12], p.amount)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                >
                  📲 Cobrar
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {/* Selector mes/año */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useMonthFlt}
              onChange={e => { setUseMonthFlt(e.target.checked); setPage(1); }}
              className="rounded border-gray-600"
            />
            <span className="text-sm text-gray-400">Filtrar por mes</span>
          </label>
          {useMonthFlt && (
            <>
              <select
                value={selMonth}
                onChange={e => { setSelMonth(Number(e.target.value)); setPage(1); }}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
              <select
                value={selYear}
                onChange={e => { setSelYear(Number(e.target.value)); setPage(1); }}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
        >
          <option value="">Todos los estados</option>
          <option value="PAID">Pagado</option>
          <option value="PENDING">Pendiente</option>
          <option value="OVERDUE">Vencido</option>
          <option value="REFUNDED">Reembolsado</option>
          <option value="FAILED">Fallido</option>
        </select>

        <input
          type="text"
          value={tenantSearch}
          onChange={e => setTenantSearch(e.target.value)}
          placeholder="Buscar tenant…"
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 min-w-[180px]"
        />
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {payLoading ? (
          <div className="p-8 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)}</div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-gray-600">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No se encontraron pagos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800 bg-gray-900/70">
                    <th className="px-4 py-3 font-medium">Tenant</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Concepto</th>
                    <th className="px-4 py-3 font-medium">Notas</th>
                    <th className="px-4 py-3 font-medium font-mono">Flow ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailTenant(p.tenant ? { ...p.tenant, id: p.tenantId } : null)}
                          className="text-left hover:underline"
                        >
                          <div className="font-medium text-white">{p.tenant?.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{p.tenant?.slug}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${PLAN_STYLE[p.tenant?.plan?.toUpperCase()] ?? 'bg-gray-800 text-gray-300'}`}>
                          {p.tenant?.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white tabular-nums">{fmtCLP(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] ?? 'bg-gray-800 text-gray-400'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{p.concept || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px]">
                        {p.notes ? (
                          <span title={p.notes} className="flex items-center gap-1 cursor-help">
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{p.notes}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.flowOrderId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Total filtrado: <span className="text-white font-semibold">{fmtCLP(totalAmount)}</span>
                <span className="text-gray-600 ml-1">({pageData?.total ?? 0} pagos)</span>
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                    className="px-3 py-1 rounded-md text-xs bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
                    ← Anterior
                  </button>
                  <span className="px-3 py-1 text-xs text-gray-500">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                    className="px-3 py-1 rounded-md text-xs bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {summary && (
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <TrendingUp className="w-3.5 h-3.5" />
          Proyección anual calculada como MRR de planes activos × 12.
        </p>
      )}

      {/* Modal: Registrar pago */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-400" />Registrar pago
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Cliente *</label>
                <select value={form.tenantId} onChange={e => handleTenantChange(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500">
                  <option value="">Seleccionar cliente...</option>
                  {modalTenants.map((t: any) => <option key={t.id} value={t.id}>{t.name} — {t.plan}</option>)}
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Monto CLP *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="29990" />
              </div>

              {/* Estado */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Estado</label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500">
                  <option value="PAID">Pagado</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="OVERDUE">Vencido</option>
                  <option value="REFUNDED">Reembolsado</option>
                </select>
              </div>

              {/* Método */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Método de pago</label>
                <select value={form.method} onChange={e => setForm(f => ({...f, method: e.target.value}))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500">
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="flow">Flow</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Concepto */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Concepto</label>
                <input type="text" value={form.concept} onChange={e => setForm(f => ({...f, concept: e.target.value}))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Suscripción mensual Mayo 2026" />
              </div>

              {/* N° Factura */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">N° Factura / Comprobante</label>
                <input type="text" value={form.invoiceNumber} onChange={e => setForm(f => ({...f, invoiceNumber: e.target.value}))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="FAC-001" />
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notas (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 resize-none"
                  placeholder="Pagó por transferencia, acordado precio especial…" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setForm({ tenantId:'', amount:'', plan:'', method:'transferencia', invoiceNumber:'', notes:'', status:'PAID', concept:'' }); }}
                className="flex-1 border border-gray-600 text-gray-300 font-medium py-2 rounded-xl text-sm hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={!form.tenantId || !form.amount || submitting}
                className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl text-sm transition-colors"
              >
                {submitting ? 'Registrando…' : 'Registrar pago ✅'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
