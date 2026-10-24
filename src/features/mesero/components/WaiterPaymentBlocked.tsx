// ═══════════════════════════════════════════════════════════════
// WAITER PAYMENT BLOCKED — Hotfix #277
// Aviso bloqueante de la app mesero cuando el backend responde 402
// (suscripcion vencida o trial terminado). El mesero no paga: solo ve
// "Contacta al administrador". Escucha 'waiter:payment_required'.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const WAITER_PAYMENT_EVENT = 'waiter:payment_required';

/** Dispara el aviso desde cualquier llamada de la app mesero que reciba 402. */
export function notifyWaiterPaymentRequired(body: any) {
  window.dispatchEvent(new CustomEvent(WAITER_PAYMENT_EVENT, { detail: { expiredReason: body?.expiredReason ?? null } }));
}

export function WaiterPaymentBlocked() {
  const [reason, setReason] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => setReason((e as CustomEvent).detail?.expiredReason ?? null);
    window.addEventListener(WAITER_PAYMENT_EVENT, handler);
    return () => window.removeEventListener(WAITER_PAYMENT_EVENT, handler);
  }, []);

  if (reason === undefined) return null;

  const title = reason === 'SUBSCRIPTION_EXPIRED' ? 'Tu suscripción venció' : 'Tu período de prueba terminó';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm mb-6">
          El servicio está pausado. <span className="font-semibold text-gray-700">Contacta al administrador</span> de tu local para reactivarlo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full min-h-[44px] border-2 border-[#F97316] text-[#F97316] font-bold rounded-xl hover:bg-orange-50 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>,
    document.body,
  );
}
