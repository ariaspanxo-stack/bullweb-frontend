import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle, AlertTriangle, Loader2, ArrowLeft,
  Sparkles, Rocket, XCircle, CreditCard, PartyPopper, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { usePlan } from '@/hooks/usePlan';
// HOTFIX #218 (P0-1): la ficha consume la query COMPARTIDA ['billing','status']
// — sin loadStatus propio (antes: fetch al montar + polling 30s duplicado).
import { useBillingStatus } from '@/hooks/useBillingStatus';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BillingStatus {
  plan:         string;
  status:       string;
  trialActive:  boolean;
  daysLeft:     number;
  trialEndsAt:  string | null;
  // Hotfix #199-1: precio EFECTIVO plano (ficha con fallback 34.000) — el mismo
  // criterio del cobro (/flow/create). DISPLAY = COBRO.
  priceCLP?:    number;
  subscription: {
    flowSubscriptionId: string | null;
    plan:               string;
    priceCLP:           number;
    status:             string;
    currentPeriodEnd:   string;
  } | null;
}

/**
 * GATING FASE D2 — /subscription, EL GESTOR DE PLAN.
 *
 * El frontend del motor de venta del dos-planos. CERO duplicación:
 *   - El plan: usePlan() de la Fase C (misma fuente del gate — subscriptions.plan).
 *   - El pago: api.post('/payments/flow/create') — el MISMO service del overlay
 *     (PaymentRequiredOverlay/Header), con targetPlan:'TODO' para el upgrade.
 *   - El estado: query COMPARTIDA ['billing','status'] (#218 P0-1) — mientras
 *     hay viaje a Flow pendiente (upgrade o retorno de pago), ESTA página
 *     sostiene el ciclo de 30s; sin viaje, lector pasivo.
 *
 * Estados:
 *   - BÁSICO        → LA TARJETA DE UPGRADE (los desbloqueos + CTA vendedor).
 *   - PAST_DUE      → CTA "Pagar ahora" (flujo EXISTENTE del overlay, sin targetPlan).
 *   - TRIAL VENCIDO → CTA "Pagar ahora" TAMBIÉN (HOTFIX #218 P1-4: el limbo
 *                     entre la expiración y el tick PAST_DUE del dunning ya no
 *                     existe — status TRIAL + trialActive false = vencido).
 *   - TODO/legacy   → su plan y fecha, SIN CTA de upgrade (nada que venderles).
 *   - Upgrade listo → "¡Ya eres TODO!" con CTA al POS (la venta cerrada).
 *
 * ESTILO CLARO PERMANENTE — prohibido dark (regla de la fase).
 */

// Flag del viaje a Flow: el click setea, la confirmación (webhook → plan TODO)
// limpia. Sobrevive al redirect de Flow para que la vuelta a /subscription
// dispare la verificación inmediata (patrón del overlay).
const UPGRADE_FLAG = 'subscription_upgrade_pending';

