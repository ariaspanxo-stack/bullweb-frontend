import { useEffect, useState } from 'react';
import { CheckCircle, Star, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
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

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Subscription() {
  const tenantId = useAuthStore(s => s.user?.tenantId);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [paying,        setPaying]        = useState(false);
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
      const response = await api.get<BillingStatus>('/api/billing/status');
      setBillingStatus(response.data);
    } catch {
      // Si no hay tenant, mostramos los planes de todas formas
      setBillingStatus(null);
    } finally {
      setLoading(false);
    }
  }

  // ── Pago único vía Flow (backend genera orden $29.000 + webhook automático) ─────
  async function handlePaySubscription() {
    try {
      setError(null);
      setPaying(true);
      const response = await api.post<{ flowUrl: string }>('/payments/flow/create');
      window.location.href = response.data.flowUrl;
    } catch (err: any) {
      setError(err.message ?? 'Error al generar el link de pago. Intenta nuevamente.');
      setPaying(false);
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

        {/* ── Plan Starter — Pagar Suscripción (Flow) ────────────────────── */}
        {!loading && (
          <div className="mb-8 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Star size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Plan Starter</h3>
                  <p className="text-indigo-100 text-sm">$29.000 CLP/mes</p>
                  <p className="text-indigo-100 text-xs">Todo incluido — sin IVA extra</p>
                </div>
              </div>
              <button
                onClick={handlePaySubscription}
                disabled={paying}
                className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-60 flex items-center gap-2 transition-colors"
              >
                {paying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generando link...
                  </>
                ) : (
                  'Pagar Suscripción'
                )}
              </button>
            </div>
            <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {[
                'POS completo (Mesas, Mostrador, Delivery)',
                'KDS de cocina',
                'Carta QR',
                'Clientes y fidelización',
                'Inventario',
                'Reportes',
                '1 sucursal',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-white">
                  <CheckCircle size={15} className="flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-orange-500" size={32} />
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