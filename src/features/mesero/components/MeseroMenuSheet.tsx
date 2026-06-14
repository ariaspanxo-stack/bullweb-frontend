// ═══════════════════════════════════════════════════════════════
// MESERO MENU SHEET — bottom sheet para seleccionar productos
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Search, ChevronRight, Loader2 } from 'lucide-react';
import { MeseroModifiers } from './MeseroModifiers';

interface Props {
  categories:       any[];
  products:         any[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  onAddProduct:     (product: any, modifiers: any[], notes: string) => void;
  onClose:          () => void;
  loadingMenu:      boolean;
}

export function MeseroMenuSheet({
  categories, products, selectedCategory,
  onSelectCategory, onAddProduct, onClose, loadingMenu,
}: Props) {
  const [search,         setSearch]         = useState('');
  const [pendingProduct, setPendingProduct] = useState<any | null>(null);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black text-gray-800">Agregar productos</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Categorías */}
        {!search && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium
                  transition-colors
                  ${selectedCategory === cat.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {loadingMenu ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm">Sin resultados para "{search}"</p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {filtered.map(product => (
                <button
                  key={product.id}
                  onClick={() => {
                    if (product.modifiers?.length > 0) {
                      setPendingProduct(product);
                    } else {
                      onAddProduct(product, [], '');
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100
                             rounded-2xl hover:border-orange-200 hover:bg-orange-50
                             active:scale-[0.98] transition-all text-left"
                >
                  {/* Imagen o emoji */}
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center
                                  justify-center flex-shrink-0 overflow-hidden">
                    {product.image
                      ? <img src={product.image} alt={product.name}
                             className="w-full h-full object-cover" />
                      : <span className="text-2xl">🍽️</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>
                    )}
                    {product.modifiers?.length > 0 && (
                      <p className="text-xs text-orange-500 mt-0.5">+ opciones disponibles</p>
                    )}
                  </div>

                  {/* Precio */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-800">
                      ${product.price.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de modificadores */}
      {pendingProduct && (
        <MeseroModifiers
          product={pendingProduct}
          onConfirm={(modifiers, notes, customPrice) => {
            const prod = customPrice
              ? { ...pendingProduct, price: customPrice }
              : pendingProduct;
            onAddProduct(prod, modifiers, notes);
            setPendingProduct(null);
          }}
          onClose={() => setPendingProduct(null)}
        />
      )}
    </div>
  );
}
