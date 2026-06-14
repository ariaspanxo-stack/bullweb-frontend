import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatSaleNumber } from '@/utils/formatSaleNumber';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Clock, User, Utensils, CreditCard, Printer, XCircle } from 'lucide-react';
import { posService } from '@/services/posService';
import toast from 'react-hot-toast';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onPrint?: () => void;
  onRefresh?: () => void;
}

const statusVariants: Record<string, any> = {
  PENDING: 'warning',
  PREPARING: 'info',
  READY: 'default',
  PAID: 'success',
  CANCELLED: 'danger'
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PREPARING: 'Preparando',
  READY: 'Lista',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada'
};

export default function OrderDetailModal({ 
  isOpen, 
  onClose, 
  order,
  onPrint,
  onRefresh,
}: OrderDetailModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  if (!order) return null;

  const canCancel = !['PAID', 'CANCELLED'].includes(order.status);

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await posService.cancelOrder(order.id, cancelReason.trim());
      toast.success('Orden cancelada');
      setShowCancelConfirm(false);
      setCancelReason('');
      onClose();
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message || 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Orden ${formatSaleNumber(order.orderNumber)}`}>
      <div className="space-y-6">
        {/* Header con estado */}
        <div className="flex items-center justify-between">
          <Badge variant={statusVariants[order.status]} className="text-lg px-4 py-2">
            {statusLabels[order.status]}
          </Badge>
          <div className="text-sm text-gray-600">
            {formatDateTime(order.createdAt)}
          </div>
        </div>

        {/* Información general */}
        <div className="grid grid-cols-2 gap-4">
          {(order.tables || order.table) && (
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-1">
                <Utensils className="w-4 h-4" />
                Mesa
              </label>
              <div className="font-medium mt-1">Mesa {(order.tables || order.table).number}</div>
            </div>
          )}
          {(order.users_orders_waiterIdTousers || order.waiter) && (
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-1">
                <User className="w-4 h-4" />
                Mesero
              </label>
              <div className="font-medium mt-1">{(order.users_orders_waiterIdTousers || order.waiter).name}</div>
            </div>
          )}
          {(order.customers || order.customer || order.customerName) && (
            <div>
              <label className="text-sm text-gray-600">Cliente</label>
              <div className="font-medium mt-1">
                {order.customers?.name || order.customer?.name || order.customerName}
              </div>
              {(order.customers?.phone || order.customer?.phone) && (
                <div className="text-sm text-gray-500">{order.customers?.phone || order.customer?.phone}</div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
          <div className="space-y-2">
            {(order.order_items || order.items || []).map((item: any) => (
              <div key={item.id} className="flex items-start justify-between py-2 border-b">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">{item.quantity}×</span>
                    <span className="font-medium">{(item.products || item.product)?.name}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-sm text-gray-600 ml-6">
                      {item.modifiers.join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-sm text-gray-600 italic ml-6">
                      Nota: {item.notes}
                    </div>
                  )}
                </div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento:</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA (19%):</span>
              <span className="font-medium">{formatCurrency(order.tax)}</span>
            </div>
          )}
          {order.tip > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Propina:</span>
              <span className="font-medium">{formatCurrency(order.tip)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span className="text-primary-600">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Pagos */}
        {order.payments && order.payments.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pagos
            </h3>
            <div className="space-y-2">
              {order.payments.map((payment: any) => (
                <div key={payment.id} className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">{payment.paymentMethod?.name}</span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Línea de tiempo */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Línea de Tiempo
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Creada:</span>
              <span className="font-medium">{formatDateTime(order.createdAt)}</span>
            </div>
            {order.updatedAt && order.updatedAt !== order.createdAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-600">Actualizada:</span>
                <span className="font-medium">{formatDateTime(order.updatedAt)}</span>
              </div>
            )}
            {order.paidAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Pagada:</span>
                <span className="font-medium">{formatDateTime(order.paidAt)}</span>
              </div>
            )}
            {order.cancelledAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Cancelada:</span>
                <span className="font-medium">{formatDateTime(order.cancelledAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cerrar
          </Button>
          {onPrint && (
            <Button onClick={onPrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(true)}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Sub-modal: motivo de cancelación */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-1 text-gray-900">Cancelar orden</h3>
            <p className="text-sm text-gray-500 mb-4">Esta acción no se puede deshacer.</p>

            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Motivo de cancelación *
            </label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Ej: cliente se fue, error en el pedido..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                disabled={!cancelReason.trim() || cancelling}
                onClick={handleCancelConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-40 transition"
              >
                {cancelling ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
