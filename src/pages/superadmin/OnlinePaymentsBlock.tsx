// LOTE 324: ficha del local -> "Pagos en linea (Mercado Pago)" y comisiones BullWeb (online y Point).
// Cada cambio queda en la auditoria superadmin (ONLINE_PAYMENTS_ENABLED/DISABLED, BULLWEB_FEE_ONLINE_CHANGED, BULLWEB_FEE_POINT_CHANGED).
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService, { type OnlinePaymentsCfg } from '@/services/superadmin/superadminService';

const fmtPct = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 2 });

export function OnlinePaymentsBlock({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const key = ['superadmin', 'online-payments', tenantId];
  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: () => superadminService.getOnlinePayments(tenantId) });
  const [online, setOnline] = useState('');
  const [point, setPoint] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setOnline(String(data.feeOnlinePct));
    setPoint(String(data.feePointPct));
  }, [data]);

  const save = async (body: Partial<Pick<OnlinePaymentsCfg, 'enabled' | 'feeOnlinePct' | 'feePointPct'>>, okMsg: string) => {
    setBusy(true);
    try {
      const r = await superadminService.updateOnlinePayments(tenantId, body);
      qc.setQueryData(key, r);
      toast.success(okMsg);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const savePct = (field: 'feeOnlinePct' | 'feePointPct', raw: string, label: string) => {
    const v = Number(raw.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || v > 20) { toast.error(`${label}: ingresa un % entre 0 y 20`); return; }
    if (data && Math.round(v * 100) / 100 === data[field]) return;
    save({ [field]: Math.round(v * 100) / 100 }, `${label} guardada`);
  };

  const enabled = data?.enabled === true;
  const disabled = busy || !data?.available;

  return (
    <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5" data-testid="sa-online-payments">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-[#F97316]" />
        Pagos en línea
        <span className="text-xs text-gray-600 font-normal normal-case tracking-normal ml-1">Cada cambio queda en auditoría</span>
      </h3>
      {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
      {isError && <p className="text-sm text-rose-400">No se pudo leer la configuración de pagos en línea.</p>}
      {data && !data.available && (
        <p className="text-xs text-amber-400 mb-3">La base aún no tiene la migración 324: el local usa la lista de respaldo del servidor.</p>
      )}
      {data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl border border-gray-700">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-200">Pagos en línea (Mercado Pago)</p>
              <p className="text-xs text-gray-500 mt-0.5">El local puede conectar su cuenta y cobrar desde la carta QR</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Pagos en línea (Mercado Pago)"
              disabled={disabled}
              onClick={() => save({ enabled: !enabled }, !enabled ? 'Pagos en línea activados' : 'Pagos en línea desactivados')}
              className={`ml-3 relative inline-flex h-11 w-16 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${enabled ? 'bg-[#F97316]' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { field: 'feeOnlinePct' as const, label: 'Comisión online', hint: 'Se cobra en cada pago de la carta (marketplace_fee)', value: online, set: setOnline },
              { field: 'feePointPct' as const, label: 'Comisión Point', hint: 'Pagos presenciales con Point', value: point, set: setPoint },
            ]).map((f) => (
              <label key={f.field} className="block p-3 bg-gray-800 rounded-xl border border-gray-700">
                <span className="text-sm font-semibold text-gray-200">{f.label} (%)</span>
                <span className="block text-xs text-gray-500 mb-2">{f.hint} · actual <b className="text-gray-300">{fmtPct(data[f.field])} %</b></span>
                <input
                  type="number" inputMode="decimal" min={0} max={20} step={0.1}
                  value={f.value}
                  disabled={disabled}
                  onChange={(e) => f.set(e.target.value)}
                  onBlur={() => savePct(f.field, f.value, f.label)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  data-testid={`sa-${f.field}`}
                  className="w-full min-h-[44px] bg-gray-950 border border-white/10 rounded-lg px-3 text-sm font-bold text-gray-100 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none disabled:opacity-50"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
