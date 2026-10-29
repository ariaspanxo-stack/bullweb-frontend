import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  FileUp,
  Grid3x3,
  Table as TableIcon,
  Package,
  TrendingUp,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Download,
  X,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Copy,
} from 'lucide-react';
import type { Product, ProductCategory } from '../../types/product.types';
import { usePagination } from '../../hooks/usePagination';
import Pagination from './Pagination';
import ProductTable from './ProductTable';
import { formatCurrency } from '../../lib/utils';
import { colorForCategory } from '../../lib/categoryHelpers';
import {
  BTN_ICON,
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD,
  MarginBadge,
  SUBTITLE,
  TITLE,
  TrashButton,
  filterClass,
} from './productsUi';

interface ProductsListTabProps {
  products: Product[];
  categories: ProductCategory[];
  onAddProduct: () => void;
  onImportMenu?: () => void; // HOTFIX 268: solo SuperAdmin
  onEditProduct: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  onBulkUpdate: (ids: string[], data: { available: boolean }) => Promise<void>;
  onToggleShowInQr?: (product: Product, showInQr: boolean) => Promise<void>; // HOTFIX 267
  canManage?: boolean;
}

type FilterType = 'all' | 'active' | 'popular' | 'lowstock';

/** Hotfix #258 (B Productos): 24 productos por página por defecto */
const DEFAULT_PAGE_SIZE = 24;

