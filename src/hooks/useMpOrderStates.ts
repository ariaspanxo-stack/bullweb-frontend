// LOTE MP-A: estado de pago Mercado Pago de las tarjetas del POS. Una sola consulta compartida cada 20 s, aunque haya muchas tarjetas.
import { useEffect, useState } from 'react';
import { mercadoPagoService, type MpOrderState } from '@/services/mercadoPagoService';

const POLL_MS = 20_000;
let cache = new Map<string, MpOrderState>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
  try {
    const { orders } = await mercadoPagoService.orderStates();
    cache = new Map(orders.map((o) => [o.orderId, o]));
    listeners.forEach((l) => l());
  } catch { /* sin datos: la tarjeta se ve como antes; reintenta en el proximo ciclo */ }
}

export function useMpOrderState(orderId: string, enabled: boolean): MpOrderState | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return; // solo pedidos pagados con Mercado Pago consultan
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    if (!timer) {
      refresh();
      timer = setInterval(refresh, POLL_MS);
    }
    return () => {
      listeners.delete(l);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [enabled]);
  return enabled ? cache.get(orderId) ?? null : null;
}
