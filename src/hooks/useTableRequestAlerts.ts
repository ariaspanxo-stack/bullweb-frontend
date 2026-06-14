// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useTableRequestAlerts — escucha solicitudes de mesa vía Socket.IO
// Replica el mismo mecanismo que useQROrderAlerts para pedidos QR
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { playOrderAlert } from '@/lib/alert-sound';

export interface TableRequest {
  id:          string;
  type:        'call_waiter' | 'request_bill';
  tableNumber: string | null;
  message:     string;
  tenantId:    string;
  createdAt:   string;
}

/** Lee el tenantId del usuario almacenado en localStorage */
const getTenantId = (): string | undefined => {
  try {
    const raw = localStorage.getItem('bullweb_user');
    if (!raw) return undefined;
    return (JSON.parse(raw) as { tenantId?: string }).tenantId;
  } catch {
    return undefined;
  }
};

let idCounter = 0;

export function useTableRequestAlerts() {
  const [pendingRequests, setPendingRequests] = useState<TableRequest[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Repetir sonido cada 15 s mientras haya solicitudes pendientes ──
  useEffect(() => {
    if (pendingRequests.length > 0) {
      alertIntervalRef.current = setInterval(() => {
        const vol = parseFloat(localStorage.getItem('qr_alert_volume') ?? '0.8');
        playOrderAlert(vol);
      }, 15_000);
    } else {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current);
        alertIntervalRef.current = null;
      }
    }
    return () => {
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
    };
  }, [pendingRequests.length]);

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
      }
    });

    // ── Escuchar evento table_request del backend ──
    socket.on('table_request', (data: Omit<TableRequest, 'id'>) => {
      const request: TableRequest = {
        ...data,
        id: `tr_${Date.now()}_${++idCounter}`,
      };
      setPendingRequests(prev => {
        // Evitar duplicados por tableNumber+type en los últimos 10s
        const isDuplicate = prev.some(r =>
          r.tableNumber === request.tableNumber &&
          r.type === request.type &&
          (Date.now() - new Date(r.createdAt).getTime()) < 10_000
        );
        if (isDuplicate) return prev;
        return [...prev, request];
      });
      // Reproducir sonido inmediatamente (mismo que pedidos QR)
      const vol = parseFloat(localStorage.getItem('qr_alert_volume') ?? '0.8');
      playOrderAlert(vol);
    });

    return () => {
      const tid = getTenantId();
      if (tid) {
        socket.emit('leaveTenantRoom', { tenantId: tid, room: 'mesero' });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Helper para descartar ──────────────────────────────────────
  const dismissRequest = useCallback((id: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  return { pendingRequests, dismissRequest };
}