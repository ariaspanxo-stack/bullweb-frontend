import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { menuService } from '@/services/menuService';
import { Search, Plus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

interface ProductGridProps {
  onProductClick: (product: Product) => void;
}

// ============================================================================
// COMPONENTE PRODUCT GRID
// ============================================================================

export default function ProductGrid({ onProductClick }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar categorías
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => menuService.getCategories()
  });

  // Cargar productos
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', selectedCategory, searchQuery],
    queryFn: () => menuService.getProducts({
      categoryId: selectedCategory,
      search: searchQuery,
      available: true
    })
  });

  return (
    <div className="flex flex-col h-full">
      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            !selectedCategory
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Todos
        </button>
        {categories?.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === category.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Grid de productos */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-[3/4] bg-gray-200 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-1">No se encontraron productos</p>
            <p className="text-sm">Intenta con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => onProductClick(product)}
                className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden text-left"
              >
                {/* Imagen */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl">🍽️</span>
                    </div>
                  )}
                  
                  {/* Badge si no está disponible */}
                  {!product.available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        No Disponible
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600">
                      {formatCurrency(product.price)}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
