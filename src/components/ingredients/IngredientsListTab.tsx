import React, { useState, useMemo } from 'react';
import { PlusIcon, SearchIcon, AlertTriangle, ShieldOff } from 'lucide-react';
import type { Ingredient, IngredientCategory } from '../../types/ingredient.types';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../products/Pagination';
import { formatCurrency } from '../../lib/utils';

interface IngredientsListTabProps {
  ingredients: Ingredient[];
  categories: IngredientCategory[];
  onAddIngredient: () => void;
  onEditIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (ingredient: Ingredient) => void;
  permissionError?: boolean;
}

type FilterType = 'all' | 'active' | 'lowStock' | 'outOfStock';

export const IngredientsListTab: React.FC<IngredientsListTabProps> = ({
  ingredients,
  categories: categoriesProp,
  onAddIngredient,
  onEditIngredient,
  onDeleteIngredient,
  permissionError = false,
}) => {
  // Derivar categorías desde los propios ingredientes si el endpoint no existe
  const categories = useMemo<IngredientCategory[]>(() => {
    if (categoriesProp.length > 0) return categoriesProp;
    const map = new Map<string, number>();
    ingredients.forEach((i) => {
      map.set(i.categoryId, (map.get(i.categoryId) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([id, count]) => ({
      id,
      name: id,
      icon: '📦',
      ingredientsCount: count,
    }));
  }, [categoriesProp, ingredients]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Filtrado
  const filteredIngredients = useMemo(() => {
    let filtered = [...ingredients];

    // Búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          i.description?.toLowerCase().includes(search) ||
          i.sku.toLowerCase().includes(search) ||
          i.supplier?.toLowerCase().includes(search)
      );
    }

    // Filtros
    switch (filterType) {
      case 'active':
        filtered = filtered.filter((i) => i.status === 'active');
        break;
      case 'lowStock':
        filtered = filtered.filter((i) => i.currentStock > 0 && i.currentStock < i.minStock);
        break;
      case 'outOfStock':
        filtered = filtered.filter((i) => i.currentStock === 0);
        break;
    }

    return filtered;
  }, [ingredients, searchTerm, filterType]);

  // Paginación
  const {
    currentPage,
    itemsPerPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage: updateItemsPerPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: filteredIngredients, itemsPerPage: 10, initialSortField: null, initialSortDirection: null });

  // Obtener categoría
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? `${category.icon} ${category.name}` : categoryId;
  };

  // Estado de stock
  const getStockStatus = (ingredient: Ingredient) => {
    if (ingredient.currentStock === 0) {
      return { icon: '🔴', label: 'Sin stock', color: 'text-red-600 bg-red-50' };
    }
    if (ingredient.currentStock < ingredient.minStock) {
      return { icon: '⚠️', label: 'Stock bajo', color: 'text-yellow-600 bg-yellow-50' };
    }
    return { icon: '✅', label: 'Stock OK', color: 'text-green-600 bg-green-50' };
  };

  // Contadores para badges
  const lowStockCount = ingredients.filter(
    (i) => i.currentStock > 0 && i.currentStock < i.minStock
  ).length;
  const outOfStockCount = ingredients.filter((i) => i.currentStock === 0).length;

  if (permissionError) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center max-w-sm">
          <ShieldOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin permisos de inventario</h3>
          <p className="text-sm text-gray-600 mb-4">
            Tu rol no tiene acceso al módulo de ingredientes. Contacta al administrador para solicitar el permiso <code className="bg-gray-100 px-1 rounded">inventory.view</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ingredientes</h2>
          <p className="text-gray-600 mt-1">
            {filteredIngredients.length} ingrediente{filteredIngredients.length !== 1 ? 's' : ''}{' '}
            {searchTerm && `encontrado${filteredIngredients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={onAddIngredient}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo Ingrediente
        </button>
      </div>

      {/* Alertas */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Alertas de Stock</p>
              <p className="text-sm text-yellow-700 mt-1">
                {outOfStockCount > 0 && `${outOfStockCount} sin stock`}
                {outOfStockCount > 0 && lowStockCount > 0 && ' • '}
                {lowStockCount > 0 && `${lowStockCount} con stock bajo`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda y Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, SKU, proveedor..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterType === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setFilterType('lowStock')}
            className={`px-4 py-2 rounded-lg transition-colors relative ${
              filterType === 'lowStock'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Stock Bajo
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterType('outOfStock')}
            className={`px-4 py-2 rounded-lg transition-colors relative ${
              filterType === 'outOfStock'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sin Stock
            {outOfStockCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {outOfStockCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Lista de Ingredientes (Cards) */}
      {filteredIngredients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">🥕</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron ingredientes
          </h3>
          <p className="text-gray-600 mb-4">Intenta ajustar los filtros o la búsqueda</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((ingredient) => {
            const stockStatus = getStockStatus(ingredient);

            return (
              <div
                key={ingredient.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Header con estado */}
                <div className={`p-3 ${stockStatus.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      {stockStatus.icon} {stockStatus.label}
                    </span>
                    <span className="text-xs font-mono text-gray-600">{ingredient.sku}</span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{ingredient.name}</h3>
                    <p className="text-sm text-gray-600">{getCategoryName(ingredient.categoryId)}</p>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600">Precio/{ingredient.unit}</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(ingredient.pricePerUnit)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600">Stock</p>
                      <p className="text-sm font-bold text-gray-900">
                        {ingredient.currentStock} {ingredient.unit}
                      </p>
                    </div>
                  </div>

                  {/* Proveedor */}
                  {ingredient.supplier && (
                    <p className="text-xs text-gray-600">
                      🏢 {ingredient.supplier}
                    </p>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => onEditIngredient(ingredient)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDeleteIngredient(ingredient)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {filteredIngredients.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredIngredients.length}
          startIndex={((currentPage - 1) * itemsPerPage)}
          endIndex={Math.min(currentPage * itemsPerPage, filteredIngredients.length)}
          onPageChange={goToPage}
          onItemsPerPageChange={updateItemsPerPage}
          onFirstPage={goToFirstPage}
          onLastPage={goToLastPage}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
        />
      )}
    </div>
  );
};

export default IngredientsListTab;
