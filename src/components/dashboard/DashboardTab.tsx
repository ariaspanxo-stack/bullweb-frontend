import React from 'react';
import type { Product } from '../../types/product.types';
import type { Ingredient } from '../../types/ingredient.types';
import type { Recipe } from '../../types/recipe.types';
import KPICard from './KPICard';
import { SalesLineChart, TopProductsChart, CategoryChart } from './charts/SalesChart';
import { mockDashboardData } from '../../data/mockDashboardData';
import { RefreshCwIcon } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface DashboardTabProps {
  products: Product[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: any[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  products,
  ingredients,
  recipes,
}) => {
  // Calcular KPIs reales basados en datos actuales
  const realKPIs = mockDashboardData.kpis.map((kpi) => {
    if (kpi.label === 'Total Productos') {
      return { ...kpi, value: products.length };
    }
    if (kpi.label === 'Ingredientes') {
      return { ...kpi, value: ingredients.length };
    }
    if (kpi.label === 'Stock Crítico') {
      const critical = ingredients.filter(
        (i) => i.currentStock < i.minStock
      ).length;
      return { ...kpi, value: critical };
    }
    return kpi;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Vista general de tu negocio gastronómico
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCwIcon className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          📊 <strong>Demo:</strong> Los datos de ventas son simulados. En producción
          se mostrarán datos reales del sistema POS/pedidos.
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {realKPIs.map((kpi, index) => (
          <KPICard key={index} data={kpi} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ventas */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SalesLineChart data={mockDashboardData.salesHistory} />
        </div>

        {/* Gráfico de Categorías */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <CategoryChart data={mockDashboardData.categoryDistribution} />
        </div>
      </div>

      {/* Gráfico de Top Productos (full width) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <TopProductsChart data={mockDashboardData.topProducts} />
      </div>

      {/* Tablas Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos con Stock Bajo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚠️ Stock Crítico
          </h3>
          {ingredients.filter((i) => i.currentStock < i.minStock).length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              ✅ Todo el stock está en niveles óptimos
            </p>
          ) : (
            <div className="space-y-2">
              {ingredients
                .filter((i) => i.currentStock < i.minStock)
                .slice(0, 5)
                .map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {ingredient.name}
                      </p>
                      <p className="text-sm text-red-600">
                        Stock: {ingredient.currentStock} {ingredient.unit} (Mín:{' '}
                        {ingredient.minStock})
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Productos Más Rentables */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💰 Productos Más Rentables
          </h3>
          <div className="space-y-2">
            {products
              .map((p) => {
                const recipe = recipes.find((r) => r.productId === p.id);
                const realCost = recipe?.totalCost ?? p.cost ?? 0;
                const margin = ((p.price - realCost) / p.price) * 100;
                return { ...p, margin, realCost };
              })
              .sort((a, b) => b.margin - a.margin)
              .slice(0, 5)
              .map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(product.price)} (Costo: {formatCurrency(product.realCost ?? 0)})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {product.margin.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">Margen</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
