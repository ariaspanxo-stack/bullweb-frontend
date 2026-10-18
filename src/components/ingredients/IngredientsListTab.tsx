import React, { useState, useMemo } from 'react';
import { PlusIcon, SearchIcon, AlertTriangle, ShieldOff, Pencil } from 'lucide-react';
import type { Ingredient, IngredientCategory } from '../../types/ingredient.types';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../products/Pagination';
import { formatCurrency } from '../../lib/utils';
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD,
  SUBTITLE,
  TITLE,
  TrashButton,
  filterClass,
  formatQty,
  formatUnit,
  stockLevel,
  type StockLevel,
} from '../products/productsUi';

interface IngredientsListTabProps {
  ingredients: Ingredient[];
  categories: IngredientCategory[];
  onAddIngredient: () => void;
  onEditIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (ingredient: Ingredient) => void;
  permissionError?: boolean;
}

type FilterType = 'all' | 'active' | 'lowStock' | 'outOfStock';

/** Hotfix #258: franja de estado en tres variantes (OK neutro, bajo ámbar, sin stock/negativo rojo) */
const STRIPE: Record<StockLevel, string> = {
  ok:  'bg-[#F1F5F9] text-[#475569]',
  low: 'bg-[#FEF3C7] text-[#92400E]',
  out: 'bg-[#FEE2E2] text-[#B91C1C]',
};

const stripeLabel = (i: Ingredient, level: StockLevel) =>
  level === 'out'
    ? Number(i.currentStock) < 0 ? '⚠ Stock negativo' : 'Sin stock'
    : level === 'low' ? 'Stock bajo' : 'Stock OK';

