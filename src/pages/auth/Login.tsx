import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, AlertCircle, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import authService from '@/services/authService';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

// ============================================================================
// VALIDACIÓN
// ============================================================================

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================================
// COMPONENTE LOGIN
// ============================================================================

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: loginStore } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  // ── Turno expirado ──
  const sessionExpired =
    (location.state as any)?.sessionExpired ||
    localStorage.getItem('bw_session_expired') === '1';

  // Limpiar el flag para que no aparezca en cargas futuras
  if (sessionExpired) localStorage.removeItem('bw_session_expired');

  // ── 2FA state ──
  const [step,      setStep]      = useState<'credentials' | '2fa'>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [code,      setCode]      = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setApiError('');

      const result = await authService.login(data);

      // Detectar flujo 2FA
      if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
        setTempToken(result.tempToken);
        setStep('2fa');
        return;
      }

      // Guardar en el store
      loginStore(result.token, result.user);

      // Mostrar notificación de éxito
      toast.success(`¡Bienvenido ${result.user.name}!`);

      // Redirigir a la página desde donde vino o al restaurant
      const from = (location.state as any)?.from?.pathname || '/restaurant';
      navigate(from, { replace: true });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al iniciar sesión. Por favor, intenta de nuevo.';
      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setIsLoading(true);
    try {
      const result = await authService.completeTwoFactorLogin(tempToken, code);
      loginStore(result.token, result.user);
      toast.success(`¡Bienvenido ${result.user.name}!`);
      const from = (location.state as any)?.from?.pathname || '/restaurant';
      navigate(from, { replace: true });
    } catch {
      toast.error('Código inválido o sesión expirada');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* ── TURNO FINALIZADO ── */}
          {step === 'credentials' && sessionExpired && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5">⏰</span>
              <div>
                <p className="font-semibold text-amber-800">Turno finalizado</p>
                <p className="text-sm text-amber-600 mt-0.5">
                  Tu sesión de 8 horas expiró. Inicia sesión para comenzar un nuevo turno.
                </p>
              </div>
            </div>
          )}

          {/* ── PASO 2FA ── */}
          {step === '2fa' ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center ring-4 ring-orange-100">
                  <Shield className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-gray-800">Verificación en 2 pasos</h2>
                <p className="text-sm text-gray-400">Ingresa el código de tu app autenticadora</p>
              </div>

              <form onSubmit={handle2FASubmit} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().trim())}
                  placeholder="000000"
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] py-5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:border-orange-400 focus:bg-white focus:outline-none transition-colors"
                />

                <button
                  type="submit"
                  disabled={code.length < 6 || isLoading}
                  className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-base rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Verificar
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setTempToken(''); setCode(''); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
                >
                  ← Volver al inicio de sesión
                </button>
              </form>

              <p className="text-xs text-center text-gray-300">
                ¿Sin acceso a tu app? Usa uno de tus códigos de recuperación
              </p>
            </div>

          ) : (
            /* ── PASO CREDENCIALES (original) ── */
            <>
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img
                  src="/logo-bullweb.png"
                  alt="BullWeb Chile"
                  className="w-24 h-24 object-contain mx-auto"
                />
              </div>

              {/* Mensaje de error global */}
              {apiError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{apiError}</p>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="turestaurante@bullwebchile.com"
                      className={`
                        w-full pl-10 pr-4 py-3 rounded-lg border
                        ${errors.email ? 'border-red-500' : 'border-gray-300'}
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        disabled:bg-gray-50 disabled:opacity-50
                      `}
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                  <p className="mt-1 text-xs text-blue-500 flex items-center gap-1">
                    <span>💡</span> Usa tu email <span className="font-mono font-medium">@bullwebchile.com</span> para ingresar
                  </p>
                </div>

                {/* Password */}
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('password')}
                      type="password"
                      placeholder="••••••••"
                      className={`
                        w-full pl-10 pr-4 py-3 rounded-lg border
                        ${errors.password ? 'border-red-500' : 'border-gray-300'}
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        disabled:bg-gray-50 disabled:opacity-50
                      `}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Recordar y olvidó contraseña */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Recordarme</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* Botón de submit */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>

              {/* Divider */}
              <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Sistema de gestión</span>
                </div>
              </div>

              {/* Info adicional */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">Bullweb POS v3.0 - Sistema de Punto de Venta</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-600">
          ¿Necesitas ayuda?{' '}
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Contactar soporte
          </button>
        </p>
      </div>
    </div>
  );
}
