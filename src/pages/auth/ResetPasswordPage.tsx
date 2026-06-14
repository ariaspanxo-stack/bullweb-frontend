import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/services/api';

export function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') ?? '';

  const [valid,    setValid]    = useState<boolean | null>(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    api.get(`/auth/reset-password/${token}/verify`)
      .then((r: any) => {
        const data = r?.data ?? r;
        setValid(true);
        setUserName(data?.name ?? data?.data?.name ?? '');
      })
      .catch(() => setValid(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6)  { setError('Mínimo 6 caracteres'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err?.message ?? 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (valid === null) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 flex items-center justify-center">
      <div className="flex items-center gap-3 text-white/40">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Verificando...</span>
      </div>
    </div>
  );

  if (!valid) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-white font-black text-xl mb-2">Link inválido o expirado</h2>
        <p className="text-white/50 text-sm mb-8">El link expira en 1 hora. Solicita uno nuevo.</p>
        <Link
          to="/forgot-password"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors inline-block"
        >
          Solicitar nuevo link
        </Link>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-white font-black text-xl mb-2">¡Contraseña actualizada!</h2>
        <p className="text-white/50 text-sm">Redirigiendo al login...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">

        <div className="mb-8">
          <h1 className="text-white font-black text-2xl mb-1">Nueva contraseña</h1>
          {userName && (
            <p className="text-white/40 text-sm">Hola {userName}, elige tu nueva contraseña.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50 pr-12"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute right-3 top-3 text-white/40 hover:text-white transition-colors"
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmar contraseña"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              'Guardar nueva contraseña →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