export const IngredientsListTab: React.FC<IngredientsListTabProps> = ({
  ingredients,
  categories: categoriesProp,
  onAddIngredient,
  onEditIngredient,
  onDeleteIngredient,
  permissionError = false,
}) => {
  // Derivar categorías desde los propios ingredientes si el endpoint no existe
  // H127: deducir del campo real category (la row no trae categoryId — columna
  // fantasma eliminada del modal en #126; la key undefined fabricaba "📦 undefined")
  const categories = useMemo<IngredientCategory[]>(() => {
    if (categoriesProp.length > 0) return categoriesProp;
    const map = new Map<string, number>();
    ingredients.forEach((i) => {
      const key = (i as any).category || 'Sin categoría';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({
      id: name,
      name,
      icon: '📦',
      ingredientsCount: count,
    }));
  }, [categoriesProp, ingredients]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Hotfix #258: un solo criterio de stock para banner, filtros y tarjetas
  const levelOf = (i: Ingredient) => stockLevel(i.currentStock, i.minStock);

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
        filtered = filtered.filter((i) => stockLevel(i.currentStock, i.minStock) === 'low');
        break;
      case 'outOfStock':
        filtered = filtered.filter((i) => stockLevel(i.currentStock, i.minStock) === 'out');
        break;
    }

    return filtered;
  }, [ingredients, searchTerm, filterType]);

  // Paginación (12 por página: múltiplo de las 4 columnas)
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
  } = usePagination({ data: filteredIngredients, itemsPerPage: 12, initialSortField: null, initialSortDirection: null });

  // H127: la row real no trae categoryId (columna fantasma fuera del modal en #126) —
  // trae category (string Prisma). Hotfix #258: "Sin categoría" se oculta (null).
  const getCategoryName = (ingredient: Ingredient): string | null => {
    const category = categories.find((c) => c.id === ingredient.categoryId);
    if (category && category.name !== 'Sin categoría') return `${category.icon} ${category.name}`;
    const raw = (ingredient as any).category;
    return raw && raw !== 'Sin categoría' ? raw : null;
  };

  // Contadores (misma función que las tarjetas)
  const lowStockCount = ingredients.filter((i) => levelOf(i) === 'low').length;
  const outOfStockCount = ingredients.filter((i) => levelOf(i) === 'out').length;

  if (permissionError) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center max-w-sm">
          <ShieldOff className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#0F172A] mb-2">Sin permisos de inventario</h3>
          <p className="text-sm text-[#64748B] mb-4">
            Tu rol no tiene acceso al módulo de ingredientes. Contacta al administrador para solicitar el permiso <code className="bg-[#F1F5F9] px-1 rounded">inventory.view</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    // H127: wrapper plano — el scroll de página lo maneja el Layout; el fondo lo pinta Products.tsx.
    <div className="p-6 space-y-6">
      {/* Encabezado — A4/A5 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={TITLE}>Ingredientes</h2>
          <p className={SUBTITLE}>
            {filteredIngredients.length} ingrediente{filteredIngredients.length !== 1 ? 's' : ''}{' '}
            {searchTerm && `encontrado${filteredIngredients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={onAddIngredient} className={BTN_PRIMARY}>
          <PlusIcon className="w-5 h-5" />
          Nuevo ingrediente
        </button>
      </div>

      {/* Banner: cuenta exactamente lo que muestran las tarjetas */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className={`rounded-xl border p-4 ${outOfStockCount > 0 ? 'bg-[#FEE2E2] border-red-200' : 'bg-[#FEF3C7] border-amber-200'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${outOfStockCount > 0 ? 'text-[#B91C1C]' : 'text-[#92400E]'}`} />
            <div>
              <p className="font-bold text-[#0F172A]">Alertas de stock</p>
              <p className="text-sm text-[#475569] mt-1">
                {outOfStockCount > 0 && `${outOfStockCount} sin stock o negativo`}
                {outOfStockCount > 0 && lowStockCount > 0 && ' • '}
                {lowStockCount > 0 && `${lowStockCount} con stock bajo`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda y filtros — A8 */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, SKU, proveedor..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterType('all')} className={filterClass(filterType === 'all')}>Todos</button>
          <button onClick={() => setFilterType('active')} className={filterClass(filterType === 'active')}>Activos</button>
          <button onClick={() => setFilterType('lowStock')} className={filterClass(filterType === 'lowStock')}>
            Stock bajo{lowStockCount > 0 ? ` (${lowStockCount})` : ''}
          </button>
          <button onClick={() => setFilterType('outOfStock')} className={filterClass(filterType === 'outOfStock')}>
            Sin stock{outOfStockCount > 0 ? ` (${outOfStockCount})` : ''}
          </button>
        </div>
      </div>

      {/* Lista de ingredientes (tarjetas compactas, 4 columnas) */}
      {filteredIngredients.length === 0 ? (
        <div className={`${CARD} text-center py-12`}>
          <div className="text-6xl mb-4">🥕</div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-2">No se encontraron ingredientes</h3>
          <p className="text-[#64748B] mb-4">Intenta ajustar los filtros o la búsqueda</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
            }}
            className={BTN_OUTLINE}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentItems.map((ingredient) => {
            const level = levelOf(ingredient);
            const price = Number((ingredient as any).unitCost ?? ingredient.pricePerUnit ?? 0);
            const unit = formatUnit(ingredient.unit);
            const categoryName = getCategoryName(ingredient);

            return (
              <div key={ingredient.id} className={`${CARD} overflow-hidden flex flex-col hover:shadow-md transition-shadow`}>
                {/* Franja de estado */}
                <div className={`px-3 py-2 ${STRIPE[level]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{stripeLabel(ingredient, level)}</span>
                    <span className="text-xs font-mono opacity-70 truncate">{ingredient.sku}</span>
                  </div>
                </div>

                <div className="p-3 space-y-2 flex flex-col flex-1">
                  <div>
                    <h3 className="font-bold text-[#0F172A] line-clamp-1" title={ingredient.name}>{ingredient.name}</h3>
                    {categoryName && <p className="text-xs text-[#64748B]">{categoryName}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#F8FAFC] rounded-lg p-2">
                      <p className="text-xs text-[#64748B]">Precio/{unit}</p>
                      {price > 0 ? (
                        <p className="text-sm font-bold text-[#0F172A]">{formatCurrency(price)}</p>
                      ) : (
                        <span className="inline-flex mt-0.5 px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-xs font-bold">⚠ Sin precio</span>
                      )}
                    </div>
                    <div className="bg-[#F8FAFC] rounded-lg p-2">
                      <p className="text-xs text-[#64748B]">Stock</p>
                      <p className={`text-sm font-bold ${level === 'out' ? 'text-[#B91C1C]' : 'text-[#0F172A]'}`}>
                        {formatQty(ingredient.currentStock)} {unit}
                      </p>
                    </div>
                  </div>

                  {ingredient.supplier && <p className="text-xs text-[#64748B] truncate">🏢 {ingredient.supplier}</p>}

                  <div className="flex items-center gap-2 pt-1 mt-auto">
                    <button onClick={() => onEditIngredient(ingredient)} className={`${BTN_OUTLINE} flex-1`}>
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <TrashButton onClick={() => onDeleteIngredient(ingredient)} label={`Eliminar ${ingredient.name}`} className="ml-4" />
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
