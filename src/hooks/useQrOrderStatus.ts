// ═══════════════════════════════════════════════════════════════
// Hotfix #194 / HOTFIX 272 — useQrOrderStatus
// Seguimiento del pedido QR para la pantalla "Pedido enviado" de la Carta Digital.
//
// HOTFIX 272: polling de GET /api/public/qr-orders/:id/status cada 10 s (el id es el de
// qr_pending_orders que devuelve POST /api/public/orders). Antes (#194) consultaba el receipt de
// `orders` con ese id y nunca salía de "esperando". Estados: PENDING | ACCEPTED | PREPARING | READY |
// DELIVERED | REJECTED. READY, DELIVERED y REJECTED son terminales: detienen el polling (cierre).
// Error de red → retry silencioso en el próximo tick (nunca rompe la pantalla).
// ~6 req/min, bajo el límite de 30/min del endpoint.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';

export type QrOrderPhase = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'REJECTED';

export interface QrOrderLiveStatus {
  status:           QrOrderPhase;
  orderType:        'delivery' | 'pickup' | null;
  code:             string | null;
  estimatedMinutes: number | null;
  deliveryFee:      number | null;
  subtotal:         number | null;
  total:            number | null;
  reason:           string | null;
  whatsapp:         string | null;
  minutesSinceSent: number;
  /** Momento (ms) en que se leyó minutesSinceSent, para contar el tiempo entre polls. */
  fetchedAt:        number;
}

const TERMINAL: QrOrderPhase[] = ['READY', 'DELIVERED', 'REJECTED'];
export const QR_STATUS_POLL_MS = 10_000;

const INITIAL: QrOrderLiveStatus = {
  status: 'PENDING', orderType: null, code: null, estimatedMinutes: null, deliveryFee: null,
  subtotal: null, total: null, reason: null, whatsapp: null, minutesSinceSent: 0, fetchedAt: Date.now(),
};

export function useQrOrderStatus(orderId: string | null): QrOrderLiveStatus {
  const [state, setState] = useState<QrOrderLiveStatus>(INITIAL);
  const terminalRef = useRef(false);

  useEffect(() => {
    if (!orderId) return;
    terminalRef.current = false;
    setState({ ...INITIAL, fetchedAt: Date.now() });

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (cancelled || terminalRef.current) return;
      try {
        const res = await fetch(`/api/public/qr-orders/${orderId}/status`);
        if (cancelled || terminalRef.current || !res.ok) return;
        const json = await res.json();
        const d = json?.data;
        if (!d?.status) return;
        setState({
          status:           d.status,
          orderType:        d.orderType ?? null,
          code:             d.code ?? null,
          estimatedMinutes: d.estimatedMinutes ?? null,
          deliveryFee:      d.deliveryFee ?? null,
          subtotal:         d.subtotal ?? null,
          total:            d.total ?? null,
          reason:           d.reason ?? null,
          whatsapp:         d.whatsapp ?? null,
          minutesSinceSent: Number(d.minutesSinceSent ?? 0),
          fetchedAt:        Date.now(),
        });
        if (TERMINAL.includes(d.status)) {
          terminalRef.current = true;
          if (timer) clearInterval(timer);
        }
      } catch {
        // Error de red: retry silencioso en el próximo tick
      }
    };

    poll();
    timer = setInterval(poll, QR_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [orderId]);

  return state;
}
