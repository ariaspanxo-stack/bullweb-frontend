import React from 'react';
import { PencilIcon, CopyIcon, TrashIcon, Info } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { calculateProductMetrics, formatMetric, getMetricColor, metricDescriptions } from '../../utils/metricsCalculator';
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
  // Mapeo de categorías para mostrar nombres legibles
  const categoryNames: Record<string, string> = {
    laptops: 'Laptops',
    phones: 'Teléfonos',
    accessories: 'Accesorios',
    men: 'Ropa Hombre',
    women: 'Ropa Mujer',
    kids: 'Ropa Niños',
    furniture: 'Muebles',
    decoration: 'Decoración',
    kitchen: 'Cocina',
    'power-tools': 'Herramientas Eléctricas',
    'hand-tools': 'Herramientas Manuales',
    fiction: 'Ficción',
    'non-fiction': 'No Ficción',
    educational: 'Educativos',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const isLowStock = (product.currentStock || 0) < 10;
              const metrics = calculateProductMetrics(product.price, product.cost || 0);

              return (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Imagen */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">Sin img</span>
                      )}
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {product.sku}
                    </span>
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {product.description}
                        </p>
                      )}
                      {product.popular && (
                        <span className="inline-flex items-center mt-1 text-xs text-yellow-600">
                          ⭐ Popular
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Categoría */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {categoryNames[product.categoryId] || product.categoryId}
                    </span>
                  </td>

                  {/* Precio */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(product.price)}
                    </span>
                  </td>

                  {/* Costo */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-600">
                      {formatCurrency(product.cost || 0)}
                    </span>
                  </td>

                  {/* Margen $ */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatMetric(metrics.marginAmount, 'currency')}
                    </span>
                  </td>

                  {/* Margen % */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getMetricColor(metrics.marginPercent, 'margin')}`}>
                      {metrics.marginPercent}%
                    </span>
                  </td>

                  {/* Markup % */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getMetricColor(metrics.markupPercent, 'markup')}`}>
                      {metrics.markupPercent}%
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
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
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => onDuplicate(product)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Duplicar"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => onDelete(product)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
