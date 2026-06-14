import { useEffect, useState, useCallback } from 'react';
import {
  Gauge, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  ShieldAlert, ShieldOff, Activity, Clock, ListFilter,
  X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import type { RateLimitRule, RateLimitEvent, RateLimitStats } from '../../services/adminService';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const METHOD_OPTIONS  = ['ALL','GET','POST','PUT','PATCH','DELETE'];
const SCOPE_OPTIONS   = ['global','role','ip'] as const;

const EMPTY_RULE: Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
  name:             '',
  description:      null,
  endpoint_pattern: '/api/*',
  http_method:      'ALL',
  scope:            'global',
  role_target:      null,
  ip_pattern:       null,
  max_requests:     60,
  window_seconds:   60,
  burst_allowance:  0,
  block_duration_s: 300,
  is_enabled:       true,
  priority:         100,
};

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-4 flex items-center gap-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/* ── Rule modal ────────────────────────────────────────────────────────────── */

function RuleModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<RateLimitRule>;
  onSave:  (r: Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_RULE, ...initial });
  const [saving, setSaving] = useState(false);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.endpoint_pattern.trim()) {
      toast.error('Nombre y patrón de endpoint son obligatorios');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            {initial.id ? 'Editar regla' : 'Nueva regla'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400">Nombre *</label>
              <input
                value={form.name}
                onChange={e => patch('name', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
                placeholder="Ej: Auth login global"
              />
            </div>

            {/* Endpoint pattern */}
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400">Patrón de endpoint *</label>
              <input
                value={form.endpoint_pattern}
                onChange={e => patch('endpoint_pattern', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white font-mono focus:border-indigo-500 focus:outline-none"
                placeholder="/api/auth/*, /api/admin/*"
              />
            </div>

            {/* Method */}
            <div>
              <label className="text-xs text-gray-400">Método HTTP</label>
              <select
                value={form.http_method}
                onChange={e => patch('http_method', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              >
                {METHOD_OPTIONS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Scope */}
            <div>
              <label className="text-xs text-gray-400">Alcance</label>
              <select
                value={form.scope}
                onChange={e => patch('scope', e.target.value as typeof form.scope)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              >
                {SCOPE_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {form.scope === 'role' && (
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400">Rol objetivo</label>
                <input
                  value={form.role_target ?? ''}
                  onChange={e => patch('role_target', e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                    text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="admin, manager, cashier…"
                />
              </div>
            )}

            {form.scope === 'ip' && (
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400">Patrón de IP / CIDR</label>
                <input
                  value={form.ip_pattern ?? ''}
                  onChange={e => patch('ip_pattern', e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                    text-white font-mono focus:border-indigo-500 focus:outline-none"
                  placeholder="192.168.1.0/24"
                />
              </div>
            )}

            {/* max_requests / window_seconds */}
            <div>
              <label className="text-xs text-gray-400">Máx. requests</label>
              <input type="number" min={1} value={form.max_requests}
                onChange={e => patch('max_requests', Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Ventana (segundos)</label>
              <input type="number" min={1} value={form.window_seconds}
                onChange={e => patch('window_seconds', Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* burst / block_duration */}
            <div>
              <label className="text-xs text-gray-400">Burst allowance</label>
              <input type="number" min={0} value={form.burst_allowance}
                onChange={e => patch('burst_allowance', Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Bloqueo (segundos)</label>
              <input type="number" min={0} value={form.block_duration_s}
                onChange={e => patch('block_duration_s', Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* priority */}
            <div>
              <label className="text-xs text-gray-400">Prioridad</label>
              <input type="number" min={1} value={form.priority}
                onChange={e => patch('priority', Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* enabled toggle */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => patch('is_enabled', !form.is_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${form.is_enabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
                    ${form.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-300">Habilitada</span>
              </label>
            </div>

            {/* description */}
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400">Descripción (opcional)</label>
              <input
                value={form.description ?? ''}
                onChange={e => patch('description', e.target.value || null)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm
                  text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300
                hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm
                font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */

export default function RateLimiterPage() {
  const [stats,   setStats]   = useState<RateLimitStats | null>(null);
  const [rules,   setRules]   = useState<RateLimitRule[]>([]);
  const [events,  setEvents]  = useState<RateLimitEvent[]>([]);
  const [tab,     setTab]     = useState<'rules' | 'events'>('rules');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<Partial<RateLimitRule> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, r, e] = await Promise.all([
        adminService.getRateLimiterStats(),
        adminService.listRateLimitRules(),
        adminService.listRateLimitEvents(50),
      ]);
      setStats(s);
      setRules(r);
      setEvents(e);
    } catch {
      toast.error('Error al cargar rate limiter');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(payload: Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
    try {
      if (modal?.id) {
        await adminService.updateRateLimitRule(modal.id, payload);
        toast.success('Regla actualizada');
      } else {
        await adminService.createRateLimitRule(payload as Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at'>);
        toast.success('Regla creada');
      }
      setModal(null);
      void load();
    } catch {
      toast.error('Error al guardar regla');
      throw new Error('save failed');
    }
  }

  async function handleToggle(id: string) {
    try {
      const updated = await adminService.toggleRateLimitRule(id);
      setRules(prev => prev.map(r => r.id === id ? updated : r));
      toast.success(updated.is_enabled ? 'Regla habilitada' : 'Regla deshabilitada');
    } catch {
      toast.error('Error al cambiar estado');
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await adminService.deleteRateLimitRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success('Regla eliminada');
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-400">
        Cargando rate limiter…
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600/20">
            <Gauge className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Rate Limiter</h1>
            <p className="text-sm text-gray-400">
              Configura límites de peticiones por endpoint, rol o IP
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm
            font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nueva regla
        </button>
      </div>

      {/* stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Reglas totales"    value={stats.total_rules}    icon={ListFilter}   color="bg-indigo-600/70" />
          <StatCard label="Reglas activas"    value={stats.enabled_rules}  icon={ShieldAlert}  color="bg-green-600/70"  />
          <StatCard label="Eventos (24 h)"    value={stats.total_events}   icon={Activity}     color="bg-blue-600/70"   />
          <StatCard label="Bloqueados (24 h)" value={stats.blocked_events} icon={ShieldOff}    color="bg-red-600/70"    />
        </div>
      )}

      {/* top blocked */}
      {stats && stats.top_blocked_endpoints.length > 0 && (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-4">
          <p className="mb-3 text-sm font-medium text-gray-200">Top endpoints bloqueados (24 h)</p>
          <div className="flex flex-wrap gap-2">
            {stats.top_blocked_endpoints.map((e, i) => (
              <span key={i} className="rounded-full bg-red-900/40 px-3 py-1 text-xs text-red-300 font-mono">
                {e.endpoint} <span className="font-bold">{e.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-800/60 p-1 w-fit">
        {(['rules','events'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors
              ${tab === t ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            {t === 'rules' ? `Reglas (${rules.length})` : `Eventos (${events.length})`}
          </button>
        ))}
      </div>

      {/* RULES TABLE */}
      {tab === 'rules' && (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Patrón</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Método</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Límite</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Alcance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {rules.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                    Sin reglas configuradas
                  </td>
                </tr>
              )}
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-gray-500">{rule.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{rule.endpoint_pattern}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                      {rule.http_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-white">{rule.max_requests}</span>
                      <span className="text-gray-500">/ {rule.window_seconds}s</span>
                    </div>
                    {rule.burst_allowance > 0 && (
                      <span className="text-xs text-gray-500">+{rule.burst_allowance} burst</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs
                      ${rule.scope === 'global' ? 'bg-blue-900/40 text-blue-300' :
                        rule.scope === 'role'   ? 'bg-purple-900/40 text-purple-300' :
                        'bg-yellow-900/40 text-yellow-300'}`}>
                      {rule.scope}
                      {rule.role_target && ` • ${rule.role_target}`}
                      {rule.ip_pattern  && ` • ${rule.ip_pattern}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(rule.id)} title="Toggle">
                      {rule.is_enabled
                        ? <ToggleRight className="h-5 w-5 text-green-400 hover:text-green-300" />
                        : <ToggleLeft  className="h-5 w-5 text-gray-500 hover:text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setModal(rule)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleting === rule.id}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-900/40 hover:text-red-400
                          disabled:opacity-40"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EVENTS TABLE */}
      {tab === 'events' && (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Regla</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                    Sin eventos registrados
                  </td>
                </tr>
              )}
              {events.map(ev => (
                <tr key={ev.id} className={`hover:bg-gray-700/20 transition-colors
                  ${ev.blocked ? 'bg-red-900/10' : ''}`}>
                  <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-300">
                    {ev.http_method && <span className="text-gray-500 mr-1">{ev.http_method}</span>}
                    {ev.endpoint ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{ev.ip_address ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{ev.user_email ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{ev.rule_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    {ev.blocked
                      ? <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-300 flex items-center gap-1 w-fit">
                          <ShieldOff className="h-3 w-3" /> Bloqueado
                        </span>
                      : <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300 flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" /> Limitado
                        </span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal */}
      {modal !== null && (
        <RuleModal
          initial={modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
