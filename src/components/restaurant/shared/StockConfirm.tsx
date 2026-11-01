/**
 * HOTFIX 305 (B6-04): aviso "Sin stock registrado" al agregar en el POS un producto con control de stock en 0 o
 * menos. No bloquea: pide confirmar (una vez por producto mientras el modal de venta siga abierto).
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { posService } from '@/services/posService';

type StockProduct = { id: string; name: string; trackStock?: boolean; hasStock?: boolean; stock?: number | string | null; currentStock?: number | string | null };

export const isOutOfStock = (p: StockProduct) =>
  (p.trackStock === true || p.hasStock === true) && Number(p.stock ?? p.currentStock ?? 0) <= 0;

export function useStockConfirm() {
  const [pending, setPending] = useState<{ product: StockProduct; go: () => void; shortages?: { name: string; unit: string; needed: number; available: number }[] } | null>(null);
  const confirmed = useRef(new Set<string>());
  const added = useRef(new Map<string, number>());

  /** Ejecuta `go` de inmediato si hay stock (o ya se confirmo); si no, pide confirmar. */
  const withStockCheck = (product: StockProduct, go: () => void) => {
    if (confirmed.current.has(product.id)) { go(); return; }
    if (isOutOfStock(product)) { setPending({ product, go }); return; }
    // HOTFIX 307 (B6-09): producto con receta cuyos ingredientes quedarian en negativo: avisa y pide confirmar.
    // Sin red o sin receta sigue como antes: el aviso nunca frena una venta por si mismo.
    const qty = (added.current.get(product.id) ?? 0) + 1;
    let settled = false;
    const proceed = () => { if (settled) return; settled = true; added.current.set(product.id, qty); go(); };
    // Sin respuesta en 1,5 s se agrega igual: con mala red el POS no queda esperando el aviso
    setTimeout(proceed, 1500);
    posService.checkProductStock(product.id, qty)
      .then(shortages => {
        if (settled) return;
        if (!shortages.length) { proceed(); return; }
        settled = true;
        setPending({ product, go: () => { added.current.set(product.id, qty); go(); }, shortages });
      })
      .catch(proceed);
  };

  const dialog = pending
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            {pending.shortages ? (
              <>
                <h3 className="text-lg font-bold text-gray-900">Faltan ingredientes</h3>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold">{pending.product.name}</span>: si vendes igual, el stock queda en negativo.
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {pending.shortages.map(s => (
                    <li key={s.name}><span className="font-semibold">{s.name}</span>: necesita <span className="font-bold">{Number(s.needed.toFixed(2))} {s.unit}</span>, hay <span className="font-bold">{Number(s.available.toFixed(2))} {s.unit}</span></li>
                  ))}
                </ul>
              </>
            ) : (
              <>
            <h3 className="text-lg font-bold text-gray-900">Sin stock registrado</h3>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">{pending.product.name}</span> tiene stock{' '}
              <span className="font-bold">{Number(pending.product.stock ?? pending.product.currentStock ?? 0)}</span>. ¿Quieres venderlo igual?
            </p>
              </>
            )}
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
