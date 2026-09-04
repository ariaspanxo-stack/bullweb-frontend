import React from 'react';
import { PencilIcon, CopyIcon, TrashIcon, Info } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { calculateProductMetrics, formatMetric, metricDescriptions } from '../../utils/metricsCalculator';
import { formatCurrency } from '../../lib/utils';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onDelete: (product: Product) => void;
  canManage?: boolean;
}

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
    <div className="bg-gray-900 rounded-xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/5">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Imagen
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Costo
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider group relative">
                <div className="flex items-center justify-center gap-1">
                  Margen $
                  <div className="relative group/tooltip">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      {metricDescriptions.marginAmount}
                    </div>
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider group relative">
                <div className="flex items-center justify-center gap-1">
                  Margen %
                  <div className="relative group/tooltip">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      {metricDescriptions.marginPercent}
                    </div>
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider group relative">
                <div className="flex items-center justify-center gap-1">
                  Markup %
                  <div className="relative group/tooltip">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      {metricDescriptions.markupPercent}
                    </div>
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((product) => {
              const isLowStock = (product.currentStock || 0) < 10;
              const metrics = calculateProductMetrics(product.price, product.cost || 0);
              // Thumbnail: el backend envía 'image' (Prisma); imageUrl es el nombre frontend
              const imageSrc: string | undefined = (product as any).image || product.imageUrl;
              const emoji: string | undefined = (product as any).emoji;

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-white/5 transition-colors ${!product.available ? 'opacity-60' : ''}`}
                >
                  {/* Imagen */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden ${!product.available ? 'grayscale' : ''}`}>
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">{emoji ?? '🍽️'}</span>
                      )}
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {product.sku}
                    </span>
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="text-sm font-medium text-white truncate">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {product.description}
                        </p>
                      )}
                      {product.popular && (
                        <span className="inline-flex items-center mt-1 text-xs text-yellow-500">
                          ⭐ Popular
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Categoría — fix #124: categoría real, no hardcode */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-400">
                      {product.category?.name || product.categoryId}
                    </span>
                  </td>

                  {/* Precio — pastilla patrón carta #124 */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className={`inline-block text-sm font-semibold rounded-lg px-2.5 py-1 ${
                      product.available === false
                        ? 'text-gray-500 line-through bg-white/5'
                        : 'bg-brand-500/15 text-brand-400'
                    }`}>
                      {formatCurrency(product.price)}
                    </span>
                  </td>

                  {/* Costo */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-500">
                      {formatCurrency(product.cost || 0)}
                    </span>
                  </td>

                  {/* Margen $ */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-white">
                      {formatMetric(metrics.marginAmount, 'currency')}
                    </span>
                  </td>

                  {/* Margen % */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${metrics.marginPercent >= 40 ? 'bg-emerald-500/10 text-emerald-400' : metrics.marginPercent >= 20 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {metrics.marginPercent}%
                    </span>
                  </td>

                  {/* Markup % */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${metrics.markupPercent >= 67 ? 'bg-emerald-500/10 text-emerald-400' : metrics.markupPercent >= 25 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {metrics.markupPercent}%
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`text-sm font-medium ${isLowStock ? 'text-red-400' : 'text-white'}`}>
                      {product.currentStock || 0}
                    </span>
                    {isLowStock && (
                      <span className="block text-xs text-red-500">Bajo</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canManage && (
                        <button
                          onClick={() => onEdit(product)}
                          className="p-1.5 text-brand-400 hover:bg-brand-500/10 rounded transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => onDuplicate(product)}
                          className="p-1.5 text-gray-400 hover:bg-white/5 hover:text-white rounded transition-colors"
                          title="Duplicar"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => onDelete(product)}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay productos para mostrar</p>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
