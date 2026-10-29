// ═══════════════════════════════════════════════════════════════
// TAREA 280 — Avance de preparación por ítem en la tarjeta del pedido
// ItemsProgress: "2/4 listos" (neutro, todos los planes).
// ItemPrepList: lista de ítems con su estado y botones de 44 px (Básico, sin KDS):
//   PENDING → "Preparar" (contorno) · PREPARING → "Listo" (naranja, acción principal del ítem)
//   READY   → texto verde de estado + botón de contorno para volver a pendiente.
// El pedido pasa solo a Listo en el backend cuando todos sus ítems están listos.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { ChefHat, Check, RotateCcw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { restaurantService } from '../../../services/restaurantService';
import { modifierNames } from './ModifierGroupsModal'; // HOTFIX 291

type PrepStatus = 'PENDING' | 'PREPARING' | 'READY';

const isDone = (s?: string) => s === 'READY' || s === 'DELIVERED';

export function itemsProgress(items: any[] | undefined) {
  const active = (items ?? []).filter((i: any) => !i.isCancelled);
  return { ready: active.filter((i: any) => isDone(i.status)).length, total: active.length };
}

export function ItemsProgress({ items }: { items: any[] | undefined }) {
  const { ready, total } = itemsProgress(items);
  if (total === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-600 tabular-nums">
      <ChefHat size={14} className="flex-shrink-0" />
      {ready}/{total} listos
    </span>
  );
}

const BTN_PRIMARY   = 'h-11 min-w-[96px] px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-60 flex-shrink-0';
const BTN_SECONDARY = 'h-11 min-w-[96px] px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-60 flex-shrink-0';
const BTN_ICON      = 'w-11 h-11 inline-flex items-center justify-center rounded-lg text-slate-600 border-[1.5px] border-slate-300 bg-white hover:bg-slate-50 transition-colors disabled:opacity-60 flex-shrink-0';

export function ItemPrepList({ orderId, items, onChanged }: {
  orderId:    string;
  items:      any[];
  onChanged?: () => void;
}) {
  // Orden estable (creación, luego id): el backend no ordena order_items y las filas saltaban al recargar
  const active = (items ?? [])
    .filter((i: any) => !i.isCancelled)
    .sort((a: any, b: any) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) || String(a.id).localeCompare(String(b.id)));
  // Estado local para respuesta inmediata; se re-sincroniza cuando llegan los ítems del servidor
  const [local, setLocal] = useState<Record<string, string>>({});
  const [busy, setBusy]   = useState<string | null>(null);
  useEffect(() => { setLocal({}); }, [items]);

  const change = async (itemId: string, status: PrepStatus) => {
    if (busy) return;
    setBusy(itemId);
    try {
      await restaurantService.setItemStatus(orderId, itemId, status);
      setLocal(prev => ({ ...prev, [itemId]: status }));
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'No se pudo actualizar el ítem');
    } finally {
      setBusy(null);
    }
  };

  if (active.length === 0) return null;

  return (
    <div className="flex flex-col divide-y divide-slate-100" onClick={(e) => e.stopPropagation()}>
      {active.map((i: any) => {
        const st = (local[i.id] ?? i.status ?? 'PENDING') as string;
        const loading = busy === i.id;
        return (
          <div key={i.id} className="flex items-center gap-2 py-1.5 min-w-0">
            <p className="flex-1 min-w-0 text-[15px] text-slate-800 truncate leading-snug">
              <span className="font-bold text-slate-900">{i.quantity}×</span> {i.productName}
              {/* HOTFIX 291: modificadores elegidos */}
              {modifierNames(i.modifiers) && <span className="block text-xs text-slate-500 truncate">+ {modifierNames(i.modifiers)}</span>}
              {st === 'PREPARING' && <span className="block text-xs font-semibold text-amber-700">En preparación</span>}
              {isDone(st) && <span className="block text-xs font-semibold text-green-700">Listo</span>}
            </p>
            {st === 'PENDING' && (
              <button type="button" className={BTN_SECONDARY} disabled={loading} onClick={() => change(i.id, 'PREPARING')}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ChefHat size={14} />} Preparar
              </button>
            )}
            {st === 'PREPARING' && (
              <button type="button" className={BTN_PRIMARY} disabled={loading} onClick={() => change(i.id, 'READY')}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Listo
              </button>
            )}
            {st === 'READY' && (
              <button type="button" className={BTN_ICON} disabled={loading} onClick={() => change(i.id, 'PENDING')}
                aria-label={`Volver a pendiente: ${i.productName}`} title="Volver a pendiente">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={16} />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
