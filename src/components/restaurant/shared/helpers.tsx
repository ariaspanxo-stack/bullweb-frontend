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

// ─── Componente tiempo transcurrido ───────────────────────────
export const ElapsedTime = ({ createdAt }: { createdAt?: string }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!createdAt) return;
    const update = () => {
      const diffMs  = Date.now() - new Date(createdAt).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 60) {
        const diffSeg = Math.floor((diffMs % 60000) / 1000);
        setElapsed(`${diffMin}m ${diffSeg}s`);
      } else {
        const hrs  = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        setElapsed(`${hrs}h ${mins}m`);
      }
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, [createdAt]);

  if (!elapsed) return null;
  return (
    <span className="text-xs text-gray-400 flex items-center gap-1">
      <Clock size={10} />{elapsed}
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
