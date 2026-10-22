// ═══════════════════════════════════════════════════════════════════════
// OnlineOrders — Bandeja de Pedidos Online (Carta QR)
// Ruta: /online-orders
// Muestra todos los pedidos recibidos vía QR, permite aceptar/rechazar.
// Polling cada 30 s + escucha socket QR_ORDER_STATUS_CHANGED si está
// disponible a través de useQROrderAlerts.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ChefHat, X, CheckCircle, ShoppingBag, Phone } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { chileDateStr } from '@/lib/chileDate';
import { CustomerSegmentBadge } from '@/components/customers/CustomerSegmentBadge';
import {
  QrAcceptForm, QrRejectForm, SinResponderBadge, useQrAcceptDefaults, qrOrderTypeLabel,
  QR_UNANSWERED_MINUTES, type QrAcceptDefaults,
} from '@/components/orders/QrDecisionForms';

// ──────────────────────────────
// Tipos
// ──────────────────────────────
interface OrderItem {
  name:     string;
  quantity: number;
  price:    number;
  notes?:   string | null;
}

interface QROnlineOrder {
  id:            string;
  customerName:  string | null;
  customerPhone: string | null;
  customerSegment?: string | null;  // Hotfix #200 (B1) — badge ⭐ VIP (JOIN backend por phone)
  orderType:     string | null;
  tableNumber:   string | null;
  status:        string;
  onlineStatus:  'pending' | 'preparing' | 'done' | 'rejected';
  total:         number;
  items:         OrderItem[];
  customerNote:  string | null;
  paymentMethod: string | null;
  viewedAt:      string | null;
  createdAt:     string;
  createdDateCl: string | null; // HOTFIX 272 lote — día en hora Chile (BD)
  minutesAgo:    number;
  deliveryFee:   number;        // HOTFIX 272 — envío informado (prellena el formulario de aceptar)
  estimatedMinutes: number | null;
}

