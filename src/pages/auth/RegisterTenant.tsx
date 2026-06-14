import { useState }                        from 'react';
import { useNavigate, Link }               from 'react-router-dom';
import { useForm }                         from 'react-hook-form';
import { zodResolver }                     from '@hookform/resolvers/zod';
import { z }                               from 'zod';
import {
  Zap, User, Mail, Phone, Lock, Eye, EyeOff,
  ArrowRight, Loader2, Check, AlertCircle, Copy, CheckCircle2,
} from 'lucide-react';
import toast                               from 'react-hot-toast';
import { useAuthStore }                    from '@/store/authStore';
import api                                 from '@/services/api';

// ============================================================================
// VALIDACIÓN (espejo del schema Zod del backend)
// ============================================================================

const registerTenantSchema = z.object({
  restaurantName: z
    .string().min(2, 'El nombre del restaurante es requerido').max(100).trim(),
  ownerName: z
    .string().min(2, 'Tu nombre es requerido').trim(),
  email: z
    .string().min(1, 'El email es requerido').email('Email inválido').toLowerCase().trim(),
  phone: z
    .string().optional(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path:    ['confirmPassword'],
});

type RegisterTenantForm = z.infer<typeof registerTenantSchema>;

// ============================================================================
// COMPONENTE
// ============================================================================

export default function RegisterTenant() {
  const navigate = useNavigate();
  const { login: loginStore } = useAuthStore();

  const [isLoading,      setIsLoading]      = useState(false);
  const [apiError,       setApiError]       = useState('');
  const [showPass,       setShowPass]       = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [credentials,    setCredentials]    = useState<{ loginEmail: string; restaurantName: string } | null>(null);
  const [copiedEmail,    setCopiedEmail]    = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterTenantForm>({
    resolver: zodResolver(registerTenantSchema),
  });

  const onSubmit = async (data: RegisterTenantForm) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await api.post('/auth/register-tenant', {
        ...data,
        email: data.email.toLowerCase().trim(),
      });
      const { token, user, credentials: creds } = res.data.data ?? res.data ?? res;
      // Guardar en el store y en localStorage (mismo patrón que Login)
      loginStore(token, user);
      localStorage.setItem('bullweb_token', token);
      // Mostrar modal con credenciales de acceso antes de redirigir
      if (creds?.loginEmail) {
        setCredentials({ loginEmail: creds.loginEmail, restaurantName: creds.restaurantName ?? '' });
      } else {
        toast.success(`¡Bienvenido a BullWeb Chile, ${user.name}! 🎉`);
        navigate('/onboarding', { replace: true });
      }
    } catch (err: any) {
      const status = err.status ?? err.response?.status;
      const msg    =
        err.message                  ??
        err.response?.data?.message  ??
        err.response?.data?.error    ??
        'Error al crear la cuenta';

      if (status === 409 || msg.toLowerCase().includes('ya está registrado') || msg.toLowerCase().includes('ya existe')) {
        setApiError('Este email ya está registrado. ¿Ya tienes cuenta? Inicia sesión.');
        toast.error('Email ya registrado — inicia sesión');
      } else {
        setApiError(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Campos del formulario ─────────────────────────────────────────────────

  const handleCopyEmail = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(credentials.loginEmail).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  };

  const handleGoOnboarding = () => {
    navigate('/onboarding', { replace: true });
  };

  // Modal de credenciales ────────────────────────────────────────────────────
  if (credentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E2A4A] to-[#0F172A] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl shadow-black/40 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-1">¡Cuenta creada!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Guarda tu correo de acceso — lo necesitarás para iniciar sesión.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tu correo de acceso</p>
            <div className="flex items-center justify-between gap-2 bg-white border border-orange-200 rounded-xl px-4 py-3">
              <span className="text-orange-600 font-mono font-semibold text-sm break-all">{credentials.loginEmail}</span>
              <button
                onClick={handleCopyEmail}
                className="flex-shrink-0 text-slate-400 hover:text-orange-500 transition-colors"
                title="Copiar"
              >
                {copiedEmail ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Usa este correo junto con la contraseña que elegiste para iniciar sesión.
            </p>
          </div>

          <button
            onClick={handleGoOnboarding}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/25"
          >
            Continuar a mi panel
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E2A4A] to-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

        {/* ── IZQUIERDA — Branding ─────────────────────────────────────────── */}
        <div className="hidden lg:block text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-black text-2xl leading-none tracking-tight">BULLWEB</p>
              <p className="text-orange-400 text-xs font-bold tracking-widest">CHILE · POS 3.0</p>
            </div>
          </div>

          <h1 className="text-4xl font-black leading-tight mb-4">
            7 días gratis,
            <br />
            <span className="text-orange-400">sin tarjeta</span>
          </h1>
          <p className="text-white/60 text-lg mb-8 leading-relaxed">
            Únete a los restaurantes chilenos
            que ya gestionan su negocio con BullWeb.
          </p>

          {/* Beneficios */}
          {[
            'POS + KDS + Delivery incluidos',
            'Configuración en menos de 2 horas',
            'Soporte en español 24/7',
            'Cancela cuando quieras',
          ].map(benefit => (
            <div key={benefit} className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-orange-400" />
              </div>
              <span className="text-white/80 text-sm">{benefit}</span>
            </div>
          ))}

          <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Sin compromiso</p>
            <p className="text-white/70 text-sm">
              Sin pago inicial. Acceso completo por 7 días.
              Cancela en cualquier momento desde el panel.
            </p>
          </div>
        </div>

        {/* ── DERECHA — Formulario ─────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-black/40">
          {/* Header móvil */}
          <div className="flex items-center gap-2 lg:hidden mb-6">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-slate-800">BULLWEB CHILE</span>
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-1">Crear cuenta gratis</h2>
          <p className="text-slate-400 text-sm mb-6">Sin tarjeta de crédito · 7 días gratis</p>

          {/* Error global */}
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {apiError.includes('Inicia sesión') ? (
                  <>
                    Este email ya está registrado.{' '}
                    <a href="/login" className="underline font-semibold hover:text-red-800">
                      Inicia sesión aquí
                    </a>
                  </>
                ) : (
                  apiError
                )}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Nombre del restaurante */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Nombre del restaurante <span className="text-orange-500">*</span>
              </label>
              <input
                {...register('restaurantName')}
                placeholder="Ej: Restaurante El Rincón"
                autoComplete="organization"
                className={`w-full border rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 transition-colors ${
                  errors.restaurantName
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-slate-200 focus:border-orange-400 focus:ring-orange-100'
                }`}
              />
              {errors.restaurantName && (
                <p className="text-red-500 text-xs mt-1">{errors.restaurantName.message}</p>
              )}
            </div>

            {/* Tu nombre */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Tu nombre <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('ownerName')}
                  placeholder="Nombre completo"
                  autoComplete="name"
                  className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 transition-colors ${
                    errors.ownerName
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-orange-400 focus:ring-orange-100'
                  }`}
                />
              </div>
              {errors.ownerName && (
                <p className="text-red-500 text-xs mt-1">{errors.ownerName.message}</p>
              )}
            </div>

            {/* Email + Teléfono en grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className={`w-full border rounded-xl pl-10 pr-3 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 transition-colors ${
                      errors.email
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-orange-400 focus:ring-orange-100'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register('phone')}
                    placeholder="+56 9 1234 5678"
                    autoComplete="tel"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Contraseña <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className={`w-full border rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 transition-colors ${
                    errors.password
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-orange-400 focus:ring-orange-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Confirmar contraseña <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  className={`w-full border rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 transition-colors ${
                    errors.confirmPassword
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-orange-400 focus:ring-orange-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 text-base mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta gratis
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Links */}
            <p className="text-center text-xs text-slate-400 pt-1">
              Al registrarte aceptas nuestros{' '}
              <span className="text-slate-500">términos de servicio</span>
            </p>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5 pt-5 border-t border-slate-100">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
