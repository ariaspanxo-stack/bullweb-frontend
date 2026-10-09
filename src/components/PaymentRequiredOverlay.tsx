import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useBillingStatus } from '@/hooks/useBillingStatus';

/**
 * PaymentRequiredOverlay
 *
 * Modal elegante de pago. Se muestra cuando el backend responde 402
 * (suscripción vencida / trial expirado). Reemplaza el redirect brusco
 * a /subscription por un overlay con CTA directo a Flow.
 *
 * - Escucha el evento global 'billing:payment_required' (disparado por api.ts).
 * - El SuperAdmin nunca ve este overlay.
 * - Botón "Pagar $XX.XXX / mes" replica el flujo de Subscription.tsx:
 *     POST /payments/flow/create → redirect a flowUrl (60s de timeout — P0-3).
 *
 * HOTFIX #218:
 *   (P0-1) CERO polling propio: consume la query COMPARTIDA ['billing','status']
 *          (useBillingStatus) — la única instancia de polling de la app. Al
 *          abrirse NO lanza checkStatus: lee el cache y se une al ciclo de 30s.
 *          Fin de la tormenta de pollers del incidente hamachi-nikkei (848 GET/2h).
 *   (P1-5) COPY DINÁMICO: plan y priceCLP de la respuesta de /billing/status
 *          (nunca más "Starter" hardcodeado).
 *   (P2-6) 429 HUMANO: si una llamada cae en 429, mensaje con countdown del
 *          retryAfter (el backend lo expone en el body) — no más clicks ciegos.
 */
export default function PaymentRequiredOverlay() {
  const { isSuperAdmin } = useAuthStore();
  const [open,      setOpen]      = useState(false);
  const [paying,    setPaying]    = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  // (P2-6) countdown del retryAfter cuando el backend responde 429.
  const [rateLimitSecs, setRateLimitSecs] = useState<number | null>(null);
  const rateLimitTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // (P0-1) LA query compartida — el overlay sostiene el ciclo de 30s SOLO
  // mientras está abierto (el usuario vencido necesita detectar la
  // reactivación); cerrado = lector pasivo. Una queryKey = un ciclo.
  const billingQ = useBillingStatus({ poll: open });
  const status   = billingQ.data?.status;
  const priceCLP = billingQ.data?.priceCLP;
  const planRaw  = billingQ.data?.subscription?.plan ?? billingQ.data?.plan;
  // (P1-5) copy dinámico del plan (label amigable; fallback neutro).
  const planLabel = planRaw === 'BASICO' ? 'Básico'
    : planRaw === 'TODO'   ? 'Full'
    : planRaw === 'PRO' || planRaw === 'ENTERPRISE' ? planRaw
    : planRaw ? planRaw.charAt(0).toUpperCase() + planRaw.slice(1).toLowerCase()
    : 'tu plan';
  const priceFmt = priceCLP ? `$${priceCLP.toLocaleString('es-CL')}` : '';

  // ── Escuchar evento 'billing:payment_required' ──────────────────────────────
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('billing:payment_required', handler);
    return () => window.removeEventListener('billing:payment_required', handler);
  }, []);

  // ── Reactivación detectada vía la query COMPARTIDA (cero polling propio) ────
  // Si el estado vuelve a ACTIVE/TRIAL (pago confirmado vía webhook), cerrar
  // y recargar. El ciclo de 30s que sostiene otro consumidor nos avisa.
  useEffect(() => {
    if (open && (status === 'ACTIVE' || status === 'TRIAL')) {
      setOpen(false);
      setError(null);
      window.location.reload();
    }
  }, [open, status]);

  // ── (P2-6) Countdown del retryAfter ─────────────────────────────────────────
  useEffect(() => {
    if (rateLimitSecs === null) {
      if (rateLimitTimer.current) { clearInterval(rateLimitTimer.current); rateLimitTimer.current = null; }
      return;
    }
    rateLimitTimer.current = setInterval(() => {
      setRateLimitSecs(prev => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => { if (rateLimitTimer.current) clearInterval(rateLimitTimer.current); };
  }, [rateLimitSecs !== null]);

  /** Clasifica un error: 429 → mensaje humano con countdown; otro → genérico. */
  const humanError = (err: any, fallback: string): string => {
    if (err?.status === 429 || err?.data?.retryAfter !== undefined) {
      const secs = Number(err?.data?.retryAfter ?? 30) || 30;
      setRateLimitSecs(secs);
      return 'Demasiados intentos — espera un momento y reintenta.';
    }
    setRateLimitSecs(null);
    return err?.message ?? fallback;
  };

  // ── Verificación manual ("Ya pagué") — refetch EXPLÍCITO de la query ────────
  const checkStatus = useCallback(async () => {
    try {
      setVerifying(true);
      setError(null);
      const fresh = await billingQ.refetch();
      const s = fresh.data?.status;
      if (s === 'ACTIVE' || s === 'TRIAL') {
        setOpen(false);
        window.location.reload();
      } else {
        setError('El pago aún no se confirma. Intenta en unos minutos.');
      }
    } catch (err: any) {
      setError(humanError(err, 'No pudimos verificar el estado. Intenta nuevamente.'));
    } finally {
      setVerifying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingQ.refetch]);

  // ── Pagar suscripción (mismo flujo que Subscription.tsx, 60s — P0-3) ────────
  const handlePay = useCallback(async () => {
    try {
      setError(null);
      setRateLimitSecs(null);
      setPaying(true);
      const response = await api.post<{ flowUrl: string }>('/payments/flow/create');
      window.location.href = response.data.flowUrl;
    } catch (err: any) {
      setError(humanError(err, 'Error al generar el link de pago. Intenta nuevamente.'));
      setPaying(false);
    }
  }, []);

  if (!open || isSuperAdmin) return null;

  return (
    <>
      {/* Overlay semitransparente de fondo */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        aria-hidden="true"
      />

      {/* Tarjeta centrada */}
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          {/* Icono */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <span className="text-3xl">🔒</span>
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tu período de prueba ha terminado
          </h2>

          {/* Descripción — (P1-5) plan y precio dinámicos de la ficha */}
          <p className="text-gray-500 text-sm mb-6">
            Para continuar operando y no perder tus ventas, activa tu plan {planLabel}{priceFmt ? ` (${priceFmt}/mes)` : ''}.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {error}
              {/* (P2-6) countdown visible del retryAfter */}
              {rateLimitSecs !== null && (
                <span className="block mt-1 font-semibold tabular-nums">
                  Reintenta en {rateLimitSecs}s…
                </span>
              )}
            </div>
          )}

          {/* Botón principal — deshabilitado mientras corre el countdown 429 */}
          <button
            onClick={handlePay}
            disabled={paying || rateLimitSecs !== null}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors mb-3"
          >
            {paying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generando link...
              </>
            ) : (
              priceFmt ? `Pagar ${priceFmt} / mes` : 'Pagar suscripción'
            )}
          </button>

          {/* Verificación manual */}
          <button
            onClick={checkStatus}
            disabled={verifying}
            className="text-gray-400 hover:text-gray-600 text-sm py-1 underline underline-offset-2 transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {verifying ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Verificando...
              </>
            ) : (
              'Ya pagué, verificar ahora'
            )}
          </button>

          {/* Indicador del ciclo compartido (P0-1) */}
          <p className="text-gray-300 text-xs mt-5 italic">
            Verificando estado cada 30 segundos…
          </p>
        </div>
      </div>
    </>
  );
}
