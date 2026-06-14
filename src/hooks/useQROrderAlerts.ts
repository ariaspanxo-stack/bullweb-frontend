// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useQROrderAlerts — escucha pedidos QR nuevos vía Socket.IO
// Permite al panel (Layout) mostrar alertas con sonido y aceptar/cancelar
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { playOrderAlert } from '@/lib/alert-sound';

export interface QROrder {
  orderId:         string;
  orderNumber:     string;
  orderType:       'mostrador' | 'delivery';
  customerName:    string;
  customerPhone:   string;
  customerAddress: string | null;
  total:           number;
  items:           Array<{ name: string; quantity: number; price: number }>;
  createdAt:       string;
  paymentMethod:   string | null;
  cashAmount:      number | null;
}

/** Lee el tenantId del usuario almacenado en localStorage (mismo origen que authService). */
const getTenantId = (): string | undefined => {
  try {
    const raw = localStorage.getItem('bullweb_user');
    if (!raw) return undefined;
    return (JSON.parse(raw) as { tenantId?: string }).tenantId;
  } catch {
    return undefined;
  }
};

export function useQROrderAlerts() {
  const [pendingOrders, setPendingOrders] = useState<QROrder[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Repetir sonido cada 30 s mientras haya pedidos pendientes ──
  useEffect(() => {
    if (pendingOrders.length > 0) {
      alertIntervalRef.current = setInterval(() => {
        const vol = parseFloat(localStorage.getItem('qr_alert_volume') ?? '0.8');
        playOrderAlert(vol);
      }, 30_000);
    } else {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current);
        alertIntervalRef.current = null;
      }
    }
    return () => {
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
    };
  }, [pendingOrders.length]);

  // ── Socket connection ──────────────────────────────────────────
  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)
      ?.replace('/api', '') ?? window.location.origin;

    const socket = io(apiUrl, {
      path:                 '/socket.io',
      transports:           ['websocket', 'polling'],
      reconnection:         true,
      reconnectionAttempts: 10,
      reconnectionDelay:    2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      const tid = getTenantId();
      if (tid) {
        socket.emit('joinTenantRoom', { tenantId: tid, room: 'mesero' });
      } else {
        // fallback: sala legacy (sin multi-tenant)
        socket.emit('joinStation', 'mesero');
      }
    });

    socket.on('new_qr_order', (order: QROrder) => {
      setPendingOrders(prev => {
        // Evitar duplicados
        if (prev.some(o => o.orderId === order.orderId)) return prev;
        return [...prev, order];
      });
      const vol = parseFloat(localStorage.getItem('qr_alert_volume') ?? '0.8');
      playOrderAlert(vol);
    });

    return () => {
      const tid = getTenantId();
      if (tid) {
        socket.emit('leaveTenantRoom', { tenantId: tid, room: 'mesero' });
      } else {
        socket.emit('leaveStation', 'mesero');
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Helpers para aceptar / cancelar ──────────────────────────
  const removeOrder = useCallback((orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.orderId !== orderId));
  }, []);

  const getToken = () => localStorage.getItem('bullweb_token') ?? '';

  const acceptOrder = useCallback(async (orderId: string) => {
    removeOrder(orderId);
    try {
      await fetch(`/api/qr-orders/${orderId}/accept`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* silencioso */ }
  }, [removeOrder]);

  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    removeOrder(orderId);
    try {
      await fetch(`/api/qr-orders/${orderId}/cancel`, {
        method:  'PATCH',
        headers: {
          Authorization:  `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
    } catch { /* silencioso */ }
  }, [removeOrder]);

  return { pendingOrders, acceptOrder, cancelOrder };
}
