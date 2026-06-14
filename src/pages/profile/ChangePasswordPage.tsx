import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import api from '@/services/api';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, new: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="font-black text-xl text-gray-900 mb-2">¡Contraseña actualizada!</h2>
        <p className="text-gray-500 text-sm">Redirigiendo...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-orange-100 p-2 rounded-xl">
          <Lock className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="font-black text-xl text-gray-900">Cambiar contraseña</h1>
          <p className="text-gray-500 text-sm">Actualiza tu contraseña de acceso</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={show.current ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={set('currentPassword')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 pr-12"
              />
              <button
                type="button"
                onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={show.new ? 'text' : 'password'}
                value={form.newPassword}
                onChange={set('newPassword')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 pr-12"
              />
              <button
                type="button"
                onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {show.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar nueva contraseña
            </label>
            <input
              type={show.new ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
