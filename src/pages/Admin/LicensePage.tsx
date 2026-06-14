import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import toast from 'react-hot-toast';
import {
  CreditCard, CheckCircle, XCircle, RefreshCw,
  Zap, Users, GitBranch, Monitor, Star, ArrowUp, ArrowDown,
  Plus, Trash2, Check, X, History, Shield,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type {
  LicensePlan, LicenseSubscription, LicenseHistoryEntry, LicenseStats,
} from '@/services/adminService';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-900/40 text-green-300 border-green-700',
  trial:     'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  expired:   'bg-red-900/40 text-red-300 border-red-700',
  cancelled: 'bg-gray-700 text-gray-400 border-gray-600',
  suspended: 'bg-orange-900/40 text-orange-300 border-orange-700',
  none:      'bg-gray-700 text-gray-400 border-gray-600',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', trial: 'En prueba', expired: 'Vencido',
  cancelled: 'Cancelado', suspended: 'Suspendido', none: 'Sin licencia',
};
const ACTION_ICONS: Record<string, React.ReactElement> = {
  created:   <Plus size={14}     className="text-green-400" />,
  upgraded:  <ArrowUp size={14}  className="text-blue-400" />,
  downgraded:<ArrowDown size={14} className="text-yellow-400" />,
  renewed:   <RefreshCw size={14} className="text-indigo-400" />,
  cancelled: <XCircle size={14}  className="text-red-400" />,
};

const fmt = (v: number) => v === -1 ? '∞' : v.toLocaleString('es-CL');
const clp = (v: number) => v === 0 ? 'Gratis' : `$${v.toLocaleString('es-CL')} CLP`;

