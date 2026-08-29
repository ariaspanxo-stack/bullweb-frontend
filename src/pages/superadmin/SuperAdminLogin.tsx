import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4200/api';

export default function SuperAdminLogin() {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [totpCode,   setTotpCode]   = useState('');
  const [step,       setStep]       = useState<'credentials' | 'totp'>('credentials');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body: Record<string, string> = { email, password };
      if (step === 'totp' && totpCode) body.totpCode = totpCode;

      const res = await fetch(`${API_BASE_URL}/superadmin/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const responseBody = await res.json();

      if (!res.ok) {
        setError(responseBody?.error || responseBody?.message || 'Credenciales incorrectas');
        return;
      }

      const data = responseBody?.data ?? responseBody;

      // Servidor pide código 2FA
      if (data?.requiresTotp === true) {
        setStep('totp');
        setLoading(false);
        return;
      }

      const token = data?.token;
      const user  = data?.user;

      if (!token || !user) {
        setError('Respuesta inesperada del servidor');
        return;
      }

      if (user.role?.name !== 'Super Admin') {
        setError('Acceso denegado: se requiere rol Super Admin');
        return;
      }

      localStorage.setItem('superadmin_token', token);
      navigate('/superadmin', { replace: true });

    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4" data-superadmin="true">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/images/bullweb-logo.png"
            alt="BullWeb Chile"
            className="h-14 w-14 object-contain"
          />
          <div className="text-white">
            <p className="font-bold text-lg leading-tight">BullWeb</p>
            <p className="text-brand-400 text-xs">Super Admin</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-8">

          {step === 'totp' ? (
            /* ── Paso 2: código TOTP ────────────────────────────────── */
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-brand-400" />
                </div>
                <h1 className="text-white text-xl font-bold">Verificación 2FA</h1>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Ingresa el código de 6 dígitos de tu app de autenticación
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Código 2FA</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    placeholder="123456"
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-gray-200 text-center text-2xl tabular-nums tracking-[0.5em] placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  {loading ? 'Verificando...' : 'Verificar'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }}
                  className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Volver
                </button>
              </form>
            </>
          ) : (
            /* ── Paso 1: email + contraseña ─────────────────────────── */
            <>
              <h1 className="text-white text-xl font-bold mb-6 text-center">
                Acceso restringido
              </h1>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                    placeholder="admin@bullweb.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  {loading ? 'Verificando...' : 'Ingresar'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Panel de administración interna · BullWeb
        </p>
      </div>
    </div>
  );
}

