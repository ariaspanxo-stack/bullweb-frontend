// ═══════════════════════════════════════════════════════════════
// NEW DELIVERY MODAL - MODAL PARA NUEVA ORDEN DELIVERY
// Similar a Mostrador pero con dirección y teléfono requeridos
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Minus,
  Truck,
  CreditCard,
  User,
  Phone,
  MapPin,
  AlertCircle,
  Clock,
  Star,
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
  CartItem,
  ProductModifier
} from '../../../types/restaurant.types';
import customersService from '../../../services/customersService';
import toast from 'react-hot-toast';

interface NewDeliveryModalProps {
  products: Product[];
  categories: ProductCategory[];
  onConfirm: (cart: CartItem[], customerName: string, customerPhone: string, customerAddress: string, deliveryCity: string, deliveryNotes: string, deliveryCost: number, paymentMethod?: string, customerId?: string) => Promise<void>;
  onClose: () => void;
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-CL');

export const NewDeliveryModal = ({
  products,
  categories,
  onConfirm,
  onClose
}: NewDeliveryModalProps) => {
  // ========== ESTADO ==========
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [saveToCustomers, setSaveToCustomers] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryCost, setDeliveryCost] = useState('2000');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'client' | 'order'>('client');
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
    setErrors([]);
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
    if (value.trim().length >= 2) {
      setSearchingCustomer(true);
      customerSearchTimeout.current = setTimeout(async () => {
        try {
          const results = await customersService.search(value.trim());
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
    setCustomerPhone(customer.phone || '');
    if (customer.address) setCustomerAddress(customer.address);
    setShowSuggestions(false);
    setErrors([]);
  };

  // Focus automático
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // ========== FUNCIONES DE CARRITO ==========
  const handleAddProduct = (product: Product) => {
    const modifiers: ProductModifier[] = (product as any).modifiers ?? [];
    const hasModifiers = modifiers.length > 0;
    const modifiersPrice = modifiers.reduce((s, m) => s + (Number(m.price) || 0), 0);
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
  const deliveryFeeValue = parseInt(deliveryCost) || 0;
  const total = subtotal + deliveryFeeValue;

  // ========== VALIDACIÓN PASO 1 (solo cliente) ==========
  const validateClient = (): boolean => {
    const newErrors: string[] = [];
    if (!customerName.trim()) newErrors.push('El nombre es requerido');
    if (!customerPhone.trim()) newErrors.push('El teléfono es requerido');
    if (!customerAddress.trim()) newErrors.push('La dirección es requerida');
    if (!deliveryCity.trim()) newErrors.push('La ciudad/comuna es requerida');
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // ========== VALIDACIÓN PASO 2 (todo) ==========
  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (cart.length === 0) {
      newErrors.push('Agrega al menos un producto');
    }

    if (!customerName.trim()) {
      newErrors.push('El nombre es requerido');
    }

    if (!customerPhone.trim()) {
      newErrors.push('El teléfono es requerido');
    }

    if (!customerAddress.trim()) {
      newErrors.push('La dirección es requerida');
    }

    if (!deliveryCity.trim()) {
      newErrors.push('La ciudad/comuna es requerida');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // ========== CONFIRMAR ==========
  const handleConfirm = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      // PRIMERO: find-or-create cliente SIEMPRE (delivery siempre tiene nombre+teléfono obligatorios)
      let customerId: string | undefined;
      if (customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
          });
          customerId = customer.id;
          toast.success(`✓ ${customerName.trim()} vinculado a la orden`);
        } catch { /* no bloquear el pedido */ }
      }
      // DESPUÉS: crear la orden con el customerId
      await onConfirm(
        cart, 
        customerName.trim(), 
        customerPhone.trim(), 
        customerAddress.trim(),
        deliveryCity.trim(),
        deliveryNotes.trim(),
        deliveryFeeValue,
        'cash',
        customerId
      );
    } catch (error: any) {
      setErrors([error?.message || 'Error al crear orden. Intenta nuevamente.']);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmpty = async () => {
    setLoading(true);
    try {
      let customerId: string | undefined;
      if (customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
          });
          customerId = customer.id;
          toast.success(`✓ ${customerName.trim()} vinculado a la orden`);
        } catch { /* no bloquear */ }
      }
      await onConfirm(
        [],
        customerName.trim(),
        customerPhone.trim(),
        customerAddress.trim(),
        deliveryCity.trim(),
        deliveryNotes.trim(),
        deliveryFeeValue,
        'cash',
        customerId
      );
    } catch (error: any) {
      setErrors([error?.message || 'Error al guardar orden.']);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    const hayDatos = customerName.trim() || customerPhone.trim() || customerAddress.trim() || deliveryCity.trim() || cart.length > 0;
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
      <div className="fixed right-0 top-0 h-screen w-full sm:w-[520px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        
        {/* ========== HEADER ========== */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'order' ? (
              <button
                onClick={() => { setStep('client'); setErrors([]); }}
                className="w-11 h-11 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck size={22} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-bold text-lg leading-tight">Nueva Orden</h2>
                <span className="bg-white/25 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wide">DELIVERY</span>
              </div>
              <p className="text-purple-100 text-xs font-medium">
                {step === 'client' ? 'Paso 1 · Datos del cliente' : `Paso 2 · Productos · ${cart.length} ${cart.length === 1 ? 'item' : 'items'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'client' ? 'bg-white text-purple-600' : 'bg-white/25 text-white/70'}`}>1</div>
              <div className="w-3 h-px bg-white/40" />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'order' ? 'bg-white text-purple-600' : 'bg-white/25 text-white/70'}`}>2</div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========== CONTENIDO SCROLLEABLE ========== */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ====== FORMULARIO DEL CLIENTE (paso 1) ====== */}
          {step === 'client' && (
          <div className="bg-[#f4f6fb] px-4 py-5 space-y-3">
            {/* ── Card: Datos del cliente ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">
                <User size={12} className="text-purple-400" />Datos del cliente
              </p>
              <div className="relative">
                <label className="block text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User size={12} />Nombre *
                </label>
                <div className="relative">
                  <input
                    ref={customerInputRef}
                    type="text"
                    placeholder="Nombre completo"
                    value={customerName}
                    onChange={(e) => handleCustomerNameChange(e.target.value)}
                    onFocus={() => {
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
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all pr-8"
                  />
                  {searchingCustomer && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {/* Dropdown sugerencias */}
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-purple-200 rounded-xl shadow-xl overflow-hidden">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => handleSelectCustomer(c)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 transition-colors text-left border-b border-gray-100 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <User size={13} className="text-purple-600" />
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
                <label className="block text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Phone size={12} />Teléfono *
                </label>
                <input
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setErrors([]); }}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
            {/* ── Card: Dirección de entrega ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 space-y-3.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider pb-2 border-b border-purple-100">
                <MapPin size={12} />Dirección de entrega
              </p>
              <div>
                <label className="block text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin size={12} />Dirección *
                </label>
                <input
                  type="text"
                  placeholder="Calle, número, depto..."
                  value={customerAddress}
                  onChange={(e) => { setCustomerAddress(e.target.value); setErrors([]); }}
                  className="w-full px-4 py-3.5 bg-purple-50 border-2 border-purple-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MapPin size={12} />Ciudad *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Santiago"
                    value={deliveryCity}
                    onChange={(e) => { setDeliveryCity(e.target.value); setErrors([]); }}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Truck size={12} />Costo envío
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-500">$</span>
                    <input
                      type="number"
                      placeholder="2000"
                      value={deliveryCost}
                      onChange={(e) => setDeliveryCost(e.target.value)}
                      className="w-full pl-7 pr-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />Indicaciones
                  <span className="text-gray-300 normal-case font-normal ml-1">— opcional</span>
                </label>
                <input
                  type="text"
                  placeholder="Timbre 2B, portería, sin ascensor..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
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
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-dashed border-gray-300 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  saveToCustomers ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'
                }`}>
                  {saveToCustomers && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                <UserPlus size={13} className={saveToCustomers ? 'text-purple-600' : 'text-gray-400'} />
                <span className={`text-xs font-bold ${
                  saveToCustomers ? 'text-purple-700' : 'text-gray-500'
                }`}>
                  Guardar "{customerName.trim()}" en base de Clientes
                </span>
              </button>
            )}
          </div>
          )}

          {/* ====== RESUMEN CLIENTE (paso 2) ====== */}
          {step === 'order' && (
            <div className="bg-purple-50 border-b-2 border-purple-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                  <User size={13} className="text-purple-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-purple-900 truncate">{customerName}</p>
                  <p className="text-xs text-purple-600 truncate">{customerPhone} · {customerAddress}, {deliveryCity}</p>
                  {deliveryNotes && <p className="text-xs text-purple-500 italic truncate">{deliveryNotes}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ====== BÚSQL + CARRITO (paso 2) ====== */}
          {step === 'order' && (<>
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}

              {/* Dropdown de resultados */}
              {searchQuery && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-purple-500 rounded-lg shadow-xl max-h-[300px] overflow-y-auto z-50">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        handleAddProduct(product);
                        setSearchQuery('');
                      }}
                      className="w-full p-3 hover:bg-purple-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                            {product.popular && (
                              <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mb-1">{product.description}</p>
                          )}
                          <span className="text-lg font-bold text-purple-500">${fmt(product.price)}</span>
                        </div>
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Plus size={16} className="text-white" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

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
                  !selectedCategory ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      onClick={() => { handleAddProduct(product); }}
                      className="text-left p-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl transition-all"
                    >
                      <p className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</p>
                      <p className="text-sm font-bold text-purple-600">${fmt(product.price)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-400 py-6">Sin productos en esta categoría</p>
              )}
            </div>
          )}

          {/* ====== CARRITO ====== */}
          <div className="bg-gray-50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Truck size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 text-sm font-medium">Carrito vacío</p>
                <p className="text-gray-400 text-xs">Agrega productos arriba</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-yellow-50 rounded-xl border border-yellow-200 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-5 h-5 bg-yellow-200 hover:bg-yellow-300 rounded flex items-center justify-center transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-5 h-5 bg-yellow-200 hover:bg-yellow-300 rounded flex items-center justify-center transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                      <span className="flex-1 font-semibold text-sm text-gray-900 truncate">{item.productName}</span>
                      <span className="text-sm font-bold text-gray-800 whitespace-nowrap">$ {fmt(item.subtotal)}</span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="border-t border-yellow-200 bg-white">
                      <textarea
                        placeholder="Agrega un comentario aquí..."
                        value={(item as any).notes || ''}
                        onChange={(e) => {
                          const notes = e.target.value;
                          setCart(prev => prev.map(i =>
                            i.id === item.id ? { ...i, notes: notes || undefined } as any : i
                          ));
                        }}
                        rows={2}
                        className="w-full text-xs px-3 py-2 resize-none focus:outline-none placeholder-gray-400 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>)}

        </div>{/* fin scroll */}

        {/* ========== FOOTER SIEMPRE VISIBLE ========== */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-4">
          {/* Errores */}
          {errors.length > 0 && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
              {errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          {step === 'client' ? (
            <button
              onClick={() => { if (validateClient()) { setStep('order'); setTimeout(() => searchInputRef.current?.focus(), 100); } }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-base font-bold hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 group"
            >
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              Continuar — Elegir productos
            </button>
          ) : (
            <>
              {/* Totales compactos */}
              {cart.length > 0 && (
                <div className="space-y-0.5 mb-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">${fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-purple-600">
                    <span>Delivery</span>
                    <span className="font-medium">${fmt(deliveryFeeValue)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-purple-600">${fmt(total)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={loading}
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
                    {cart.length === 0
                      ? 'Crear Delivery'
                      : `Crear Delivery $${fmt(total)}`}
                  </>
                )}
              </button>
              <button
                onClick={handleSaveEmpty}
                disabled={loading}
                className="w-full border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 Guardar sin productos
              </button>
              <button
                onClick={() => setShowPrintControl(true)}
                disabled={cart.length === 0}
                className="w-full py-2 border-2 border-indigo-400 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={17} />
                Imprimir control de mesa
              </button>
            </>
          )}
        </div>

      </div>
      <PrintControlModal
        open={showPrintControl}
        onClose={() => setShowPrintControl(false)}
        customerName={customerName.trim() || undefined}
        tableLabel="Delivery"
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

export default NewDeliveryModal;
