// TAREA 332: ficha del local -> "Cobranza": vencimiento, dias de gracia (0 a 15) y "Dar dias" (1, 2, 7 o 30) con motivo.
// Cada cambio queda en la auditoria del superadmin (GIVE_DAYS, GRACE_DAYS_CHANGED) y en la del local.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService from '@/services/superadmin/superadminService';
import { isoToClDate, ymdToCl } from '@/lib/planLabel';

const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const DAYS = [1, 2, 7, 30];
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Activo', TRIAL: 'Prueba', PAST_DUE: 'Vencido', SUSPENDED: 'Suspendido', CANCELLED: 'Cancelado' };

export function venceTexto(daysToDue: number | null | undefined): string {
  if (daysToDue === null || daysToDue === undefined) return '';
  if (daysToDue === 0) return 'vence hoy';
  if (daysToDue > 0) return `en ${daysToDue} día${daysToDue > 1 ? 's' : ''}`;
  return `hace ${-daysToDue} día${daysToDue < -1 ? 's' : ''}`;
}

export function CobranzaBlock({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const key = ['superadmin', 'tenant-cobranza', tenantId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => superadminService.getTenantCobranza(tenantId) });
  const [pending, setPending] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', tenantId] });
    qc.invalidateQueries({ queryKey: ['superadmin', 'cartera'] });
  };

  const confirmGive = async () => {
    if (pending === null) return;
    if (reason.trim().length < 3) { toast.error('Escribe el motivo'); return; }
    setBusy(true);
    try {
      const r = await superadminService.giveDays(tenantId, pending, reason.trim());
      toast.success(`Se dieron ${pending} día${pending > 1 ? 's' : ''}: vence el ${isoToClDate(r.dueAt)}`);
      setPending(null);
      setReason('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudieron dar los días');
    } finally {
      setBusy(false);
    }
  };

  const changeGrace = async (g: number) => {
    setBusy(true);
    try {
      await superadminService.setGraceDays(tenantId, g);
      toast.success(`Días de gracia: ${g}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar la gracia');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5" data-testid="sa-cobranza">
      <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
        <CalendarClock className="w-4 h-4 text-brand-400" />Cobranza
        <span className="text-xs text-gray-600 font-normal ml-1">Queda en auditoría</span>
      </h2>
      {isLoading || !data ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-gray-950 border border-white/10 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Plan y precio</p>
              <p className="text-sm font-bold text-white" data-testid="sa-cob-plan">{data.planLabel} · {data.priceCLP != null ? `${fmtCLP(data.priceCLP)}/mes` : 'sin precio'}</p>
            </div>
            <div className="bg-gray-950 border border-white/10 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Estado</p>
              <p className={`text-sm font-bold ${data.blocked ? 'text-rose-400' : data.inGrace ? 'text-yellow-300' : 'text-white'}`} data-testid="sa-cob-estado">
                {data.blocked ? 'Bloqueado' : data.inGrace ? 'En gracia' : (STATUS_LABEL[data.status] ?? data.status)}
              </p>
            </div>
            <div className="bg-gray-950 border border-white/10 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Vence</p>
              <p className="text-sm font-bold text-white" data-testid="sa-cob-vence">{data.dueAt ? `${isoToClDate(data.dueAt)} (${venceTexto(data.daysToDue)})` : '—'}</p>
            </div>
            <div className="bg-gray-950 border border-white/10 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Último día para pagar</p>
              <p className="text-sm font-bold text-white">{data.payUntil ? ymdToCl(data.payUntil) : '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label htmlFor="sa-gracia" className="text-xs text-gray-500 mb-1 block">Días de gracia al vencer</label>
              <select
                id="sa-gracia"
                data-testid="sa-gracia"
                value={data.graceDays}
                disabled={busy || data.graceConfigurable === false}
                onChange={(e) => changeGrace(Number(e.target.value))}
                className="min-h-[44px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                {Array.from({ length: (data.maxGraceDays ?? 15) + 1 }, (_, i) => i).map((g) => (
                  <option key={g} value={g}>{g} día{g === 1 ? '' : 's'}{g === 3 ? ' (normal)' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Dar días</p>
              <div className="flex gap-2">
                {(data.giveDaysOptions ?? DAYS).map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-testid={`sa-dar-${d}`}
                    disabled={busy || data.status === 'SUSPENDED'}
                    onClick={() => { setPending(d); setReason(''); }}
                    className="min-h-[44px] min-w-[56px] px-3 rounded-lg border border-white/15 bg-gray-800 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    +{d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {pending !== null && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" data-testid="sa-dar-modal">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-gray-100 mb-1">Dar {pending} día{pending > 1 ? 's' : ''}</h4>
            <p className="text-sm text-gray-400 mb-4">
              Corre desde hoy si ya venció, o desde el vencimiento actual si aún no vence. Si está bloqueado, se desbloquea.
            </p>
            <label htmlFor="sa-dar-motivo" className="text-xs text-gray-500 mb-1 block">Motivo (obligatorio)</label>
            <textarea
              id="sa-dar-motivo"
              data-testid="sa-dar-motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-4"
              placeholder="Ej: paga el viernes por transferencia"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPending(null)} disabled={busy}
                className="min-h-[44px] px-4 rounded-lg border border-white/15 text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
              <button type="button" onClick={confirmGive} disabled={busy || reason.trim().length < 3} data-testid="sa-dar-confirmar"
                className="min-h-[44px] px-5 rounded-lg bg-[#F97316] text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50">Dar días</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
