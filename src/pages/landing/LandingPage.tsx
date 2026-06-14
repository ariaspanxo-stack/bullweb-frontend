import { useState }              from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore }          from '@/store/authStore';
import {
  Check, ChevronRight, Smartphone, BarChart3,
  UtensilsCrossed, QrCode, Shield, Headphones,
} from 'lucide-react';

// ── Datos ─────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:      'STARTER',
    name:    'Starter',
    price:   29_990,
    popular: false,
    features: [
      'Restaurant POS completo',
      'Hasta 30 mesas',
      'Hasta 3 usuarios',
      'KDS cocina',
      'Reportes básicos',
      'Soporte por email',
    ],
  },
  {
    id:      'PRO',
    name:    'Pro',
    price:   59_990,
    popular: true,
    features: [
      'Todo lo de Starter',
      'Mesas ilimitadas',
      'Usuarios ilimitados',
      'App Mesero móvil',
      'Carta QR para clientes',
      'Reportes avanzados',
      'Campañas marketing',
      'Soporte prioritario',
    ],
  },
  {
    id:      'ENTERPRISE',
    name:    'Enterprise',
    price:   99_990,
    popular: false,
    features: [
      'Todo lo de Pro',
      'Múltiples locales',
      'API acceso',
      'Onboarding dedicado',
      'SLA garantizado',
      'Soporte 24/7',
    ],
  },
];

const FEATURES = [
  { icon: UtensilsCrossed, title: 'Restaurant POS',  desc: 'Gestión de mesas, órdenes y pagos en tiempo real.',       color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { icon: Smartphone,      title: 'App Mesero',       desc: 'Tu equipo toma pedidos desde el celular.',               color: 'text-sky-400',    bg: 'bg-sky-500/10' },
  { icon: QrCode,          title: 'Carta QR',         desc: 'Tus clientes ven el menú desde su teléfono.',            color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: BarChart3,       title: 'Reportes',         desc: 'Ventas, productos y rendimiento en tiempo real.',        color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { icon: Shield,          title: 'Seguro',           desc: 'Tus datos 100% protegidos y separados.',                 color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { icon: Headphones,      title: 'Soporte',          desc: 'Te acompañamos en cada paso.',                           color: 'text-pink-400',   bg: 'bg-pink-500/10' },
];

// ── Componente ────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate                    = useNavigate();
  const [selected, setSelected]     = useState('PRO');
  const isAuthenticated             = useAuthStore(s => s.isAuthenticated);

  // Si ya tiene sesión activa → va directo al sistema
  if (isAuthenticated) return <Navigate to="/restaurant" replace />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src="/images/bullweb-logo.png"
            alt="BullWeb Chile"
            className="h-12 w-12 object-contain"
          />
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          Iniciar sesión →
        </button>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-400 text-xs font-bold mb-6">
          🇨🇱 Sistema POS 100% chileno
        </div>
        <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
          El sistema POS que tu
          <span className="text-orange-400"> restaurante </span>
          necesita
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
          Gestiona mesas, pedidos, cocina y reportes desde un solo lugar.
          Sin complicaciones.
        </p>
        <button
          onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-colors inline-flex items-center gap-2"
        >
          Ver planes
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <p className="font-bold text-sm mb-1">{f.title}</p>
              <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANES ─────────────────────────────────────────────────────────── */}
      <section id="planes" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-black text-center mb-2">Planes y precios</h2>
        <p className="text-white/40 text-center text-sm mb-10">
          7 días de prueba gratis. Sin tarjeta de crédito.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative rounded-2xl border p-6 cursor-pointer transition-all ${
                selected === plan.id
                  ? 'border-orange-500 bg-orange-500/5'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Más popular
                </div>
              )}
              <p className="font-bold text-base mb-1">{plan.name}</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black">${plan.price.toLocaleString('es-CL')}</span>
                <span className="text-white/40 text-sm">CLP/mes</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate(`/registro?plan=${selected}`)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-base transition-colors inline-flex items-center gap-2"
          >
            Comenzar con plan {PLANS.find(p => p.id === selected)?.name}
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="text-white/30 text-xs mt-3">
            7 días gratis · Sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-sm">
        <div className="flex justify-center mb-4">
          <img
            src="/images/bullweb-logo.png"
            alt="BullWeb Chile"
            className="h-16 w-16 object-contain opacity-70"
          />
        </div>
        <p>© 2026 BullWeb Chile — Sistema POS Profesional</p>
        <p className="mt-1">contacto@bullwebchile.com</p>
      </footer>
    </div>
  );
}
