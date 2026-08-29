import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

/**
 * PaymentRequiredOverlay
 *
 * Modal elegante de pago. Se muestra cuando el backend responde 402
 * (suscripción vencida / trial expirado). Reemplaza el redirect brusco
 * a /subscription por un overlay con CTA directo a Flow.
 *
 * - Escucha el evento global 'billing:payment_required' (disparado por api.ts).
 * - El SuperAdmin nunca ve este overlay.
 * - Botón "Pagar $29.000 / mes" replica el flujo de Subscription.tsx:
 *     POST /payments/flow/create → redirect a flowUrl.
 * - Polling cada 30s a /billing/status para ocultar el modal si el estado
 *   del tenant vuelve a ACTIVE/TRIAL (pago confirmado vía webhook).
 */
export default function PaymentRequiredOverlay() {
  const { isSuperAdmin } = useAuthStore();
  const [open,      setOpen]      = useState(false);
  const [paying,    setPaying]    = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ── Escuchar evento 'billing:payment_required' ──────────────────────────────
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('billing:payment_required', handler);
    return () => window.removeEventListener('billing:payment_required', handler);
  }, []);

  // ── Polling cada 30s para detectar reactivación ─────────────────────────────
  // Nota: /billing/status responde 200 con el estado real en el body.
  // Solo consideramos reactivado si el campo status es ACTIVE o TRIAL.
  const checkStatus = useCallback(async () => {
    setVerifying(true);
    try {
      const res = await api.get<{ status: string }>('/billing/status');
      if (res.data?.status === 'ACTIVE' || res.data?.status === 'TRIAL') {
        setOpen(false);
        setError(null);
        window.location.reload();
      } else {
        setError('El pago aún no se confirma. Intenta en unos minutos.');
      }
    } catch {
      // Si sigue vencido, el backend devolverá 402 y no hacemos nada.
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(checkStatus, 30_000);
    return () => clearInterval(interval);
  }, [open, checkStatus]);

  // ── Pagar suscripción (mismo flujo que Subscription.tsx) ─────────────────────
  const handlePay = useCallback(async () => {
    try {
      setError(null);
      setPaying(true);
      const response = await api.post<{ flowUrl: string }>('/payments/flow/create');
      window.location.href = response.data.flowUrl;
    } catch (err: any) {
      setError(err?.message ?? 'Error al generar el link de pago. Intenta nuevamente.');
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

          {/* Descripción */}
          <p className="text-gray-500 text-sm mb-6">
            Para continuar operando y no perder tus ventas, activa tu plan PRO.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Botón principal */}
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors mb-3"
          >
            {paying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generando link...
              </>
            ) : (
              'Pagar $29.000 / mes'
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

          {/* Indicador de polling */}
          <p className="text-gray-300 text-xs mt-5 italic">
            Verificando estado cada 30 segundos…
          </p>
        </div>
      </div>
    </>
  );
}