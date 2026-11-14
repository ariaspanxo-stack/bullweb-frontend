// TAREA 335: logica pura del KDS para TV (sin React): canal, semaforo, estacion, listos.
export type Level = 'green' | 'amber' | 'red';
export type Channel = 'mesa' | 'mostrador' | 'delivery' | 'qr';
export interface Thresholds { amberMin: number; redMin: number }
export const DEFAULT_THRESHOLDS: Thresholds = { amberMin: 10, redMin: 20 };
export const READY_WINDOW_MS = 10 * 60 * 1000;

export const itemsOf = (o: any): any[] => (Array.isArray(o?.items) ? o.items : Array.isArray(o?.order_items) ? o.order_items : []);
const isDone = (i: any) => i?.status === 'READY' || i?.status === 'DELIVERED';

export function levelFor(elapsedMs: number, th: Thresholds, manual = false): Level {
  if (manual || elapsedMs > th.redMin * 60_000) return 'red';
  if (elapsedMs >= th.amberMin * 60_000) return 'amber';
  return 'green';
}

export function channelOf(o: any): Channel {
  if (o?.source === 'QR_CARTA') return 'qr';
  if (o?.type === 'DELIVERY') return 'delivery';
  if (o?.tables || o?.tableNumber || o?.type === 'DINE_IN') return 'mesa';
  return 'mostrador';
}

export const tableNumberOf = (o: any): string | null => {
  const n = o?.tableNumber ?? o?.tables?.number;
  return n === undefined || n === null || n === '' ? null : String(n);
};

export function channelLabel(o: any): string {
  const ch = channelOf(o);
  if (ch === 'qr') return 'Carta QR';
  if (ch === 'delivery') return 'Delivery';
  if (ch === 'mesa') return tableNumberOf(o) ? `Mesa ${tableNumberOf(o)}` : 'Mesa';
  return 'Mostrador';
}

/** Nombre para llamar: cliente; si no hay y viene de una mesa por la carta, la mesa. */
export function callName(o: any): string | null {
  const raw = o?.customerName ?? o?.customers?.name ?? o?.customer?.name;
  if (raw && String(raw).trim()) {
    return String(raw).trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
  if (channelOf(o) === 'qr' && tableNumberOf(o)) return `Mesa ${tableNumberOf(o)}`;
  return null;
}

export function shortNumber(o: any): string {
  const n = String(o?.orderNumber ?? o?.number ?? '');
  if (n) return n.includes('-') ? n.split('-').pop() || n : n;
  return String(o?.id ?? '').slice(0, 6);
}

export const isManualUrgent = (o: any) => o?.priority === 1 || o?._urgent === true;

/** Items de la estacion (mismo criterio que el backend, FIX 63: products.stationId u order_items.stationId). */
function filterItems(o: any, station: string): any[] {
  const items = itemsOf(o);
  if (station === 'all') return items;
  return items.filter((i: any) => {
    const ps = i?.products?.stationId ?? '';
    const is = i?.stationId ?? '';
    return station === 'unassigned' ? !ps && !is : ps === station || is === station;
  });
}

// Cache por objeto pedido: mientras el pedido no cambie, su version filtrada conserva la identidad (los tickets memo no se repintan).
const stationCache = new WeakMap<object, Map<string, any | null>>();
export function forStation(o: any, station: string): any | null {
  if (!o || typeof o !== 'object') return null;
  let m = stationCache.get(o);
  if (!m) { m = new Map(); stationCache.set(o, m); }
  if (m.has(station)) return m.get(station);
  const all = itemsOf(o);
  const items = filterItems(o, station);
  const out = items.length === 0 ? null : items.length === all.length && o.items === all ? o : { ...o, items };
  m.set(station, out);
  return out;
}

export const fullyReady = (o: any) => {
  const items = itemsOf(o);
  return items.length > 0 && items.every(isDone);
};

export function lastReadyAt(o: any): number {
  let t = 0;
  for (const i of itemsOf(o)) {
    const r = i?.readyAt ? new Date(i.readyAt).getTime() : 0;
    if (r > t) t = r;
  }
  return t;
}

export const createdMs = (o: any) => new Date(o?.createdAt ?? Date.now()).getTime();

export function sortOrders(list: any[]): any[] {
  return [...list].sort((a, b) => {
    const ua = isManualUrgent(a) ? 0 : 1;
    const ub = isManualUrgent(b) ? 0 : 1;
    if (ua !== ub) return ua - ub;
    return createdMs(a) - createdMs(b);
  });
}

/** mm:ss (minutos sin tope); un dia o mas se muestra en dias. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 86_400) return `${Math.floor(s / 86_400)} d`;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function nextStatus(status: string): 'PREPARING' | 'READY' | null {
  if (status === 'PENDING') return 'PREPARING';
  if (status === 'PREPARING') return 'READY';
  return null;
}
