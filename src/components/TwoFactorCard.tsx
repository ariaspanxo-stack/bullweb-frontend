import { useState }     from 'react';
import { useAuthStore } from '@/store/authStore';
import authService      from '@/services/authService';
import toast            from 'react-hot-toast';
import {
  Shield, ShieldCheck, ShieldOff,
  Copy, Eye, EyeOff, Loader2,
  CheckCircle, KeyRound,
} from 'lucide-react';

type Step =
  | 'idle'
  | 'setup_qr'
  | 'setup_verify'
  | 'setup_codes'
  | 'disable_confirm';

export function TwoFactorCard() {
  const { user, updateUser } = useAuthStore();
  const isActive = user?.totp_enabled ?? false;

  const [step,          setStep]         = useState<Step>('idle');
  const [qrDataUrl,     setQrDataUrl]    = useState('');
  const [secret,        setSecret]       = useState('');
  const [showSecret,    setShowSecret]   = useState(false);
  const [inputCode,     setInputCode]    = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading,       setLoading]      = useState(false);

  const reset = () => {
    setStep('idle');
    setInputCode('');
    setSecret('');
    setQrDataUrl('');
    setRecoveryCodes([]);
    setShowSecret(false);
  };

  // ── Setup ─────────────────────────────────────────────────────────────────
  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await authService.setup2FA();
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStep('setup_qr');
    } catch {
      toast.error('Error al iniciar configuración');
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmar ──────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (inputCode.length < 6) return;
    setLoading(true);
    try {
      const result = await authService.confirm2FA(inputCode);
      if (!result.success) {
        toast.error('Código incorrecto');
        setInputCode('');
        return;
      }
      setRecoveryCodes(result.recoveryCodes ?? []);
      updateUser({ ...user!, totp_enabled: true, totp_verified: true });
      setStep('setup_codes');
      toast.success('2FA activado correctamente ✓');
    } catch {
      toast.error('Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  // ── Disable ────────────────────────────────────────────────────────────────
  const handleDisable = async () => {
    if (inputCode.length < 6) return;
    setLoading(true);
    try {
      await authService.disable2FA(inputCode);
      updateUser({ ...user!, totp_enabled: false, totp_verified: false });
      reset();
      toast.success('2FA desactivado');
    } catch {
      toast.error('Código incorrecto');
      setInputCode('');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

      {/* Header — siempre visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
            <ShieldCheck className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Autenticación en 2 pasos</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {isActive
                ? 'Tu cuenta tiene una capa extra de seguridad'
                : 'Protege tu cuenta con un código TOTP'
              }
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {isActive ? '✓ Activa' : 'Inactiva'}
        </span>
      </div>

      {/* ── IDLE — sin 2FA ── */}
      {step === 'idle' && !isActive && (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Activar verificación en 2 pasos
        </button>
      )}

      {/* ── SETUP QR ── */}
      {step === 'setup_qr' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Escanea con <strong>Google Authenticator</strong> o <strong>Authy</strong>:
          </p>

          <div className="flex justify-center">
            <img
              src={qrDataUrl}
              alt="QR 2FA"
              className="w-44 h-44 rounded-2xl p-2 bg-white border-2 border-gray-100"
            />
          </div>

          {/* Secret con blur */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <p className="text-xs text-gray-400">O ingresa manualmente:</p>
            <div className="flex items-center gap-2">
              <code className={`flex-1 text-xs font-mono text-gray-600 break-all leading-relaxed transition-all ${!showSecret ? 'blur-sm select-none' : ''}`}>
                {secret}
              </code>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setShowSecret(p => !p)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                  {showSecret
                    ? <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                    : <Eye    className="w-3.5 h-3.5 text-gray-400" />
                  }
                </button>
                <button onClick={() => copy(secret, 'Secret copiado')} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          <button onClick={() => setStep('setup_verify')} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
            Ya escaneé el código →
          </button>
          <button onClick={reset} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
            Cancelar
          </button>
        </div>
      )}

      {/* ── SETUP VERIFY ── */}
      {step === 'setup_verify' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Ingresa el código de 6 dígitos que muestra la app:</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={inputCode}
            onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoFocus
            className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-orange-400 focus:bg-white focus:outline-none transition-colors"
          />
          <button
            onClick={handleConfirm}
            disabled={inputCode.length < 6 || loading}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirmar y activar
          </button>
          <button onClick={() => setStep('setup_qr')} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
            ← Volver al QR
          </button>
        </div>
      )}

      {/* ── RECOVERY CODES ── */}
      {step === 'setup_codes' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-bold text-amber-800">⚠ Guarda estos códigos de recuperación</p>
            <p className="text-xs text-amber-700 mt-1">
              Son de un solo uso. Si pierdes tu dispositivo, los necesitarás para acceder a tu cuenta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((code, i) => (
              <button
                key={i}
                onClick={() => copy(code, 'Código copiado')}
                className="bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 flex items-center justify-between gap-2 transition-colors group"
              >
                <code className="text-xs font-mono text-gray-700">{code}</code>
                <Copy className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
              </button>
            ))}
          </div>

          <button
            onClick={() => copy(recoveryCodes.join('\n'), 'Todos los códigos copiados')}
            className="w-full py-2.5 border-2 border-dashed border-gray-200 hover:border-gray-400 text-gray-500 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Copy className="w-4 h-4" />
            Copiar todos
          </button>

          <button onClick={reset} className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
            Listo
          </button>
        </div>
      )}

      {/* ── IDLE — con 2FA activo ── */}
      {step === 'idle' && isActive && (
        <div className="space-y-3">
          {user?.last_2fa_at && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
              <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Último uso:{' '}
                {new Date(user.last_2fa_at).toLocaleDateString('es-CL', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          )}
          <button
            onClick={() => setStep('disable_confirm')}
            className="w-full py-3 border-2 border-red-200 text-red-500 font-semibold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <ShieldOff className="w-4 h-4" />
            Desactivar 2FA
          </button>
        </div>
      )}

      {/* ── DISABLE CONFIRM ── */}
      {step === 'disable_confirm' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-bold text-red-800">Confirma para desactivar</p>
            <p className="text-xs text-red-600 mt-1">Ingresa el código actual de tu app autenticadora.</p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={11}
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase().trim())}
            placeholder="000000"
            autoFocus
            className="w-full text-center text-2xl font-mono tracking-[0.4em] py-4 border-2 border-red-200 rounded-xl focus:border-red-400 focus:outline-none transition-colors"
          />
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleDisable}
              disabled={inputCode.length < 6 || loading}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desactivar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
