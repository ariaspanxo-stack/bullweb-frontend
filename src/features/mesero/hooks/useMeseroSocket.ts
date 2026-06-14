// ═══════════════════════════════════════════════════════════════
// HOOK: useMeseroSocket — WebSocket centralizado para la app mesero
// Usa el mismo servidor Socket.io que el KDS
// También escucha table_request para alertas de mesero/cuenta
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { playOrderAlert } from '@/lib/alert-sound';

// ── Tipos de solicitudes de mesa ──
export interface MeseroTableRequest {
  id:          string;
  type:        'call_waiter' | 'request_bill';
  tableNumber: string | null;
  message:     string;
  tenantId:    string;
  createdAt:   string;
}

interface MeseroSocketEvents {
  onOrderUpdated?: (order: any) => void;
  onOrderReady?:   (data: { orderId: string; order: any }) => void;
}

let _idCounter = 0;

export function useMeseroSocket(events: MeseroSocketEvents) {
  const socketRef   = useRef<Socket | null>(null);
  const eventsRef   = useRef(events);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Solicitudes de mesa pendientes ──
  const [pendingRequests, setPendingRequests] = useState<MeseroTableRequest[]>([]);

  // Mantener referencia actualizada sin reconectar
  eventsRef.current = events;

  // ── Repetir sonido cada 15s mientras haya solicitudes ──
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

  useEffect(() => {
    // Mismo origen que el KDS
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)
      ?.replace('/api', '') ?? window.location.origin;

    const socket = io(apiUrl, {
      path:                '/socket.io',
      transports:          ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: 5,
      reconnectionDelay:   2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Mesero WS] Conectado:', socket.id);
      socket.emit('joinStation', 'mesero');

      // Unirse al room del tenant para recibir table_request
      const tid = getTenantId();
      if (tid) {
        socket.emit('joinTenantRoom', { tenantId: tid, room: 'mesero' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Mesero WS] Desconectado:', reason);
    });

    socket.on('connect_error', (err) => {
      // No es crítico — el polling sigue como fallback
      console.warn('[Mesero WS] Error de conexión:', err.message);
    });

    socket.on('order.updated', (order: any) => {
      eventsRef.current.onOrderUpdated?.(order);
    });

    socket.on('order.ready', (data: { orderId: string; order: any }) => {
      eventsRef.current.onOrderReady?.(data);
    });

    // ── Escuchar solicitudes de mesa (mesero/cuenta) ──
    socket.on('table_request', (data: Omit<MeseroTableRequest, 'id'>) => {
      const request: MeseroTableRequest = {
        ...data,
        id: `mr_${Date.now()}_${++_idCounter}`,
      };
      setPendingRequests(prev => {
        const isDuplicate = prev.some(r =>
          r.tableNumber === request.tableNumber &&
          r.type === request.type &&
          (Date.now() - new Date(r.createdAt).getTime()) < 10_000
        );
        if (isDuplicate) return prev;
        return [...prev, request];
      });
      // Sonido inmediato
      const vol = parseFloat(localStorage.getItem('qr_alert_volume') ?? '0.8');
      playOrderAlert(vol);
      // Vibrar en móvil
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
    });

    return () => {
      const tid = getTenantId();
      if (tid) {
        socket.emit('leaveTenantRoom', { tenantId: tid, room: 'mesero' });
      }
      socket.emit('leaveStation', 'mesero');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Conectar solo una vez

  // ── Helper para descartar solicitud ──
  const dismissRequest = useCallback((id: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  return { socketRef, pendingRequests, dismissRequest };
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
