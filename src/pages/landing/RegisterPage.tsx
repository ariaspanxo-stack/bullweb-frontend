import { useState }        from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Copy }     from 'lucide-react';
import api                 from '@/services/api';

// ── Datos estáticos ────────────────────────────────────────────────────────

const PRICES: Record<string, number> = {
  STARTER: 29_990,
  PRO:     59_990,
  ENTERPRISE: 99_990,
};

const BANK_INFO = {
  banco:  'Banco de Chile',
  tipo:   'Cuenta Corriente',
  numero: '123456789',
  rut:    '12.345.678-9',
  nombre: 'Francisco Arias',
  email:  'pagos@bullwebchile.com',
};

// ── Componente ─────────────────────────────────────────────────────────────

export function RegisterPage() {
  const [params]  = useSearchParams();
  const [step,    setStep]    = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);
  const [form, setForm] = useState({
    restaurantName: '',
    adminName:      '',
    adminEmail:     '',
    adminPhone:     '',
    plan:           params.get('plan') ?? 'PRO',
  });

  const price = PRICES[form.plan] ?? PRICES.PRO;

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/onboarding/register', form);
      setStep('success');
    } catch (err: any) {
      const msg = err.message ?? err.response?.data?.error ?? 'Error al registrar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyAccount = () => {
    navigator.clipboard.writeText(BANK_INFO.numero);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Pantalla de éxito ─────────────────────────────────────────────────────

  if (step === 'success') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 rounded-2xl border border-white/10 p-8">

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-white font-black text-xl">¡Registro exitoso!</h2>
          <p className="text-white/50 text-sm mt-1">
            Revisa tu email — te enviamos las credenciales de acceso
          </p>
        </div>

        {/* Datos de transferencia */}
        <div className="bg-[#0f172a] rounded-xl p-4 mb-4 border border-white/10">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">
            Datos para transferencia
          </p>
          {[
            ['Banco',  BANK_INFO.banco],
            ['Tipo',   BANK_INFO.tipo],
            ['RUT',    BANK_INFO.rut],
            ['Nombre', BANK_INFO.nombre],
            ['Monto',  `$${price.toLocaleString('es-CL')} CLP`],
            ['Asunto', form.restaurantName],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-white/5 text-sm">
              <span className="text-white/40">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}

          {/* Número de cuenta con copy */}
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-white/40">Número</span>
            <div className="flex items-center gap-2">
              <span className="text-orange-400 font-mono font-bold">{BANK_INFO.numero}</span>
              <button onClick={copyAccount} aria-label="Copiar número de cuenta">
                {copied
                  ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                  : <Copy className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                }
              </button>
            </div>
          </div>
        </div>

        <p className="text-white/40 text-xs text-center">
          Envía el comprobante a{' '}
          <span className="text-orange-400">{BANK_INFO.email}</span>
          {' '}para activar tu cuenta.
        </p>

        <a
          href="https://app.bullwebchile.com"
          className="block w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-center transition-colors"
        >
          Ir a mi sistema →
        </a>
      </div>
    </div>
  );

  // ── Formulario ────────────────────────────────────────────────────────────

  const FIELDS = [
    { label: 'Nombre del restaurante', field: 'restaurantName', placeholder: 'Ej: Restaurante Don Juan',  type: 'text' },
    { label: 'Tu nombre completo',     field: 'adminName',      placeholder: 'Juan González',             type: 'text' },
    { label: 'Tu email',               field: 'adminEmail',     placeholder: 'juan@restaurante.cl',       type: 'email' },
    { label: 'Tu teléfono',            field: 'adminPhone',     placeholder: '+56 9 1234 5678',           type: 'tel' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center font-black text-sm mx-auto mb-3">
            BW
          </div>
          <h1 className="text-white font-black text-xl">Crear cuenta</h1>
          <p className="text-white/40 text-sm">7 días gratis · Sin tarjeta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">

          {/* Plan selector */}
          <div>
            <label className="text-white/60 text-xs font-bold block mb-1.5">Plan seleccionado</label>
            <select
              value={form.plan}
              onChange={set('plan')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
            >
              <option value="STARTER">Starter    — $29.990/mes</option>
              <option value="PRO">Pro        — $59.990/mes</option>
              <option value="ENTERPRISE">Enterprise — $99.990/mes</option>
            </select>
          </div>

          {/* Campos */}
          {FIELDS.map(input => (
            <div key={input.field}>
              <label className="text-white/60 text-xs font-bold block mb-1.5">{input.label}</label>
              <input
                type={input.type}
                value={(form as Record<string, string>)[input.field]}
                onChange={set(input.field)}
                placeholder={input.placeholder}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50"
              />
            </div>
          ))}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Registrando...' : 'Crear mi cuenta gratis →'}
          </button>

          <p className="text-white/30 text-xs text-center">
            Al registrarte aceptas nuestros términos de servicio
          </p>
        </form>

        <p className="text-center text-white/30 text-xs mt-4">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