// ──────────────────────────────
// Helpers
// ──────────────────────────────
function fmtCLP(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function fmtMin(min: number) {
  if (min < 1)  return 'hace un momento';
  if (min < 60) return `hace ${Math.floor(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `hace ${h}h ${m > 0 ? m + 'min' : ''}`.trim();
}

// ──────────────────────────────
// StatusBadge
// ──────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: '⏳ Pendiente',  cls: 'bg-orange-100 text-orange-700' },
    preparing: { label: '👨‍🍳 Preparando', cls: 'bg-blue-100 text-blue-700'   },
    done:      { label: '✅ Listo',       cls: 'bg-green-100 text-green-700'  },
    rejected:  { label: '❌ Rechazado',   cls: 'bg-red-100 text-red-600'     },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ──────────────────────────────
// OrderCard
// ──────────────────────────────
interface OrderCardProps {
  order:        QROnlineOrder;
  defaults:     QrAcceptDefaults;
  onAccept:     (id: string, estimatedMinutes: number, deliveryFee?: number) => Promise<void>;
  onDone:       (id: string) => Promise<void>;
  onReject:     (id: string, reason?: string) => Promise<void>;
  processing:   string | null;
}

function OrderCard({ order, defaults, onAccept, onDone, onReject, processing }: OrderCardProps) {
  const isLoading        = processing === order.id;
  // HOTFIX 272 — Aceptar abre minutos (+ envío si delivery); Rechazar abre motivos
  const [mode, setMode]  = useState<'idle' | 'accept' | 'reject'>('idle');
  const isDelivery       = String(order.orderType ?? '').toLowerCase() === 'delivery';
  const unanswered       = order.onlineStatus === 'pending' && order.minutesAgo > QR_UNANSWERED_MINUTES;
  const borderByStatus   = {
    pending:   'border-orange-400 shadow-orange-100',
    preparing: 'border-blue-400 shadow-blue-100',
    done:      'border-green-300 shadow-green-50',
    rejected:  'border-red-200 opacity-60',
  }[order.onlineStatus] ?? 'border-gray-200';

  return (
    <div className={`bg-white rounded-xl border-2 p-5 shadow-sm transition-all ${borderByStatus}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-gray-900">
              {isDelivery ? '🛵' : '🍽️'} Pedido · {qrOrderTypeLabel(order.orderType, order.tableNumber)}
            </span>
            <StatusBadge status={order.onlineStatus} />
            {unanswered && <SinResponderBadge />}
            {!order.viewedAt && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                NUEVO
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {order.tableNumber ? `Mesa ${order.tableNumber} · ` : ''}
            {fmtMin(order.minutesAgo)}
          </p>
          {order.customerName && (
            <p className="text-sm text-gray-700 mt-0.5 font-medium flex items-center gap-1.5">
              {order.customerName}
              <CustomerSegmentBadge segment={order.customerSegment} />
            </p>
          )}
          {order.customerPhone && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" /> {order.customerPhone}
            </p>
          )}
        </div>
        <span className="text-xl font-black text-orange-500">{fmtCLP(order.total)}</span>
      </div>

      {/* Items */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        {(order.items ?? []).length === 0 ? (
          <p className="text-xs text-gray-400">Sin detalle de items</p>
        ) : (
          order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0 border-gray-200">
              <span className="text-gray-700">{item.quantity}× {item.name}</span>
              <span className="text-gray-500 font-medium">{fmtCLP(item.price * item.quantity)}</span>
            </div>
          ))
        )}
      </div>

      {/* Nota del cliente */}
      {order.customerNote && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3 text-sm text-yellow-800">
          💬 {order.customerNote}
        </div>
      )}

      {/* Método de pago */}
      {order.paymentMethod && (
        <p className="text-xs text-gray-400 mb-3">💳 {order.paymentMethod}</p>
      )}

      {/* Acciones */}
      {order.onlineStatus === 'pending' && mode === 'idle' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setMode('accept')}
            disabled={isLoading}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-lg text-sm transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ChefHat className="w-4 h-4" />
            )}
            Aceptar
          </button>
          <button
            onClick={() => setMode('reject')}
            disabled={isLoading}
            className="min-h-[44px] px-4 flex items-center gap-1.5 border-2 border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
          >
            <X className="w-4 h-4" />
            Rechazar
          </button>
        </div>
      )}
      {order.onlineStatus === 'pending' && mode === 'accept' && (
        <div className="mt-3">
          <QrAcceptForm
            isDelivery={isDelivery}
            subtotal={order.total}
            defaults={defaults}
            initialFee={order.deliveryFee}
            busy={isLoading}
            onBack={() => setMode('idle')}
            onConfirm={(minutes, fee) => onAccept(order.id, minutes, fee)}
          />
        </div>
      )}
      {order.onlineStatus === 'pending' && mode === 'reject' && (
        <div className="mt-3">
          <QrRejectForm
            busy={isLoading}
            onBack={() => setMode('idle')}
            onConfirm={reason => onReject(order.id, reason)}
          />
        </div>
      )}
      {order.onlineStatus === 'done' && order.estimatedMinutes != null && (
        <p className="text-xs text-gray-500 mt-2">Aceptado con demora de <span className="font-bold">{order.estimatedMinutes} min</span></p>
      )}

      {order.onlineStatus === 'preparing' && (
        <button
          onClick={() => onDone(order.id)}
          disabled={isLoading}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2 rounded-lg text-sm transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Marcar como listo
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════
// Página principal
// ══════════════════════════════
const FILTERS = [
  { key: 'all',      label: 'Todos'        },
  { key: 'pending',  label: '⏳ Pendientes' },
  { key: 'preparing',label: '👨‍🍳 Preparando' },
  { key: 'done',     label: '✅ Listos'     },
  { key: 'rejected', label: '❌ Rechazados' },
] as const;

export default function OnlineOrders() {
  const [orders,      setOrders]     = useState<QROnlineOrder[]>([]);
  const [filter,      setFilter]     = useState<string>('all');
  const [loading,     setLoading]    = useState(true);
  const [processing,  setProcessing] = useState<string | null>(null);
  const [_unread,      _setUnread]    = useState(0);
  // HOTFIX 272 lote: "hoy" en hora Chile (antes día UTC)
  const [selectedDate, setSelectedDate] = useState(() => chileDateStr());
  const [page,        setPage]       = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const PAGE_SIZE = 10;
  const todayStr  = chileDateStr();

  // Reset página al cambiar cualquier filtro
  useEffect(() => { setPage(1); }, [selectedDate, filter]);

  // Mapeo de filtros de UI → status en backend
  const filterToStatus: Record<string, string> = {
    pending:   'PENDING_APPROVAL',
    done:      'CONFIRMED',
    rejected:  'REJECTED',
  };

  // ── Cargar pedidos ───────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const statusParam = filter !== 'all' && filterToStatus[filter]
        ? `status=${filterToStatus[filter]}&`
        : '';
      const res = await api.get(`/qr-orders?${statusParam}limit=200`);
      const raw: any[] = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.data) ? res.data.data : []);
      const now = Date.now();
      const mapped: QROnlineOrder[] = raw.map((r: any) => ({
        id:            r.id,
        customerName:  r.customerName ?? null,
        customerPhone: r.customerPhone ?? null,
        customerSegment: r.customerSegment ?? null,
        orderType:     r.orderType ?? null,
        tableNumber:   r.tableNumber ?? null,
        status:        r.status,
        onlineStatus:  r.status === 'PENDING_APPROVAL' ? 'pending'
                     : r.status === 'CONFIRMED'         ? 'done'
                     : r.status === 'REJECTED'          ? 'rejected'
                     :                                    'pending',
        total:         Number(r.total ?? 0),
        items:         Array.isArray(r.items) ? r.items : [],
        customerNote:  r.notes ?? null,
        paymentMethod: r.paymentMethod ?? null,
        viewedAt:      r.viewedAt ?? null,
        createdAt:     r.createdAt,
        createdDateCl: r.createdDateCl ?? null,
        // HOTFIX 272: minutos calculados en la BD (created_at sin zona); el cálculo local queda de respaldo
        minutesAgo:    r.minutesAgo != null ? Number(r.minutesAgo) : (now - new Date(r.createdAt).getTime()) / 60000,
        deliveryFee:   Number(r.deliveryFee ?? 0) || 0,
        estimatedMinutes: r.estimatedMinutes != null ? Number(r.estimatedMinutes) : null,
      }));
      // Filtro 'preparing' no existe en backend → mostrar vacío
      setOrders(filter === 'preparing' ? [] : mapped);
      _setUnread(mapped.filter(o => o.onlineStatus === 'pending').length);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Carga inicial y al cambiar filtro
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Polling cada 30 s
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchOrders(true), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOrders]);

  // ── Filtro por fecha (local) ──────────────────────────────────────────
  // HOTFIX 272 lote: día del pedido en hora Chile calculado en la BD (createdDateCl); respaldo en el navegador
  const dateFiltered = orders.filter(order => {
    const orderDate = order.createdDateCl ?? chileDateStr(new Date(order.createdAt));
    return orderDate === selectedDate;
  });

  // ── Paginación ────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(dateFiltered.length / PAGE_SIZE));
  const paginated  = dateFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Acciones ─────────────────────────────────────────────────────────
  const acceptDefaults = useQrAcceptDefaults(); // HOTFIX 272 — prellenado de minutos y envío

  const handleStatus = async (orderId: string, status: 'preparing' | 'done' | 'rejected', reason?: string) => {
    setProcessing(orderId);
    // Actualización optimista
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, onlineStatus: status } : o
    ));
    try {
      if (status === 'rejected') {
        await api.patch(`/qr-orders/${orderId}/cancel`, { reason: reason ?? 'Rechazado por el local' });
      } else {
        await api.patch(`/qr-orders/${orderId}/accept`, {});
      }
      await fetchOrders(true);
    } catch {
      await fetchOrders(true);
    } finally {
      setProcessing(null);
    }
  };

  // HOTFIX 272 — aceptar con minutos (+ envío si delivery) y rechazar con motivo opcional; sin optimismo:
  // la tarjeta cambia solo con la respuesta del backend, y un error se avisa.
  const handleAccept = async (orderId: string, estimatedMinutes: number, deliveryFee?: number) => {
    setProcessing(orderId);
    try {
      await api.post(`/qr-orders/${orderId}/accept`, { estimatedMinutes, ...(deliveryFee != null ? { deliveryFee } : {}) });
      toast.success(`Pedido aceptado: ${estimatedMinutes} min`);
    } catch (e: any) {
      toast.error(e?.data?.error ?? e?.message ?? 'No se pudo aceptar el pedido');
    } finally {
      await fetchOrders(true);
      setProcessing(null);
    }
  };

  const handleReject = async (orderId: string, reason?: string) => {
    setProcessing(orderId);
    try {
      await api.post(`/qr-orders/${orderId}/reject`, reason ? { reason } : {});
      toast.success('Pedido rechazado');
    } catch (e: any) {
      toast.error(e?.data?.error ?? e?.message ?? 'No se pudo rechazar el pedido');
    } finally {
      await fetchOrders(true);
      setProcessing(null);
    }
  };

  // ── Pending count activo (para el título) ────────────────────────────
  const pendingCount = orders.filter(o => o.onlineStatus === 'pending').length;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Pedidos Online</h1>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Pedidos recibidos vía Carta QR · actualiza cada 30 s
          </p>
        </div>
        <button
          onClick={() => fetchOrders()}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50"
          title="Refrescar"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Selector de fecha */}
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-600 font-medium">📅 Fecha:</label>
        <input
          type="date"
          value={selectedDate}
          max={todayStr}
          onChange={e => { setSelectedDate(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {selectedDate !== todayStr && (
          <button
            onClick={() => { setSelectedDate(todayStr); setPage(1); }}
            className="text-xs text-orange-500 hover:underline"
          >
            Ir a hoy
          </button>
        )}
        {dateFiltered.length > 0 && (
          <span className="text-xs text-gray-400 ml-1">
            {dateFiltered.length} pedido{dateFiltered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-orange-400" />
          <p>Cargando pedidos…</p>
        </div>
      ) : dateFiltered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🧾</p>
          <p className="font-semibold text-gray-600">No hay pedidos {filter !== 'all' ? `con estado "${FILTERS.find(f=>f.key===filter)?.label}"` : 'online'}</p>
          <p className="text-sm mt-1">Los pedidos de Carta QR aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {paginated.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                defaults={acceptDefaults}
                processing={processing}
                onAccept={handleAccept}
                onDone={id => handleStatus(id, 'done')}
                onReject={handleReject}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
