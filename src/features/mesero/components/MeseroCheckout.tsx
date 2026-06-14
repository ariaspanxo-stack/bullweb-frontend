// ═══════════════════════════════════════════════════════════════
// MESERO CHECKOUT — cobro de mesa desde la app mesero
// Respeta permisos: charge, discount_table, select_payment,
//                   close_table, print_receipt
// ═══════════════════════════════════════════════════════════════

import { useState }              from 'react';
import { X, Receipt, Loader2 }   from 'lucide-react';
import { useMutation }           from '@tanstack/react-query';
import toast                     from 'react-hot-toast';
import { useWaiterPermission }   from '../hooks/useWaiterPermission';
import { meseroService }         from '../meseroService';
import { PaymentMethodGrid }     from './PaymentMethodGrid';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '/api';

function getWaiterToken(): string {
  return localStorage.getItem('waiterToken') ?? '';
}

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
}

// ── Tipos ─────────────────────────────────────────────────────
interface OrderItem {
  id:       string;
  quantity: number;
  name:     string;
  price:    number;
}

interface CheckoutProps {
  isOpen:    boolean;
  orderId:   string;
  tableNum:  number | string;
  items:     OrderItem[];
  total:     number;
  tableId?:  string;
  onClose:   () => void;
  onSuccess: () => void;
}

// ── Componente principal ──────────────────────────────────────
export function MeseroCheckout({
  isOpen, orderId, tableNum, items, total, tableId,
  onClose, onSuccess,
}: CheckoutProps) {

  const canCharge      = useWaiterPermission('charge');
  const canDiscount    = useWaiterPermission('discount_table');
  const canSelectPay   = useWaiterPermission('select_payment');
  const canClose       = useWaiterPermission('close_table');
  const canPrint       = useWaiterPermission('print_receipt');

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountPct,   setDiscountPct]   = useState(0);

  const finalTotal = discountPct > 0
    ? Math.round(total * (1 - discountPct / 100))
    : total;

  // ── Solicitar cuenta (sin permiso de cobro) ───────────────
  const requestBillMutation = useMutation({
    mutationFn: async () => {
      await meseroService.requestBill(orderId);
    },
    onSuccess: () => {
      toast.success('Cuenta solicitada al cajero 🧾');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Cobrar ────────────────────────────────────────────────
  const chargeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/waiter/orders/${orderId}/charge`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${getWaiterToken()}`,
        },
        body: JSON.stringify({ paymentMethod, discountPct }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cobrar');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(`¡Cobrado ${formatCLP(data.total)}! 💰`);
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Cerrar mesa sin cobrar ────────────────────────────────
  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!tableId) return;
      const res = await fetch(`${API_BASE}/waiter/tables/${tableId}/close`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${getWaiterToken()}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al cerrar mesa');
    },
    onSuccess: () => {
      toast.success('Mesa cerrada');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Imprimir ──────────────────────────────────────────────
  const printMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/waiter/orders/${orderId}/print`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${getWaiterToken()}` },
      });
      if (!res.ok) throw new Error('Error al solicitar impresión');
    },
    onSuccess: () => toast.success('Boleta solicitada a impresora 🖨️'),
    onError:   (err: any) => toast.error(err.message),
  });

  const isProcessing = chargeMutation.isPending || requestBillMutation.isPending;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[55] bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-900
                      rounded-t-3xl max-h-[92vh] flex flex-col">

        {/* Handle + Header */}
        <div className="flex-shrink-0 px-5 pt-3 pb-4 border-b border-gray-800">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Cobrar — Mesa {tableNum}
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Sin permiso de cobro → solo "Pedir la cuenta" */}
        {!canCharge ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Receipt className="w-14 h-14 text-gray-500 mb-4" />
            <div className="text-white font-semibold mb-2 text-lg">
              No tienes permiso para cobrar
            </div>
            <div className="text-gray-400 text-sm mb-8 max-w-xs">
              Puedes solicitar la cuenta para que un cajero la procese
            </div>
            <button
              onClick={() => requestBillMutation.mutate()}
              disabled={requestBillMutation.isPending}
              className="w-full max-w-xs bg-blue-600 hover:bg-blue-500
                         text-white py-4 rounded-2xl font-semibold
                         active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {requestBillMutation.isPending ? '⏳ Enviando...' : '📋 Pedir la cuenta'}
            </button>
          </div>
        ) : (

          /* Con permiso — flujo completo */
          <div className="flex-1 overflow-y-auto">

            {/* Resumen de ítems */}
            <div className="px-5 py-4 border-b border-gray-800">
              <div className="text-gray-400 text-xs uppercase mb-2">Resumen</div>
              <div className="space-y-1">
                {items.slice(0, 5).map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-gray-400">
                      {formatCLP(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                {items.length > 5 && (
                  <div className="text-gray-600 text-xs">
                    +{items.length - 5} más…
                  </div>
                )}
              </div>
            </div>

            {/* Descuento */}
            {canDiscount && (
              <div className="px-5 py-4 border-b border-gray-800">
                <div className="text-gray-400 text-xs uppercase mb-3">Descuento</div>
                <div className="flex gap-2">
                  {[0, 5, 10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPct(pct)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium
                                  border transition-all active:scale-95
                        ${discountPct === pct
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                        }`}
                    >
                      {pct === 0 ? 'Sin' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Método de pago */}
            <div className="px-5 py-4 border-b border-gray-800">
              <div className="text-gray-400 text-xs uppercase mb-3">
                Método de pago
              </div>
              {canSelectPay ? (
                <PaymentMethodGrid
                  selected={paymentMethod}
                  onSelect={setPaymentMethod}
                />
              ) : (
                <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div>
                    <div className="text-white font-medium">Efectivo</div>
                    <div className="text-gray-500 text-xs">Método por defecto</div>
                  </div>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="px-5 py-4 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-lg">Total a cobrar</span>
                <span className="text-white text-2xl font-bold">
                  {formatCLP(finalTotal)}
                </span>
              </div>
              {discountPct > 0 && (
                <div className="text-gray-500 text-xs mt-1 text-right">
                  {formatCLP(total)} − {discountPct}% = {formatCLP(finalTotal)}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="px-5 py-5 space-y-3">
              <button
                onClick={() => chargeMutation.mutate()}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-500 text-white
                           py-5 rounded-2xl font-bold text-xl
                           active:scale-[0.98] transition-all
                           shadow-lg shadow-green-600/25
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chargeMutation.isPending
                  ? <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Procesando…
                    </span>
                  : `💰 Cobrar ${formatCLP(finalTotal)}`
                }
              </button>

              {canPrint && (
                <button
                  onClick={() => printMutation.mutate()}
                  disabled={printMutation.isPending}
                  className="w-full bg-gray-800 text-gray-300 py-3 rounded-xl
                             text-sm active:scale-[0.98] transition-all
                             disabled:opacity-50"
                >
                  {printMutation.isPending ? '…' : '🖨️ Imprimir boleta'}
                </button>
              )}

              {canClose && tableId && (
                <button
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending || isProcessing}
                  className="w-full text-gray-600 py-2 text-sm
                             hover:text-gray-400 transition-colors"
                >
                  Cerrar mesa sin cobrar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
