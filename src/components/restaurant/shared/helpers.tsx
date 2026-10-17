// ═══════════════════════════════════════════════════════════════
// Helpers compartidos del POS Restaurant
// ─ ElapsedTime, OrderItemsSummary, fmt, formatTimeAgo
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

// ─── Formato moneda ────────────────────────────────────────────
export const fmt = (n: number | null | undefined) =>
  Math.round(n || 0).toLocaleString('es-CL');

// ─── Tiempo transcurrido (texto) ───────────────────────────────
export function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  return `hace ${Math.floor(mins / 60)}h`;
}

// ─── Tiempo transcurrido (sin segundos) ───────────────────────
// <60 min: "32 min" · <24 h: "6 h 55 min" · ≥24 h: "31 d 8 h"
export function formatElapsed(totalMin: number): string {
  const m = Math.max(0, totalMin);
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`;
}

export interface ElapsedInfo {
  text:    string;  // texto para pantalla
  minutes: number;  // minutos totales (para colorear)
  title:   string;  // timestamp exacto (atributo title)
}

// Hook: recalcula cada 60 s
export function useElapsed(createdAt?: string): ElapsedInfo | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!createdAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [createdAt]);

  if (!createdAt) return null;
  const start = new Date(createdAt);
  if (isNaN(start.getTime())) return null;
  const minutes = Math.floor((now - start.getTime()) / 60000);
  return {
    text:    formatElapsed(minutes),
    minutes,
    title:   start.toLocaleString('es-CL'),
  };
}

// ─── Componente tiempo transcurrido ───────────────────────────
export const ElapsedTime = ({ createdAt }: { createdAt?: string }) => {
  const elapsed = useElapsed(createdAt);
  if (!elapsed) return null;
  return (
    <span className="text-xs text-gray-400 flex items-center gap-1" title={elapsed.title}>
      <Clock size={10} />{elapsed.text}
    </span>
  );
};

// ─── Resumen de ítems en tarjeta ───────────────────────────────
export const OrderItemsSummary = ({ items }: { items: any[] }) => {
  if (!items || items.length === 0) return null;
  const visible = items.slice(0, 3);
  const hidden  = items.length - 3;
  return (
    <div className="space-y-1 mb-3">
      {visible.map((item, i) => (
        <div key={item.id ?? i} className="flex justify-between items-center text-xs">
          <span className="text-gray-700 truncate flex-1 mr-2">
            <span className="font-bold text-gray-500 mr-1">{item.quantity}×</span>
            {item.productName}
          </span>
          <span className="text-gray-500 flex-shrink-0">
            ${fmt(item.total ?? item.subtotal ?? 0)}
          </span>
        </div>
      ))}
      {hidden > 0 && (
        <p className="text-xs text-gray-400 italic">
          +{hidden} ítem{hidden > 1 ? 's' : ''} más
        </p>
      )}
    </div>
  );
};
