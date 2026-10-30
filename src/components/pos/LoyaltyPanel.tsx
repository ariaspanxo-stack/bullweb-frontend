// ═══════════════════════════════════════════════════════════════
// LoyaltyPanel — puntos del cliente en el cobro
// HOTFIX #282: el canje se aplica EN EL SERVIDOR sobre el descuento de la orden
// (POST /pos/orders/:id/points: atómico, idempotente; quitar/reemplazar el descuento o anular devuelve los puntos).
// La regla (bloque, valor, mínimo) viene del saldo del cliente: un solo lugar, el backend.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Loader2, AlertCircle } from 'lucide-react';
import { customersApi } from '@/services/api';
import api from '@/services/api';

interface LoyaltyPanelProps {
  orderId: string;
  customerId: string;
  customerName: string;
  /** Pregunta antes de reemplazar otro descuento; false = cancelar */
  beforeRedeem: () => boolean;
  /** El servidor ya guardó el descuento en la orden */
  onApplied: (cashDiscount: number, points: number) => void;
  /** HOTFIX 298: total de la venta ANTES del descuento y sin propina (base del tope de canje) */
  saleTotal?: number;
}

const DEFAULT_RULES = { redeemBlockPoints: 100, redeemBlockValue: 500, minRedeemPoints: 100, maxRedeemPctPerSale: 50 };

export const LoyaltyPanel = ({ orderId, customerId, customerName, beforeRedeem, onApplied, saleTotal }: LoyaltyPanelProps) => {
  const queryClient = useQueryClient();
  const [pointsInput, setPointsInput] = useState<number>(DEFAULT_RULES.minRedeemPoints);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['pointsBalance', customerId],
    queryFn: () => customersApi.getPointsBalance(customerId),
    enabled: !!customerId,
  });

  const balance: any = (data as any)?.data ?? data;
  const rules = { ...DEFAULT_RULES, ...(balance?.rules ?? {}) };
  const block = rules.redeemBlockPoints;
  const currentPoints = Number(balance?.points ?? 0);
  const balanceRedeemable = Math.floor(currentPoints / block) * block;
  // HOTFIX 298: tope por venta = floor(total * pct / 100) en $, llevado a bloques completos (el backend igual valida)
  const hasSaleTotal = typeof saleTotal === 'number' && Number.isFinite(saleTotal);
  const saleCapCash = hasSaleTotal ? Math.floor((Math.max(0, saleTotal as number) * rules.maxRedeemPctPerSale) / 100) : Infinity;
  const saleCapPoints = hasSaleTotal ? Math.floor(saleCapCash / rules.redeemBlockValue) * block : Infinity;
  const maxRedeemable = Math.min(balanceRedeemable, saleCapPoints);
  const maxCash = Math.floor(maxRedeemable / block) * rules.redeemBlockValue;
  const cashPreview = Math.floor(pointsInput / block) * rules.redeemBlockValue;

  useEffect(() => { setPointsInput(rules.minRedeemPoints); }, [rules.minRedeemPoints]);

  const handleRedeem = async () => {
    setErrorMsg(null);
    if (!Number.isInteger(pointsInput) || pointsInput < rules.minRedeemPoints || pointsInput > maxRedeemable || pointsInput % block !== 0) {
      setErrorMsg(`Ingresa un múltiplo de ${block}, desde ${rules.minRedeemPoints} y hasta ${maxRedeemable.toLocaleString('es-CL')} pts (saldo y tope de esta venta)`);
      return;
    }
    if (!beforeRedeem()) return;
    setApplying(true);
    try {
      const res: any = await api.post(`/pos/orders/${orderId}/points`, { points: pointsInput });
      const r = res?.data ?? res;
      queryClient.invalidateQueries({ queryKey: ['pointsBalance', customerId] });
      onApplied(Number(r?.discountAmount ?? cashPreview), pointsInput);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'No se pudo canjear');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
        <Gift size={16} className="text-[#F97316]" />
        <span>Puntos de {customerName}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Loader2 size={14} className="animate-spin" />
          Cargando saldo...
        </div>
      ) : (
        <>
          <div className="flex gap-2 text-center">
            <div className="flex-1 bg-slate-50 rounded-lg p-1.5">
              <div className="text-xl font-bold text-slate-900">{currentPoints.toLocaleString('es-CL')}</div>
              <div className="text-xs text-slate-500">Saldo</div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg p-1.5">
              <div className="text-xl font-bold text-slate-900">${Number(balance?.cashValue ?? 0).toLocaleString('es-CL')}</div>
              <div className="text-xs text-slate-500">Equivale a</div>
            </div>
          </div>

          {maxRedeemable >= rules.minRedeemPoints ? (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-600">
                Cada {block} pts = ${rules.redeemBlockValue.toLocaleString('es-CL')} de descuento
              </p>
              {/* HOTFIX 298: máximo canjeable en esta venta */}
              <p className="text-xs text-slate-700">
                Máximo en esta venta: <strong>{maxRedeemable.toLocaleString('es-CL')} pts</strong> → <strong>${maxCash.toLocaleString('es-CL')}</strong>
                {hasSaleTotal && <span className="text-slate-500"> (tope {rules.maxRedeemPctPerSale}% del total)</span>}
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={rules.minRedeemPoints}
                  max={maxRedeemable}
                  step={block}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(Math.trunc(Number(e.target.value)))}
                  className="w-28 h-11 border border-slate-300 rounded-lg px-2 text-sm text-center font-semibold bg-white"
                  aria-label="Puntos a canjear"
                />
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={applying || pointsInput > maxRedeemable || pointsInput < rules.minRedeemPoints}
                  className="flex-1 h-11 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {applying
                    ? <><Loader2 size={14} className="animate-spin" /> Canjeando...</>
                    : <>Canjear {pointsInput} pts → <strong>-${cashPreview.toLocaleString('es-CL')}</strong></>}
                </button>
              </div>
            </div>
          ) : balanceRedeemable >= rules.minRedeemPoints ? (
            // HOTFIX 298: tiene saldo, pero el tope de esta venta no alcanza el canje mínimo
            <p className="text-xs text-slate-500">
              El tope de esta venta ({rules.maxRedeemPctPerSale}% del total = <strong>${(Number.isFinite(saleCapCash) ? saleCapCash : 0).toLocaleString('es-CL')}</strong>) no alcanza el canje mínimo de {rules.minRedeemPoints} pts
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Necesita al menos {rules.minRedeemPoints} puntos para canjear (tiene {currentPoints.toLocaleString('es-CL')})
            </p>
          )}
          {errorMsg && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle size={12} /> {errorMsg}
            </p>
          )}
        </>
      )}
    </div>
  );
};
