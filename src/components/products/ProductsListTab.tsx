import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Grid3x3,
  Table as TableIcon,
  Package,
  TrendingUp,
  AlertCircle,
  Menu,
  ArrowUp,
  ArrowDown,
  Download,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { Product, ProductCategory } from '../../types/product.types';
import { usePagination } from '../../hooks/usePagination';
import Pagination from './Pagination';
import ProductTable from './ProductTable';
import { calculateProductMetrics, formatMetric } from '../../utils/metricsCalculator';
import { formatCurrency } from '../../lib/utils';

interface ProductsListTabProps {
  products: Product[];
  categories: ProductCategory[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  selectedCategory: string | null;
  onCategoryToggle: () => void;
  onCategoryChange: (id: string | null) => void;
  onBulkUpdate: (ids: string[], data: { available: boolean }) => Promise<void>;
  canManage?: boolean;
}

type FilterType = 'all' | 'active' | 'popular' | 'lowstock';

export const ProductsListTab: React.FC<ProductsListTabProps> = ({
  products,
  categories,
  onAddProduct,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  selectedCategory,
  onCategoryToggle,
  onCategoryChange,
  onBulkUpdate,
  canManage = true,
}) => {
  // Estados locales
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [quickFilter, setQuickFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Estadísticas
  const stats = {
    total: products.length,
    active: products.filter(p => p.active && p.available).length,
    popular: products.filter(p => p.popular).length,
    lowStock: products.filter(p => 
      p.hasStock && 
      p.currentStock !== undefined && 
      p.minStock !== undefined &&
      p.currentStock < p.minStock
    ).length
  };

  // Filtrado
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Búsqueda
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Categoría
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    // Quick filter
    if (quickFilter === 'active') {
      filtered = filtered.filter(product => product.active && product.available);
    } else if (quickFilter === 'popular') {
      filtered = filtered.filter(product => product.popular === true);
    } else if (quickFilter === 'lowstock') {
      filtered = filtered.filter(product => 
        product.hasStock && 
        product.currentStock !== undefined && 
        product.minStock !== undefined &&
        product.currentStock < product.minStock
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory, quickFilter, products]);

  // Paginación
  const {
    currentItems,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage,
    sortField,
    sortDirection,
    handleSort,
    canGoNext,
    canGoPrevious,
  } = usePagination({
    data: filteredProducts,
    itemsPerPage: 10,
    initialSortField: null,
    initialSortDirection: null,
  });

  // Limpiar selección cuando cambian los filtros
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, selectedCategory, quickFilter]);

