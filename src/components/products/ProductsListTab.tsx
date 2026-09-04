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
    active: products.filter(p => p.available).length,
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
      filtered = filtered.filter(product => product.available);
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
            ? 'bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
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
      {/* Header premium #124 — patrón Command Center #110-111 */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Botón toggle sidebar (mobile) */}
            <button
              onClick={onCategoryToggle}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Abrir categorías"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Productos</h1>
              <p className="text-xs text-gray-500 mt-1">
                Mostrando {startIndex + 1}-{endIndex} de {totalItems} productos
                {filteredProducts.length !== products.length && ` (${products.length} total)`}
              </p>
            </div>
          </div>
          <button
            onClick={onAddProduct}
            className="inline-flex items-center px-4 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
            />
          </div>

          {/* Exportar CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-white/10 text-gray-400 text-sm font-medium rounded-lg hover:bg-white/5 hover:text-white transition-colors"
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
                  ? 'bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Vista Cards"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewType === 'table'
                  ? 'bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
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
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/20 ring-1 ring-inset ring-brand-500/20'
                  : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
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
                    ? 'bg-brand-500/10 text-brand-400 border-brand-500/20 ring-1 ring-inset ring-brand-500/20'
                    : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {cat.icon && <span className="text-sm">{cat.icon}</span>}
                {cat.name}
                <span className={`text-xs ml-0.5 ${selectedCategory === cat.id ? 'text-brand-300' : 'text-gray-500'}`}>
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
                ? 'bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setQuickFilter('active')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              quickFilter === 'active'
                ? 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/30'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${quickFilter === 'active' ? 'bg-green-400' : 'bg-green-500/60'}`}></div>
            Activos ({stats.active})
          </button>
          <button
            onClick={() => setQuickFilter('popular')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              quickFilter === 'popular'
                ? 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/30'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <TrendingUp size={14} />
            Populares ({stats.popular})
          </button>
          <button
            onClick={() => setQuickFilter('lowstock')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              quickFilter === 'lowstock'
                ? 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <AlertCircle size={14} />
            Stock Bajo ({stats.lowStock})
          </button>
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
          <span className="text-sm text-gray-500">Ordenar por:</span>
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
        <div className="bg-gray-900 border-b border-brand-500/30 px-6 py-3 flex items-center gap-3 shadow-md z-10">
          <span className="font-medium text-sm flex-shrink-0 text-brand-400">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          {selectedIds.size < currentItems.length && (
            <button
              onClick={toggleSelectAll}
              className="text-sm text-gray-400 hover:text-white underline"
            >
              Seleccionar todos ({currentItems.length})
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button
              onClick={() => handleBulkAvailability(true)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <ToggleRight className="w-4 h-4" />
              Habilitar
            </button>
            <button
              onClick={() => handleBulkAvailability(false)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <ToggleLeft className="w-4 h-4" />
              Deshabilitar
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
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
              <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                <Package size={40} className="text-brand-400/60" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {products.length === 0 ? 'Aún no hay registros' : 'No se encontraron productos'}
              </h3>
              <p className="text-gray-500 mb-6">
                {products.length === 0
                  ? 'Crea tu primer producto en 3 pasos: nombre, precio y categoría.'
                  : 'Intenta cambiar los filtros o búsqueda.'}
              </p>
              {products.length === 0 && canManage && (
                <button
                  onClick={onAddProduct}
                  className="px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
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
              const marginColor = margin >= 40 ? 'text-emerald-400' : margin >= 20 ? 'text-amber-400' : 'text-rose-400';
              // Thumbnail: el backend envía 'image' (Prisma); imageUrl es el nombre frontend
              const imageSrc: string | undefined = (product as any).image || product.imageUrl;
              const emoji: string | undefined = (product as any).emoji;

              return (
                <div
                  key={product.id}
                  className={`bg-white/[0.03] rounded-2xl border overflow-hidden transition-all duration-200 group ${
                    selectedIds.has(product.id)
                      ? 'border-brand-500/50 ring-2 ring-brand-500/50'
                      : 'border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Imagen — thumbnail protagonista #124 */}
                  <div className="relative h-48 bg-gray-800">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={product.name}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-all duration-300 ${!product.available ? 'grayscale opacity-60' : 'group-hover:scale-105'}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/10 to-gray-800">
                        <span className="text-5xl">{emoji ?? '🍽️'}</span>
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
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70 backdrop-blur-[2px]">
                          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-black/45 uppercase tracking-wider">
                            Agotado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stock badge */}
                    {product.hasStock && product.currentStock !== undefined && (
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md backdrop-blur-sm ${
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

                    {/* Pastilla de precio #124 — patrón carta #103 */}
                    <div className="absolute bottom-2 right-2">
                      <span className={`px-2.5 py-1 text-sm font-bold rounded-full shadow-lg ${
                        product.available === false
                          ? 'bg-gray-950/80 text-gray-400 line-through'
                          : 'bg-brand-500 text-white'
                      }`}>
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    {/* Categoría + SKU — línea meta */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {category ? (
                        <span className="text-[10px] font-medium text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-full px-2 py-0.5">
                          {category.icon} {category.name}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-[10px] font-mono text-gray-500 truncate">
                        {product.sku}
                      </span>
                    </div>

                    {/* Nombre */}
                    <h3 className="font-bold text-white text-[15px] mb-1 line-clamp-1">
                      {product.name}
                    </h3>

                    {/* Tags — chips patrón carta */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.tags.map((tag) => {
                          const TAG_EMOJI: Record<string, string> = {
                            vegano: '🌱', vegetariano: '🥦', sin_gluten: '🌾',
                            picante: '🌶️', popular: '⭐', nuevo: '🆕', oferta: '🏷️',
                          };
                          return (
                            <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/5 text-gray-400 text-[10px] rounded-full">
                              {TAG_EMOJI[tag] ?? '🏷️'} {tag.replace('_', ' ')}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Descripción */}
                    {product.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed min-h-[2rem]">
                        {product.description}
                      </p>
                    )}

                    {/* Métricas como chips discretos #124 — cálculo intacto (:489-493) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 bg-white/5 rounded-full px-2 py-0.5">
                        Costo {formatCurrency(product.cost || 0)}
                      </span>
                      {product.cost ? (
                        <>
                          <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium bg-white/5 ${marginColor}`}>
                            Mrg {metrics.marginPercent}%
                          </span>
                          <span className="text-[10px] text-gray-500 bg-white/5 rounded-full px-2 py-0.5">
                            Mkup {metrics.markupPercent}%
                          </span>
                        </>
                      ) : null}
                    </div>

                    {/* Acciones al hover #124 — handlers intactos */}
                    <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditProduct(product)}
                        title="Editar"
                        aria-label={`Editar ${product.name}`}
                        className="flex-1 px-3 py-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium rounded-lg hover:bg-brand-500/20 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDuplicateProduct(product)}
                        title="Duplicar"
                        aria-label={`Duplicar ${product.name}`}
                        className="px-3 py-2 border border-white/10 text-gray-400 text-sm font-medium rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                      >
                        Duplicar
                      </button>
                      <button
                        onClick={() => onDeleteProduct(product)}
                        title="Eliminar"
                        aria-label={`Eliminar ${product.name}`}
                        className="px-3 py-2 border border-red-500/20 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/10 transition-colors"
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
