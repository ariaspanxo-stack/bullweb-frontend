import { useEffect, useState } from 'react';
import { CheckCircle, Zap, Star, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import api from '@/services/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BillingStatus {
  plan:         string;
  status:       string;
  trialActive:  boolean;
  daysLeft:     number;
  trialEndsAt:  string | null;
  subscription: {
    flowSubscriptionId: string | null;
    plan:               string;
    priceCLP:           number;
    status:             string;
    currentPeriodEnd:   string;
  } | null;
}

// ─── Planes ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id:          'STARTER' as const,
    name:        'Starter',
    price:       29990,
    description: 'Perfecto para restaurantes y cafeterías pequeñas',
    icon:        Zap,
    color:       'orange',
    features: [
      'POS completo + comandas',
      'Hasta 3 usuarios',
      'Módulo KDS',
      'Reportes básicos',
      'Soporte por email',
      'Actualizaciones incluidas',
    ],
  },
  {
    id:          'PRO' as const,
    name:        'Pro',
    price:       59990,
    description: 'Para negocios en crecimiento con múltiples sucursales',
    icon:        Star,
    color:       'indigo',
    features: [
      'Todo lo de Starter',
      'Usuarios ilimitados',
      'Múltiples sucursales',
      'Delivery integrado',
      'Campañas de marketing',
      'Facturación DTE',
      'Soporte prioritario',
      'API acceso completo',
    ],
    popular: true,
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Subscription() {
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [subscribing,   setSubscribing]   = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    // Leer query params para mostrar mensajes de éxito/cancelación
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      // La activación ocurre vía webhook; mostramos mensaje de espera
      setError(null);
    }
    if (params.get('cancelled') === 'true') {
      setError('Proceso de pago cancelado. Puedes intentarlo nuevamente cuando quieras.');
    }
  }, []);

  async function loadStatus() {
    try {
      setLoading(true);
      const data = await api.get<BillingStatus>('/api/billing/status');
      setBillingStatus(data);
    } catch {
      // Si no hay tenant, mostramos los planes de todas formas
      setBillingStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(plan: 'STARTER' | 'PRO') {
    try {
      setError(null);
      setSubscribing(plan);
      const result = await api.post<{ redirectUrl: string }>('/api/billing/subscribe', { plan });
      // Redirigir a Flow para registro de tarjeta
      window.location.href = result.redirectUrl;
    } catch (err: any) {
      setError(err.message ?? 'Error iniciando suscripción. Intenta nuevamente.');
      setSubscribing(null);
    }
  }

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  async function handleCancel() {
    try {
      setError(null);
      await api.post('/api/billing/cancel', {});
      await loadStatus();
    } catch (err: any) {
      setError(err.message ?? 'Error cancelando suscripción.');
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <a href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft size={16} />
            Volver al dashboard
          </a>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Elige tu plan BullWeb
          </h1>
          <p className="text-lg text-gray-600">
            Gestión completa para tu negocio gastronómico. Sin costos ocultos.
          </p>
        </div>

        {/* Estado trial */}
        {!loading && billingStatus?.trialActive && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-amber-800">
                Trial activo — {billingStatus.daysLeft} día{billingStatus.daysLeft !== 1 ? 's' : ''} restante{billingStatus.daysLeft !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-700">
                Vence el {billingStatus.trialEndsAt ? new Date(billingStatus.trialEndsAt).toLocaleDateString('es-CL') : '—'}.
                Suscríbete ahora y no pierdas el acceso.
              </p>
            </div>
          </div>
        )}

        {/* Suscripción activa */}
        {!loading && billingStatus?.status === 'ACTIVE' && billingStatus.subscription && (
          <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-green-800">
                    Plan {billingStatus.subscription.plan} activo
                  </p>
                  <p className="text-sm text-green-700">
                    Próxima renovación:{' '}
                    {new Date(billingStatus.subscription.currentPeriodEnd).toLocaleDateString('es-CL')}
                    {' '}— ${billingStatus.subscription.priceCLP.toLocaleString('es-CL')}/mes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelConfirmOpen(true)}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Cancelar suscripción
              </button>
            </div>
          </div>
        )}

        {/* Confirm cancelar suscripción */}
        <ConfirmModal
          isOpen={cancelConfirmOpen}
          title="Cancelar suscripción"
          message="¿Estás seguro que deseas cancelar tu suscripción? Perderás el acceso al final del período activo."
          confirmLabel="Sí, cancelar"
          variant="danger"
          onConfirm={() => { setCancelConfirmOpen(false); handleCancel(); }}
          onCancel={() => setCancelConfirmOpen(false)}
        />

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        ) : (
          /* Cards de planes */
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map(plan => {
              const Icon        = plan.icon;
              const isActive    = billingStatus?.subscription?.plan === plan.id &&
                                  billingStatus?.status === 'ACTIVE';
              const isLoading   = subscribing === plan.id;
              const isOrange    = plan.color === 'orange';

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 bg-white p-8 shadow-sm transition-shadow hover:shadow-md ${
                    plan.popular
                      ? 'border-indigo-500'
                      : 'border-gray-200'
                  } ${isActive ? 'ring-2 ring-green-400' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MÁS POPULAR
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${isOrange ? 'bg-orange-100' : 'bg-indigo-100'}`}>
                      <Icon
                        size={22}
                        className={isOrange ? 'text-orange-500' : 'text-indigo-500'}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                      <p className="text-sm text-gray-500">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ${plan.price.toLocaleString('es-CL')}
                    </span>
                    <span className="text-gray-500 ml-1">/mes + IVA</span>
                  </div>

                  <ul className="space-y-2 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isActive ? (
                    <div className="w-full py-3 rounded-xl font-semibold text-center bg-green-100 text-green-700">
                      ✓ Plan actual
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isLoading || !!subscribing}
                      className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                        plan.popular
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300'
                          : 'bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-300'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Redirigiendo a Flow...
                        </>
                      ) : (
                        `Suscribirse a ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-10">
          Pago seguro procesado por{' '}
          <a
            href="https://www.flow.cl"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-gray-700 hover:underline"
          >
            Flow.cl
          </a>
          . Cancela cuando quieras.
        </p>
      </div>
    </div>
  );
}
