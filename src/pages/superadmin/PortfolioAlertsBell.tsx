// TAREA 331: campana de alertas de cartera en el header del superadmin.
// Paso a PAST_DUE o SUSPENDED, 3 dias sin pedidos pagados, prueba que vence en 48 h, pago recibido y resumen semanal.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import superadminService, { type PortfolioAlertSA } from '@/services/superadmin/superadminService';

const KIND_LABEL: Record<PortfolioAlertSA['kind'], string> = {
  estado: 'Estado',
  sin_pedidos: 'Sin pedidos',
  trial_48h: 'Prueba',
  pago: 'Pago',
  resumen_semanal: 'Resumen semanal',
};

function hace(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function PortfolioAlertsBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['superadmin', 'portfolio-alerts'],
    queryFn: superadminService.getPortfolioAlerts,
    refetchInterval: 120_000,
  });
  const markRead = useMutation({
    mutationFn: superadminService.markPortfolioAlertsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin', 'portfolio-alerts'] }),
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={boxRef} data-testid="sa-portfolio-bell">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Alertas de cartera: ${unread} sin leer` : 'Alertas de cartera'}
        className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F97316] text-white text-[11px] font-bold leading-[18px] text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-gray-900 shadow-2xl z-50">
          <div className="sticky top-0 flex items-center justify-between gap-2 px-4 py-2 border-b border-white/10 bg-gray-900">
            <span className="text-sm font-semibold text-white">Alertas de cartera</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead.mutate()}
                disabled={markRead.isPending}
                className="min-h-[44px] px-3 text-xs font-semibold text-[#F97316] hover:text-orange-300 disabled:opacity-50"
              >
                Marcar leídas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              {data && !data.ready ? 'Las alertas de cartera aún no están activas.' : 'Sin alertas en los últimos 14 días.'}
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((a) => (
                <li key={a.id} className={`px-4 py-3 ${a.readAt ? '' : 'bg-orange-500/5'}`} data-testid="sa-portfolio-alert">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{KIND_LABEL[a.kind] ?? a.kind}</span>
                    <span className="text-[11px] text-gray-500">{hace(a.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.body}</p>
                  {a.tenantId && (
                    <button
                      type="button"
                      onClick={() => { setOpen(false); navigate(`/superadmin/tenants/${a.tenantId}`); }}
                      className="mt-2 min-h-[44px] px-3 rounded-lg border border-white/10 text-xs font-semibold text-gray-200 hover:bg-white/5"
                    >
                      Ver ficha
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