// ── ActivateModal ─────────────────────────────────────────────────────────────
interface ActivateModalProps {
  plan: LicensePlan;
  onClose: () => void;
  onDone: () => void;
}
function ActivateModal({ plan, onClose, onDone }: ActivateModalProps) {
  const [billing, setBilling]   = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');
  const [endsAt,  setEndsAt]    = useState('');
  const [notes,   setNotes]     = useState('');
  const [saving,  setSaving]    = useState(false);

  const price = billing === 'yearly' ? plan.price_yearly
    : billing === 'monthly' ? plan.price_monthly : 0;

  const submit = async () => {
    setSaving(true);
    try {
      await adminService.activateLicensePlan({
        plan_id: plan.id, billing_cycle: billing,
        ends_at: endsAt || undefined,
        notes:   notes  || undefined,
      });
      toast.success(`Plan "${plan.name}" activado`);
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Activar plan — {plan.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ciclo de facturación</label>
            <div className="flex gap-2">
              {(['monthly', 'yearly', 'lifetime'] as const).map(c => (
                <button key={c} onClick={() => setBilling(c)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${billing === c ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}>
                  {c === 'monthly' ? 'Mensual' : c === 'yearly' ? 'Anual' : 'Lifetime'}
                </button>
              ))}
            </div>
            {billing !== 'lifetime' && (
              <p className="text-center text-sm text-indigo-300 mt-2 font-semibold">{clp(price)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fecha de vencimiento (opcional)</label>
            <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500"
              placeholder="Motivo del cambio…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            Activar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PlanEditModal ─────────────────────────────────────────────────────────────
interface PlanEditModalProps {
  plan?: LicensePlan | null;
  onClose: () => void;
  onDone: () => void;
}
function PlanEditModal({ plan, onClose, onDone }: PlanEditModalProps) {
  const [form, setForm] = useState({
    name:          plan?.name          ?? '',
    slug:          plan?.slug          ?? '',
    description:   plan?.description   ?? '',
    price_monthly: plan?.price_monthly ?? 0,
    price_yearly:  plan?.price_yearly  ?? 0,
    max_branches:  plan?.max_branches  ?? 1,
    max_devices:   plan?.max_devices   ?? 1,
    max_users:     plan?.max_users     ?? 5,
    features:      (plan?.features ?? []).join('\n'),
    is_active:     plan?.is_active     ?? true,
    sort_order:    plan?.sort_order    ?? 99,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, features: form.features.split('\n').map(s => s.trim()).filter(Boolean) };
      if (plan) { await adminService.updateLicensePlan(plan.id, payload); toast.success('Plan actualizado'); }
      else { await adminService.createLicensePlan(payload); toast.success('Plan creado'); }
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{plan ? 'Editar plan' : 'Nuevo plan'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slug *</label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                placeholder="pro" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descripción</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Precio mensual (CLP)</label>
              <input type="number" value={form.price_monthly} onChange={e => set('price_monthly', Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Precio anual (CLP)</label>
              <input type="number" value={form.price_yearly} onChange={e => set('price_yearly', Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['max_branches','Sucursales'],['max_devices','Dispositivos'],['max_users','Usuarios']].map(([k, l]) => (
              <div key={k}>
                <label className="block text-xs text-gray-400 mb-1">{l} (-1=∞)</label>
                <input type="number" value={(form as any)[k]} onChange={e => set(k, Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Características (una por línea)</label>
            <textarea value={form.features} onChange={e => set('features', e.target.value)} rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500"
              placeholder="POS básico&#10;Dashboard&#10;Soporte email" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-300">Plan activo</span>
            </label>
            <div>
              <label className="text-xs text-gray-400 mr-2">Orden:</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', Number(e.target.value))}
                className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LicensePage() {
  const [tab,       setTab]       = useState<'plans' | 'subscriptions' | 'history'>('plans');
  const [stats,     setStats]     = useState<LicenseStats | null>(null);
  const [plans,     setPlans]     = useState<LicensePlan[]>([]);
  const [current,   setCurrent]   = useState<LicenseSubscription | null>(null);
  const [subs,      setSubs]      = useState<LicenseSubscription[]>([]);
  const [history,   setHistory]   = useState<LicenseHistoryEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activating,setActivating]= useState<LicensePlan | null>(null);
  const [editing,   setEditing]   = useState<LicensePlan | null | undefined>(undefined);
  const [cancelling,setCancelling]= useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, pl, cur] = await Promise.all([
        adminService.getLicenseStats(),
        adminService.listLicensePlans(),
        adminService.getCurrentLicenseSubscription(),
      ]);
      setStats(st); setPlans(pl); setCurrent(cur);
    } catch { toast.error('Error cargando licencias'); }
    finally { setLoading(false); }
  }, []);

  const loadSubs = useCallback(async () => {
    try { setSubs(await adminService.listLicenseSubscriptions()); } catch { /**/ }
  }, []);
  const loadHistory = useCallback(async () => {
    try { setHistory(await adminService.getLicenseHistory()); } catch { /**/ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'subscriptions') loadSubs(); }, [tab, loadSubs]);
  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);

  const handleCancel = async (id: string) => {
    if (cancelling !== id) { setCancelling(id); return; }
    try {
      await adminService.cancelLicenseSubscription(id);
      toast.success('Suscripción cancelada');
      setCancelling(null); load(); loadSubs();
    } catch { toast.error('Error'); setCancelling(null); }
  };

  const handleDeletePlan = async (id: string) => {
    if (deleting !== id) { setDeleting(id); return; }
    try {
      await adminService.deleteLicensePlan(id);
      toast.success('Plan eliminado');
      setDeleting(null); load();
    } catch { toast.error('No se puede eliminar un plan con suscripciones activas'); setDeleting(null); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="text-indigo-400" size={24} />
          <div>
            <h1 className="text-xl font-bold text-white">License Manager</h1>
            <p className="text-sm text-gray-400">Gestiona planes, suscripciones y límites del sistema</p>
          </div>
        </div>
        {tab === 'plans' && (
          <button onClick={() => setEditing(null)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">
            <Plus size={14} /> Nuevo plan
          </button>
        )}
      </div>

      {/* Banner plan actual */}
      {stats && (
        <div className={`rounded-xl border p-5 ${
          stats.active_sub ? 'bg-indigo-950/40 border-indigo-700' : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stats.active_sub ? 'bg-indigo-600/30' : 'bg-gray-700'}`}>
                <Shield size={24} className={stats.active_sub ? 'text-indigo-300' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Plan actual</p>
                <p className="text-xl font-bold text-white">{stats.current_plan}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[stats.current_status] ?? STATUS_STYLES.none}`}>
                {STATUS_LABELS[stats.current_status] ?? stats.current_status}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              {stats.days_remaining !== null && (
                <div className="text-center">
                  <p className={`text-2xl font-bold ${stats.days_remaining < 10 ? 'text-red-400' : 'text-white'}`}>
                    {stats.days_remaining}
                  </p>
                  <p className="text-xs text-gray-400">días restantes</p>
                </div>
              )}
              {current && (
                <>
                  {[
                    { label: 'Sucursales', val: plans.find(p => p.id === current.plan_id)?.max_branches, icon: GitBranch },
                    { label: 'Dispositivos', val: plans.find(p => p.id === current.plan_id)?.max_devices, icon: Monitor },
                    { label: 'Usuarios', val: plans.find(p => p.id === current.plan_id)?.max_users, icon: Users },
                  ].map(it => it.val !== undefined && (
                    <div key={it.label} className="text-center">
                      <it.icon size={14} className="text-gray-400 mx-auto mb-0.5" />
                      <p className="text-sm font-semibold text-white">{fmt(it.val)}</p>
                      <p className="text-xs text-gray-400">{it.label}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit border border-gray-700">
        {(['plans', 'subscriptions', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'plans' ? 'Planes' : t === 'subscriptions' ? 'Suscripciones' : 'Historial'}
          </button>
        ))}
      </div>

      {/* ── Tab: Plans ──────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw className="animate-spin mr-2" size={18} />Cargando…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {plans.map(plan => {
              const isActive = current?.plan_id === plan.id && current.status === 'active';
              return (
                <div key={plan.id} className={`relative rounded-xl border flex flex-col ${
                  isActive ? 'border-indigo-500 bg-indigo-950/30' : 'border-gray-700 bg-gray-800'
                }`}>
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={10} /> Plan activo
                    </div>
                  )}
                  {!plan.is_active && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-600 text-gray-200 text-xs px-3 py-0.5 rounded-full">Inactivo</div>
                  )}
                  <div className="p-5 flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-gray-400 mb-3">{plan.description}</p>}
                    {/* Precios */}
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-white">{clp(plan.price_monthly)}</span>
                      {plan.price_monthly > 0 && <span className="text-xs text-gray-400 ml-1">/mes</span>}
                      {plan.price_yearly > 0 && (
                        <p className="text-xs text-gray-500">{clp(plan.price_yearly)} /año</p>
                      )}
                    </div>
                    {/* Límites */}
                    <div className="space-y-1.5 mb-4">
                      {[
                        { icon: GitBranch, label: 'Sucursales',   val: plan.max_branches },
                        { icon: Monitor,   label: 'Dispositivos', val: plan.max_devices  },
                        { icon: Users,     label: 'Usuarios',     val: plan.max_users    },
                      ].map(it => (
                        <div key={it.label} className="flex items-center gap-2 text-xs text-gray-400">
                          <it.icon size={11} className="text-gray-500 shrink-0" />
                          <span>{fmt(it.val)} {it.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Features */}
                    {plan.features.length > 0 && (
                      <ul className="space-y-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                            <CheckCircle size={10} className="text-green-400 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Acciones */}
                  <div className="p-4 border-t border-gray-700 flex gap-2">
                    {isActive ? (
                      <div className="flex-1 flex items-center justify-center gap-1 text-xs text-indigo-300">
                        <CheckCircle size={12} /> Plan en uso
                      </div>
                    ) : (
                      <button onClick={() => setActivating(plan)} disabled={!plan.is_active}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs disabled:opacity-40">
                        <Zap size={11} /> Activar
                      </button>
                    )}
                    <button onClick={() => setEditing(plan)}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs">Editar</button>
                    <button onClick={() => handleDeletePlan(plan.id)}
                      className={`px-3 py-2 rounded-lg text-xs transition-all ${deleting === plan.id ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-400'}`}>
                      {deleting === plan.id ? <Check size={11} /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Tab: Subscriptions ──────────────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {subs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Sin suscripciones</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs">
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Ciclo</th>
                  <th className="text-left px-4 py-3">Inicio</th>
                  <th className="text-left px-4 py-3">Vencimiento</th>
                  <th className="text-left px-4 py-3">Creado por</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-medium text-white">{s.plan_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[s.status] ?? ''}`}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs capitalize">{s.billing_cycle}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.starts_at).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 text-xs">
                      {s.ends_at
                        ? <span className={s.days_remaining !== null && s.days_remaining < 10 ? 'text-red-400' : 'text-gray-400'}>
                            {new Date(s.ends_at).toLocaleDateString('es-CL')}
                            {s.days_remaining !== null && <span className="ml-1 text-gray-500">({s.days_remaining}d)</span>}
                          </span>
                        : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.created_by ?? '—'}</td>
                    <td className="px-4 py-3">
                      {s.status === 'active' || s.status === 'trial' ? (
                        <button onClick={() => handleCancel(s.id)}
                          className={`px-3 py-1 rounded text-xs transition-all ${cancelling === s.id ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                          {cancelling === s.id ? 'Confirmar' : 'Cancelar'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: History ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Sin historial</div>
          ) : history.map(entry => (
            <div key={entry.id} className="flex items-start gap-4 bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="p-2 bg-gray-700 rounded-lg mt-0.5">
                {ACTION_ICONS[entry.action] ?? <History size={14} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white capitalize">{entry.action}</span>
                  <span className="text-xs text-indigo-300">{entry.plan_name}</span>
                  {entry.from_plan && entry.to_plan && (
                    <span className="text-xs text-gray-400">{entry.from_plan} → {entry.to_plan}</span>
                  )}
                </div>
                {entry.notes && <p className="text-xs text-gray-400 mt-0.5">{entry.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                {entry.actor_email && <p className="text-xs text-gray-400">{entry.actor_email}</p>}
                <p className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString('es-CL')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {activating && (
        <ActivateModal plan={activating} onClose={() => setActivating(null)} onDone={() => { setActivating(null); load(); }} />
      )}
      {editing !== undefined && (
        <PlanEditModal plan={editing} onClose={() => setEditing(undefined)} onDone={() => { setEditing(undefined); load(); }} />
      )}
    </div>
  );
}
