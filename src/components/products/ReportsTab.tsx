import React from 'react';
import { PackageIcon, DollarSignIcon, TrendingUpIcon, AlertTriangleIcon } from 'lucide-react';
import type { Product } from '../../types/product.types';
import { calculateProductMetrics, formatMetric } from '../../utils/metricsCalculator';

interface ReportsTabProps {
  products: Product[];
  categories: any[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ products, categories }) => {
  // Calcular métricas agregadas
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.available !== false).length;
  const lowStockProducts = products.filter((p) => (p.currentStock || 0) < 10).length;

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.price * (p.currentStock || 0),
    0
  );

  const totalCostValue = products.reduce(
    (sum, p) => sum + (p.cost || 0) * (p.currentStock || 0),
    0
  );

  const averageMetrics = products.reduce(
    (acc, product) => {
      const metrics = calculateProductMetrics(product.price, product.cost || 0);
      return {
        marginPercent: acc.marginPercent + metrics.marginPercent,
        markupPercent: acc.markupPercent + metrics.markupPercent,
        count: acc.count + 1,
      };
    },
    { marginPercent: 0, markupPercent: 0, count: 0 }
  );

  const avgMarginPercent = totalProducts > 0 ? averageMetrics.marginPercent / totalProducts : 0;
  const avgMarkupPercent = totalProducts > 0 ? averageMetrics.markupPercent / totalProducts : 0;

  // Top 5 productos más rentables por margen %
  const topProfitable = [...products]
    .map((p) => ({
      ...p,
      metrics: calculateProductMetrics(p.price, p.cost || 0),
    }))
    .sort((a, b) => b.metrics.marginPercent - a.metrics.marginPercent)
    .slice(0, 5);

  // Productos por categoría
  const productsByCategory = categories.map((cat) => ({
    ...cat,
    count: products.filter((p) => p.categoryId === cat.id).length,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reportes y Métricas</h2>
        <p className="text-gray-600 mt-1">
          Análisis general de tu inventario de productos
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Productos */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Productos</span>
            <PackageIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
          <p className="text-xs text-gray-500 mt-1">
            {activeProducts} activos
          </p>
        </div>

        {/* Valor Inventario */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Valor Inventario</span>
            <DollarSignIcon className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatMetric(totalInventoryValue, 'currency')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Costo: {formatMetric(totalCostValue, 'currency')}
          </p>
        </div>

        {/* Margen Promedio */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Margen Promedio</span>
            <TrendingUpIcon className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {avgMarginPercent.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Markup: {avgMarkupPercent.toFixed(1)}%
          </p>
        </div>

        {/* Stock Bajo */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Stock Bajo</span>
            <AlertTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {lowStockProducts}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Productos con stock {'<'} 10
          </p>
        </div>
      </div>

      {/* Top 5 Más Rentables */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🏆 Top 5 Productos Más Rentables
        </h3>
        <div className="space-y-3">
          {topProfitable.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-400">
                  #{index + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Margen</p>
                <p className="text-lg font-bold text-green-600">
                  {product.metrics.marginPercent}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Productos por Categoría */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Productos por Categoría
        </h3>
        <div className="space-y-2">
          {productsByCategory.map((cat) => {
            const percentage = totalProducts > 0 ? (cat.count / totalProducts) * 100 : 0;
            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="font-medium text-gray-900">{cat.name}</span>
                  </span>
                  <span className="text-gray-600">
                    {cat.count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
