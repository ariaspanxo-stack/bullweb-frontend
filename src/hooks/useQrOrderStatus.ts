// ═══════════════════════════════════════════════════════════════
// Hotfix #194 — useQrOrderStatus
// Polling del receipt público (GET /api/public/receipt/:orderId)
// para el paso success del CartSheet de la Carta Digital.
//
// CONTRATO REAL (bullweb-backend public.routes.ts:609):
//   - El receipt consulta la tabla `orders`; el orderId que recibe el
//     comensal es el de `qr_pending_orders`. Mientras el local no acepta,
//     responde 404 → "waiting". Cuando responde 200, la orden fue creada
//     y aceptada → "accepted".
//   - El rechazo NO es entregable por este contrato (quedará para el
//     batch backend de la carta, #196).
//
// Mecánica: poll inmediato + intervala 18s (~3.3 req/min, muy por bajo
// el rate limit de 30/min del endpoint). Error de red → retry silencioso
// en el próximo tick (nunca rompe la pantalla). Estado terminal detiene
// el polling y lo blindá con un ref (no revive si cambia el orderId).
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';

export type QrOrderLiveStatus = 'waiting' | 'accepted';

export function useQrOrderStatus(orderId: string | null): QrOrderLiveStatus {
  const [status, setStatus] = useState<QrOrderLiveStatus>('waiting');
  const terminalRef = useRef(false);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled || terminalRef.current) return;
      try {
        const res = await fetch(`/api/public/receipt/${orderId}`);
        if (cancelled || terminalRef.current) return;
        if (res.status === 200) {
          // La orden existe en `orders` → el local aceptó el pedido
          terminalRef.current = true;
          setStatus('accepted');
        }
        // 404/400 u otro código: sigue esperando — retry silencioso
      } catch {
        // Error de red: retry silencioso en el próximo tick
      }
    };

    poll();
    const timer = setInterval(poll, 18000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId]);

  return status;
}
