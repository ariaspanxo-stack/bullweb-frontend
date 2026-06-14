import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ArrowLeft, Building2, Users, ShoppingBag, CreditCard, Calendar,
  Clock, TrendingUp, Printer, FileText, Plus, Trash2, RefreshCw,
  ExternalLink, MessageCircle, Settings, AlertTriangle, CheckCircle,
  XCircle, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService from '@/services/superadmin/superadminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d?: string | Date | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDayAgo(d?: string | Date | null): string {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return `hace ${diff} días`;
}

function fmtDayLabel(d: string | Date) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

const PLAN_STYLE: Record<string, string> = {
  STARTER:    'bg-gray-700 text-gray-200',
  PRO:        'bg-indigo-900/70 text-indigo-200',
  ENTERPRISE: 'bg-yellow-900/70 text-yellow-200',
};

const STATUS_STYLE: Record<string, { badge: string; icon: React.ReactNode }> = {
  ACTIVE:    { badge: 'bg-emerald-900/60 text-emerald-300', icon: <CheckCircle className="w-3 h-3" /> },
  TRIAL:     { badge: 'bg-amber-900/60 text-amber-300',   icon: <Clock className="w-3 h-3" /> },
  SUSPENDED: { badge: 'bg-rose-900/60 text-rose-300',     icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { badge: 'bg-gray-800 text-gray-400',        icon: <XCircle className="w-3 h-3" /> },
  PAST_DUE:  { badge: 'bg-yellow-900/60 text-yellow-300', icon: <AlertTriangle className="w-3 h-3" /> },
};

const PAY_STATUS_STYLE: Record<string, string> = {
  PAID:     'bg-emerald-900/50 text-emerald-300',
  FAILED:   'bg-rose-900/50 text-rose-300',
  PENDING:  'bg-amber-900/50 text-amber-300',
  OVERDUE:  'bg-red-900/60 text-red-300',
  REFUNDED: 'bg-gray-700 text-gray-400',
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  COMPLETED: 'text-emerald-400',
  PENDING:   'text-amber-400',
  CANCELLED: 'text-rose-400',
};

function semaforo(orders7d: number, status: string) {
  if (status === 'SUSPENDED' || status === 'CANCELLED') return 'red';
  if (orders7d > 50) return 'green';
  if (orders7d > 5)  return 'yellow';
  return 'red';
}

// ─── Subcomponente: Modal de pago rápido ──────────────────────────────────────

function QuickPayModal({ tenantId, tenantName, plan, onClose }: {
  tenantId: string; tenantName: string; plan: string; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const PLAN_PRICES: Record<string, number> = { STARTER: 28_000, PRO: 40_000, ENTERPRISE: 80_000 };
  const [form, setForm] = useState({
    amount:        String(PLAN_PRICES[plan?.toUpperCase()] ?? ''),
    status:        'PAID',
    method:        'transferencia',
    concept:       '',
    invoiceNumber: '',
    notes:         '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!form.amount) return;
    setSubmitting(true);
    try {
      await superadminService.createSubscriptionPayment({
        tenantId, amount: form.amount, plan, ...form,
      });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', tenantId] });
      toast.success('Pago registrado');
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-teal-400" />Registrar pago · {tenantName}
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Monto CLP *', key: 'amount', type: 'number', placeholder: '28000' },
            { label: 'Concepto',    key: 'concept', type: 'text',   placeholder: 'Suscripción mayo 2026' },
            { label: 'N° Factura',  key: 'invoiceNumber', type: 'text', placeholder: 'FAC-001' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Estado</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="PAID">Pagado</option>
                <option value="PENDING">Pendiente</option>
                <option value="OVERDUE">Vencido</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Método</label>
              <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="transferencia">Transferencia</option>
                <option value="flow">Flow</option>
                <option value="efectivo">Efectivo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Notas</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 resize-none"
              placeholder="Notas del pago..." />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-xl text-sm hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={!form.amount || submitting}
            className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm transition-colors">
            {submitting ? 'Registrando…' : '✅ Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SuperAdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [noteText,       setNoteText]       = useState('');
  const [savingNote,     setSavingNote]     = useState(false);
  const [showPayModal,   setShowPayModal]   = useState(false);
  const [changingPlan,   setChangingPlan]   = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [modules, setModules] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['superadmin', 'tenant-detail', id],
    queryFn:  () => superadminService.getTenantDetail(id!),
    enabled:  !!id,
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ['superadmin', 'tenant-payments', id],
    queryFn:  () => superadminService.getTenantPayments(id!),
    enabled:  !!id,
  });

  const tenant  = data?.tenant;
  const kpis    = data?.kpis ?? {};

  // Cargar módulos premium desde settings del tenant
  useEffect(() => {
    if (data?.tenant) {
      setModules((data.tenant.settings as any)?.modules ?? {});
    }
  }, [data?.tenant]);
  const users   = data?.users   ?? [];
  const orders  = data?.recentOrders ?? [];
  const printers = data?.printers ?? [];
  const notes   = data?.notes ?? [];
  const rawChart = data?.chart14 ?? [];
  const payments = paymentHistory?.payments ?? [];
  const totalPaid = paymentHistory?.totalPaid ?? 0;

  // Gráfico 14 días con gaps en 0
  const chart14 = useMemo(() => {
    const map = new Map<string, number>();
    rawChart.forEach((r: any) => map.set(new Date(r.day).toDateString(), r.count));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      return { label: fmtDayLabel(d), count: map.get(d.toDateString()) ?? 0 };
    });
  }, [rawChart]);

  const sem = tenant ? semaforo(kpis.week ?? 0, tenant.status) : 'red';
  const semColor: Record<string, string> = { green: 'bg-emerald-400', yellow: 'bg-yellow-400', red: 'bg-rose-500' };

  const handleToggleModule = async (moduleKey: string) => {
    if (!id) return;
    const prev = { ...modules };
    const newModules = { ...modules, [moduleKey]: !modules[moduleKey] };
    setModules(newModules);
    try {
      await superadminService.updateModules(id, newModules);
      toast.success(`Módulo ${newModules[moduleKey] ? 'activado' : 'desactivado'}`);
    } catch {
      setModules(prev);
      toast.error('Error al actualizar módulo');
    }
  };

  async function handleChangePlan(plan: string) {
    if (!id || !plan) return;
    setChangingPlan(true);
    try {
      await superadminService.changePlan(id, plan);
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', id] });
      toast.success(`Plan cambiado a ${plan}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setChangingPlan(false); }
  }

  async function handleToggleStatus() {
    if (!id || !tenant) return;
    setChangingStatus(true);
    try {
      if (tenant.status === 'ACTIVE' || tenant.status === 'TRIAL') {
        await superadminService.suspendTenant(id);
        toast.success('Tenant suspendido');
      } else {
        await superadminService.activateTenant(id);
        toast.success('Tenant activado');
      }
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', id] });
    } catch (e: any) { toast.error(e.message); }
    finally { setChangingStatus(false); }
  }

  async function handleExtendTrial() {
    if (!id) return;
    try {
      await superadminService.extendTrial(id, 7);
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', id] });
      toast.success('+7 días de trial agregados');
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleImpersonate() {
    if (!id) return;
    try {
      const r = await superadminService.impersonate(id);
      localStorage.setItem('admin_token', r.token);
      window.open(`/admin/dashboard`, '_blank');
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSaveNote() {
    if (!id || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await superadminService.createTenantNote(id, noteText.trim());
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', id] });
      toast.success('Nota guardada');
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingNote(false); }
  }

  async function handleDeleteNote(noteId: string) {
    if (!id) return;
    try {
      await superadminService.deleteTenantNote(id, noteId);
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', id] });
      toast.success('Nota eliminada');
    } catch (e: any) { toast.error(e.message); }
  }

  const waLink = tenant?.contact_email
    ? `https://wa.me/?text=${encodeURIComponent(`Hola ${tenant.name}, te contactamos desde BullWeb Chile.`)}`
    : '#';

  if (isLoading || !tenant) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="space-y-4">{[...Array(6)].map((_, i) => <div key={i} className={`h-${i === 0 ? '24' : '40'} bg-gray-800 rounded-xl animate-pulse`} />)}</div>
      </div>
    );
  }

  const statusInfo = STATUS_STYLE[tenant.status] ?? STATUS_STYLE.SUSPENDED;
  const isSuspended = tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-20">
      {showPayModal && (
        <QuickPayModal
          tenantId={id!}
          tenantName={tenant.name}
          plan={tenant.plan}
          onClose={() => setShowPayModal(false)}
        />
      )}

      {/* ── Navegación ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/superadmin/tenants')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />Clientes
        </button>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300 text-sm">{tenant.name}</span>
        <button onClick={() => refetch()} className="ml-auto p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ══ BLOQUE 1 — Header ════════════════════════════════════════════════ */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          {/* Logo / Inicial */}
          <div className="flex-shrink-0">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name}
                className="w-20 h-20 rounded-xl object-cover border border-gray-700" />
            ) : (
              <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-black text-white"
                style={{ backgroundColor: tenant.primaryColor ?? tenant.theme_color ?? '#374151' }}>
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">{tenant.name}</h1>
              {/* Semáforo */}
              <span className={`w-3 h-3 rounded-full ${semColor[sem]}`} title={`Salud: ${sem}`} />
              {tenant.isTest && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/60 text-orange-300 font-semibold">TEST</span>
              )}
            </div>
            <p className="text-gray-500 text-sm font-mono mb-2">@{tenant.slug}</p>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase ${PLAN_STYLE[tenant.plan?.toUpperCase()] ?? 'bg-gray-700 text-gray-300'}`}>
                {tenant.plan}
              </span>
              <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 font-semibold ${statusInfo.badge}`}>
                {statusInfo.icon}{tenant.status}
              </span>
              {tenant.status === 'TRIAL' && tenant.trialEndsAt && (
                <span className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-400">
                  Trial hasta {fmtDate(tenant.trialEndsAt)}
                </span>
              )}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleImpersonate}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />Entrar al POS
            </button>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
              <MessageCircle className="w-4 h-4" />WhatsApp
            </a>
            <div className="relative group">
              <button
                disabled={changingPlan}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Settings className="w-4 h-4" />Plan <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl min-w-[140px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {['STARTER', 'PRO', 'ENTERPRISE'].map(p => (
                  <button key={p} onClick={() => handleChangePlan(p)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors ${tenant.plan?.toUpperCase() === p ? 'text-teal-400 font-semibold' : 'text-gray-300'} first:rounded-t-xl last:rounded-b-xl`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleToggleStatus}
              disabled={changingStatus}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${isSuspended ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-rose-800 hover:bg-rose-700 text-white'}`}
            >
              {isSuspended ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {isSuspended ? 'Activar' : 'Suspender'}
            </button>
            <button
              onClick={handleExtendTrial}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Clock className="w-4 h-4" />+7d Trial
            </button>
          </div>
        </div>
      </div>

      {/* ══ BLOQUE 2 — KPIs ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Órdenes hoy',     value: kpis.today,        color: 'text-orange-400' },
          { label: 'Órdenes 30d',     value: kpis.month,        color: 'text-indigo-400' },
          { label: 'MRR',             value: fmtCLP(kpis.mrr),  color: 'text-teal-400' },
          { label: 'Usuarios',        value: kpis.userCount,    color: 'text-purple-400' },
          { label: 'Días cliente',    value: kpis.daysAsClient, color: 'text-amber-400' },
          { label: 'Último acceso',   value: fmtDayAgo(kpis.lastLogin), color: 'text-gray-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{c.label}</p>
            <p className={`text-xl font-black ${c.color}`}>{c.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* ══ Grid de 2 columnas (info + actividad) ════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── BLOQUE 3 — Info del negocio ─────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-400" />Información del negocio
          </h2>
          {[
            { label: 'Nombre legal', value: tenant.legalName ?? tenant.name },
            { label: 'RUT',          value: tenant.rut },
            { label: 'Email',        value: tenant.contact_email },
            { label: 'Teléfono',     value: tenant.contact_phone },
            { label: 'Dirección',    value: tenant.address },
            { label: 'Ciudad',       value: tenant.city },
            { label: 'País',         value: tenant.country },
            { label: 'Web',          value: tenant.website },
            { label: 'Registro',     value: fmtDate(tenant.created_at) },
            { label: 'Trial hasta',  value: tenant.trialEndsAt ? fmtDate(tenant.trialEndsAt) : null },
          ].filter(r => r.value).map(r => (
            <div key={r.label} className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">{r.label}</span>
              <span className="text-xs text-gray-200 break-all">{r.value}</span>
            </div>
          ))}
          {/* Color tema */}
          {(tenant.primaryColor ?? tenant.theme_color) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">Color tema</span>
              <div className="w-4 h-4 rounded-full border border-gray-600"
                style={{ backgroundColor: tenant.primaryColor ?? tenant.theme_color }} />
              <span className="text-xs text-gray-400 font-mono">{tenant.primaryColor ?? tenant.theme_color}</span>
            </div>
          )}
        </div>

        {/* ── BLOQUE 5 — Actividad (gráfico) ──────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-orange-400" />Actividad — últimos 14 días
          </h2>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chart14} barSize={14}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [`${v} órdenes`, '']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chart14.map((e, i) => (
                  <Cell key={i} fill={e.count > 0 ? '#ea580c' : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Últimas 5 órdenes */}
          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-500 font-medium mb-2">Últimas órdenes</p>
            {orders.length === 0 ? (
              <p className="text-xs text-gray-600">Sin órdenes registradas</p>
            ) : orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-800 last:border-0">
                <span className="text-gray-400 font-mono">{o.orderNumber}</span>
                <span className="text-gray-500">{o.type}</span>
                <span className={ORDER_STATUS_STYLE[o.status] ?? 'text-gray-400'}>{o.status}</span>
                <span className="text-white font-semibold">{fmtCLP(o.total)}</span>
                <span className="text-gray-600">{fmtDate(o.createdAt, { day: '2-digit', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BLOQUE 4 — Usuarios ══════════════════════════════════════════════ */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-300">Usuarios ({users.length})</h2>
        </div>
        {users.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">Sin usuarios</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-900/60">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Último login</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                        {u.role_name ?? 'Sin rol'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ BLOQUE 6 — Pagos ═════════════════════════════════════════════════ */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-gray-300">Pagos</h2>
          </div>
          <button onClick={() => setShowPayModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />Registrar pago
          </button>
        </div>
        {payments.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">Sin pagos registrados</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 bg-gray-900/60">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Concepto</th>
                    <th className="px-4 py-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{fmtCLP(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_STATUS_STYLE[p.status] ?? 'bg-gray-800 text-gray-400'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{p.concept || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate" title={p.notes}>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-800 text-sm text-gray-500">
              Total pagado histórico: <span className="text-emerald-400 font-bold ml-1">{fmtCLP(totalPaid)}</span>
            </div>
          </>
        )}
      </div>

      {/* ══ BLOQUE 7 — Notas internas ════════════════════════════════════════ */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-yellow-400" />Notas internas del SuperAdmin
          <span className="text-xs text-gray-600 font-normal ml-1">Solo visible en /superadmin</span>
        </h2>

        {/* Nueva nota */}
        <div className="flex gap-2 mb-4">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Escribe una nota interna... (ej: Cliente difícil de cobrar, acordado precio especial)"
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 resize-none"
          />
          <button
            onClick={handleSaveNote}
            disabled={!noteText.trim() || savingNote}
            className="flex-shrink-0 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />{savingNote ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {/* Historial de notas */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-600">Sin notas registradas</p>
          ) : notes.map((n: any) => (
            <div key={n.id} className="bg-gray-800 rounded-xl px-4 py-3 flex gap-3 group">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">{fmtDateTime(n.createdAt)}</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{n.note}</p>
              </div>
              <button
                onClick={() => handleDeleteNote(n.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-rose-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BLOQUE 8 — Impresoras ════════════════════════════════════════════ */}
      {printers.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-300">Impresoras ({printers.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-900/60">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Conexión</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Agente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {printers.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs uppercase">{p.type}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.connection_type}{p.ip_address ? ` · ${p.ip_address}` : ''}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>
                        {p.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.agent_name ? (
                        <span className={`flex items-center gap-1 ${p.agent_online ? 'text-emerald-400' : 'text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.agent_online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                          {p.agent_name}
                        </span>
                      ) : <span className="text-gray-600">Sin agente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ BLOQUE 9 — Configuración rápida ══════════════════════════════════ */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-gray-400" />Configuración rápida
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Plan */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Plan activo</label>
            <select
              value={tenant.plan?.toUpperCase()}
              onChange={e => handleChangePlan(e.target.value)}
              disabled={changingPlan}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
            >
              <option value="STARTER">STARTER · {fmtCLP(28_000)}/mes</option>
              <option value="PRO">PRO · {fmtCLP(40_000)}/mes</option>
              <option value="ENTERPRISE">ENTERPRISE · {fmtCLP(80_000)}/mes</option>
            </select>
          </div>
          {/* Estado */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Estado</label>
            <div className="flex gap-2">
              <button
                onClick={() => { if (!isSuspended) handleToggleStatus(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${!isSuspended ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>
                Activo
              </button>
              <button
                onClick={() => { if (isSuspended) handleToggleStatus(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${isSuspended ? 'bg-rose-800 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>
                Suspendido
              </button>
            </div>
          </div>
          {/* isTest badge */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tipo de tenant</label>
            <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${tenant.isTest ? 'bg-orange-900/40 text-orange-300' : 'bg-gray-800 text-gray-300'}`}>
              {tenant.isTest ? '🧪 Tenant de prueba (TEST)' : '✅ Tenant real de producción'}
            </div>
          </div>
        </div>
      </div>

      {/* ── MÓDULOS PREMIUM ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          Módulos Premium
        </h3>
        <div className="space-y-3">
          {[
            { key: 'fidelizacion', label: 'Fidelización', price: '$4.990/mes', desc: 'Emails automáticos, campañas, puntos de lealtad' },
            { key: 'cupones', label: 'Cupones & Promociones', price: '$2.990/mes', desc: 'Descuentos, cupones, promociones' },
            { key: 'clientes', label: 'Clientes', price: '$4.990/mes', desc: 'Base de datos, historial, segmentación, VIP' },
          ].map(mod => (
            <div key={mod.key} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-200">{mod.label}</span>
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-900/50 px-1.5 py-0.5 rounded">{mod.price}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
              </div>
              <button
                onClick={() => handleToggleModule(mod.key)}
                className={`ml-3 relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                  modules[mod.key] ? 'bg-emerald-500' : 'bg-gray-600'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  modules[mod.key] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
