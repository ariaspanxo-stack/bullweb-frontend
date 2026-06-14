/**
 * BULLWEB ENTERPRISE — Sprint 16
 * Gestión de 2FA / TOTP para administradores.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fingerprint,
  ShieldCheck,
  ShieldOff,
  QrCode,
  Copy,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserX,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { TwoFactorUser, TwoFactorSetup } from '@/services/adminService';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  return format(new Date(d), 'dd MMM yyyy HH:mm', { locale: es });
}

function StatusBadge({ enabled, verified }: { enabled: boolean; verified: boolean }) {
  if (enabled && verified)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Activo
      </span>
    );
  if (!enabled && !verified)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/60 px-2 py-0.5 text-xs font-medium text-zinc-400">
        <ShieldOff className="h-3 w-3" /> Desactivado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-400">
      <Clock className="h-3 w-3" /> Pendiente
    </span>
  );
}

// ─── Setup Modal ─────────────────────────────────────────────────────────────

interface SetupModalProps {
  user: TwoFactorUser;
  setup: TwoFactorSetup;
  onClose: () => void;
  onVerified: () => void;
}

function SetupModal({ user, setup, onClose, onVerified }: SetupModalProps) {
  const qc = useQueryClient();
  const [token, setToken]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [step, setStep]         = useState<'qr' | 'verify'>('qr');

  const verifyMut = useMutation({
    mutationFn: () => adminService.verify2FA(user.id, token),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('2FA activado correctamente');
        qc.invalidateQueries({ queryKey: ['admin-2fa-users'] });
        qc.invalidateQueries({ queryKey: ['admin-2fa-stats'] });
        onVerified();
      } else {
        toast.error(res.message ?? 'Token inválido');
      }
    },
    onError: () => toast.error('Error al verificar el token'),
  });

  function copyKey() {
    navigator.clipboard.writeText(setup.manualEntryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6">
        {/* header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-indigo-400" />
              Configurar 2FA
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
        </div>

        {step === 'qr' ? (
          <>
            <p className="mb-4 text-sm text-zinc-300">
              Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.).
            </p>
            <div className="flex justify-center mb-4">
              <img
                src={setup.qrDataUrl}
                alt="QR 2FA"
                className="rounded-xl border border-zinc-700 w-48 h-48 object-contain bg-white p-2"
              />
            </div>

            {/* clave manual */}
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-1">O ingresa manualmente:</p>
              <div className="flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2">
                <code className="flex-1 text-xs text-indigo-300 font-mono break-all">
                  {setup.manualEntryKey}
                </code>
                <button
                  onClick={copyKey}
                  className="shrink-0 text-zinc-400 hover:text-white transition"
                  title="Copiar"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* backup codes */}
            <div className="mb-5">
              <p className="text-xs text-zinc-500 mb-2">
                Códigos de recuperación (guárdalos en lugar seguro):
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {setup.backupCodes.map((c, i) => (
                  <span key={i} className="font-mono text-xs bg-zinc-800 rounded px-2 py-1 text-center text-amber-300 border border-zinc-700">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 transition"
            >
              Continuar → Verificar token
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-300">
              Ingresa el código de 6 dígitos que muestra tu app para confirmar la vinculación.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-center text-2xl font-mono tracking-widest text-white py-4 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setStep('qr')}
                className="flex-1 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2.5 transition"
              >
                ← Volver
              </button>
              <button
                disabled={token.length < 6 || verifyMut.isPending}
                onClick={() => verifyMut.mutate()}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 transition flex items-center justify-center gap-2"
              >
                {verifyMut.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando…</>
                  : 'Activar 2FA'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Disable Modal ────────────────────────────────────────────────────

function ConfirmDisableModal({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: TwoFactorUser;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400 shrink-0" />
          <h2 className="text-base font-bold text-white">Desactivar 2FA</h2>
        </div>
        <p className="text-sm text-zinc-300 mb-1">
          ¿Desactivar el 2FA del usuario?
        </p>
        <p className="text-sm font-semibold text-white mb-5">{user.email}</p>
        <p className="text-xs text-zinc-500 mb-5">
          Se eliminará el secret TOTP y los códigos de recuperación. El usuario deberá configurar 2FA nuevamente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2.5 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 transition flex items-center justify-center gap-2"
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Desactivando…</> : 'Desactivar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TwoFactorPage() {
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [setupUser, setSetupUser]     = useState<TwoFactorUser | null>(null);
  const [setupData, setSetupData]     = useState<TwoFactorSetup | null>(null);
  const [disableUser, setDisableUser] = useState<TwoFactorUser | null>(null);

  const statsQ = useQuery({
    queryKey: ['admin-2fa-stats'],
    queryFn:  adminService.get2FAStats,
  });

  const usersQ = useQuery({
    queryKey: ['admin-2fa-users'],
    queryFn:  adminService.list2FAUsers,
  });

  const setupMut = useMutation({
    mutationFn: (userId: string) => adminService.setup2FA(userId),
    onSuccess: (data, userId) => {
      const user = usersQ.data?.find(u => u.id === userId) ?? null;
      setSetupData(data);
      setSetupUser(user);
    },
    onError: () => toast.error('Error al iniciar setup'),
  });

  const disableMut = useMutation({
    mutationFn: (userId: string) => adminService.disable2FA(userId),
    onSuccess: () => {
      toast.success('2FA desactivado');
      qc.invalidateQueries({ queryKey: ['admin-2fa-users'] });
      qc.invalidateQueries({ queryKey: ['admin-2fa-stats'] });
      setDisableUser(null);
    },
    onError: () => toast.error('Error al desactivar 2FA'),
  });

  const stats = statsQ.data;
  const users = usersQ.data ?? [];
  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">

      {/* Title */}
      <div className="flex items-center gap-3">
        <Fingerprint className="h-6 w-6 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Autenticación en Dos Factores</h1>
          <p className="text-sm text-zinc-400">Gestiona el estado 2FA/TOTP de todos los usuarios</p>
        </div>
        <button
          onClick={() => {
            qc.invalidateQueries({ queryKey: ['admin-2fa-users'] });
            qc.invalidateQueries({ queryKey: ['admin-2fa-stats'] });
          }}
          className="ml-auto text-zinc-400 hover:text-white transition"
          title="Refrescar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total usuarios', value: stats.total,       color: 'text-zinc-200',   icon: <Fingerprint className="h-5 w-5 text-zinc-400" /> },
            { label: '2FA Activo',     value: stats.enabled,     color: 'text-green-400',  icon: <ShieldCheck  className="h-5 w-5 text-green-400" /> },
            { label: 'Sin 2FA',        value: stats.disabled,    color: 'text-red-400',    icon: <UserX        className="h-5 w-5 text-red-400"   /> },
            { label: 'Adopción',       value: `${stats.adoptionPct}%`, color: 'text-indigo-400', icon: <ShieldCheck className="h-5 w-5 text-indigo-400" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="rounded-2xl bg-zinc-800/60 border border-zinc-700/50 p-4 flex items-center gap-3">
              {icon}
              <div>
                <p className="text-xs text-zinc-500">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Buscar por email o nombre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-500 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {usersQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Usuario', 'Rol', 'Estado 2FA', 'Último 2FA', 'Último Login', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{u.name ?? '—'}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-700/60 px-2 py-0.5 text-xs text-zinc-300 font-mono">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge enabled={u.totp_enabled} verified={u.totp_verified} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{fmtDate(u.last_2fa_at)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{fmtDate(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setupMut.mutate(u.id)}
                        disabled={setupMut.isPending && setupMut.variables === u.id}
                        title="Configurar / regenerar QR"
                        className="rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-600/40 text-indigo-300 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1"
                      >
                        {setupMut.isPending && setupMut.variables === u.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <QrCode className="h-3 w-3" />}
                        Setup QR
                      </button>
                      {u.totp_enabled && (
                        <button
                          onClick={() => setDisableUser(u)}
                          title="Desactivar 2FA"
                          className="rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 text-red-400 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1"
                        >
                          <ShieldOff className="h-3 w-3" /> Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    {search ? 'No hay resultados para tu búsqueda.' : 'No hay usuarios.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Setup Modal */}
      {setupUser && setupData && (
        <SetupModal
          user={setupUser}
          setup={setupData}
          onClose={() => { setSetupUser(null); setSetupData(null); }}
          onVerified={() => { setSetupUser(null); setSetupData(null); }}
        />
      )}

      {/* Disable Confirm Modal */}
      {disableUser && (
        <ConfirmDisableModal
          user={disableUser}
          onClose={() => setDisableUser(null)}
          onConfirm={() => disableMut.mutate(disableUser.id)}
          isPending={disableMut.isPending}
        />
      )}
    </div>
  );
}
