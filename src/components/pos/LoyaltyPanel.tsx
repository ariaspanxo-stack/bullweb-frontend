import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, Loader2, AlertCircle } from 'lucide-react';
import { customersApi } from '@/services/api';

interface LoyaltyPanelProps {
  customerId: string;
  customerName: string;
  onRedeem: (cashDiscount: number) => void;
}

export const LoyaltyPanel = ({ customerId, customerName, onRedeem }: LoyaltyPanelProps) => {
  const queryClient = useQueryClient();
  const [pointsInput, setPointsInput] = useState<number>(100);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pointsBalance', customerId],
    queryFn: () => customersApi.getPointsBalance(customerId),
    enabled: !!customerId,
  });

  const balance = data?.data ?? data;

  const redeemMutation = useMutation({
    mutationFn: (pts: number) => customersApi.redeemPoints(customerId, pts),
    onSuccess: (res: any) => {
      const result = res?.data ?? res;
      queryClient.invalidateQueries({ queryKey: ['pointsBalance', customerId] });
      setErrorMsg(null);
      onRedeem(result.cashValue ?? 0);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Error al canjear puntos');
    },
  });

  const currentPoints = balance?.points ?? 0;
  const totalEarned   = balance?.totalEarned ?? 0;
  const totalSpent    = balance?.totalSpent  ?? 0;

  const maxRedeemable = Math.floor(currentPoints / 100) * 100;
  const cashPreview   = Math.floor(pointsInput / 100) * 1000;

  const handleRedeem = () => {
    setErrorMsg(null);
    if (pointsInput < 100 || pointsInput > currentPoints || pointsInput % 100 !== 0) {
      setErrorMsg('Ingresa un múltiplo de 100 ≤ saldo actual');
      return;
    }
    redeemMutation.mutate(pointsInput);
  };

  return (
    <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
        <Gift size={16} />
        <span>Puntos de {customerName}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-amber-600 text-xs">
          <Loader2 size={14} className="animate-spin" />
          Cargando saldo...
        </div>
      ) : (
        <>
          <div className="flex gap-2 text-center">
            <div className="flex-1 bg-white rounded-lg p-1.5">
              <div className="text-xl font-bold text-amber-700">{currentPoints}</div>
              <div className="text-xs text-gray-500">Saldo actual</div>
            </div>
            <div className="flex-1 bg-white rounded-lg p-1.5">
              <div className="text-base font-semibold text-green-600">{totalEarned}</div>
              <div className="text-xs text-gray-500">Ganados</div>
            </div>
            <div className="flex-1 bg-white rounded-lg p-1.5">
              <div className="text-base font-semibold text-gray-500">{totalSpent}</div>
              <div className="text-xs text-gray-500">Canjeados</div>
            </div>
          </div>

          {maxRedeemable >= 100 && (
            <div className="space-y-1.5">
              <p className="text-xs text-amber-700 font-medium">
                Cada 100 pts = $1.000 descuento
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={100}
                  max={maxRedeemable}
                  step={100}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(Number(e.target.value))}
                  className="w-24 border border-amber-300 rounded px-2 py-1 text-sm text-center bg-white"
                />
                <span className="flex items-center text-sm text-gray-600">
                  pts = ${cashPreview.toLocaleString('es-CL')} desc.
                </span>
              </div>
              {errorMsg && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle size={12} /> {errorMsg}
                </p>
              )}
              <button
                onClick={handleRedeem}
                disabled={redeemMutation.isPending || pointsInput > currentPoints || pointsInput < 100}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                {redeemMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Canjeando...
                  </span>
                ) : (
                  `Canjear ${pointsInput} pts → -$${cashPreview.toLocaleString('es-CL')}`
                )}
              </button>
            </div>
          )}

          {maxRedeemable < 100 && currentPoints > 0 && (
            <p className="text-xs text-amber-600">
              Necesita al menos 100 puntos para canjear (tienes {currentPoints})
            </p>
          )}
        </>
      )}
    </div>
  );
};
