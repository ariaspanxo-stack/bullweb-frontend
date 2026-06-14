import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import api from '@/services/api';

export function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Error al enviar el email. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="text-6xl mb-4">📧</div>
        <h2 className="text-white font-black text-xl mb-3">Revisa tu email</h2>
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          Si el email está registrado, recibirás las instrucciones en los próximos minutos.
        </p>
        <Link
          to="/login"
          className="text-orange-400 hover:text-orange-300 text-sm font-bold transition-colors"
        >
          ← Volver al login
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">

        <Link
          to="/login"
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al login
        </Link>

        <div className="mb-8">
          <h1 className="text-white font-black text-2xl mb-1">¿Olvidaste tu contraseña?</h1>
          <p className="text-white/40 text-sm">
            Ingresa tu email y te enviamos un link para recuperarla.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Mail className="w-4 h-4 text-white/30" />
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              'Enviar instrucciones →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
