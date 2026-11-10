// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useTableRequestAlerts — escucha solicitudes de mesa vía Socket.IO
// Replica el mismo mecanismo que useQROrderAlerts para pedidos QR
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { contextSocketAuth } from '@/lib/socketAuth';
import { playOrderAlert } from '@/lib/alert-sound';
import api from '@/services/api'; // LOTE 323 (B4-14)

// LOTE 323 (B4-14): los llamados se confirman en el servidor. En la app mesero (token de mesero) se usan las rutas
// /waiter/table-requests; en el panel, /pos/table-requests. Al atender en un equipo, desaparece de todos.
const isWaiterApp = () => window.location.pathname.startsWith('/mesero') && !!localStorage.getItem('waiterToken');
async function trFetch(method: 'GET' | 'POST', path: string): Promise<any> {
  if (isWaiterApp()) {
    const base = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
    const tenant = localStorage.getItem('waiterTenant') ?? '';
    const r = await fetch(`${base}/waiter${path}`, {
      method,
      headers: { Authorization: `Bearer ${localStorage.getItem('waiterToken') ?? ''}`, ...(tenant ? { 'x-tenant-slug': tenant } : {}) },
    });
    const j = await r.json().catch(() => null);
    return j?.data ?? null;
  }
  const r: any = method === 'GET' ? await api.get(`/pos${path}`) : await api.post(`/pos${path}`);
  return r?.data ?? null;
}

export interface TableRequest {
  requestId?: string | null; // LOTE 323 (B4-14): id del llamado en el servidor
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
      auth:                 contextSocketAuth, // TAREA 281: handshake autenticado
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
    // LOTE 323 (B4-14): otro equipo atendio el llamado -> se quita aqui tambien
    socket.on('table_request.ack', (data: { requestId?: string }) => {
      if (data?.requestId) setPendingRequests(prev => prev.filter(r => r.requestId !== data.requestId));
    });

    socket.on('table_request', (data: Omit<TableRequest, 'id'>) => {
      const request: TableRequest = {
        ...data,
        id: data.requestId ? String(data.requestId) : `tr_${Date.now()}_${++idCounter}`,
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

  // LOTE 323 (B4-14): al abrir, los llamados sin atender de las ultimas 2 h (un equipo que se conecta tarde los ve)
  useEffect(() => {
    trFetch('GET', '/table-requests').then((rows: any[] | null) => {
      if (!Array.isArray(rows) || !rows.length) return;
      setPendingRequests(prev => {
        const have = new Set(prev.map(r => r.requestId).filter(Boolean));
        const add = rows.filter(r => r?.requestId && !have.has(r.requestId)).map(r => ({
          requestId: String(r.requestId), id: String(r.requestId), type: r.type === 'call_waiter' ? 'call_waiter' as const : 'request_bill' as const,
          tableNumber: r.tableNumber ?? null, message: String(r.message ?? ''), tenantId: getTenantId() ?? '', createdAt: String(r.createdAt),
        }));
        return add.length ? [...prev, ...add] : prev;
      });
    }).catch(() => {});
  }, []);

  // ── Helper para descartar ──────────────────────────────────────
  // LOTE 323 (B4-14): descartar = atendido: se confirma en el servidor y se quita de todos los equipos
  const dismissRequest = useCallback((id: string) => {
    setPendingRequests(prev => {
      const r = prev.find(x => x.id === id);
      if (r?.requestId) trFetch('POST', `/table-requests/${encodeURIComponent(r.requestId)}/ack`).catch(() => {});
      return prev.filter(x => x.id !== id);
    });
  }, []);

  return { pendingRequests, dismissRequest };
}