  // Funciones de selección masiva
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentItems.length && currentItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentItems.map(p => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkAvailability = async (available: boolean) => {
    setBulkLoading(true);
    try {
      await onBulkUpdate(Array.from(selectedIds), { available });
      clearSelection();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportCSV = () => {
    const rows = filteredProducts.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      const mrgn = p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.sku || '').replace(/"/g, '""')}"`,
        p.price,
        p.cost || 0,
        `"${(cat?.name || '').replace(/"/g, '""')}"`,
        mrgn,
        p.currentStock ?? '',
        p.available ? 'Sí' : 'No',
      ].join(',');
    });
    const header = 'Nombre,SKU,Precio,Costo,Categoría,Margen %,Stock,Disponible';
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Componente de botón de ordenamiento
  const SortButton: React.FC<{
    field: 'name' | 'price' | 'cost' | 'currentStock' | 'createdAt';
    label: string;
  }> = ({ field, label }) => {
    const isActive = sortField === field;
    
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {label}
        {isActive && sortDirection === 'asc' && (
          <ArrowUp className="w-4 h-4" />
        )}
        {isActive && sortDirection === 'desc' && (
          <ArrowDown className="w-4 h-4" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Botón toggle sidebar (mobile) */}
            <button
              onClick={onCategoryToggle}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Abrir categorías"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
              <p className="text-sm text-gray-600 mt-1">
                Mostrando {startIndex + 1}-{endIndex} de {totalItems} productos
                {filteredProducts.length !== products.length && ` (${products.length} total)`}
              </p>
            </div>
          </div>
          <button 
            onClick={onAddProduct}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            style={canManage ? undefined : { display: 'none' }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </button>
        </div>

        {/* Búsqueda y filtros */}
        <div className="flex items-center gap-3">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Exportar CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            title="Exportar productos filtrados a CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Toggle vista */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewType === 'grid'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Vista Cards"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewType === 'table'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Vista Tabla"
            >
              <TableIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chips de categoría */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => onCategoryChange(null)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !selectedCategory
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(selectedCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat.icon && <span className="text-sm">{cat.icon}</span>}
                {cat.name}
                <span className={`text-xs ml-0.5 ${selectedCategory === cat.id ? 'text-orange-100' : 'text-gray-400'}`}>
                  ({products.filter(p => p.categoryId === cat.id).length})
                </span>
                {selectedCategory === cat.id && (
                  <X size={12} className="ml-0.5 opacity-80 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setQuickFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              quickFilter === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setQuickFilter('active')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              quickFilter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            Activos ({stats.active})
          </button>
          <button
            onClick={() => setQuickFilter('popular')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              quickFilter === 'popular'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp size={14} />
            Populares ({stats.popular})
          </button>
          <button
            onClick={() => setQuickFilter('lowstock')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              quickFilter === 'lowstock'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertCircle size={14} />
            Stock Bajo ({stats.lowStock})
          </button>
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">Ordenar por:</span>
          <div className="flex flex-wrap gap-2">
            <SortButton field="name" label="Nombre" />
            <SortButton field="price" label="Precio" />
            <SortButton field="cost" label="Costo" />
            <SortButton field="currentStock" label="Stock" />
            <SortButton field="createdAt" label="Fecha" />
          </div>
        </div>
      </div>

      {/* Barra de acciones masivas */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center gap-3 shadow-md z-10">
          <span className="font-medium text-sm flex-shrink-0">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          {selectedIds.size < currentItems.length && (
            <button
              onClick={toggleSelectAll}
              className="text-sm text-blue-200 hover:text-white underline"
            >
              Seleccionar todos ({currentItems.length})
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button
              onClick={() => handleBulkAvailability(true)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <ToggleRight className="w-4 h-4" />
              Habilitar
            </button>
            <button
              onClick={() => handleBulkAvailability(false)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <ToggleLeft className="w-4 h-4" />
              Deshabilitar
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProducts.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <Package size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {products.length === 0 ? '¡Comienza tu catálogo!' : 'No se encontraron productos'}
              </h3>
              <p className="text-gray-600 mb-6">
                {products.length === 0 
                  ? 'Crea tu primer producto en 3 pasos: nombre, precio y categoría.'
                  : 'Intenta cambiar los filtros o búsqueda.'}
              </p>
              {products.length === 0 && canManage && (
                <button 
                  onClick={onAddProduct}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 inline mr-2" />
                  Crear Primer Producto
                </button>
              )}
            </div>
          </div>
        ) : viewType === 'table' ? (
          // Vista Tabla
          <ProductTable
            products={currentItems}
            onEdit={onEditProduct}
            onDuplicate={onDuplicateProduct}
            onDelete={(product) => onDeleteProduct(product)}
            canManage={canManage}
          />
        ) : (
          // Vista Cards
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentItems.map((product) => {
              const category = categories.find(c => c.id === product.categoryId);
              const margin = product.cost 
                ? Math.round(((product.price - product.cost) / product.price) * 100)
                : 0;
              const metrics = calculateProductMetrics(product.price, product.cost || 0);
              const marginColor = margin >= 40 ? 'text-green-600' : margin >= 20 ? 'text-yellow-600' : 'text-red-600';

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all group ${
                    selectedIds.has(product.id)
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Imagen */}
                  <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-200">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={48} className="text-orange-300" />
                      </div>
                    )}
                    
                    {/* Checkbox + Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {/* Checkbox de selección */}
                      <div
                        className={`transition-opacity ${
                          selectedIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shadow-sm transition-colors ${
                          selectedIds.has(product.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white/90 border-gray-400 hover:border-blue-500'
                        }`}>
                          {selectedIds.has(product.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {product.popular && (
                        <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-md flex items-center gap-1">
                          <TrendingUp size={12} />
                          Popular
                        </span>
                      )}
                      {!product.available && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-md">
                          No disponible
                        </span>
                      )}
                    </div>

                    {/* Stock badge */}
                    {product.hasStock && product.currentStock !== undefined && (
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                          product.currentStock === 0
                            ? 'bg-red-500 text-white'
                            : product.minStock && product.currentStock < product.minStock
                            ? 'bg-yellow-500 text-white'
                            : 'bg-green-500 text-white'
                        }`}>
                          {product.currentStock === 0 
                            ? 'Sin stock'
                            : `Stock: ${product.currentStock}`}
                        </span>
                      </div>
                    )}

                    {/* Margin badge */}
                    {product.cost !== undefined && product.cost > 0 && (
                      <div className="absolute bottom-2 right-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                          margin >= 40 ? 'bg-green-500 text-white' :
                          margin >= 20 ? 'bg-yellow-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {margin}% mrg
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    {/* Categoría */}
                    {category && (
                      <div className="text-xs text-gray-500 mb-1">
                        {category.icon} {category.name}
                      </div>
                    )}

                    {/* Nombre */}
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">
                      {product.name}
                    </h3>
                    
                    {/* SKU */}
                    <p className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit mt-1 mb-2">
                      {product.sku}
                    </p>

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.tags.map((tag) => {
                          const TAG_EMOJI: Record<string, string> = {
                            vegano: '🌱', vegetariano: '🥦', sin_gluten: '🌾',
                            picante: '🌶️', popular: '⭐', nuevo: '🆕', oferta: '🏷️',
                          };
                          return (
                            <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-full">
                              {TAG_EMOJI[tag] ?? '🏷️'} {tag.replace('_', ' ')}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Descripción */}
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">
                        {product.description}
                      </p>
                    )}

                    {/* Precio y métricas */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-sm text-gray-500">
                          Costo: {formatCurrency(product.cost || 0)}
                        </span>
                      </div>
                      
                      {/* Métricas en grid */}
                      {product.cost && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Margen $</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatMetric(metrics.marginAmount, 'currency')}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Margen %</p>
                            <p className={`text-sm font-semibold ${marginColor}`}>
                              {metrics.marginPercent}%
                            </p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Markup %</p>
                            <p className={`text-sm font-semibold ${
                              metrics.markupPercent >= 67 ? 'text-green-600' : 
                              metrics.markupPercent >= 25 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {metrics.markupPercent}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => onEditProduct(product)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => onDuplicateProduct(product)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                      >
                        Duplicar
                      </button>
                      <button 
                        onClick={() => onDeleteProduct(product)}
                        className="px-3 py-2 border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-50 transition-colors"
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
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={goToPage}
            onItemsPerPageChange={setItemsPerPage}
            onFirstPage={goToFirstPage}
            onLastPage={goToLastPage}
            onNextPage={nextPage}
            onPreviousPage={previousPage}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
          />
        )}
      </div>
    </>
  );
};

export default ProductsListTab;
