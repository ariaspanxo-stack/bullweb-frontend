import { useState } from 'react';
import { Loader2, KeyRound, ShieldCheck, ShieldOff, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService from '@/services/superadmin/superadminService';
import { Button } from '@/components/ui/superadmin/button';
import { PageHeader } from '@/components/ui/superadmin/pageHeader';

const SA_API = import.meta.env.VITE_API_URL || 'http://localhost:4200/api';

// ── Validación inline de las 3 reglas (min 8 + 1 mayúscula + 1 número) ────────
function validarNuevaClave(pw: string): string | null {
  if (pw.length < 8)    return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(pw)) return 'Agrega una mayúscula';
  if (!/[0-9]/.test(pw)) return 'Agrega un número';
  return null;
}

// ── Sección Cambiar contraseña (POST /api/auth/change-password) ────────────────
function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError,      setFieldError]      = useState<string | null>(null);
  const [justUpdated,     setJustUpdated]     = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const errRegla = validarNuevaClave(newPassword);
    if (errRegla) { setFieldError(errRegla); return; }
    if (newPassword !== confirmPassword) {
      setFieldError('Las contraseñas nuevas no coinciden');
      return;
    }

    setJustUpdated(false);
    setBusy(true);
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch(`${SA_API}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
      }
      toast.success('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setJustUpdated(true);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al cambiar la contraseña');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-white/5 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Cambiar contraseña</h2>
          <p className="text-xs text-gray-500">Mínimo 8 caracteres, una mayúscula y un número</p>
        </div>
      </div>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Contraseña actual</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
          />
          {newPassword && validarNuevaClave(newPassword) && (
            <p className="text-xs text-amber-400 mt-1">{validarNuevaClave(newPassword)}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Confirmar nueva contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-amber-400 mt-1">Las contraseñas nuevas no coinciden</p>
          )}
        </div>

        {fieldError && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400 text-xs">
            {fieldError}
          </div>
        )}

        <Button variant="primary" type="submit" disabled={busy || !currentPassword || !newPassword || !confirmPassword}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {busy ? 'Guardando...' : 'Actualizar contraseña'}
        </Button>

        {justUpdated && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-emerald-400 text-xs">
            Tu sesión actual sigue activa — al cerrar sesión, ingresa con tu nueva clave.
          </div>
        )}
      </div>
    </form>
  );
}

export default function SuperAdminConfig() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={UserCircle}
        title="Mi cuenta"
        sub="Seguridad de tu acceso al panel Super Admin"
      />

      {/* ── Sección Cambiar contraseña ────────────────────────────────────────── */}
      <ChangePasswordSection />

      {/* ── Sección 2FA ─────────────────────────────────────────────────────── */}
      <TwoFASection />
    </div>
  );
}

// ── Sección de configuración 2FA ─────────────────────────────────────────────

function TwoFASection() {
  const [qrUrl,    setQrUrl]    = useState<string | null>(null);
  const [code,     setCode]     = useState('');
  const [enabled,  setEnabled]  = useState<boolean | null>(null);
  const [busy,     setBusy]     = useState(false);

  // Leer estado actual de 2FA del perfil superadmin
  // (lo deducimos del localStorage token o hacemos un fetch simple)
  async function handleSetup() {
    setBusy(true);
    try {
      const result = await superadminService.setup2FA();
      setQrUrl(result.qrCodeUrl);
      toast.success('Escanea el código QR con Google Authenticator o Authy');
    } catch {
      toast.error('Error al generar 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      await superadminService.verify2FA(code);
      setEnabled(true);
      setQrUrl(null);
      setCode('');
      toast.success('2FA activado correctamente');
    } catch {
      toast.error('Código inválido');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!confirm('¿Deshabilitar 2FA? Esto reduce la seguridad del panel.')) return;
    setBusy(true);
    try {
      await superadminService.disable2FA();
      setEnabled(false);
      setQrUrl(null);
      toast.success('2FA deshabilitado');
    } catch {
      toast.error('Error al deshabilitar 2FA');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 bg-gray-900/60 border border-white/5 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Autenticación de dos factores (2FA)</h2>
          <p className="text-xs text-gray-500">TOTP compatible con Google Authenticator / Authy</p>
        </div>
        {enabled === true && (
          <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20 px-2 py-0.5 rounded-full">Activo</span>
        )}
        {enabled === false && (
          <span className="ml-auto text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Inactivo</span>
        )}
      </div>

      {!qrUrl && enabled !== true && (
        <Button variant="primary" onClick={handleSetup} loading={busy}>
          <ShieldCheck className="w-4 h-4" />
          {busy ? 'Generando...' : 'Configurar 2FA'}
        </Button>
      )}

      {qrUrl && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-400 text-center">
            Escanea este código QR con tu app de autenticación y luego ingresa el código de 6 dígitos para confirmar.
          </p>
          <img src={qrUrl} alt="QR 2FA" className="w-48 h-48 bg-white p-2 rounded-lg" />
          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="flex-1 bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-gray-200 text-center text-lg tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
            <Button variant="primary" onClick={handleVerify} disabled={busy || code.length !== 6}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activar'}
            </Button>
          </div>
        </div>
      )}

      {enabled === true && (
        <Button
          variant="danger"
          onClick={handleDisable}
          loading={busy}
        >
          <ShieldOff className="w-4 h-4" />
          Deshabilitar 2FA
        </Button>
      )}
    </div>
  );
}