const TODO_UNLOCKS: { icon: 'check' | 'star'; text: string }[] = [
  { icon: 'star', text: 'Boletas electrónicas al SII — $0 por documento' },
  { icon: 'check', text: 'Pedidos desde la carta QR' },
  { icon: 'check', text: 'KDS — pantalla de cocina en tiempo real' },
  { icon: 'check', text: 'App Mesero: pedidos desde el celular' },
  { icon: 'check', text: 'Inventario con alertas de stock' },
  { icon: 'check', text: 'Fidelización, Campañas y Cupones' },
  { icon: 'check', text: 'Mapeo de Delivery (Uber Eats, PedidosYa)' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Subscription() {
  const { isBasico } = usePlan();

  // (P0-1) La única fuente: la query compartida. Esta página sostiene el ciclo
  // de 30s SOLO mientras espera confirmación de un pago (flag de upgrade o
  // retorno de Flow); en visita normal es lectora pasiva del cache global.
  const awaitingUpgrade =
    typeof window !== 'undefined' && sessionStorage.getItem(UPGRADE_FLAG) === '1';
  const retornoPago =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === 'true';

  const billingQ = useBillingStatus({ poll: isBasico || awaitingUpgrade || retornoPago });
  const billingStatus = (billingQ.data ?? null) as BillingStatus | null;
  const loading = billingQ.isLoading;
  const loadError = billingQ.isError;

  const [paying,   setPaying]   = useState<'upgrade' | 'renewal' | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // ── Verificación del upgrade desde el cache compartido (cero fetch propio) ──
  useEffect(() => {
    if (!billingStatus) return;
    const plan   = billingStatus.subscription?.plan ?? billingStatus.plan;
    const status = billingStatus.status;
    if (plan === 'TODO' && (status === 'ACTIVE' || status === 'TRIAL')) {
      sessionStorage.removeItem(UPGRADE_FLAG);
      setUpgraded(true);
    }
  }, [billingStatus]);

  // Mensajes de retorno de Flow (query params) — solo al montar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cancelled') === 'true') {
      setError('Proceso de pago cancelado. Puedes intentarlo nuevamente cuando quieras.');
    }
  }, []);

  // ── UPGRADE BÁSICO→TODO (Fase D1 viva): el MISMO service del overlay con
  // targetPlan — PENDING 34.000 concept 'UPGRADE_PLAN:TODO', webhook aplica
  // TODO +30 días (V1 sin prorrateo, sellado en D1).
  const handleUpgrade = useCallback(async () => {
    try {
      setError(null);
      setPaying('upgrade');
      sessionStorage.setItem(UPGRADE_FLAG, '1');
      const response = await api.post<{ flowUrl: string }>('/payments/flow/create', {
        targetPlan: 'TODO',
      });
      window.location.href = response.data.flowUrl;
    } catch (err: any) {
      // Sin viaje a Flow no hay upgrade que esperar — el flag se retira.
      sessionStorage.removeItem(UPGRADE_FLAG);
      setError(err.message ?? 'Error al generar el link de pago. Intenta nuevamente.');
      setPaying(null);
    }
  }, []);

  // ── Renovación/reactivación: el flujo EXISTENTE del overlay (SIN targetPlan
  // → cobra la ficha del tenant). Reutilizado tal cual — cero duplicación.
  // #218 P0-3: viaja con timeout honesto de 60s (api.ts).
  const handlePayRenewal = useCallback(async () => {
    try {
      setError(null);
      setPaying('renewal');
      const response = await api.post<{ flowUrl: string }>('/payments/flow/create');
      window.location.href = response.data.flowUrl;
    } catch (err: any) {
      setError(err.message ?? 'Error al generar el link de pago. Intenta nuevamente.');
      setPaying(null);
    }
  }, []);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const handleCancel = useCallback(async () => {
    try {
      setError(null);
      await api.post('/billing/cancel', {});
      billingQ.refetch();
    } catch (err: any) {
      setError(err.message ?? 'Error cancelando suscripción.');
    }
  }, [billingQ]);

  // ── Helpers de display ──────────────────────────────────────────────────────

  // STARTER→TODO como el backend lo resuelve (normalizePlan de la Fase A).
  const planDisplay = isBasico ? 'Básico' : 'Todo';
  const priceFmt    = billingStatus?.priceCLP
    ? `$${billingStatus.priceCLP.toLocaleString('es-CL')}`
    : null;
  const periodEnd = billingStatus?.subscription?.currentPeriodEnd;

  // HOTFIX #218 (P1-4) — EL LIMBO CERRADO: TRIAL con trialActive=false es un
  // trial VENCIDO (entre la expiración y el tick PAST_DUE del dunning de 6h).
  const trialVencido =
    billingStatus?.status === 'TRIAL' && billingStatus?.trialActive === false;
  // El CTA de pago vive en PAST_DUE **y** en el limbo del trial vencido.
  const debePagar =
    billingStatus?.status === 'PAST_DUE' || trialVencido;

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
            Tu plan BullWeb
          </h1>
          <p className="text-lg text-gray-600">
            Gestión completa para tu negocio gastronómico. Sin costos ocultos.
          </p>
        </div>

        {/* ══ LA VENTA CERRADA — "¡Ya eres TODO!" (polling confirmó el upgrade) ══ */}
        {upgraded && (
          <div className="mb-8 p-8 bg-white border border-emerald-200 rounded-2xl shadow-sm text-center">
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Ya eres TODO!
            </h2>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Tu upgrade está confirmado. Todos los módulos de BullWeb quedaron
              desbloqueados ahora mismo: boletas al SII, cocina conectada,
              fidelización y más.
            </p>
            <Link
              to="/restaurant"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
            >
              <Rocket className="w-4 h-4" />
              Ir al POS
            </Link>
          </div>
        )}

        {/* ══ (P1-4c) ERROR HONESTO — la ficha NUNCA desaparece silenciosamente ══ */}
        {!loading && loadError && !billingStatus && (
          <div className="mb-8 p-6 bg-white border border-red-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500 flex-shrink-0" size={22} />
                <div>
                  <p className="font-semibold text-red-800">
                    No pudimos cargar tu estado de suscripción
                  </p>
                  <p className="text-sm text-red-700">
                    Tu plan sigue activo — es un problema temporal de conexión.
                    Reintenta en un momento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => billingQ.refetch()}
                disabled={billingQ.isFetching}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={16} className={billingQ.isFetching ? 'animate-spin' : ''} />
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ══ ESTADO ACTUAL — el plan efectivo, el precio, el período ══ */}
        {!loading && billingStatus && (
          <div className="mb-8 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${isBasico
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-emerald-50 border-emerald-200'}`}>
                  {isBasico
                    ? <Sparkles className="w-6 h-6 text-slate-500" />
                    : <CheckCircle className="w-6 h-6 text-emerald-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-xl font-bold text-gray-900">
                      Plan {planDisplay}
                    </h3>
                    {/* Estado del período */}
                    {billingStatus.status === 'ACTIVE' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                        Activo
                      </span>
                    )}
                    {billingStatus.status === 'TRIAL' && !trialVencido && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                        Prueba · {billingStatus.daysLeft}d
                      </span>
                    )}
                    {/* (P1-4b) EL LIMBO YA NO MIENTE: badge Vencido con color
                        de alerta — jamás "Prueba · 0d" para un trial vencido. */}
                    {trialVencido && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[11px] font-bold text-red-700 uppercase tracking-wide">
                        Vencido
                      </span>
                    )}
                    {billingStatus.status === 'PAST_DUE' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[11px] font-bold text-red-700 uppercase tracking-wide">
                        Pago pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {priceFmt ? `${priceFmt} CLP/mes` : '—'}
                    {billingStatus.status === 'TRIAL' && billingStatus.trialEndsAt && !trialVencido
                      ? ` · Prueba gratis hasta el ${new Date(billingStatus.trialEndsAt).toLocaleDateString('es-CL')}`
                      : periodEnd
                        ? ` · Próxima renovación: ${new Date(periodEnd).toLocaleDateString('es-CL')}`
                        : ''}
                  </p>
                </div>
              </div>

              {billingStatus.status === 'ACTIVE' && billingStatus.subscription && (
                <button
                  onClick={() => setCancelConfirmOpen(true)}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Cancelar suscripción
                </button>
              )}
            </div>

            {/* Trial: aviso preventivo (banner existente, conservado) */}
            {billingStatus.trialActive && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
                <p className="text-sm text-amber-800">
                  Te quedan <strong>{billingStatus.daysLeft} día{billingStatus.daysLeft !== 1 ? 's' : ''}</strong> de prueba.
                  Asegura tu acceso antes del {billingStatus.trialEndsAt
                    ? new Date(billingStatus.trialEndsAt).toLocaleDateString('es-CL')
                    : 'vencimiento'}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══ (P1-4a) PAGAR — PAST_DUE **y** el limbo del trial vencido ══ */}
        {!loading && debePagar && !upgraded && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500 flex-shrink-0" size={22} />
                <div>
                  <p className="font-semibold text-red-800">
                    {trialVencido
                      ? 'Tu período de prueba ha terminado'
                      : 'Tu suscripción está vencida'}
                  </p>
                  <p className="text-sm text-red-700">
                    Paga ahora y recupera el acceso completo en segundos — tus datos
                    siguen intactos.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePayRenewal}
                disabled={paying !== null}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2 transition-colors"
              >
                {paying === 'renewal' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generando link...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Pagar ahora
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══ BÁSICO — LA TARJETA DE UPGRADE (el candado es una oferta) ══ */}
        {!loading && isBasico && !upgraded && (
          <div className="mb-8 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg text-white">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-1">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Rocket size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Desbloquea el plan TODO</h3>
                  <p className="text-indigo-100 text-sm">
                    Tu Básico funciona. El TODO lo multiplica — todo BullWeb por $34.000/mes.
                  </p>
                </div>
              </div>
            </div>
            <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {TODO_UNLOCKS.map(f => (
                <li key={f.text} className="flex items-center gap-2 text-sm text-white">
                  {f.icon === 'star'
                    ? <Sparkles size={15} className="flex-shrink-0 text-amber-200" />
                    : <CheckCircle size={15} className="flex-shrink-0" />}
                  {f.text}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center flex-wrap gap-4">
              <button
                onClick={handleUpgrade}
                disabled={paying !== null}
                className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-60 flex items-center gap-2 transition-colors"
              >
                {paying === 'upgrade' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generando link...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Mejorar a TODO $34.000/mes
                  </>
                )}
              </button>
              <p className="text-indigo-100 text-xs">
                Todo lo del Básico sigue incluido. Sin permanencia — cancela cuando quieras.
              </p>
            </div>
            {awaitingUpgrade && (
              <p className="mt-3 text-indigo-100 text-xs italic">
                Verificando tu pago cada 30 segundos… al confirmarse, esta pantalla se convertirá en tu bienvenida al plan TODO.
              </p>
            )}
          </div>
        )}

        {/* ══ TODO / grandfathered — su plan y fecha, SIN CTA de upgrade ══ */}
        {!loading && !isBasico && billingStatus?.status !== 'PAST_DUE' && !trialVencido && !upgraded && (
          <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
            <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
            <p className="text-sm text-green-800">
              Tienes acceso completo a BullWeb{periodEnd
                ? ` — próximo cobro el ${new Date(periodEnd).toLocaleDateString('es-CL')}`
                : ''}.
              {billingStatus?.trialActive
                ? ' Al terminar tu prueba puedes continuar desde aquí.'
                : ''}
            </p>
          </div>
        )}

        {/* Trial TODO/legacy VIGENTE que quiere pagar ya — el flujo existente, discreto */}
        {!loading && !isBasico && billingStatus?.status === 'TRIAL' && !trialVencido && (
          <div className="mb-8 text-center">
            <button
              onClick={handlePayRenewal}
              disabled={paying !== null}
              className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 disabled:opacity-60"
            >
              {paying === 'renewal' ? 'Generando link...' : 'Pagar suscripción ahora'}
            </button>
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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
