// ─────────────────────────────────────────────────────────────────────────────
// QROrderAlert — Modal de alerta para nuevos pedidos QR
// Se muestra en el panel cuando llega un pedido (Parte 3 del flujo)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Phone, MapPin, ShoppingBag, Clock } from 'lucide-react';
import type { QROrder } from '@/hooks/useQROrderAlerts';

const COUNTDOWN_SEC = 120;

const REJECT_REASONS = [
  'Sin stock',
  'Local cerrado',
  'Zona sin cobertura',
  'Pedido duplicado',
  'Otro',
];

function fmtCLP(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

interface Props {
  order:    QROrder;
  onAccept: (orderId: string) => void;
  onCancel: (orderId: string, reason?: string) => void;
}

export function QROrderAlert({ order, onAccept, onCancel }: Props) {
  const navigate = useNavigate();
  const [remaining,      setRemaining]      = useState(COUNTDOWN_SEC);
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason,   setRejectReason]   = useState('');

  // Cuenta regresiva — auto-cancela al llegar a 0
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(t);
          onCancel(order.orderId, 'Tiempo expirado');
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.orderId]);

  const isDelivery  = order.orderType === 'delivery';
  const pct         = (remaining / COUNTDOWN_SEC) * 100;
  const urgentColor = remaining <= 30 ? '#ef4444' : remaining <= 60 ? '#f97316' : '#22c55e';

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept(order.orderId);
      // Navegar al tab correcto en /restaurant
      const tabValue = order.orderType === 'delivery' ? 'delivery' : 'mostrador';
      navigate('/restaurant', { state: { openTab: tabValue } });
    } catch {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onCancel(order.orderId, rejectReason || 'Rechazado por el local');
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-orange-500/40 overflow-hidden">

        {/* Barra de progreso countdown */}
        <div className="h-1.5 bg-gray-800">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%`, background: urgentColor }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-lg">Nuevo pedido</h2>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: isDelivery ? '#1d4ed8' : '#92400e', color: 'white' }}
                >
                  {isDelivery ? '🛵 Delivery' : '🏪 Mostrador'}
                </span>
              </div>
              <p className="text-orange-400 font-mono font-bold">{order.orderNumber}</p>
            </div>
          </div>
          {/* Countdown badge */}
          <div className="flex items-center gap-1 shrink-0" style={{ color: urgentColor }}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-sm">{remaining}s</span>
          </div>
        </div>

        {/* Datos cliente */}
        <div className="px-5 pb-3 space-y-2">
          <div className="bg-gray-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-medium w-16 shrink-0">Cliente</span>
              <span className="text-white font-semibold">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <a
                href={`tel:${order.customerPhone}`}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {order.customerPhone}
              </a>
            </div>
            {isDelivery && order.customerAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">{order.customerAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Método de pago */}
        {order.paymentMethod && (
          <div className="px-5 pb-3">
            <div className="bg-gray-800 rounded-xl p-3">
              <div className="text-gray-400 text-xs mb-2">💳 Método de pago</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {order.paymentMethod === 'efectivo'      ? '💵'
                     : order.paymentMethod === 'transferencia' ? '📱'
                     : '💳'}
                  </span>
                  <span className="text-white font-semibold capitalize">{order.paymentMethod}</span>
                </div>
                {order.paymentMethod === 'efectivo' && order.cashAmount != null && (
                  <div className="text-right">
                    <div className="text-gray-400 text-xs">Paga con</div>
                    <div className="text-green-400 font-bold">{fmtCLP(order.cashAmount)}</div>
                    {order.cashAmount > order.total && (
                      <div className="text-gray-500 text-xs">
                        Vuelto: {fmtCLP(order.cashAmount - order.total)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="px-5 pb-3">
          <div className="bg-gray-800/60 rounded-xl divide-y divide-gray-700/50 max-h-36 overflow-y-auto">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                <span className="text-gray-300">
                  <span className="text-orange-400 font-bold">{item.quantity}×</span>{' '}
                  {item.name}
                </span>
                <span className="text-white font-semibold shrink-0 ml-2">
                  {fmtCLP(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-2 px-1">
            <span className="text-gray-400 text-sm">Total</span>
            <span className="text-white font-black text-lg">{fmtCLP(order.total)}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5 space-y-3">
          {!showRejectForm ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400 font-semibold transition-all active:scale-95 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Rechazar
              </button>
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold transition-colors active:scale-95 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {isProcessing ? 'Procesando...' : 'Aceptar'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Razón del rechazo:</p>
              <div className="flex flex-wrap gap-2">
                {REJECT_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setRejectReason(r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      rejectReason === r
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-400 text-sm hover:border-gray-500 transition-colors"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
