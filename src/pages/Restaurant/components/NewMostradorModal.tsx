// ═══════════════════════════════════════════════════════════════
// NEW MOSTRADOR MODAL - MODAL PARA NUEVA ORDEN PARA LLEVAR
// Similar a OrderModal pero sin mesa, con captura de nombre
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  Trash2,
  ShoppingBag,
  CreditCard,
  Clock,
  Star,
  User,
  Phone,
  AlertCircle,
  MessageSquare,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Printer
} from 'lucide-react';
import { PrintControlModal } from '../../../components/print/PrintControlModal';
import type { PrintControlItem } from '../../../components/print/PrintControlModal';
import type { 
  Product, 
  ProductCategory,
  CartItem 
} from '../../../types/restaurant.types';
import type { ProductModifier } from '../../../types/sales.types';
import customersService from '../../../services/customersService';
import toast from 'react-hot-toast';

interface NewMostradorModalProps {
  products: Product[];
  categories: ProductCategory[];
  onConfirm: (cart: CartItem[], customerName: string, deliveryPhone: string, pickupTime?: string, paymentMethod?: string, customerId?: string) => Promise<void>;
  onClose: () => void;
}

const fmt = (n: number | null | undefined) => Math.round(n || 0).toLocaleString('es-CL');

export const NewMostradorModal = ({
  products,
  categories,
  onConfirm,
  onClose
}: NewMostradorModalProps) => {
  // ========== ESTADO ==========
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [saveToCustomers, setSaveToCustomers] = useState(true);
  // pickupTime removed
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'client' | 'order'>('client');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  // Panel inline de comentario
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Print control
  const [showPrintControl, setShowPrintControl] = useState(false);
  // Autocomplete clientes
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const customerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Cerrar sugerencias al click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          customerInputRef.current && !customerInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerNameChange = useCallback((value: string) => {
    setCustomerName(value);
    setError('');
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
    if (value.trim().length >= 2) {
      setSearchingCustomer(true);
      customerSearchTimeout.current = setTimeout(async () => {
        try {
          const results = await customersService.search(value.trim());
          // Filtrar localmente para garantizar que el texto buscado
          // esté contenido en el nombre o teléfono del resultado
          const term = value.trim().toLowerCase();
          const filtered = results.filter(
            (c: any) =>
              c.name?.toLowerCase().includes(term) ||
              c.phone?.toLowerCase().includes(term) ||
              c.email?.toLowerCase().includes(term)
          );
          setCustomerSuggestions(filtered.slice(0, 5));
          setShowSuggestions(filtered.length > 0);
        } catch { setCustomerSuggestions([]); }
        finally { setSearchingCustomer(false); }
      }, 300);
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      setSearchingCustomer(false);
    }
  }, []);

  const handleSelectCustomer = (customer: any) => {
    setCustomerName(customer.name || '');
    setDeliveryPhone(customer.phone || '');
    setShowSuggestions(false);
    setError('');
  };

  // Focus automático
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // ========== FUNCIONES DE CARRITO ==========
  const handleAddProduct = (product: Product) => {
    const modifiers: ProductModifier[] = (product as any).modifiers ?? [];
    const hasModifiers = modifiers.length > 0;
    const modifiersPrice = modifiers.reduce((s, m) => s + (m.price || 0), 0);
    const notes: string | undefined = (product as any).notes || undefined;
    const effectivePrice = product.price + modifiersPrice;

    // Solo combinar si no tiene modificadores seleccionados
    if (!hasModifiers) {
      const existingItem = cart.find(item => item.productId === product.id && !item.modifiers?.length);
      if (existingItem) {
        setCart(cart.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice, total: (item.quantity + 1) * item.unitPrice }
            : item
        ));
        return;
      }
    }

    const newItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: effectivePrice,
      subtotal: effectivePrice,
      total: effectivePrice,
      ...(hasModifiers && { modifiers, modifiersPrice }),
      ...(notes && { notes }),
    };
    setCart([...cart, newItem]);
  };

  // Al hacer click en producto, agregar directo al carrito
  const handleProductClick = (product: Product) => {
    setSearchQuery('');
    handleAddProduct({ ...product, modifiers: [] } as any);
  };

  // Toggle panel de comentario
  const handleToggleInline = (_itemId: string) => {};

  // Auto-guardar nota directamente al carrito
  const handleUpdateNotes = (itemId: string, notes: string) => {
    setCart(prev => prev.map(i =>
      i.id === itemId ? { ...i, notes: notes || undefined } : i
    ));
  };

  // Toggle modificador con auto-guardado (afecta precio)
  const handleToggleModifier = (itemId: string, mod: ProductModifier) => {
    setCart(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const prod = products.find(p => p.id === item.productId);
      const cur = (item.modifiers as ProductModifier[]) || [];
      const has = cur.some(m => m.id === mod.id);
      const newMods = has ? cur.filter(m => m.id !== mod.id) : [...cur, mod];
      const modifiersPrice = newMods.reduce((s, m) => s + (Number(m.price) || 0), 0);
      const newUnitPrice = (prod?.price ?? item.unitPrice) + modifiersPrice;
      return { ...item, modifiers: newMods, modifiersPrice, unitPrice: newUnitPrice,
        subtotal: newUnitPrice * item.quantity, total: newUnitPrice * item.quantity };
    }));
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== itemId));
      return;
    }
    
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity, subtotal: quantity * item.unitPrice, total: quantity * item.unitPrice }
        : item
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // ========== FILTROS ==========
  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.available;
  });

  // ========== CÁLCULOS ==========
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = 0;
  const total = subtotal;

  // ========== VALIDACIÓN PASO 1 ==========
  const validateClient = (): boolean => {
    if (!customerName.trim()) {
      setError('El nombre del cliente es requerido');
      return false;
    }
    if (false && !deliveryPhone.trim()) {
      setError('El teléfono es requerido para avisar cuando esté listo');
      return false;
    }
    setError('');
    return true;
  };

  // ========== CONFIRMAR ==========
  const handleConfirm = async () => {
    // Validar
    if (cart.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }

    if (!customerName.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }

    if (false && !deliveryPhone.trim()) {
      setError('El teléfono es requerido para llamar cuando esté listo');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // PRIMERO: find-or-create cliente SIEMPRE cuando hay nombre (mostrador siempre tiene nombre+teléfono)
      let customerId: string | undefined;
      if (customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: deliveryPhone.trim() || undefined,
          });
          customerId = customer.id;
          toast.success(`✓ ${customerName.trim()} vinculado a la orden`);
        } catch { /* no bloquear el pedido */ }
      }
      // DESPUÉS: crear la orden con el customerId
      await onConfirm(cart, customerName.trim(), deliveryPhone.trim(), undefined, 'cash', customerId);
    } catch (error: any) {
      setError(error?.message || 'Error al crear orden. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmpty = async () => {
    setLoading(true);
    setError('');
    try {
      let customerId: string | undefined;
      if (customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: deliveryPhone.trim() || undefined,
          });
          customerId = customer.id;
          toast.success(`✓ ${customerName.trim()} vinculado a la orden`);
        } catch { /* no bloquear */ }
      }
      await onConfirm([], customerName.trim(), deliveryPhone.trim(), undefined, 'cash', customerId);
    } catch (error: any) {
      setError(error?.message || 'Error al guardar orden.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    const hayDatos = customerName.trim() || deliveryPhone.trim() || cart.length > 0;
    if (hayDatos) {
      const confirmar = window.confirm('¿Seguro que quieres salir? Se perderán los datos ingresados.');
      if (!confirmar) return;
    }
    onClose();
  };

  return (
    <>
      {/* Overlay — sin onClick para no cerrar al hacer click fuera */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
      />

      {/* Modal lateral */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        
        {/* ========== HEADER ========== */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'order' ? (
              <button
                onClick={() => { setStep('client'); setError(''); }}
                className="w-11 h-11 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag size={22} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-bold text-lg leading-tight">Nueva Orden</h2>
                <span className="bg-white/25 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wide">PARA LLEVAR</span>
              </div>
              <p className="text-blue-100 text-xs font-medium">
                {step === 'client' ? 'Paso 1 · Datos del cliente' : `Paso 2 · Productos · ${cart.length} ${cart.length === 1 ? 'item' : 'items'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'client' ? 'bg-white text-blue-600' : 'bg-white/25 text-white/70'}`}>1</div>
              <div className="w-3 h-px bg-white/40" />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'order' ? 'bg-white text-blue-600' : 'bg-white/25 text-white/70'}`}>2</div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========== FORMULARIO DEL CLIENTE (paso 1) ========== */}
        {step === 'client' && (
        <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 space-y-3 min-h-0">
          {/* ── Card: Datos del cliente ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">
              <User size={12} className="text-blue-400" />Datos del cliente
            </p>
            <div className="relative">
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User size={12} />Nombre *
              </label>
              <div className="relative">
                <input
                  ref={customerInputRef}
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => {
                    // Solo mostrar sugerencias si el texto actual coincide con alguna de ellas
                    if (customerSuggestions.length > 0 && customerName.trim().length >= 2) {
                      const term = customerName.trim().toLowerCase();
                      const stillValid = customerSuggestions.some(
                        (c: any) =>
                          c.name?.toLowerCase().includes(term) ||
                          c.phone?.toLowerCase().includes(term)
                      );
                      if (stillValid) setShowSuggestions(true);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all pr-8"
                />
                {searchingCustomer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {/* Dropdown sugerencias */}
              {showSuggestions && customerSuggestions.length > 0 && (
                <div ref={suggestionsRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-xl overflow-hidden">
                  {customerSuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => handleSelectCustomer(c)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User size={13} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-500 truncate">{c.phone}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Phone size={12} />Teléfono
              </label>
              <input
                type="tel"
                placeholder="+56 9 1234 5678"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
          {/* ── Toggle guardar cliente ── */}
          {customerName.trim() && (
            <button
              type="button"
              onClick={() => setSaveToCustomers(v => !v)}
              className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 transition-all ${
                saveToCustomers
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-dashed border-gray-300 bg-white'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                saveToCustomers ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
              }`}>
                {saveToCustomers && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <UserPlus size={13} className={saveToCustomers ? 'text-blue-600' : 'text-gray-400'} />
              <span className={`text-xs font-bold ${
                saveToCustomers ? 'text-blue-700' : 'text-gray-500'
              }`}>
                Guardar "{customerName.trim()}" en base de Clientes
              </span>
            </button>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}
        </div>
        )}

        {/* ====== RESUMEN CLIENTE (paso 2) ====== */}
        {step === 'order' && (
          <div className="bg-blue-50 border-b-2 border-blue-100 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-900 truncate">{customerName}</p>
                <p className="text-xs text-blue-600 truncate">{deliveryPhone}</p>
              </div>
            </div>
          </div>
        )}

        {/* ====== BÚSQL + CARRITO (paso 2) ====== */}
        {step === 'order' && (<>
        {/* ========== BÚSQUEDA ========== */}
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}

            {/* Dropdown de resultados de búsqueda */}
            {searchQuery && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-500 rounded-lg shadow-xl max-h-[300px] overflow-y-auto z-50">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="w-full p-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 line-clamp-1">
                            {product.name}
                          </h3>
                          {product.popular && (
                            <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5" />
                          )}
                          {product.modifiers && product.modifiers.length > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 rounded px-1 py-0.5 font-medium flex-shrink-0">Extras</span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mb-1">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-500">
                            ${fmt(product.price)}
                          </span>
                          {product.preparationTime && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={10} />
                              {product.preparationTime}'
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Plus size={16} className="text-white" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Mensaje cuando no hay resultados */}
            {searchQuery && filteredProducts.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 text-center z-50">
                <Search size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">No se encontraron productos</p>
              </div>
            )}
          </div>

          {/* Categorías */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                !selectedCategory
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grilla de productos por categoría (sin búsqueda) ── */}
        {!searchQuery && selectedCategory && (
          <div className="border-b border-gray-200 bg-white overflow-y-auto flex-shrink-0" style={{ maxHeight: 240 }}>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 p-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="text-left p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all"
                  >
                    <p className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</p>
                    <p className="text-sm font-bold text-blue-600">${fmt(product.price)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-6">Sin productos en esta categoría</p>
            )}
          </div>
        )}

        {/* ========== CONTENIDO - SOLO CARRITO ========== */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* CARRITO (100% altura) */}
            <div className="flex-1 bg-gray-50 flex flex-col min-h-0 overflow-hidden">
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingBag size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 text-sm font-medium">Carrito vacío</p>
                  <p className="text-gray-400 text-xs">Agrega productos arriba</p>
                </div>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-yellow-50 rounded-lg border border-yellow-200 overflow-hidden"
                    >
                      {/* Fila principal: qty + nombre + precio + botones */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        {/* Controles de cantidad */}
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 bg-yellow-200 hover:bg-yellow-300 rounded flex items-center justify-center transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 bg-yellow-200 hover:bg-yellow-300 rounded flex items-center justify-center transition-colors"
                        >
                          <Plus size={10} />
                        </button>

                        {/* Nombre del producto */}
                        <span className="flex-1 font-semibold text-sm text-gray-900 truncate">
                          {item.productName}
                        </span>

                        {/* Precio */}
                        <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                          $ {fmt(item.subtotal)}
                        </span>

                        {/* Botón eliminar */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Nota: boton o textarea */}
                      {(expandedNotes[item.id] || (item.notes && item.notes.trim().length > 0)) ? (
                        <div className="border-t border-yellow-200 bg-white">
                          <textarea
                            placeholder="Escribe la nota..."
                            value={item.notes || ''}
                            onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                            rows={2}
                            className="w-full text-xs px-3 py-2 resize-none focus:outline-none placeholder-gray-400 bg-white"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="border-t border-yellow-200 bg-white px-2 py-1.5">
                          <button
                            onClick={() => setExpandedNotes(prev => ({ ...prev, [item.id]: true }))}
                            className="w-full py-2 rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-400 text-yellow-700 text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare size={13} />
                            AGREGAR NOTA
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totales y botón — fijo abajo */}
                <div className="border-t-2 border-gray-300 bg-white p-3 flex-shrink-0">
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-medium">${fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span className="text-blue-500">${fmt(total)}</span>
                    </div>
                  </div>

                  {/* Error visible en paso 2 */}
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 mb-2">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span className="text-xs font-medium">{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleConfirm}
                    disabled={loading || cart.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Crear Orden ${fmt(total)}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowPrintControl(true)}
                    disabled={cart.length === 0}
                    className="w-full py-2 border-2 border-indigo-400 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Printer size={17} />
                    Imprimir control de mesa
                  </button>
                </div>
              </>
            )}
                  {/* Guardar sin productos — siempre visible en paso order */}
                  {step === 'order' && (
                  <button
                    onClick={handleSaveEmpty}
                    disabled={loading || !customerName.trim()}
                    className="w-full border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    💾 Guardar sin productos
                  </button>
                  )}
          </div>
        </div>
        </>)}

        {/* Botón continuar - solo paso 1 */}
        {step === 'client' && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 flex-shrink-0">
            <button
              onClick={() => { if (validateClient()) { setStep('order'); setTimeout(() => searchInputRef.current?.focus(), 100); } }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-base font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
            >
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              Continuar — Elegir productos
            </button>
          </div>
        )}
      </div>

      <PrintControlModal
        open={showPrintControl}
        onClose={() => setShowPrintControl(false)}
        customerName={customerName.trim() || undefined}
        tableLabel="Mostrador"
        items={cart.map((i): PrintControlItem => ({
          name: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total ?? i.subtotal,
        }))}
        subtotal={subtotal}
        tax={tax}
        total={total}
      />
    </>
  );
};

export default NewMostradorModal;
