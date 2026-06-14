import { useEffect, useState } from 'react';
import {
  ShieldAlert, KeyRound, LogIn, Clock, Eye,
  History, CheckCircle2, XCircle, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import type { SecurityPolicy, PolicyLogEntry } from '../../services/adminService';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
          ${checked ? 'bg-indigo-600' : 'bg-gray-600'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

function NumberField({
  label, value, onChange, min = 0, max = 9999, hint,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-400">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-32 rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white
          focus:border-indigo-500 focus:outline-none"
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}

const SECTION_ICONS = {
  passwords: KeyRound,
  login:     LogIn,
  session:   Clock,
  audit:     Eye,
  log:       History,
};

/* ── main component ───────────────────────────────────────────────────────── */

export default function SecurityPolicyPage() {
  const [policy,   setPolicy]   = useState<SecurityPolicy | null>(null);
  const [draft,    setDraft]    = useState<SecurityPolicy | null>(null);
  const [log,      setLog]      = useState<PolicyLogEntry[]>([]);
  const [tab,      setTab]      = useState<'passwords'|'login'|'session'|'audit'|'log'>('passwords');
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [notes,    setNotes]    = useState('');

  // validator test
  const [testPwd,  setTestPwd]  = useState('');
  const [testUser, setTestUser] = useState('');
  const [testResult, setTestResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [testing,  setTesting]  = useState(false);

  useEffect(() => {
    Promise.all([
      adminService.getSecurityPolicy(),
      adminService.getSecurityPolicyLog(30),
    ])
      .then(([p, l]) => {
        setPolicy(p);
        setDraft(p);
        setLog(l);
      })
      .catch(() => toast.error('Error al cargar política de seguridad'))
      .finally(() => setLoading(false));
  }, []);

  function patch<K extends keyof SecurityPolicy>(key: K, value: SecurityPolicy[K]) {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await adminService.updateSecurityPolicy({ ...draft, notes: notes || undefined });
      setPolicy(updated);
      setDraft(updated);
      setNotes('');
      toast.success('Política actualizada correctamente');
      const l = await adminService.getSecurityPolicyLog(30);
      setLog(l);
    } catch {
      toast.error('Error al guardar la política');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (policy) setDraft(policy);
    setNotes('');
    toast('Cambios descartados');
  }

  async function testPassword() {
    if (!testPwd) return;
    setTesting(true);
    try {
      const res = await adminService.validatePassword(testPwd, testUser || undefined);
      setTestResult(res);
    } catch {
      toast.error('Error al validar contraseña');
    } finally {
      setTesting(false);
    }
  }

  if (loading || !draft) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-400">
        Cargando política de seguridad…
      </div>
    );
  }

  const tabs: { id: typeof tab; label: string; Icon: React.ElementType }[] = [
    { id: 'passwords', label: 'Contraseñas',    Icon: SECTION_ICONS.passwords },
    { id: 'login',     label: 'Login',           Icon: SECTION_ICONS.login    },
    { id: 'session',   label: 'Sesión',          Icon: SECTION_ICONS.session  },
    { id: 'audit',     label: 'Auditoría',       Icon: SECTION_ICONS.audit    },
    { id: 'log',       label: 'Historial',       Icon: SECTION_ICONS.log      },
  ];

  return (
    <div className="space-y-6 px-6 py-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20">
          <ShieldAlert className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Política de Seguridad</h1>
          <p className="text-sm text-gray-400">
            Configura contraseñas, login, sesiones y auditoría del sistema
          </p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-800/60 p-1">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm
              font-medium transition-colors
              ${tab === id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-white'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* panels */}
      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6 space-y-6">

        {/* ── CONTRASEÑAS ─────────────────────────────────────────────────── */}
        {tab === 'passwords' && (
          <>
            <h2 className="text-base font-semibold text-white">Requisitos de contraseña</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Longitud mínima"
                value={draft.pwd_min_length}
                onChange={v => patch('pwd_min_length', v)}
                min={4} max={64}
              />
              <NumberField
                label="Días para expiración (0 = nunca)"
                value={draft.pwd_max_age_days}
                onChange={v => patch('pwd_max_age_days', v)}
                hint="0 deshabilita la expiración"
              />
              <NumberField
                label="Historial de contraseñas"
                value={draft.pwd_history_count}
                onChange={v => patch('pwd_history_count', v)}
                hint="No reutilizar últimas N contraseñas"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Toggle checked={draft.pwd_require_uppercase}  onChange={v => patch('pwd_require_uppercase', v)}  label="Requiere mayúsculas" />
              <Toggle checked={draft.pwd_require_lowercase}  onChange={v => patch('pwd_require_lowercase', v)}  label="Requiere minúsculas" />
              <Toggle checked={draft.pwd_require_numbers}    onChange={v => patch('pwd_require_numbers', v)}    label="Requiere números" />
              <Toggle checked={draft.pwd_require_symbols}    onChange={v => patch('pwd_require_symbols', v)}    label="Requiere símbolos (@!#…)" />
              <Toggle checked={draft.pwd_prevent_username}   onChange={v => patch('pwd_prevent_username', v)}   label="No permitir nombre de usuario en contraseña" />
            </div>

            {/* password tester */}
            <div className="rounded-xl border border-gray-600 bg-gray-700/50 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-200">Probar contraseña</p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Usuario (opcional)"
                  value={testUser}
                  onChange={e => setTestUser(e.target.value)}
                  className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white w-40
                    focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Contraseña a probar"
                  value={testPwd}
                  onChange={e => setTestPwd(e.target.value)}
                  className="flex-1 min-w-[160px] rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5
                    text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={testPassword}
                  disabled={testing || !testPwd}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white
                    hover:bg-indigo-700 disabled:opacity-50"
                >
                  {testing ? 'Probando…' : 'Validar'}
                </button>
              </div>
              {testResult && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm
                  ${testResult.valid ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  {testResult.valid
                    ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <div>
                    {testResult.valid
                      ? 'Contraseña válida según la política actual'
                      : testResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── LOGIN ───────────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <>
            <h2 className="text-base font-semibold text-white">Control de acceso</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Intentos máximos antes de bloqueo"
                value={draft.login_max_attempts}
                onChange={v => patch('login_max_attempts', v)}
                min={1} max={99}
              />
              <NumberField
                label="Minutos de bloqueo tras fallos"
                value={draft.login_lockout_minutes}
                onChange={v => patch('login_lockout_minutes', v)}
                hint="0 = bloqueo indefinido hasta desbloqueo manual"
              />
              <NumberField
                label="Segundos de cooldown entre intentos"
                value={draft.login_cooldown_seconds}
                onChange={v => patch('login_cooldown_seconds', v)}
                hint="0 = sin espera"
              />
            </div>

            <div className="rounded-xl border border-gray-600 bg-gray-700/50 p-4 space-y-2">
              <p className="text-sm font-medium text-gray-200">Roles que requieren 2FA</p>
              <p className="text-xs text-gray-400">Separa con comas: admin, manager, cashier</p>
              <input
                type="text"
                value={draft.login_require_2fa_roles.join(', ')}
                onChange={e =>
                  patch('login_require_2fa_roles',
                    e.target.value.split(',').map(r => r.trim()).filter(Boolean)
                  )
                }
                placeholder="admin, manager"
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white
                  focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* ── SESIÓN ──────────────────────────────────────────────────────── */}
        {tab === 'session' && (
          <>
            <h2 className="text-base font-semibold text-white">Gestión de sesiones</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Timeout de sesión (minutos)"
                value={draft.session_timeout_minutes}
                onChange={v => patch('session_timeout_minutes', v)}
                hint="0 = sin expiración automática"
              />
              <NumberField
                label="Sesiones simultáneas máximas por usuario"
                value={draft.session_max_concurrent}
                onChange={v => patch('session_max_concurrent', v)}
                min={1} max={99}
              />
            </div>
            <Toggle
              checked={draft.session_refresh_enabled}
              onChange={v => patch('session_refresh_enabled', v)}
              label="Renovar token automáticamente mientras el usuario esté activo"
            />

            <div className="rounded-xl border border-gray-600 bg-gray-700/50 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={draft.ip_allowlist_enabled}
                  onChange={v => patch('ip_allowlist_enabled', v)}
                  label="Habilitar allowlist de IPs para admin"
                />
              </div>
              <p className="text-xs text-gray-400">Una IP por línea (IPv4 o CIDR). Vacío = sin restricción.</p>
              <textarea
                rows={4}
                value={draft.ip_allowlist_admin.join('\n')}
                onChange={e =>
                  patch('ip_allowlist_admin',
                    e.target.value.split('\n').map(r => r.trim()).filter(Boolean)
                  )
                }
                placeholder="192.168.1.0/24&#10;10.0.0.1"
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white
                  focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </>
        )}

        {/* ── AUDITORÍA ───────────────────────────────────────────────────── */}
        {tab === 'audit' && (
          <>
            <h2 className="text-base font-semibold text-white">Eventos auditados</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Toggle
                checked={draft.audit_login_events}
                onChange={v => patch('audit_login_events', v)}
                label="Registrar eventos de login (éxito y fallo)"
              />
              <Toggle
                checked={draft.audit_data_exports}
                onChange={v => patch('audit_data_exports', v)}
                label="Registrar exportaciones de datos"
              />
              <Toggle
                checked={draft.audit_sensitive_reads}
                onChange={v => patch('audit_sensitive_reads', v)}
                label="Registrar lecturas de datos sensibles"
              />
            </div>
          </>
        )}

        {/* ── HISTORIAL ───────────────────────────────────────────────────── */}
        {tab === 'log' && (
          <>
            <h2 className="text-base font-semibold text-white">Historial de cambios</h2>
            {log.length === 0 ? (
              <p className="text-sm text-gray-400">Sin cambios registrados todavía.</p>
            ) : (
              <div className="space-y-3">
                {log.map(entry => (
                  <div key={entry.id} className="rounded-xl border border-gray-700 bg-gray-700/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {entry.actor_email ?? '—'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString('es-CL')}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-indigo-300 italic">"{entry.notes}"</p>
                    )}
                    {entry.after && (
                      <details className="text-xs text-gray-400">
                        <summary className="cursor-pointer select-none">Ver cambios</summary>
                        <pre className="mt-1 overflow-auto rounded bg-gray-800 p-2 text-xs text-gray-300">
                          {JSON.stringify(entry.after, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* save bar (hidden on log tab) */}
      {tab !== 'log' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-700
          bg-gray-800/60 px-6 py-4">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Nota sobre este cambio (opcional)"
            className="flex-1 min-w-[200px] rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5
              text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={reset}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300
              hover:bg-gray-700"
          >
            Descartar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm
              font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
