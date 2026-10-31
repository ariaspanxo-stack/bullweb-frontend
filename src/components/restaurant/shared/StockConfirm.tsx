/**
 * HOTFIX 305 (B6-04): aviso "Sin stock registrado" al agregar en el POS un producto con control de stock en 0 o
 * menos. No bloquea: pide confirmar (una vez por producto mientras el modal de venta siga abierto).
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type StockProduct = { id: string; name: string; trackStock?: boolean; hasStock?: boolean; stock?: number | string | null; currentStock?: number | string | null };

export const isOutOfStock = (p: StockProduct) =>
  (p.trackStock === true || p.hasStock === true) && Number(p.stock ?? p.currentStock ?? 0) <= 0;

export function useStockConfirm() {
  const [pending, setPending] = useState<{ product: StockProduct; go: () => void } | null>(null);
  const confirmed = useRef(new Set<string>());

  /** Ejecuta `go` de inmediato si hay stock (o ya se confirmo); si no, pide confirmar. */
  const withStockCheck = (product: StockProduct, go: () => void) => {
    if (!isOutOfStock(product) || confirmed.current.has(product.id)) { go(); return; }
    setPending({ product, go });
  };

  const dialog = pending
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Sin stock registrado</h3>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">{pending.product.name}</span> tiene stock{' '}
              <span className="font-bold">{Number(pending.product.stock ?? pending.product.currentStock ?? 0)}</span>. ¿Quieres venderlo igual?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="min-h-[44px] flex-1 rounded-xl border border-gray-300 px-4 font-semibold text-gray-700"
                onClick={() => setPending(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="min-h-[44px] flex-1 rounded-xl bg-[#F97316] px-4 font-semibold text-white"
                onClick={() => { confirmed.current.add(pending.product.id); const go = pending.go; setPending(null); go(); }}
              >
                Vender igual
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return { withStockCheck, stockDialog: dialog };
}
