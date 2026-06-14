// ═══════════════════════════════════════════════════════════════
// ADD ITEMS MODAL - Agregar productos a una orden existente
// ═══════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { X, Search, Plus, Minus, ShoppingCart, Star } from 'lucide-react';
import type { Product, ProductCategory, CartItem } from '../../../types/restaurant.types';
import type { ProductModifier } from '../../../types/sales.types';

interface AddItemsModalProps {
  orderNumber: string;
  orderType: 'mostrador' | 'delivery';
  products: Product[];
  categories: ProductCategory[];
  onConfirm: (cart: CartItem[]) => Promise<void>;
  onClose: () => void;
}

export const AddItemsModal = ({
  orderNumber,
  orderType,
  products,
  categories,
  onConfirm,
  onClose,
}: AddItemsModalProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const accent = orderType === 'delivery' ? 'purple' : 'blue';

  const filteredProducts = products.filter(p => {
    const matchCat = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && p.available;
  });

  const handleAdd = (product: Product) => {
    const modifiers: ProductModifier[] = (product as any).modifiers ?? [];
    const hasModifiers = modifiers.length > 0;
    if (!hasModifiers) {
      const existing = cart.find(i => i.productId === product.id && !i.modifiers?.length);
      if (existing) {
        setCart(cart.map(i =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice, total: (i.quantity + 1) * i.unitPrice }
            : i
        ));
        setSearchQuery('');
        return;
      }
    }
    const newItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      subtotal: product.price,
      total: product.price,
    };
    setCart([...cart, newItem]);
    setSearchQuery('');
  };

  const handleQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(cart.filter(i => i.id !== id)); return; }
    setCart(cart.map(i => i.id === id ? { ...i, quantity: qty, subtotal: qty * i.unitPrice, total: qty * i.unitPrice } : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const tax = 0;
  const total = subtotal;

  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      await onConfirm(cart);
    } finally {
      setLoading(false);
    }
  };

  const colorBtn = accent === 'purple'
    ? 'bg-purple-500 hover:bg-purple-600'
    : 'bg-blue-500 hover:bg-blue-600';
  const colorRing = accent === 'purple'
    ? 'focus:ring-purple-500 border-purple-500'
    : 'focus:ring-blue-500 border-blue-500';
  const colorBadge = accent === 'purple'
    ? 'bg-purple-500 text-white'
    : 'bg-blue-500 text-white';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[420px] bg-white shadow-2xl z-[60] flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className={`${accent === 'purple' ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-blue-600 to-blue-700'} text-white px-4 py-3 flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Agregar productos</h2>
              <p className={`${accent === 'purple' ? 'text-purple-100' : 'text-blue-100'} text-xs`}>
                Orden #{orderNumber} · {cart.length} {cart.length === 1 ? 'nuevo' : 'nuevos'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* SEARCH + CATEGORIES */}
        <div className="p-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${colorRing} focus:border-transparent`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}

            {searchQuery && filteredProducts.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1 bg-white border-2 ${accent === 'purple' ? 'border-purple-500' : 'border-blue-500'} rounded-lg shadow-xl max-h-[280px] overflow-y-auto z-50`}>
                {filteredProducts.map(product => (
                  <button key={product.id} onClick={() => handleAdd(product)}
                    className={`w-full p-3 hover:${accent === 'purple' ? 'bg-purple-50' : 'bg-blue-50'} transition-colors text-left border-b border-gray-100 last:border-0 flex items-center justify-between gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-sm text-gray-900 truncate">{product.name}</span>
                        {product.popular && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                      </div>
                      <span className={`text-base font-bold ${accent === 'purple' ? 'text-purple-600' : 'text-blue-600'}`}>${product.price.toLocaleString()}</span>
                    </div>
                    <div className={`w-7 h-7 ${colorBtn} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Plus size={14} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            <button onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!selectedCategory ? colorBadge : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Todos
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id ? colorBadge : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* CART */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">Sin productos nuevos</p>
              <p className="text-gray-400 text-xs">Busca un producto arriba para agregarlo</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 flex items-center gap-2 px-3 py-2.5">
                  <button onClick={() => handleQty(item.id, item.quantity - 1)}
                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Minus size={11} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                  <button onClick={() => handleQty(item.id, item.quantity + 1)}
                    className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Plus size={11} />
                  </button>
                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">{item.productName}</span>
                  <span className="text-sm font-bold text-gray-700 whitespace-nowrap">${item.subtotal.toLocaleString()}</span>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        {cart.length > 0 && (
          <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white px-3 pt-3 pb-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span className="font-medium">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total nuevos</span>
              <span className={accent === 'purple' ? 'text-purple-600' : 'text-blue-600'}>${total.toLocaleString()}</span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`w-full py-3 ${colorBtn} text-white rounded-lg font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />Agregando...</>
              ) : (
                <><Plus size={18} />Agregar {cart.length} producto{cart.length !== 1 ? 's' : ''} a la orden</>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AddItemsModal;
