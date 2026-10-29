import React from 'react';
import { PencilIcon, CopyIcon, Info } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { calculateProductMetrics, formatMetric, metricDescriptions } from '../../utils/metricsCalculator';
import { formatCurrency } from '../../lib/utils';
import { BTN_ICON, CARD, NoCostBadge, TrashButton, formatPct, marginTone } from './productsUi';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onDelete: (product: Product) => void;
  canManage?: boolean;
}

// Hotfix #258: vista tabla en fondo claro; aquí viven costo y markup (la tarjeta solo muestra margen).
const TH = 'px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider';

const InfoTip: React.FC<{ text: string }> = ({ text }) => (
  <div className="relative group/tooltip">
    <Info className="w-4 h-4 text-[#94A3B8] cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-64 p-2 bg-[#0F172A] text-white text-xs normal-case rounded-lg shadow-lg z-10">
      {text}
    </div>
  </div>
);

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDuplicate,
  onDelete,
  canManage = true,
}) => {
  // #124: fix — eliminado categoryNames hardcodeado (demo e-commerce);
  // ahora se usa la categoría real poblada del producto (product.category)

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E2E8F0]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className={`${TH} text-left`}>Imagen</th>
              <th className={`${TH} text-left`}>SKU</th>
              <th className={`${TH} text-left`}>Nombre</th>
              <th className={`${TH} text-left`}>Categoría</th>
              <th className={`${TH} text-right`}>Precio</th>
              <th className={`${TH} text-right`}>Costo</th>
              <th className={`${TH} text-center`}>
                <div className="flex items-center justify-center gap-1">Margen $ <InfoTip text={metricDescriptions.marginAmount} /></div>
              </th>
              <th className={`${TH} text-center`}>
                <div className="flex items-center justify-center gap-1">Margen % <InfoTip text={metricDescriptions.marginPercent} /></div>
              </th>
              <th className={`${TH} text-center`}>
                <div className="flex items-center justify-center gap-1">Markup % <InfoTip text={metricDescriptions.markupPercent} /></div>
              </th>
              <th className={`${TH} text-center`}>Stock</th>
              <th className={`${TH} text-center`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white">
            {products.map((product) => {
              // HOTFIX 288: el stock solo aplica si el producto lo controla; bajo = bajo su stock mínimo (o en 0)
              const isLowStock = !!product.hasStock && ((product.currentStock ?? 0) <= 0 || (product.currentStock ?? 0) < (product.minStock ?? 0));
              const metrics = calculateProductMetrics(product.price, product.cost || 0);
              const hasCost = !!product.cost && product.cost > 0;
              // Thumbnail: el backend envía 'image' (Prisma); imageUrl es el nombre frontend
              const imageSrc: string | undefined = (product as any).image || product.imageUrl;
              const emoji: string | undefined = (product as any).emoji;

              return (
                <tr key={product.id} className={`hover:bg-[#F8FAFC] transition-colors ${!product.available ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`w-12 h-12 rounded-lg bg-[#F1F5F9] flex items-center justify-center overflow-hidden ${!product.available ? 'grayscale' : ''}`}>
                      {imageSrc ? (
                        <img src={imageSrc} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{emoji ?? '🍽️'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded">{product.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{product.name}</p>
                      {product.description && <p className="text-xs text-[#64748B] truncate">{product.description}</p>}
                      {product.popular && <span className="inline-flex items-center mt-1 text-xs text-[#92400E]">⭐ Popular</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-[#475569]">{product.category?.name || product.categoryId}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={`text-sm font-bold ${product.available === false ? 'text-[#94A3B8] line-through' : 'text-[#0F172A]'}`}>
                      {formatCurrency(product.price)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-[#475569]">{formatCurrency(product.cost || 0)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm font-bold text-[#0F172A]">
                      {hasCost ? formatMetric(metrics.marginAmount, 'currency') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {hasCost ? (
                      <span className={`text-[13px] font-bold ${marginTone(metrics.marginPercent)}`}>{formatPct(metrics.marginPercent)}</span>
                    ) : (
                      <NoCostBadge />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-[13px] font-semibold text-[#475569]">{hasCost ? formatPct(metrics.markupPercent) : '—'}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {product.hasStock ? (
                      <>
                        <span className={`text-sm font-bold ${isLowStock ? 'text-[#B45309]' : 'text-[#0F172A]'}`}>{product.currentStock ?? 0}</span>
                        {isLowStock && <span className="block text-xs text-[#B45309]">Bajo</span>}
                      </>
                    ) : (
                      <span className="text-sm text-[#94A3B8]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canManage && (
                        <button onClick={() => onEdit(product)} className={BTN_ICON} title="Editar" aria-label={`Editar ${product.name}`}>
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => onDuplicate(product)} className={BTN_ICON} title="Duplicar" aria-label={`Duplicar ${product.name}`}>
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <TrashButton onClick={() => onDelete(product)} label={`Eliminar ${product.name}`} className="ml-4" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#64748B]">No hay productos para mostrar</p>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
