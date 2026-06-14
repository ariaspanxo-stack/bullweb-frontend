import React, { useState, useMemo } from 'react';
import { PlusIcon, SearchIcon, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Recipe } from '../../types/recipe.types';
import type { Product } from '../../types/product.types';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../products/Pagination';
import { compareCosts, calculateRealMargin } from '../../utils/recipeCalculator';
import { formatCurrency } from '../../lib/utils';

interface RecipesListTabProps {
  recipes: Recipe[];
  products: Product[];
  ingredients: any[];
  onAddRecipe: () => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipe: Recipe) => void;
}

export const RecipesListTab: React.FC<RecipesListTabProps> = ({
  recipes,
  products,
  onAddRecipe,
  onEditRecipe,
  onDeleteRecipe,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Estadísticas globales
  const stats = useMemo(() => {
    const total = recipes.length;
    const margins = recipes.map((r) => {
      const product = products.find((p) => p.id === r.productId);
      return product ? calculateRealMargin(product.price, r.totalCost) : null;
    }).filter((m): m is number => m !== null);
    const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    const lowMargin = margins.filter((m) => m < 30).length;
    return { total, avgMargin, lowMargin };
  }, [recipes, products]);

  // Filtrado
  const filteredRecipes = useMemo(() => {
    let filtered = [...recipes];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.description?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [recipes, searchTerm]);

  // Paginación
  const {
    currentPage,
    itemsPerPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    previousPage,
    setItemsPerPage: updateItemsPerPage,
  } = usePagination({ data: filteredRecipes, itemsPerPage: 10 });

  // Obtener nombre producto
  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : 'Producto desconocido';
  };

  // Obtener producto
  const getProduct = (productId: string) => {
    return products.find((p) => p.id === productId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fichas Técnicas</h2>
          <p className="text-gray-600 mt-1">
            {filteredRecipes.length} ficha{filteredRecipes.length !== 1 ? 's' : ''} técnica
            {filteredRecipes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onAddRecipe}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Ficha Técnica
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-blue-600 font-medium">Total fichas</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${stats.avgMargin >= 40 ? 'bg-green-50 border-green-200' : stats.avgMargin >= 20 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
          <TrendingUp className={`w-8 h-8 flex-shrink-0 ${stats.avgMargin >= 40 ? 'text-green-500' : stats.avgMargin >= 20 ? 'text-yellow-500' : 'text-red-500'}`} />
          <div>
            <p className={`text-xs font-medium ${stats.avgMargin >= 40 ? 'text-green-600' : stats.avgMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>Margen promedio</p>
            <p className={`text-2xl font-bold ${stats.avgMargin >= 40 ? 'text-green-900' : stats.avgMargin >= 20 ? 'text-yellow-900' : 'text-red-900'}`}>{stats.total ? stats.avgMargin.toFixed(1) : '—'}%</p>
          </div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${stats.lowMargin === 0 ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200'}`}>
          <AlertTriangle className={`w-8 h-8 flex-shrink-0 ${stats.lowMargin === 0 ? 'text-gray-400' : 'text-orange-500'}`} />
          <div>
            <p className={`text-xs font-medium ${stats.lowMargin === 0 ? 'text-gray-500' : 'text-orange-600'}`}>Margen bajo (&lt;30%)</p>
            <p className={`text-2xl font-bold ${stats.lowMargin === 0 ? 'text-gray-700' : 'text-orange-900'}`}>{stats.lowMargin}</p>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar ficha técnica..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay fichas técnicas
          </h3>
          <p className="text-gray-600 mb-4">
            Crea tu primera ficha técnica para calcular costos reales
          </p>
          <button
            onClick={onAddRecipe}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Crear Ficha Técnica
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {currentItems.map((recipe) => {
            const product = getProduct(recipe.productId);
            const comparison = product
              ? compareCosts(product.cost || 0, recipe.totalCost)
              : null;
            const realMargin = product
              ? calculateRealMargin(product.price, recipe.totalCost)
              : 0;

            return (
              <div
                key={recipe.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {recipe.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      📦 {getProductName(recipe.productId)}
                    </p>
                    {recipe.description && (
                      <p className="text-sm text-gray-600">{recipe.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditRecipe(recipe)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDeleteRecipe(recipe)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Costo Total */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-700 mb-1">Costo Total</p>
                    <p className="text-lg font-bold text-blue-900">
                      {formatCurrency(recipe.totalCost)}
                    </p>
                  </div>

                  {/* Ingredientes */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-700 mb-1">Ingredientes</p>
                    <p className="text-lg font-bold text-gray-900">
                      {recipe.ingredients.length}
                    </p>
                  </div>

                  {/* Porciones */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-700 mb-1">Porciones</p>
                    <p className="text-lg font-bold text-gray-900">{recipe.servings}</p>
                  </div>

                  {/* Margen Real */}
                  <div
                    className={`rounded-lg p-3 ${
                      realMargin >= 40
                        ? 'bg-green-50'
                        : realMargin >= 20
                        ? 'bg-yellow-50'
                        : 'bg-red-50'
                    }`}
                  >
                    <p
                      className={`text-xs mb-1 ${
                        realMargin >= 40
                          ? 'text-green-700'
                          : realMargin >= 20
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}
                    >
                      Margen Real
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        realMargin >= 40
                          ? 'text-green-900'
                          : realMargin >= 20
                          ? 'text-yellow-900'
                          : 'text-red-900'
                      }`}
                    >
                      {realMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Comparación */}
                {comparison && comparison.status !== 'match' && (
                  <div
                    className={`mt-4 p-3 rounded-lg text-sm ${
                      comparison.status === 'higher'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-yellow-50 text-yellow-800'
                    }`}
                  >
                    ⚠️ El costo real es{' '}
                    {comparison.status === 'higher' ? 'mayor' : 'menor'} que el estimado
                    por {formatCurrency(Math.abs(comparison.difference))} (
                    {Math.abs(comparison.differencePercent).toFixed(1)}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {filteredRecipes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredRecipes.length}
          onPageChange={goToPage}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
          onItemsPerPageChange={updateItemsPerPage}
        />
      )}
    </div>
  );
};

export default RecipesListTab;
