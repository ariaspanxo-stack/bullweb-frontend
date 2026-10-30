// HOTFIX 297: "Cerrar Pedido" en Delivery pide confirmacion y medio de pago.
// Antes cobraba el total en un clic con el medio previsto. Ahora muestra numero, cliente,
// total y un selector con los medios ACTIVOS del tenant (mismo servicio que PaymentModal del POS).
// Solo al confirmar llama processPayment (o closeOrder si ya esta PAID o el total es 0).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmt } from './helpers';
import { formatSaleNumber } from '../../../utils/formatSaleNumber';
import { posService } from '../../../services/posService';
import { paymentMethodsService } from '../../../services/paymentMethodsService';
import type { Sale } from '../../../types/restaurant.types';
import { CashSessionRequiredNotice, isCashSessionRequired, CASH_SESSION_REQUIRED_MSG } from '../../cash/CashSessionRequiredNotice'; // HOTFIX 299

interface CloseDeliveryOrderModalProps {
  order: Sale;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}

export function CloseDeliveryOrderModal({ order, onClose, onDone }: CloseDeliveryOrderModalProps) {
  const totalNum = Number(order.total) || 0;
  const needsPayment = !(order.status === 'PAID' || totalNum <= 0);
  const plannedId = (order as any).paymentMethodId ? String((order as any).paymentMethodId) : '';

  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [cashRequired, setCashRequired] = useState<string | null>(null); // HOTFIX 299

  // HOTFIX 297: medios activos reales del tenant (paymentMethodsService.getActiveAsync, igual que PaymentModal)
  useEffect(() => {
    let alive = true;
    paymentMethodsService.getActiveAsync().then(list => {
      if (!alive) return;
      const mapped = list.map(m => ({ id: m.id, name: m.name }));
      setMethods(mapped);
      // Precarga el medio previsto del pedido solo si existe y esta activo
      if (plannedId && mapped.some(m => m.id === plannedId)) setSelectedId(plannedId);
      setLoadingMethods(false);
    });
    return () => { alive = false; };
  }, [plannedId]);

  const canConfirm = !saving && (!needsPayment || (!!selectedId && methods.some(m => m.id === selectedId)));

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    try {
      // Si la orden ya está pagada o el total es 0, cerrar directamente sin procesar pago
      if (!needsPayment) {
        await posService.closeOrder(order.id);
      } else {
        // Si hay monto que cobrar, procesar el pago con el medio elegido
        await posService.processPayment(order.id, {
          paymentMethodId: selectedId,
          amount: totalNum,
          tip: 0,
        });
      }

      toast.success('Pedido cerrado y pagado correctamente.');
      await onDone();
    } catch (err: any) {
      // HOTFIX 299 (B2-01): sin turno -> aviso con "Abrir turno"; el medio elegido se conserva para reintentar
      if (isCashSessionRequired(err)) {
        setCashRequired(err?.data?.error || err?.response?.data?.error || CASH_SESSION_REQUIRED_MSG);
        return;
      }
      console.error('[Cerrar Delivery] Error DETALLADO:', err);
      const errorData = err?.response?.data || err?.data || err;
      const backendMsg = errorData?.error || errorData?.message || err?.message;
      console.error('[Cerrar Delivery] Mensaje Backend:', backendMsg);
      toast.error(backendMsg || 'Error al cerrar el pedido.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={e => { e.stopPropagation(); if (!saving) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Cerrar pedido</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 space-y-1">
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-gray-500">Pedido</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {formatSaleNumber(order.orderNumber || order.id.slice(-6).toUpperCase())}
            </span>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-gray-500">Cliente</span>
            <span className="font-semibold text-gray-900 truncate">{order.customerName || 'Cliente'}</span>
          </div>
          <div className="flex justify-between items-end gap-2 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">${fmt(totalNum)}</span>
          </div>
        </div>

        {needsPayment ? (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
            {loadingMethods ? (
              <p className="text-sm text-gray-500 min-h-[44px] flex items-center">Cargando medios de pago...</p>
            ) : methods.length === 0 ? (
              <p className="text-sm text-red-600 min-h-[44px] flex items-center">No hay medios de pago activos.</p>
            ) : (
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                disabled={saving}
                className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="" disabled>Selecciona un medio de pago</option>
                {methods.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">El pedido no tiene monto pendiente; solo se cerrará.</p>
        )}

        {cashRequired !== null && (
          <div className="mt-4">
            <CashSessionRequiredNotice
              message={cashRequired}
              onOpened={() => setCashRequired(null)}
            />
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-60"
          >
            <CheckCircle size={16} />
            {saving ? 'Cerrando...' : 'Cobrar y cerrar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
