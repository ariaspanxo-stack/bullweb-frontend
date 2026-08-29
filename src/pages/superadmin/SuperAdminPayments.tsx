import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CreditCard, RefreshCw, TrendingUp, AlertTriangle, Plus, Download, FileText, Wallet, CalendarDays, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService from '@/services/superadmin/superadminService';
import { StatusBadge } from '@/components/ui/superadmin/statusBadge';
import { Table, Thead, Tr, Th, Td } from '@/components/ui/superadmin/table';
import { Button } from '@/components/ui/superadmin/button';
import { Modal } from '@/components/ui/superadmin/modal';
import { PageHeader } from '@/components/ui/superadmin/pageHeader';
import { EmptyState } from '@/components/ui/superadmin/emptyState';
import { Input, Select } from '@/components/ui/superadmin/input';
import { KpiCard } from '@/components/ui/superadmin/kpiCard';

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

const WA_MSG = (name: string, month: string, amount: number) =>
  encodeURIComponent(
    `Hola ${name}, tu suscripción BullWeb de ${month} está pendiente. Monto: ${fmtCLP(amount)} CLP`
  );

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Modal historial tenant ───────────────────────────────────────────────────

function TenantPaymentsModal({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'tenant-payments', tenant.id],
    queryFn:  () => superadminService.getTenantPayments(tenant.id),
  });
  const payments = data?.payments ?? [];
  const totalPaid = data?.totalPaid ?? 0;

  return (
    <Modal open onClose={onClose} title={tenant.name} wide>
      <p className="text-xs text-gray-500 mb-4">
        Historial de pagos · Total pagado: <span className="text-emerald-400 font-semibold">{fmtCLP(totalPaid)}</span>
      </p>
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)}</div>
      ) : payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sin pagos registrados" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Fecha</Th>
              <Th className="text-right">Monto</Th>
              <Th>Estado</Th>
              <Th>Concepto</Th>
              <Th>Notas</Th>
            </Tr>
          </Thead>
          <tbody>
            {payments.map((p: any) => (
              <Tr key={p.id}>
                <Td className="text-xs text-gray-400">{fmtDate(p.paidAt ?? p.createdAt)}</Td>
                <Td className="text-right font-medium text-white tabular-nums">{fmtCLP(p.amount)}</Td>
                <Td><StatusBadge status={p.status} kind="payment" /></Td>
                <Td className="text-xs text-gray-400">{p.concept || '—'}</Td>
                <Td className="text-xs text-gray-500 max-w-[160px]">
                  <span className="block truncate" title={p.notes ?? undefined}>{p.notes || '—'}</span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Modal>
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

  // Tenants con estado OVERDUE/PENDING para alertas (umbral: solo >48h de antigüedad)
  const overduePayments = useMemo(() =>
    payments.filter((p: any) => {
      if (p.status !== 'OVERDUE' && p.status !== 'PENDING') return false;
      const when = p.paidAt ?? p.createdAt;
      return Boolean(when) && Date.now() - new Date(when).getTime() > 48 * 60 * 60 * 1000;
    }),
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
      <PageHeader
        icon={CreditCard}
        title="Pagos y Facturación"
        sub="Control financiero de todos los tenants"
        actions={
          <>
            <Button variant="secondary" size="md" onClick={exportCSV}>
              <Download className="w-4 h-4" />Exportar
            </Button>
            <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />Registrar pago
            </Button>
            <Button variant="ghost" size="md" onClick={handleRefresh} aria-label="Actualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </>
        }
      />

      {/* KPIs */}
      {sumLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={Wallet} label={summary.recentMonthLabel ?? 'Mes actual'} value={fmtCLP(summary.thisMonth.amount)} sub={`${summary.thisMonth.count} pagos`} accent="brand" />
          <KpiCard icon={CalendarDays} label="Mes anterior" value={fmtCLP(summary.lastMonth.amount)} sub={`${summary.lastMonth.count} pagos`} accent="sky" />
          <KpiCard icon={Landmark} label="Total histórico" value={fmtCLP(summary.allTime.amount)} sub={`${summary.allTime.count} pagos`} accent="brand" />
          <KpiCard icon={TrendingUp} label="Proyección anual" value={fmtCLP(summary.annualProjection)} sub="MRR × 12 por planes activos" accent="emerald" />
          <KpiCard icon={AlertTriangle} label="Fallidos este mes" value={summary.failedThisMonth} accent={summary.failedThisMonth > 0 ? 'rose' : 'gray'} sub={summary.failedThisMonth > 0 ? 'Requieren atención' : 'Sin fallos'} />
        </div>
      )}

      {/* Gráfico 6 meses */}
      {chart6.length > 0 && (
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Ingresos por mes — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chart6} barSize={18} barGap={4}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
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
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-rose-300">
              {overduePayments.length} pago{overduePayments.length !== 1 ? 's' : ''} pendiente/vencido
            </h2>
          </div>
          <div className="space-y-2">
            {overduePayments.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{p.tenant?.name}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{fmtCLP(p.amount)}</span>
                  <StatusBadge status={p.status} kind="payment" />
                </div>
                <a
                  href={`https://wa.me/?text=${WA_MSG(p.tenant?.name ?? '', MONTHS[(selMonth - 1) % 12], p.amount)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex-shrink-0"
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
              className="rounded border-white/20 bg-gray-950 accent-brand-500"
            />
            <span className="text-sm text-gray-400">Filtrar por mes</span>
          </label>
          {useMonthFlt && (
            <>
              <select
                value={selMonth}
                onChange={e => { setSelMonth(Number(e.target.value)); setPage(1); }}
                className="bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
              >
                {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
              <select
                value={selYear}
                onChange={e => { setSelYear(Number(e.target.value)); setPage(1); }}
                className="bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
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
          className="bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors min-w-[180px]"
        />
      </div>

      {/* Tabla */}
      {payLoading ? (
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-8 space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-gray-900/60 border border-white/5 rounded-xl">
          <EmptyState icon={CreditCard} title="No se encontraron pagos" sub="Ajusta los filtros o registra un nuevo pago" />
        </div>
      ) : (
        <>
          <Table>
            <Thead>
              <Tr>
                <Th>Tenant</Th>
                <Th>Plan</Th>
                <Th className="text-right">Monto</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
                <Th>Concepto</Th>
                <Th>Notas</Th>
                <Th className="font-mono">Flow ID</Th>
              </Tr>
            </Thead>
            <tbody>
              {filteredPayments.map((p: any) => (
                <Tr key={p.id}>
                  <Td>
                    <button
                      onClick={() => setDetailTenant(p.tenant ? { ...p.tenant, id: p.tenantId } : null)}
                      className="text-left hover:underline"
                    >
                      <div className="font-medium text-white">{p.tenant?.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{p.tenant?.slug}</div>
                    </button>
                  </Td>
                  <Td>
                    <StatusBadge status={p.tenant?.plan?.toUpperCase() ?? ''} kind="plan" />
                  </Td>
                  <Td className="text-right font-medium text-white tabular-nums">{fmtCLP(p.amount)}</Td>
                  <Td><StatusBadge status={p.status} kind="payment" /></Td>
                  <Td className="text-xs text-gray-400">{fmtDate(p.paidAt ?? p.createdAt)}</Td>
                  <Td className="text-xs text-gray-400">{p.concept || '—'}</Td>
                  <Td className="text-xs text-gray-500 max-w-[120px]">
                    {p.notes ? (
                      <span title={p.notes} className="flex items-center gap-1 cursor-help">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{p.notes}</span>
                      </span>
                    ) : '—'}
                  </Td>
                  <Td className="text-xs text-gray-500 font-mono">{p.flowOrderId || '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Total filtrado: <span className="text-white font-semibold tabular-nums">{fmtCLP(totalAmount)}</span>
              <span className="text-gray-600 ml-1">({pageData?.total ?? 0} pagos)</span>
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  className="px-3 py-1 rounded-md text-xs bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
                  ← Anterior
                </button>
                <span className="px-3 py-1 text-xs text-gray-500 tabular-nums">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="px-3 py-1 rounded-md text-xs bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {summary && (
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <TrendingUp className="w-3.5 h-3.5" />
          Proyección anual calculada como MRR de planes activos × 12.
        </p>
      )}

      {/* Modal: Registrar pago */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar pago"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { setShowModal(false); setForm({ tenantId:'', amount:'', plan:'', method:'transferencia', invoiceNumber:'', notes:'', status:'PAID', concept:'' }); }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitPayment}
              loading={submitting}
              disabled={!form.tenantId || !form.amount}
            >
              Registrar pago
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Cliente */}
          <Select label="Cliente *" value={form.tenantId} onChange={e => handleTenantChange(e.target.value)}>
            <option value="">Seleccionar cliente...</option>
            {modalTenants.map((t: any) => <option key={t.id} value={t.id}>{t.name} — {t.plan}</option>)}
          </Select>

          {/* Monto */}
          <Input label="Monto CLP *" type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="29990" />

          {/* Estado */}
          <Select label="Estado" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
            <option value="PAID">Pagado</option>
            <option value="PENDING">Pendiente</option>
            <option value="OVERDUE">Vencido</option>
            <option value="REFUNDED">Reembolsado</option>
          </Select>

          {/* Método */}
          <Select label="Método de pago" value={form.method} onChange={e => setForm(f => ({...f, method: e.target.value}))}>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="flow">Flow</option>
            <option value="efectivo">Efectivo</option>
            <option value="otro">Otro</option>
          </Select>

          {/* Concepto */}
          <Input label="Concepto" type="text" value={form.concept} onChange={e => setForm(f => ({...f, concept: e.target.value}))} placeholder="Suscripción mensual Mayo 2026" />

          {/* N° Factura */}
          <Input label="N° Factura / Comprobante" type="text" value={form.invoiceNumber} onChange={e => setForm(f => ({...f, invoiceNumber: e.target.value}))} placeholder="FAC-001" />

          {/* Notas */}
          <label className="block">
            <span className="block text-xs font-medium text-gray-400 mb-1.5">Notas (opcional)</span>
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors resize-none"
              placeholder="Pagó por transferencia, acordado precio especial…" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
