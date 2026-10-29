// ═══════════════════════════════════════════════════════════════════
// Hotfix #289 — Inventario > Productos
// Lista los productos con "Controlar stock" (stock simple): stock, minimo,
// estado y ajuste rapido con motivo obligatorio. Misma fuente de datos que
// Productos (productsApi.getAll) y mismo PATCH con stockReason que el modal
// de producto: el backend registra el movimiento ADJUSTMENT con el motivo.
// Stock bajo = stock <= minimo (en el minimo ya avisa).
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi } from '@/services/api';
import { usePermission } from '@/hooks/usePermission';

type StockProduct = { id: string; name: string; currentStock: number; minStock: number; hasStock: boolean; deletedAt?: string | null };

export const productStockState = (p: { currentStock: number; minStock: number }) =>
  p.currentStock <= 0
    ? { key: 'out', label: 'Sin stock', cls: 'bg-[#FEE2E2] text-[#B91C1C]' }
    : p.currentStock <= p.minStock
    ? { key: 'low', label: 'Stock bajo', cls: 'bg-[#FEF3C7] text-[#92400E]' }
    : { key: 'ok', label: 'OK', cls: 'bg-[#F1F5F9] text-[#475569]' };

export default function ProductsStockTab() {
  const queryClient = useQueryClient();
  const canAdjust = usePermission(['products.manage', 'menu.manage']);
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [adjusting, setAdjusting] = useState<StockProduct | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-products-stock'],
    queryFn: () => productsApi.getAll(),
  });

  const tracked: StockProduct[] = ((data ?? []) as StockProduct[]).filter((p) => p.hasStock && !p.deletedAt);
  const lowCount = tracked.filter((p) => productStockState(p).key !== 'ok').length;
  const rows = tracked
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((p) => !onlyLow || productStockState(p).key !== 'ok')
    .sort((a, b) => a.currentStock - b.currentStock);

  const adjustMutation = useMutation({
    mutationFn: ({ id, stock, reason }: { id: string; stock: number; reason: string }) =>
      productsApi.update(id, { currentStock: stock, stockReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      setAdjusting(null);
      toast.success('Stock ajustado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al ajustar stock'),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setOnlyLow(!onlyLow)}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              onlyLow ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            Stock bajo ({lowCount})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando productos...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    {tracked.length === 0
                      ? 'Ningún producto controla stock. Actívalo en Productos > Editar > Controlar stock.'
                      : 'Sin resultados'}
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const state = productStockState(p);
                  return (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-bold">{p.currentStock}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.minStock}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${state.cls}`}>
                          {state.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canAdjust && (
                          <button
                            onClick={() => setAdjusting(p)}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-lg border-2 border-[#F97316] text-[#F97316] font-bold hover:bg-orange-50 transition-colors"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                            Ajustar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {adjusting && (
        <AdjustStockModal
          product={adjusting}
          isSubmitting={adjustMutation.isPending}
          onClose={() => setAdjusting(null)}
          onSubmit={(stock, reason) => adjustMutation.mutate({ id: adjusting.id, stock, reason })}
        />
      )}
    </div>
  );
}

function AdjustStockModal({
  product,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  product: StockProduct;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (stock: number, reason: string) => void;
}) {
  const [stock, setStock] = useState(String(product.currentStock));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const value = Number(stock);
    if (stock.trim() === '' || isNaN(value) || value < 0) return setError('Ingresa un stock válido (0 o más)');
    if (value === product.currentStock) return setError('El stock no cambió');
    if (!reason.trim()) return setError('Indica el motivo del ajuste de stock');
    setError('');
    onSubmit(value, reason.trim());
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div role="dialog" aria-labelledby="adjust-stock-title" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl z-[100] p-5 space-y-4">
        <div>
          <h3 id="adjust-stock-title" className="font-bold text-gray-900">Ajustar stock: {product.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Stock actual <span className="font-bold">{product.currentStock}</span> · mínimo {product.minStock}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo stock</label>
          <input
            type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)}
            className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del ajuste</label>
          <input
            type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: conteo físico, reposición, merma"
            className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar ajuste'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
