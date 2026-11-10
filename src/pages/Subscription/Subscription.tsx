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
import { createPortal } from 'react-dom'; // HOTFIX 306

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
 *   - Upgrade listo → "¡Ya eres Full!" con CTA al POS (la venta cerrada).
 *
 * ESTILO CLARO PERMANENTE — prohibido dark (regla de la fase).
 */

// Flag del viaje a Flow: el click setea, la confirmación (webhook → plan TODO)
// limpia. Sobrevive al redirect de Flow para que la vuelta a /subscription
// dispare la verificación inmediata (patrón del overlay).
const UPGRADE_FLAG = 'subscription_upgrade_pending';

const TODO_UNLOCKS: { icon: 'check' | 'star'; text: string }[] = [
  { icon: 'star', text: 'Boletas electrónicas al SII — $0 por documento' },
  // HOTFIX 262: carta QR con pedidos y App Mesero salieron de la lista — incluidas en Básico.
  { icon: 'check', text: 'KDS — pantalla de cocina en tiempo real' },
  { icon: 'check', text: 'Inventario, fichas técnicas y alertas de stock' },
  { icon: 'check', text: 'Clientes, Fidelización y Campañas' }, // HOTFIX 278: Cupones incluidos en Básico
  { icon: 'check', text: 'Control de asistencia con kiosco' },
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

  // HOTFIX 306 (B7-01): pagar, cambiar de plan y cancelar = solo quien tiene billing.manage (el Administrador)
  const perms: string[] = useAuthStore((s) => ((s.user as any)?.role?.permissions ?? []) as string[]);
  const canBill = perms.includes('ALL_PERMISSIONS') || perms.includes('billing.manage');
  const [cancelText, setCancelText] = useState('');

  const [paying,   setPaying]   = useState<'upgrade' | 'renewal' | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // ── Verificación del upgrade desde el cache compartido (cero fetch propio) ──
  useEffect(() => {
    if (!billingStatus) return;
    const plan   = billingStatus.subscription?.plan ?? billingStatus.plan;
    const status = billingStatus.status;
    if (plan === 'TODO' && (status === 'ACTIVE' || (status === 'TRIAL' && billingStatus.trialActive))) { // HOTFIX 402
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
      await api.post('/billing/cancel', { confirm: cancelText.trim().toUpperCase() });
      setCancelText('');
      billingQ.refetch();
    } catch (err: any) {
      setError(err.message ?? 'Error cancelando suscripción.');
    }
  }, [billingQ, cancelText]);

  // ── Helpers de display ──────────────────────────────────────────────────────

  // STARTER→TODO como el backend lo resuelve (normalizePlan de la Fase A).
  const planDisplay = isBasico ? 'Básico' : 'Full';
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

        {/* ══ LA VENTA CERRADA — "¡Ya eres Full!" (polling confirmó el upgrade) ══ */}
        {upgraded && (
          <div className="mb-8 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-slate-700" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Ya eres Full!
            </h2>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Tu upgrade está confirmado. Todos los módulos de BullWeb quedaron
              desbloqueados ahora mismo: boletas al SII, cocina conectada,
              fidelización y más.
            </p>
            <Link
              to="/restaurant"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors shadow-lg  border border-slate-300"
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
                className="min-h-[44px] px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2 transition-colors"
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
                  : 'bg-slate-50 border-slate-200'}`}>
                  {isBasico
                    ? <Sparkles className="w-6 h-6 text-slate-500" />
                    : <CheckCircle className="w-6 h-6 text-slate-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-xl font-bold text-gray-900">
                      Plan {planDisplay}
                    </h3>
                    {/* Estado del período */}
                    {billingStatus.status === 'ACTIVE' && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
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

              {canBill && billingStatus.status === 'ACTIVE' && billingStatus.subscription && (
                <button
                  onClick={() => setCancelConfirmOpen(true)}
                  className="min-h-[44px] text-sm text-red-600 hover:text-red-800 underline"
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
                disabled={paying !== null || !canBill}
                className="min-h-[44px] px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2 transition-colors"
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
          <div className="mb-8 p-6 rounded-2xl shadow-lg text-slate-900">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-1">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Rocket size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Desbloquea el plan Full</h3>
                  <p className="text-slate-500 text-sm">
                    Tu Básico funciona. El Full lo multiplica — todo BullWeb por $34.000/mes.
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
                disabled={paying !== null || !canBill}
                className="min-h-[44px] px-6 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-100 disabled:opacity-60 flex items-center gap-2 transition-colors"
              >
                {paying === 'upgrade' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generando link...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Mejorar a Full $34.000/mes
                  </>
                )}
              </button>
              <p className="text-slate-500 text-xs">
                Todo lo del Básico sigue incluido. Sin permanencia — cancela cuando quieras.
              </p>
            </div>
            {awaitingUpgrade && (
              <p className="mt-3 text-slate-500 text-xs italic">
                Verificando tu pago cada 30 segundos… al confirmarse, esta pantalla se convertirá en tu bienvenida al plan Full.
              </p>
            )}
          </div>
        )}

        {/* ══ TODO / grandfathered — su plan y fecha, SIN CTA de upgrade ══ */}
        {!loading && !isBasico && billingStatus?.status !== 'PAST_DUE' && !trialVencido && !upgraded && (
          <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <CheckCircle className="text-slate-500 flex-shrink-0" size={20} />
            <p className="text-sm text-slate-700">
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
              disabled={paying !== null || !canBill}
              className="min-h-[44px] text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 disabled:opacity-60"
            >
              {paying === 'renewal' ? 'Generando link...' : 'Pagar suscripción ahora'}
            </button>
          </div>
        )}

        {/* HOTFIX 306 (B7-01): cancelar exige escribir CANCELAR (modal por portal, z-100) */}
        {cancelConfirmOpen && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-slate-900">
            <div className="absolute inset-0 bg-black/50" onClick={() => { setCancelConfirmOpen(false); setCancelText(''); }} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancelar suscripción</h3>
              <p className="text-sm text-gray-600 mb-4">
                El local quedará sin acceso al sistema. Para confirmar escribe <span className="font-bold">CANCELAR</span>.
              </p>
              <input
                value={cancelText}
                onChange={(e) => setCancelText(e.target.value)}
                placeholder="CANCELAR"
                aria-label="Escribe CANCELAR para confirmar"
                className="w-full min-h-[44px] px-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
              <div className="flex-wrap flex gap-3">
                <button
                  onClick={() => { setCancelConfirmOpen(false); setCancelText(''); }}
                  className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Volver
                </button>
                <button
                  disabled={cancelText.trim().toUpperCase() !== 'CANCELAR'}
                  onClick={() => { setCancelConfirmOpen(false); handleCancel(); }}
                  className="flex-1 min-h-[44px] rounded-xl bg-white text-slate-700 font-semibold hover:opacity-90 disabled:opacity-40 border border-slate-300"
                >
                  Cancelar suscripción
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

        {!canBill && (
          <p className="mb-6 text-sm text-gray-500 text-center">
            Solo el administrador del local puede pagar, cambiar el plan o cancelar la suscripción.
          </p>
        )}

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

        {/* LOTE 323 (B7-11): historial de pagos de la suscripcion y comprobante (solo lectura, solo administrador) */}
        {canBill && <BillingHistory />}

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

// ─── LOTE 323 (B7-11): historial de pagos y comprobante ─────────────────────────
// Solo lectura de GET /billing/payments (administrador, HOTFIX 306). No cobra, no cambia plan ni estado.
interface BillingPaymentRow {
  id: string; amount: number; currency?: string; status: string; concept?: string | null;
  paidAt?: string | null; createdAt: string; invoiceNumber?: string | null; commerceOrder?: string | null;
}
const PAY_STATUS: Record<string, string> = { PAID: 'Pagado', PENDING: 'Pendiente', FAILED: 'Rechazado', CANCELLED: 'Anulado', REFUNDED: 'Devuelto' };
const fmtFecha = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtMonto = (n: number) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

function printReceipt(p: BillingPaymentRow) {
  const w = window.open('', '_blank', 'width=420,height=600');
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comprobante BullWeb</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:18px}td{padding:4px 0}td+td{text-align:right;font-weight:700}</style></head>
    <body><h1>Comprobante de pago - BullWeb Chile</h1><table style="width:100%">
    <tr><td>Concepto</td><td>${esc(String(p.concept ?? 'Suscripción BullWeb'))}</td></tr>
    <tr><td>Monto</td><td>${esc(fmtMonto(p.amount))} ${esc(String(p.currency ?? 'CLP'))}</td></tr>
    <tr><td>Estado</td><td>${esc(PAY_STATUS[p.status] ?? p.status)}</td></tr>
    <tr><td>Fecha de pago</td><td>${esc(fmtFecha(p.paidAt ?? p.createdAt))}</td></tr>
    <tr><td>N° de orden</td><td>${esc(String(p.commerceOrder ?? p.id.slice(0, 8)))}</td></tr>
    ${p.invoiceNumber ? `<tr><td>N° de documento</td><td>${esc(p.invoiceNumber)}</td></tr>` : ''}
    </table><p style="font-size:12px;color:#555">Pago procesado por Flow.cl</p><script>window.print()</script></body></html>`);
  w.document.close();
}

