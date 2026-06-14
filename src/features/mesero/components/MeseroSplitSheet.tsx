// ═══════════════════════════════════════════════════════════════
// MESERO SPLIT SHEET — dividir cuenta por ítems
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Scissors, Loader2, Minus, Plus } from 'lucide-react';
import { meseroService } from '../meseroService';
import toast from 'react-hot-toast';

interface OrderItem {
  id:        string;
  quantity:  number;
  unitPrice: number;
  products:  { name: string } | null;
}

interface MeseroSplitSheetProps {
  isOpen:   boolean;
  orderId:  string;
  items:    OrderItem[];
  onClose:  () => void;
  onSplit:  () => void;
}

export function MeseroSplitSheet({
  isOpen, orderId, items, onClose, onSplit,
}: MeseroSplitSheetProps) {

  const [splitQty, setSplitQty] = useState<Record<string, number>>({});
  const [loading,  setLoading]  = useState(false);

  if (!isOpen) return null;

  const splitItems = Object.entries(splitQty)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ itemId, quantity }));

  const splitTotal = items.reduce((sum, item) => {
    const qty = splitQty[item.id] ?? 0;
    return sum + qty * item.unitPrice;
  }, 0);

  const remainTotal = items.reduce((sum, item) => {
    const qtyOut = splitQty[item.id] ?? 0;
    const qtyIn  = item.quantity - qtyOut;
    return sum + qtyIn * item.unitPrice;
  }, 0);

  const canSplit = splitItems.length > 0 && remainTotal > 0;

  const handleSplit = async () => {
    if (!canSplit) return;
    setLoading(true);
    try {
      await meseroService.splitBill(orderId, splitItems);
      toast.success('Cuenta dividida correctamente');
      setSplitQty({});
      onSplit();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al dividir la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const setQty = (itemId: string, delta: number, max: number) => {
    setSplitQty(prev => {
      const current = prev[itemId] ?? 0;
      const next    = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl
                      max-h-[90vh] flex flex-col">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-gray-800 text-lg">Dividir cuenta</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="px-5 text-sm text-gray-400 pb-3 flex-shrink-0">
          Selecciona los ítems que van a la cuenta nueva
        </p>

        {/* Lista scrollable */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {items.map(item => {
            const qty   = splitQty[item.id] ?? 0;
            const isOut = qty > 0;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                  ${isOut ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">
                    {item.products?.name ?? 'Ítem'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCLP(item.unitPrice)} × {item.quantity}
                  </p>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setQty(item.id, -1, item.quantity)}
                    disabled={qty === 0}
                    className="w-8 h-8 rounded-full bg-white border-2 border-gray-200
                               flex items-center justify-center disabled:opacity-30
                               transition-colors hover:border-indigo-300"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className={`w-6 text-center font-bold text-sm
                    ${isOut ? 'text-indigo-600' : 'text-gray-300'}`}>
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(item.id, +1, item.quantity)}
                    disabled={qty >= item.quantity}
                    className="w-8 h-8 rounded-full bg-white border-2 border-gray-200
                               flex items-center justify-center disabled:opacity-30
                               transition-colors hover:border-indigo-300"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview + botón confirmar */}
        <div className="flex-shrink-0 px-4 pt-4 pb-8 border-t border-gray-100 space-y-3 mt-2">

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Esta mesa queda</p>
              <p className="font-black text-gray-800">{formatCLP(remainTotal)}</p>
            </div>
            <div className={`rounded-2xl p-3 text-center ${splitItems.length > 0 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-400 mb-1">Cuenta nueva</p>
              <p className={`font-black ${splitItems.length > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                {formatCLP(splitTotal)}
              </p>
            </div>
          </div>

          {splitItems.length > 0 && remainTotal <= 0 && (
            <p className="text-xs text-red-500 text-center">
              Debe quedar al menos un ítem en la mesa original
            </p>
          )}

          <button
            onClick={handleSplit}
            disabled={!canSplit || loading}
            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-base
                       rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Dividiendo...</>
            ) : (
              <><Scissors className="w-5 h-5" /> Crear cuenta nueva</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}
