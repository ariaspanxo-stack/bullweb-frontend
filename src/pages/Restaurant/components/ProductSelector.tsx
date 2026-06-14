// ═══════════════════════════════════════════════════════════════
// PRODUCT SELECTOR - SELECTOR DE PRODUCTOS PREMIUM
// Búsqueda rápida + categorías + productos populares
// ═══════════════════════════════════════════════════════════════

import { Search, Star, Plus, Clock } from 'lucide-react';
import type { Product, ProductCategory } from '../../../types/restaurant.types';

interface ProductSelectorProps {
  products: Product[];
  categories: ProductCategory[];
  onSelectProduct: (product: Product) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export const ProductSelector = ({
  products,
  categories,
  onSelectProduct,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange
}: ProductSelectorProps) => {
  // ========== FILTROS ==========
  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.available;
  });

  const popularProducts = products.filter(p => p.popular && p.available).slice(0, 6);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* ========== BÚSQUEDA ========== */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar producto (F para enfocar)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>
      </div>

      {/* ========== CATEGORÍAS ========== */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => onCategoryChange('')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              !selectedCategory
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* ========== PRODUCTOS POPULARES ========== */}
      {!searchQuery && !selectedCategory && popularProducts.length > 0 && (
        <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            Más Vendidos
          </h3>
          <div className="grid grid-cols-6 gap-2">
            {popularProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="bg-white border border-yellow-300 rounded-lg p-3 hover:shadow-md hover:border-orange-500 transition-all group"
              >
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-orange-500">
                    {product.name}
                  </div>
                  <div className="text-xs font-bold text-orange-500">
                    ${product.price.toLocaleString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========== GRID DE PRODUCTOS ========== */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <p className="text-gray-600 font-medium mb-2">
              No se encontraron productos
            </p>
            <p className="text-gray-400 text-sm">
              Prueba con otro término de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-500 hover:shadow-xl transition-all group"
              >
                {/* Imagen placeholder */}
                <div className="w-full aspect-square bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg mb-3 flex items-center justify-center group-hover:from-orange-200 group-hover:to-orange-300 transition-colors">
                  <span className="text-4xl">
                    {product.imageUrl ? '🖼️' : '🍽️'}
                  </span>
                </div>

                {/* Nombre */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
                  {product.name}
                </h3>

                {/* Descripción */}
                {product.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Badges */}
                <div className="flex items-center gap-2 mb-3">
                  {product.popular && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold flex items-center gap-1">
                      <Star size={10} className="fill-yellow-700" />
                      Popular
                    </span>
                  )}
                  {product.preparationTime && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex items-center gap-1">
                      <Clock size={10} />
                      {product.preparationTime}'
                    </span>
                  )}
                </div>

                {/* Precio y botón */}
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold text-orange-500">
                    ${product.price.toLocaleString()}
                  </div>
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={16} className="text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSelector;