function BillingHistory() {
  const [rows, setRows] = useState<BillingPaymentRow[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.get('/billing/payments')
      .then((r: any) => { const d = r?.data; setRows(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []); })
      .catch(() => setErr(true));
  }, []);
  return (
    <section className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Historial de pagos</h2>
      {err && <p className="text-sm text-gray-500">No se pudo cargar el historial.</p>}
      {!err && rows === null && <Loader2 className="animate-spin text-orange-500" size={20} />}
      {!err && rows !== null && rows.length === 0 && <p className="text-sm text-gray-500">Aún no hay pagos registrados.</p>}
      {!err && rows !== null && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Concepto</th>
                <th className="py-2 pr-3 text-right">Monto</th><th className="py-2 pr-3">Estado</th><th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmtFecha(p.paidAt ?? p.createdAt)}</td>
                  <td className="py-2 pr-3">{p.concept ?? 'Suscripción BullWeb'}</td>
                  <td className="py-2 pr-3 text-right font-bold whitespace-nowrap">{fmtMonto(p.amount)}</td>
                  <td className="py-2 pr-3">{PAY_STATUS[p.status] ?? p.status}</td>
                  <td className="py-2 text-right">
                    {p.status === 'PAID' && (
                      <button type="button" onClick={() => printReceipt(p)}
                        className="min-h-[44px] px-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                        Comprobante
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
