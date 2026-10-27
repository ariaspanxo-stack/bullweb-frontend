// ═══════════════════════════════════════════════════════════════
// Hotfix #286 — Confirmacion antes de quitar el ultimo producto
// El backend anula el pedido completo al quitar su ultimo producto
// activo ("Todos los items eliminados"); despues no admite agregar.
// useConfirmVoidOrder() devuelve askVoid(etiqueta, p. ej. "#V-001" o "de la mesa 3") -> Promise<boolean>
// y el modal (portal, z-100) para renderizar al final del componente.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

/** true si quitar estos items deja el pedido sin productos activos */
export function leavesOrderEmpty(items: { id: string; isCancelled?: boolean }[], removingIds: string[]): boolean {
  const active = items.filter(i => !i.isCancelled);
  return active.length > 0 && active.every(i => removingIds.includes(i.id));
}

export function useConfirmVoidOrder(): { askVoid: (orderNum: string) => Promise<boolean>; voidModal: ReactNode } {
  const [pending, setPending] = useState<{ orderNum: string; resolve: (ok: boolean) => void } | null>(null);

  const askVoid = useCallback((orderNum: string) => new Promise<boolean>(resolve => setPending({ orderNum, resolve })), []);
  const close = (ok: boolean) => { pending?.resolve(ok); setPending(null); };

  const voidModal = pending ? createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={() => close(false)} />
      <div role="alertdialog" aria-labelledby="void-order-title" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl z-[100] p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 id="void-order-title" className="font-bold text-gray-900">Quitar el último producto anula el pedido</h3>
            <p className="text-sm text-gray-600 mt-1">
              La venta {pending.orderNum} quedará anulada y no podrás agregarle productos. Para cambiar el producto, agrega primero el nuevo y luego quita este.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => close(false)}
            className="flex-1 min-h-[44px] rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => close(true)}
            className="flex-1 min-h-[44px] rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold transition-colors"
          >
            Anular pedido
          </button>
        </div>
      </div>
    </>,
    document.body,
  ) : null;

  return { askVoid, voidModal };
}
