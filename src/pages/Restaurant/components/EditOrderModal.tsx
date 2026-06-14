// ═══════════════════════════════════════════════════════════════
// EDIT ORDER MODAL — Editar venta existente
// Permite eliminar productos existentes y agregar nuevos
// ═══════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { X, Search, Plus, Minus, Trash2, Pencil, Star } from 'lucide-react';
import type { Product, ProductCategory, CartItem } from '../../../types/restaurant.types';
import type { Sale, SaleItem } from '../../../types/sales.types';
import { restaurantService } from '../../../services/restaurantService';

interface EditOrderModalProps {
  order: Sale;
  products: Product[];
  categories: ProductCategory[];
  onClose: () => void;
  onUpdated: () => void;
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-CL');

export const EditOrderModal = ({
  order,
  products,
  categories,
  onClose,
  onUpdated,
}: EditOrderModalProps) => {
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [newCart, setNewCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const orderType = (order as any).type === 'delivery' ? 'delivery' : 'mostrador';
  const accent = orderType === 'delivery' ? 'purple' : 'blue';
  const existingItems: SaleItem[] = ((order as any).items as SaleItem[]) || [];
  const orderNum = (order as any).orderNumber || order.id.slice(-6).toUpperCase();

  /* ── Toggle marcar/desmarcar para eliminar ── */
  const toggleDelete = (itemId: string) => {
    setPendingDeletes(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  /* ── Agregar producto al carrito de nuevos ── */
  const handleAddProduct = (product: Product) => {
    const existing = newCart.find(i => i.productId === product.id);
    if (existing) {
      setNewCart(newCart.map(i =>
        i.id === existing.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice, total: (i.quantity + 1) * i.unitPrice }
          : i
      ));
    } else {
      setNewCart([...newCart, {
        id: `cart-${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        subtotal: product.price,
        total: product.price,
      }]);
    }
    setSearchQuery('');
  };

  const handleQty = (id: string, qty: number) => {
    if (qty <= 0) { setNewCart(newCart.filter(i => i.id !== id)); return; }
    setNewCart(newCart.map(i => i.id === id
      ? { ...i, quantity: qty, subtotal: qty * i.unitPrice, total: qty * i.unitPrice }
      : i
    ));
  };

  const filteredProducts = products.filter(p => {
    const matchCat = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && p.available;
  });

  const hasChanges = pendingDeletes.size > 0 || newCart.length > 0;
  const newSubtotal = newCart.reduce((s, i) => s + i.subtotal, 0);
  const newTax = 0;
  const newTotal = newSubtotal;

  /* ── Guardar cambios ── */
  const handleSave = async () => {
    if (!hasChanges) { onClose(); return; }
    setLoading(true);
    setError('');
    try {
      for (const itemId of Array.from(pendingDeletes)) {
        await restaurantService.removeItemFromOrder(order.id, itemId);
      }
      if (newCart.length > 0) {
        await restaurantService.addItemsToSale(order.id, newCart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          modifiers: [],
          modifiersPrice: 0,
          notes: item.notes || '',
        })));
      }
      onUpdated();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const accentBg = accent === 'purple'
    ? 'bg-gradient-to-br from-purple-600 to-purple-700'
    : 'bg-gradient-to-br from-blue-600 to-blue-700';
  const accentText = accent === 'purple' ? 'text-purple-100' : 'text-blue-100';
  const accentBtn = accent === 'purple'
    ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
  const accentFocus = accent === 'purple'
    ? 'focus:ring-purple-400 focus:border-purple-400'
    : 'focus:ring-blue-400 focus:border-blue-400';
  const accentDropdown = accent === 'purple' ? 'border-purple-400' : 'border-blue-400';
  const accentPill = accent === 'purple' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white';
  const accentPriceText = accent === 'purple' ? 'text-purple-600' : 'text-blue-600';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />

      <div className="fixed right-0 top-0 h-screen w-[480px] bg-white shadow-2xl z-[60] flex flex-col overflow-hidden">

        {/* ── HEADER ── */}
        <div className={`${accentBg} text-white px-4 py-3 flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Pencil size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Editar Venta #{orderNum}</h2>
              <p className={`${accentText} text-xs`}>
                {existingItems.length} producto{existingItems.length !== 1 ? 's' : ''} · {(order as any).customerName || ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── CUERPO SCROLLABLE ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* PRODUCTOS EXISTENTES */}
          <div className="p-4 pb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Productos actuales
            </p>
            <div className="space-y-1.5">
              {existingItems.length === 0 && (
                <p className="text-xs text-gray-400 italic">Sin productos</p>
              )}
              {existingItems.map(item => {
                const isMarked = pendingDeletes.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                      isMarked
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-6 text-sm font-bold flex-shrink-0 ${isMarked ? 'text-red-400 line-through' : 'text-gray-500'}`}>
                      {item.quantity}×
                    </span>
                    <span className={`flex-1 text-sm truncate ${isMarked ? 'line-through text-red-400' : 'text-gray-900 font-medium'}`}>
                      {item.productName}
                    </span>
                    <span className={`text-sm font-bold whitespace-nowrap flex-shrink-0 ${isMarked ? 'line-through text-red-400' : 'text-gray-700'}`}>
                      ${fmt(item.total ?? (item as any).subtotal ?? 0)}
                    </span>
                    <button
                      onClick={() => toggleDelete(item.id)}
                      title={isMarked ? 'Deshacer' : 'Eliminar'}
                      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isMarked
                          ? 'bg-red-200 text-red-600 hover:bg-red-300'
                          : 'bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500'
                      }`}
                    >
                      {isMarked ? <Plus size={12} /> : <Trash2 size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEPARADOR */}
          <div className={`mx-4 h-0.5 my-2 ${accent === 'purple' ? 'bg-purple-100' : 'bg-blue-100'}`} />

          {/* AGREGAR NUEVOS PRODUCTOS */}
          <div className="p-4 pt-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Agregar productos
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${accentFocus} transition-colors`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
              {/* Dropdown */}
              {searchQuery && filteredProducts.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1 bg-white border-2 ${accentDropdown} rounded-xl shadow-xl max-h-[240px] overflow-y-auto z-50`}>
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="w-full px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          {p.popular && <Star size={11} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                        </div>
                        <span className={`text-sm font-bold ${accentPriceText}`}>${fmt(p.price)}</span>
                      </div>
                      <div className={`w-7 h-7 ${accent === 'purple' ? 'bg-purple-500' : 'bg-blue-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Plus size={14} className="text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && filteredProducts.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow p-3 text-center z-50">
                  <p className="text-xs text-gray-500">Sin resultados para "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Category pills */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!selectedCategory ? accentPill : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id ? accentPill : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Carrito de nuevos */}
            {newCart.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">
                  A agregar:
                </p>
                {newCart.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-2.5 py-2"
                  >
                    <button
                      onClick={() => handleQty(item.id, item.quantity - 1)}
                      className="w-5 h-5 bg-green-200 hover:bg-green-300 rounded-md flex items-center justify-center flex-shrink-0"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => handleQty(item.id, item.quantity + 1)}
                      className="w-5 h-5 bg-green-200 hover:bg-green-300 rounded-md flex items-center justify-center flex-shrink-0"
                    >
                      <Plus size={10} />
                    </button>
                    <span className="flex-1 text-sm font-medium text-gray-900 truncate">{item.productName}</span>
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap">${fmt(item.subtotal)}</span>
                    <button
                      onClick={() => setNewCart(newCart.filter(i => i.id !== item.id))}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white px-4 pt-3 pb-4 space-y-2">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{error}</p>
          )}
          {pendingDeletes.size > 0 && (
            <p className="text-xs text-red-500 font-medium text-center">
              ⚠ Se eliminarán {pendingDeletes.size} producto{pendingDeletes.size !== 1 ? 's' : ''} de la orden
            </p>
          )}
          {newCart.length > 0 && (
            <div className="text-sm text-gray-600 space-y-0.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <div className="flex justify-between">
                <span>Nuevos subtotal</span>
                <span className="font-medium">${fmt(newSubtotal)}</span>
              </div>
              <div className={`flex justify-between font-bold pt-1 border-t border-green-200 ${accentPriceText}`}>
                <span>Adicional</span>
                <span>${fmt(newTotal)}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !hasChanges}
            className={`w-full py-3 ${hasChanges ? accentBtn : 'bg-gray-100'} ${hasChanges ? 'text-white' : 'text-gray-400'} rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Guardando...
              </>
            ) : hasChanges ? (
              <>
                <Pencil size={16} />
                Guardar cambios
              </>
            ) : (
              <span>Sin cambios pendientes</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default EditOrderModal;
