// ═══════════════════════════════════════════════════════════════
// WAITER PAYMENT BLOCKED — Hotfix #277
// Aviso bloqueante de la app mesero cuando el backend responde 402
// (suscripcion vencida o trial terminado). El mesero no paga: solo ve
// "Contacta al administrador". Escucha 'waiter:payment_required'.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export const WAITER_PAYMENT_EVENT = 'waiter:payment_required';

/** Dispara el aviso desde cualquier llamada de la app mesero que reciba 402. */
export function notifyWaiterPaymentRequired(body: any) {
  window.dispatchEvent(new CustomEvent(WAITER_PAYMENT_EVENT, { detail: { expiredReason: body?.expiredReason ?? null } }));
}

/**
 * Hotfix #116 y HOTFIX 306: cierra la sesion del mesero (invalida el token en el servidor y lo borra del equipo).
 * Devuelve SU login, preservando el tenant del localStorage.
 */
export function closeWaiterSession(): string {
  const tenant = localStorage.getItem('waiterTenant');
  const token = localStorage.getItem('waiterToken');
  if (token) {
    const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
    fetch(`${API}/waiter/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...(tenant ? { 'x-tenant-slug': tenant } : {}) },
    }).catch(() => {});
  }
  localStorage.removeItem('waiterToken');
  localStorage.removeItem('waiterInfo');
  return tenant ? `/mesero/login?tenant=${tenant}` : '/mesero/login';
}

export function WaiterPaymentBlocked() {
  const navigate = useNavigate();
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
          className="w-full min-h-[44px] text-gray-400 hover:text-gray-600 text-sm underline underline-offset-2 transition-colors"
        >
          Verificar ahora
        </button>
        {/* HOTFIX overlay: siempre se puede salir */}
        <button
          onClick={() => navigate(closeWaiterSession())}
          className="w-full min-h-[44px] mt-2 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>,
    document.body,
  );
}
