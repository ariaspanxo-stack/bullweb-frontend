import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useBillingStatus } from '@/hooks/useBillingStatus';
import { isoToClDate, ymdToCl } from '@/lib/planLabel';

/**
 * TAREA 332 — aviso amarillo de gracia.
 * El plan vencio pero el local sigue operando hasta el ultimo dia de gracia; el bloqueo (overlay 402) llega al dia siguiente.
 * Solo quien administra el pago (billing.manage o ALL_PERMISSIONS) ve el boton Pagar; el resto ve a quien avisar.
 * Lee la query compartida de /billing/status (sin polling propio).
 */
export default function GraceBanner() {
  const { isSuperAdmin, user } = useAuthStore();
  const billingQ = useBillingStatus();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const d = billingQ.data;
  if (isSuperAdmin || !d?.inGrace || !d.dueAt || !d.payUntil) return null;

  const perms = user?.role?.permissions ?? [];
  const canPay = perms.includes('ALL_PERMISSIONS') || perms.includes('billing.manage');
  const vencio = isoToClDate(d.dueAt);
  const hasta = ymdToCl(d.payUntil);

  const pay = async () => {
    try {
      setError(null);
      setPaying(true);
      const r = await api.post<{ flowUrl: string }>('/payments/flow/create');
      window.location.href = r.data.flowUrl;
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo generar el enlace de pago. Intenta nuevamente.');
      setPaying(false);
    }
  };

  return (
    <div role="status" data-testid="grace-banner" className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        <AlertTriangle size={18} className="text-yellow-700 shrink-0" aria-hidden="true" />
        <p className="text-sm flex-1 min-w-[200px]">
          Tu plan venció el <b>{vencio}</b>, tienes hasta el <b>{hasta}</b> para pagar.
          {!canPay && ' Avisa al administrador del local.'}
          {error && <span className="block text-red-700 mt-1">{error}</span>}
        </p>
        {canPay && (
          <button
            type="button"
            onClick={pay}
            disabled={paying}
            data-testid="grace-pagar"
            className="min-h-[44px] px-5 rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2"
          >
            {paying && <Loader2 size={16} className="animate-spin" />}
            Pagar
          </button>
        )}
      </div>
    </div>
  );
}