export const ProductsListTab: React.FC<ProductsListTabProps> = ({
  products,
  categories,
  onAddProduct,
  onImportMenu,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  selectedCategory,
  onCategoryChange,
  onBulkUpdate,
  onToggleShowInQr,
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
      p.currentStock <= p.minStock // HOTFIX 289: en el minimo ya es stock bajo
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
        product.currentStock <= product.minStock // HOTFIX 289
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
    itemsPerPage: DEFAULT_PAGE_SIZE,
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
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Botón de ordenamiento — la opción activa se resalta con su flecha ↑↓
  const SortButton: React.FC<{
    field: 'name' | 'price' | 'cost' | 'currentStock' | 'createdAt';
    label: string;
  }> = ({ field, label }) => {
    const isActive = sortField === field;

    return (
      <button onClick={() => handleSort(field)} className={filterClass(isActive)}>
        {label}
        {isActive && sortDirection === 'asc' && <ArrowUp className="w-4 h-4" />}
        {isActive && sortDirection === 'desc' && <ArrowDown className="w-4 h-4" />}
      </button>
    );
  };

  return (
    <>
      {/* Encabezado — Hotfix #258 (A3/A4/A5): fondo claro, título legible, crear naranja arriba a la derecha */}
      <div className="sticky top-0 z-20 bg-[#F8FAFC]/95 backdrop-blur border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className={TITLE}>Productos</h1>
            <p className={SUBTITLE}>
              Mostrando {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} de {totalItems} productos
              {filteredProducts.length !== products.length && ` (${products.length} en total)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onImportMenu && (
              <button onClick={onImportMenu} className={BTN_OUTLINE}>
                <FileUp className="w-5 h-5" />
                Importar carta
              </button>
            )}
            {canManage && (
              <button onClick={onAddProduct} className={BTN_PRIMARY}>
                <Plus className="w-5 h-5" />
                Nuevo producto
              </button>
            )}
          </div>
        </div>

        {/* Búsqueda, exportar y vista */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <button onClick={handleExportCSV} className={BTN_OUTLINE} title="Exportar productos filtrados a CSV">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setViewType('grid')}
              className={viewType === 'grid' ? filterClass(true) : BTN_ICON}
              title="Vista tarjetas"
              aria-label="Vista tarjetas"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={viewType === 'table' ? filterClass(true) : BTN_ICON}
              title="Vista tabla"
              aria-label="Vista tabla"
            >
              <TableIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chips de categoría — Hotfix #258 (A2): único filtro de categoría, con el color de la categoría */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button onClick={() => onCategoryChange(null)} className={filterClass(!selectedCategory)}>
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(selectedCategory === cat.id ? null : cat.id)}
                className={filterClass(selectedCategory === cat.id)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colorForCategory(categories, cat.id) }}
                />
                {cat.name}
                <span className="text-xs text-[#64748B]">
                  ({products.filter(p => p.categoryId === cat.id).length})
                </span>
                {selectedCategory === cat.id && <X size={12} className="flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* Filtros rápidos — A8 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={() => setQuickFilter('all')} className={filterClass(quickFilter === 'all')}>
            Todos ({products.length})
          </button>
          <button onClick={() => setQuickFilter('active')} className={filterClass(quickFilter === 'active')}>
            Activos ({stats.active})
          </button>
          <button onClick={() => setQuickFilter('popular')} className={filterClass(quickFilter === 'popular')}>
            <TrendingUp size={14} />
            Populares ({stats.popular})
          </button>
          <button onClick={() => setQuickFilter('lowstock')} className={filterClass(quickFilter === 'lowstock')}>
            <AlertCircle size={14} />
            Stock bajo ({stats.lowStock})
          </button>
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#E2E8F0] flex-wrap">
          <span className="text-sm text-[#64748B]">Ordenar por:</span>
          <SortButton field="name" label="Nombre" />
          <SortButton field="price" label="Precio" />
          <SortButton field="cost" label="Costo" />
          <SortButton field="currentStock" label="Stock" />
          <SortButton field="createdAt" label="Fecha" />
        </div>
      </div>

      {/* Barra de acciones masivas */}
      {selectedIds.size > 0 && (
        <div className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-3 z-10">
          <span className="font-semibold text-sm flex-shrink-0 text-[#C2410C]">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          {selectedIds.size < currentItems.length && (
            <button onClick={toggleSelectAll} className="text-sm text-[#475569] hover:text-[#0F172A] underline">
              Seleccionar todos ({currentItems.length})
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button onClick={() => handleBulkAvailability(true)} disabled={bulkLoading} className={BTN_OUTLINE}>
              <ToggleRight className="w-4 h-4" />
              Habilitar
            </button>
            <button onClick={() => handleBulkAvailability(false)} disabled={bulkLoading} className={BTN_OUTLINE}>
              <ToggleLeft className="w-4 h-4" />
              Deshabilitar
            </button>
            <button onClick={clearSelection} className={BTN_OUTLINE}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
                <Package size={40} className="text-[#94A3B8]" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                {products.length === 0 ? 'Aún no hay registros' : 'No se encontraron productos'}
              </h3>
              <p className="text-[#64748B] mb-6">
                {products.length === 0
                  ? 'Crea tu primer producto en 3 pasos: nombre, precio y categoría.'
                  : 'Intenta cambiar los filtros o búsqueda.'}
              </p>
              {products.length === 0 && canManage && (
                <button onClick={onAddProduct} className={BTN_PRIMARY}>
                  <Plus className="w-5 h-5" />
                  Crear primer producto
                </button>
              )}
            </div>
          </div>
        ) : viewType === 'table' ? (
          <ProductTable
            products={currentItems}
            onEdit={onEditProduct}
            onDuplicate={onDuplicateProduct}
            onDelete={(product) => onDeleteProduct(product)}
            canManage={canManage}
          />
        ) : (
          // Vista tarjetas — misma altura (flex-col h-full), sin código PRD, solo margen con color por rango
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {currentItems.map((product) => {
              const category = categories.find(c => c.id === product.categoryId);
              const catColor = product.categoryId ? colorForCategory(categories, product.categoryId) : '#64748B';
              // Thumbnail: el backend envía 'image' (Prisma); imageUrl es el nombre frontend
              const imageSrc: string | undefined = (product as any).image || product.imageUrl;
              const emoji: string | undefined = (product as any).emoji;
              const selected = selectedIds.has(product.id);
              const stockState = product.hasStock && product.currentStock !== undefined
                ? product.currentStock <= 0
                  ? { label: 'Sin stock', cls: 'bg-[#FEE2E2] text-[#B91C1C]' }
                  : product.minStock && product.currentStock <= product.minStock // HOTFIX 289
                  ? { label: `Stock: ${product.currentStock}`, cls: 'bg-[#FEF3C7] text-[#92400E]' }
                  : { label: `Stock: ${product.currentStock}`, cls: 'bg-[#F1F5F9] text-[#475569]' }
                : null;

              return (
                <div
                  key={product.id}
                  className={`${CARD} h-full flex flex-col overflow-hidden transition-shadow group ${
                    selected ? 'ring-2 ring-[#F97316] border-[#F97316]' : 'hover:shadow-md'
                  }`}
                >
                  {/* Imagen o color de la categoría */}
                  <div className="relative h-32 flex-shrink-0" style={imageSrc ? undefined : { backgroundColor: catColor }}>
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={product.name}
                        loading="lazy"
                        className={`w-full h-full object-cover ${!product.available ? 'grayscale opacity-60' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl">{emoji ?? '🍽️'}</span>
                      </div>
                    )}

                    {/* Selección + badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      <div
                        className={`transition-opacity ${selectedIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shadow-sm ${
                          selected ? 'bg-[#F97316] border-[#F97316]' : 'bg-white/90 border-[#94A3B8]'
                        }`}>
                          {selected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {product.popular && (
                        <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-xs font-bold rounded-md flex items-center gap-1">
                          <TrendingUp size={12} />
                          Popular
                        </span>
                      )}
                    </div>

                    {!product.available && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/50">
                        <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full bg-black/50 uppercase tracking-wider">
                          Agotado
                        </span>
                      </div>
                    )}

                    {stockState && (
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${stockState.cls}`}>{stockState.label}</span>
                      </div>
                    )}

                    {/* Precio en píldora oscura legible sobre cualquier foto */}
                    <div className="absolute bottom-2 right-2">
                      <span
                        className={`inline-block px-2.5 py-1 text-sm font-bold text-white rounded-full ${product.available === false ? 'line-through' : ''}`}
                        style={{ backgroundColor: 'rgba(15,23,42,0.75)' }}
                      >
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-3 flex flex-col flex-1">
                    {category && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#475569] mb-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                        {category.name}
                      </span>
                    )}
                    <h3 className="font-bold text-[#0F172A] text-[15px] mb-1 line-clamp-1" title={product.name}>
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-[#64748B] mb-2 line-clamp-1">{product.description}</p>
                    )}

                    <div className="mt-auto">
                      <div className="mb-2">
                        <MarginBadge price={product.price} cost={product.cost} />
                      </div>

                      {/* HOTFIX 267: Mostrar en carta QR */}
                      {onToggleShowInQr && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.showInQr !== false}
                          aria-label={`Mostrar ${product.name} en carta QR`}
                          onClick={() => onToggleShowInQr(product, product.showInQr === false)}
                          className="w-full h-11 mb-2 inline-flex items-center gap-2 px-2 rounded-lg hover:bg-slate-50"
                        >
                          <span className={`relative inline-flex w-10 h-6 rounded-full transition-colors flex-shrink-0 ${product.showInQr !== false ? 'bg-[#1E2A4A]' : 'bg-[#CBD5E1]'}`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${product.showInQr !== false ? 'left-5' : 'left-1'}`} />
                          </span>
                          <span className="text-sm font-semibold text-[#1E2A4A]">Mostrar en carta QR</span>
                        </button>
                      )}

                      {(
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditProduct(product)}
                            title="Editar"
                            aria-label={`Editar ${product.name}`}
                            className={`${BTN_OUTLINE} flex-1`}
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => onDuplicateProduct(product)}
                            title="Duplicar"
                            aria-label={`Duplicar ${product.name}`}
                            className={BTN_ICON}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <TrashButton onClick={() => onDeleteProduct(product)} label={`Eliminar ${product.name}`} className="ml-4" />
                        </div>
                      )}
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
