import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, FileDown, Trash2, AlertTriangle,
  Clock, CheckCircle2, XCircle, RefreshCw,
  Database, Users, BarChart2, Plus, X, Save,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import type { DataRequest, ConsentRecord, RetentionPolicy, DataPrivacyStats } from '../../services/adminService';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  export:      'Exportación',
  delete:      'Eliminación',
  rectify:     'Rectificación',
  restrict:    'Restricción',
  portability: 'Portabilidad',
};

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-yellow-900/40 text-yellow-300',
  in_progress: 'bg-blue-900/40 text-blue-300',
  completed:   'bg-green-900/40 text-green-300',
  rejected:    'bg-red-900/40 text-red-300',
  cancelled:   'bg-gray-700 text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending:     'Pendiente',
  in_progress: 'En proceso',
  completed:   'Completado',
  rejected:    'Rechazado',
  cancelled:   'Cancelado',
};

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    export:      FileDown,
    delete:      Trash2,
    rectify:     RefreshCw,
    restrict:    ShieldCheck,
    portability: Database,
  };
  const Icon = icons[type] ?? FileDown;
  return <Icon className="h-4 w-4" />;
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-4 flex items-center gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

/* ── New request modal ──────────────────────────────────────────────────────── */

function NewRequestModal({ onSave, onClose }: {
  onSave: (p: Pick<DataRequest, 'type'|'requester_email'|'requester_name'|'description'>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    type: 'export' as DataRequest['type'],
    requester_email: '',
    requester_name: '' as string | null,
    description: '' as string | null,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.requester_email.trim()) { toast.error('Email requerido'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        requester_name: form.requester_name || null,
        description:    form.description    || null,
      });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Nueva solicitud DSAR</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div>
            <label className="text-xs text-gray-400">Tipo de solicitud</label>
            <select value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value as DataRequest['type'] }))}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                text-white focus:border-indigo-500 focus:outline-none">
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Email del solicitante *</label>
            <input type="email" value={form.requester_email}
              onChange={e => setForm(p => ({ ...p, requester_email: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                text-white focus:border-indigo-500 focus:outline-none"
              placeholder="usuario@ejemplo.com" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Nombre (opcional)</label>
            <input type="text" value={form.requester_name ?? ''}
              onChange={e => setForm(p => ({ ...p, requester_name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                text-white focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Descripción (opcional)</label>
            <textarea rows={3} value={form.description ?? ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                text-white focus:border-indigo-500 focus:outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm
                font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'Creando…' : 'Crear solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Reject modal ────────────────────────────────────────────────────────────── */

function RejectModal({ onConfirm, onClose }: {
  onConfirm: (reason: string) => Promise<void>;
  onClose:   () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onConfirm(reason); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Rechazar solicitud</h2>
        <form onSubmit={submit} className="space-y-3">
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Motivo del rechazo (opcional)"
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
              text-white focus:border-indigo-500 focus:outline-none resize-none" />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
              {saving ? 'Rechazando…' : 'Confirmar rechazo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */

export default function DataPrivacyPage() {
  const [stats,      setStats]      = useState<DataPrivacyStats | null>(null);
  const [requests,   setRequests]   = useState<DataRequest[]>([]);
  const [consents,   setConsents]   = useState<ConsentRecord[]>([]);
  const [retention,  setRetention]  = useState<RetentionPolicy[]>([]);
  const [tab,        setTab]        = useState<'requests'|'consents'|'retention'|'stats'>('requests');
  const [loading,    setLoading]    = useState(true);
  const [showNew,    setShowNew]    = useState(false);
  const [rejectId,   setRejectId]   = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [editRetId,    setEditRetId]    = useState<string | null>(null);
  const [editRetDays,  setEditRetDays]  = useState(0);
  const [editRetAuto,  setEditRetAuto]  = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r, c, p] = await Promise.all([
        adminService.getDataPrivacyStats(),
        adminService.listDataRequests({ limit: 100 }),
        adminService.listConsentRecords({ limit: 100 }),
        adminService.listRetentionPolicies(),
      ]);
      setStats(s);
      setRequests(r);
      setConsents(c);
      setRetention(p);
    } catch {
      toast.error('Error al cargar datos de privacidad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(payload: Pick<DataRequest, 'type'|'requester_email'|'requester_name'|'description'>) {
    await adminService.createDataRequest(payload);
    toast.success('Solicitud creada');
    setShowNew(false);
    void load();
  }

  async function handleAction(id: string, action: 'start'|'complete'|'reject'|'cancel', opts?: Record<string, string>) {
    try {
      await adminService.updateDataRequestStatus(id, action, opts);
      toast.success(`Solicitud ${STATUS_LABELS[action === 'start' ? 'in_progress' : action === 'complete' ? 'completed' : action === 'reject' ? 'rejected' : 'cancelled'].toLowerCase()}`);
      setRejectId(null);
      void load();
    } catch {
      toast.error('Error al actualizar solicitud');
    }
  }

  async function handleSaveRetention(id: string) {
    try {
      await adminService.updateRetentionPolicy(id, { retention_days: editRetDays, auto_delete: editRetAuto });
      toast.success('Política actualizada');
      setEditRetId(null);
      void load();
    } catch {
      toast.error('Error al actualizar política');
    }
  }

  const filteredRequests = requests.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (!filterType   || r.type   === filterType)
  );

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-gray-400">Cargando privacidad…</div>;
  }

  const tabs = [
    { id: 'requests'  as const, label: `Solicitudes (${requests.length})`,    icon: FileDown    },
    { id: 'consents'  as const, label: `Consentimientos (${consents.length})`, icon: CheckCircle2 },
    { id: 'retention' as const, label: 'Retención',                            icon: Database     },
    { id: 'stats'     as const, label: 'Estadísticas',                         icon: BarChart2    },
  ];

  return (
    <div className="space-y-6 px-6 py-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/20">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Privacidad & GDPR</h1>
            <p className="text-sm text-gray-400">Solicitudes DSAR, consentimientos y políticas de retención</p>
          </div>
        </div>
        {tab === 'requests' && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm
              font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </button>
        )}
      </div>

      {/* quick stats bar */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Solicitudes totales"  value={stats.total_requests}     icon={FileDown}       color="bg-indigo-600/70" />
          <StatCard label="Pendientes"            value={stats.pending_requests}   icon={Clock}          color="bg-yellow-600/70" />
          <StatCard label="Vencidas (SLA)"        value={stats.overdue_requests}   icon={AlertTriangle}  color="bg-red-600/70"    />
          <StatCard label="Consentimientos activos" value={stats.active_consents}  icon={Users}          color="bg-teal-600/70"   />
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-800/60 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs
              font-medium transition-colors
              ${tab === id ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── REQUESTS ─────────────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {/* filters */}
          <div className="flex flex-wrap gap-3">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white
                focus:border-indigo-500 focus:outline-none">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white
                focus:border-indigo-500 focus:outline-none">
              <option value="">Todos los tipos</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-800/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700 bg-gray-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Solicitante</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Vence</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredRequests.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">Sin solicitudes</td></tr>
                )}
                {filteredRequests.map(req => {
                  const overdue = req.due_date && new Date(req.due_date) < new Date()
                    && ['pending','in_progress'].includes(req.status);
                  return (
                    <tr key={req.id} className={`hover:bg-gray-700/20 transition-colors ${overdue ? 'bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-white">{req.requester_name ?? req.requester_email}</p>
                        <p className="text-xs text-gray-400">{req.requester_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <TypeIcon type={req.type} />
                          {TYPE_LABELS[req.type] ?? req.type}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[req.status] ?? ''}`}>
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {req.due_date ? (
                          <span className={overdue ? 'text-red-400 font-medium' : 'text-gray-400'}>
                            {new Date(req.due_date).toLocaleDateString('es-CL')}
                            {overdue && ' ⚠'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {req.status === 'pending' && (
                            <button onClick={() => handleAction(req.id, 'start')}
                              className="rounded px-2 py-1 text-xs bg-blue-900/40 text-blue-300 hover:bg-blue-800/60">
                              Iniciar
                            </button>
                          )}
                          {req.status === 'in_progress' && (
                            <button onClick={() => handleAction(req.id, 'complete')}
                              className="rounded px-2 py-1 text-xs bg-green-900/40 text-green-300 hover:bg-green-800/60">
                              Completar
                            </button>
                          )}
                          {['pending','in_progress'].includes(req.status) && (
                            <button onClick={() => setRejectId(req.id)}
                              className="rounded px-2 py-1 text-xs bg-red-900/40 text-red-300 hover:bg-red-800/60">
                              Rechazar
                            </button>
                          )}
                          {['pending','in_progress'].includes(req.status) && (
                            <button onClick={() => handleAction(req.id, 'cancel')}
                              className="rounded px-2 py-1 text-xs bg-gray-700 text-gray-400 hover:bg-gray-600">
                              Cancelar
                            </button>
                          )}
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

      {/* ── CONSENTS ─────────────────────────────────────────────────────────── */}
      {tab === 'consents' && (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Fuente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {consents.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">Sin registros de consentimiento</td></tr>
              )}
              {consents.map(c => (
                <tr key={c.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3 text-white">{c.user_email}</td>
                  <td className="px-4 py-3 text-gray-300">{c.consent_type}</td>
                  <td className="px-4 py-3">
                    {c.granted && !c.revoked_at
                      ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="h-3 w-3"/>Activo</span>
                      : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="h-3 w-3"/>Revocado</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{c.source ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RETENTION ────────────────────────────────────────────────────────── */}
      {tab === 'retention' && (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Retención</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Auto-purga</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Última purga</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {retention.map(pol => (
                editRetId === pol.id ? (
                  <tr key={pol.id} className="bg-indigo-900/10">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-300">{pol.data_category}</td>
                    <td colSpan={2} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <input type="number" min={0} value={editRetDays}
                          onChange={e => setEditRetDays(Number(e.target.value))}
                          className="w-20 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm
                            text-white focus:border-indigo-500 focus:outline-none" />
                        <span className="text-xs text-gray-400">días (0 = forever)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditRetAuto(!editRetAuto)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          ${editRetAuto ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
                          ${editRetAuto ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td colSpan={2} className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveRetention(pol.id)}
                          className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700">
                          Guardar
                        </button>
                        <button onClick={() => setEditRetId(null)}
                          className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-400 hover:bg-gray-700">
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={pol.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">{pol.data_category}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{pol.description ?? '—'}</td>
                    <td className="px-4 py-3 text-white">
                      {pol.retention_days === 0
                        ? <span className="text-gray-500">Indefinido</span>
                        : `${pol.retention_days} días`}
                    </td>
                    <td className="px-4 py-3">
                      {pol.auto_delete
                        ? <span className="text-xs text-green-400">Sí</span>
                        : <span className="text-xs text-gray-500">No</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {pol.last_purge_at ? new Date(pol.last_purge_at).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditRetId(pol.id); setEditRetDays(pol.retention_days); setEditRetAuto(pol.auto_delete); }}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      {tab === 'stats' && stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Solicitudes por tipo</h3>
            {Object.entries(TYPE_LABELS).map(([type, label]) => {
              const count  = stats.by_type[type] ?? 0;
              const pct    = stats.total_requests > 0
                ? Math.round((count / stats.total_requests) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{label}</span>
                    <span className="font-medium text-white">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-700">
                    <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Resumen solicitudes</h3>
            {[
              { label: 'Total',       value: stats.total_requests,     color: 'text-blue-400'   },
              { label: 'Pendientes',  value: stats.pending_requests,   color: 'text-yellow-400' },
              { label: 'Vencidas',    value: stats.overdue_requests,   color: 'text-red-400'    },
              { label: 'Completadas', value: stats.completed_requests, color: 'text-green-400'  },
              { label: 'Rechazadas',  value: stats.rejected_requests,  color: 'text-gray-400'   },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm text-gray-400">{label}</span>
                <span className={`text-xl font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* modals */}
      {showNew && <NewRequestModal onSave={handleCreate} onClose={() => setShowNew(false)} />}
      {rejectId && (
        <RejectModal
          onConfirm={reason => handleAction(rejectId, 'reject', reason ? { rejection_reason: reason } : {})}
          onClose={() => setRejectId(null)}
        />
      )}
    </div>
  );
}
