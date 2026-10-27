// ═══════════════════════════════════════════════════════════════
// NEW DELIVERY MODAL - MODAL PARA NUEVA ORDEN DELIVERY
// Similar a Mostrador pero con dirección y teléfono requeridos
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { createPortal } from 'react-dom';
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
  Mail,
  Clock,
  Star,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Printer,
  Trash2,
  LayoutGrid
} from 'lucide-react';
import { emojiForCategory, categoryLabel, colorForCategory } from '../../../lib/categoryHelpers';
import { PrintControlModal } from '../../../components/print/PrintControlModal';
import { OrderTicket } from '../../../components/restaurant/shared/OrderTicket';
import type { PrintControlItem } from '../../../components/print/PrintControlModal';
import type { 
  Product, 
  ProductCategory,
  CartItem,
  ProductModifier
} from '../../../types/restaurant.types';
import customersService from '../../../services/customersService';
import { paymentMethodsService } from '../../../services/paymentMethodsService';
import toast from 'react-hot-toast';
import { useRestaurant } from '../../../contexts/RestaurantContext';

interface NewDeliveryModalProps {
  products: Product[];
  categories: ProductCategory[];
  onConfirm: (cart: CartItem[], customerName: string, customerPhone: string, customerAddress: string, deliveryCity: string, deliveryNotes: string, deliveryCost: number, paymentMethod?: string, customerId?: string, cashAmount?: number) => Promise<void>;
  onClose: () => void;
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-CL');

export const NewDeliveryModal = ({
  products,
  categories,
  onConfirm,
  onClose
}: NewDeliveryModalProps) => {
  // HOTFIX 262: clientes/CRM no está en Básico — sin búsqueda ni alta de clientes desde el POS
  // (el backend igual registra nombre y teléfono en el pedido).
  const { isBasico } = usePlan();
  // ========== ESTADO (drafts persistentes en el contexto) ==========
  // FIX: el carrito y los datos del cliente viven en el contexto para sobrevivir
  // al cierre del modal (antes se perdían porque eran useState local).
  const {
    deliveryCart: cart, setDeliveryCart: setCart,
    deliveryDraft, setDeliveryDraft,
    clearDeliveryDraft,
  } = useRestaurant();
  const customerName = deliveryDraft.customerName;
  const customerPhone = deliveryDraft.customerPhone;
  const customerAddress = deliveryDraft.customerAddress;
  const deliveryCity = deliveryDraft.deliveryCity;
  const deliveryNotes = deliveryDraft.deliveryNotes;
  const deliveryCost = deliveryDraft.deliveryCost;
  const customerEmail = deliveryDraft.customerEmail;
  const setCustomerName = (v: string) => setDeliveryDraft({ ...deliveryDraft, customerName: v });
  const setCustomerPhone = (v: string) => setDeliveryDraft({ ...deliveryDraft, customerPhone: v });
  const setCustomerAddress = (v: string) => setDeliveryDraft({ ...deliveryDraft, customerAddress: v });
  const setDeliveryCity = (v: string) => setDeliveryDraft({ ...deliveryDraft, deliveryCity: v });
  const setDeliveryNotes = (v: string) => setDeliveryDraft({ ...deliveryDraft, deliveryNotes: v });
  const setDeliveryCost = (v: string) => setDeliveryDraft({ ...deliveryDraft, deliveryCost: v });
  const setCustomerEmail = (v: string) => setDeliveryDraft({ ...deliveryDraft, customerEmail: v });
  // Hotfix #88: opt-in de marketing — DESMARCADO por defecto, nunca persiste en el draft
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Medios de pago (cargados desde el backend)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>();
  // HOTFIX 269: "paga con" (opcional, solo si el medio elegido es efectivo)
  const [cashAmount, setCashAmount] = useState('');

  const [saveToCustomers, setSaveToCustomers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Hotfix 245 C3: null = nivel 1 (baldosas de categorías); id = nivel 2
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Hotfix 245 C4: animación de tap (~120ms, clase CSS scale, estado local puro)
  const [tappedProductId, setTappedProductId] = useState<string | null>(null);
  // Hotfix #244: toggle búsqueda↔grilla, preferencia persistida por dispositivo
  const [viewMode, setViewMode] = useState<'search' | 'grid'>(() =>
    (localStorage.getItem('bullweb_pos_viewmode_delivery') as 'search' | 'grid') || 'grid'
  );
  const toggleViewMode = (mode: 'search' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('bullweb_pos_viewmode_delivery', mode);
  };
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'client' | 'order'>(() =>
    (deliveryDraft.customerName.trim().length > 0 || cart.length > 0) ? 'order' : 'client'
  );
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
    if (!isBasico && value.trim().length >= 2) {
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
  }, [isBasico]);

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

  // Cargar métodos de pago activos al montar el componente
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const methods = await paymentMethodsService.fetchAll();
        const active = (methods ?? []).filter((m: any) => m.active);
        if (cancelled) return;
        setPaymentMethods(active);
        // Pre-seleccionar el primero si hay alguno
        if (active.length > 0 && !paymentMethodId) {
          setPaymentMethodId(active[0].id);
        }
      } catch (e) {
        console.error('[NewDeliveryModal] fetchAll paymentMethods error:', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Hotfix 245 C4: categoría activa (nivel 2) y su color de banda
  const activeCat = categories.find(c => c.id === selectedCategory) ?? null;
  const activeCatColor = activeCat ? colorForCategory(categories, activeCat.id) : '#8B5CF6';

  // Hotfix 245 C6: búsqueda global en TODA la carta (ignora selectedCategory)
  // con el MISMO criterio del filtro actual (matchesSearch + available)
  const searchResults = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ).filter(p => p.available)
    : [];

  // ========== CÁLCULOS ==========
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = 0;
  const deliveryFeeValue = parseInt(deliveryCost) || 0;
  const total = subtotal + deliveryFeeValue;
  // HOTFIX 269: el vuelto se calcula sobre el total a cobrar (subtotal + despacho)
  const selectedMethodName = (paymentMethods.find((m: any) => m.id === paymentMethodId)?.name ?? '') as string;
  const isCash = /efectivo|cash/i.test(selectedMethodName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const cashNum = parseInt(cashAmount) || 0;
  const cashToSend = isCash && cashNum > 0 ? cashNum : undefined;

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
      if (!isBasico && customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
            email: customerEmail.trim() || undefined,
            marketingOptIn,
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
        paymentMethodId,
        customerId,
        cashToSend
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
      if (!isBasico && customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
            email: customerEmail.trim() || undefined,
            marketingOptIn,
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
        paymentMethodId,
        customerId,
        cashToSend
      );
    } catch (error: any) {
      setErrors([error?.message || 'Error al guardar orden.']);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // FIX: los datos ahora persisten en el contexto, no se pierden al cerrar.
    onClose();
  };

  return createPortal(
    <>
      {/* Overlay — sin onClick para no cerrar al hacer click fuera */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
      />

      {/* Modal fullscreen — Hotfix 245 C1 */}
      <div className="fixed inset-0 bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        
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
            {cart.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('¿Limpiar el carrito y los datos del cliente para empezar un pedido nuevo?')) {
                    clearDeliveryDraft();
                    setStep('client');
                    setErrors([]);
                  }
                }}
                title="Limpiar carrito y empezar nueva orden"
                className="w-9 h-9 bg-white/20 hover:bg-red-500/80 rounded-lg flex items-center justify-center transition-colors"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========== CONTENIDO (Hotfix 245 C1: client centrado · order dos columnas) ========== */}
        {step === 'client' ? (
        <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 min-h-0">
          {/* Hotfix 245 C1: tarjeta centrada max-w-lg — campos y validaciones idénticos */}
          <div className="mx-auto w-full max-w-lg space-y-3">
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
              {/* ── Hotfix #88: Email opcional ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Mail size={12} />Email
                  <span className="text-gray-300 normal-case font-normal ml-1">— opcional</span>
                </label>
                <input
                  type="email"
                  autoComplete="off" // Hotfix #285: el navegador no debe rellenar el correo de otro cliente
                  placeholder="cliente@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
            {/* ── Hotfix #88: Opt-in de marketing (desmarcado por defecto) ── */}
            <button
              type="button"
              onClick={() => setMarketingOptIn(v => !v)}
              className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 transition-all ${
                marketingOptIn
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-dashed border-gray-300 bg-white'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                marketingOptIn ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'
              }`}>
                {marketingOptIn && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <span className={`text-xs font-bold ${
                marketingOptIn ? 'text-purple-700' : 'text-gray-500'
              }`}>
                Quiero recibir ofertas y promociones por email
              </span>
            </button>
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
        </div>
        ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* ── Columna catálogo ── */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {/* Hotfix #244: toggle Búsqueda↔Categorías, persistido por dispositivo */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => toggleViewMode('search')}
                  title="Búsqueda"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'search' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Search size={16} />
                </button>
                <button
                  onClick={() => toggleViewMode('grid')}
                  title="Categorías"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              {searchQuery && viewMode === 'search' && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}

              {/* Dropdown de resultados — Hotfix 245 C6: visible en AMBOS modos;
                  busca en toda la carta ignorando selectedCategory */}
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-purple-500 rounded-lg shadow-xl max-h-[300px] overflow-y-auto z-50">
                  {searchResults.map((product) => (
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

              {searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 text-center z-50">
                  <Search size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">No se encontraron productos</p>
                </div>
              )}
            </div>
</div>

{/* ── Hotfix 245 C3: nivel 1 = baldosas de categorías · nivel 2 = grilla de
    productos de la categoría (selección LLAMA al handler existente handleAddProduct) ── */}
{viewMode === 'grid' && !searchQuery && (
  selectedCategory === null ? (
  <div className="flex-1 overflow-y-auto min-h-0 bg-white flex-shrink-0 border-b border-gray-200">
    <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
      {categories.map((cat, i) => {
        const prevColor = i > 0 ? colorForCategory(categories, categories[i - 1].id) : undefined;
        const color = colorForCategory(categories, cat.id, prevColor);
        const count = products.filter(p => p.categoryId === cat.id && p.available).length;
        return (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="text-left rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all min-h-[120px] flex flex-col"
          >
            {(cat as any).image ? (
              <div className="h-16 w-full overflow-hidden bg-gray-100">
                <img src={(cat as any).image} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ) : (
              <div className="h-16 w-full flex items-center justify-center" style={{ backgroundColor: color }}>
                <span className="text-4xl leading-none">{emojiForCategory(cat, products)}</span>
              </div>
            )}
            <div className="p-2.5 flex-1">
              <p className="text-[15px] font-semibold text-gray-900 line-clamp-2">{categoryLabel(cat)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{count} {count === 1 ? 'producto' : 'productos'}</p>
            </div>
          </button>
        );
      })}
    </div>
  </div>
  ) : (
  <div className="flex-1 overflow-y-auto min-h-0 bg-white flex-shrink-0 border-b border-gray-200">
    {/* ── Hotfix 245 C4: cabecera del nivel 2 ── */}
    <div className="px-3 pt-3 flex items-center gap-2.5">
      <button
        onClick={() => setSelectedCategory(null)}
        className="h-11 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-colors flex-shrink-0"
      >
        <ArrowLeft size={16} />
        Categorías
      </button>
      <div className="min-w-0 flex items-center gap-2">
        <p className="text-sm font-bold text-gray-900 truncate">{activeCat ? categoryLabel(activeCat) : ''}</p>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {products.filter(p => p.categoryId === selectedCategory && p.available).length} disponibles
        </span>
      </div>
    </div>
    {/* ── Hotfix 245 C4: chips de TODAS las categorías (flex-wrap, activo naranja) ── */}
    <div className="flex flex-wrap gap-2 px-3 py-2.5">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setSelectedCategory(cat.id)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
            selectedCategory === cat.id
              ? 'bg-[#F97316] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {(cat as any).image ? (
            <img src={(cat as any).image} alt="" className="w-4 h-4 rounded-full object-cover" loading="lazy" />
          ) : (
            <span className="text-xs leading-none">{emojiForCategory(cat, products)}</span>
          )}
          {categoryLabel(cat)}
        </button>
      ))}
    </div>
    {/* ── Hotfix 245 C4: grilla de productos de la categoría (auto-fill 160px) ── */}
    {filteredProducts.length > 0 ? (
      <div className="grid gap-2.5 p-3 pt-0" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {filteredProducts.map((product) => {
          const qtyInCart = cart.filter(i => i.productId === product.id).reduce((s, i) => s + i.quantity, 0);
          return (
            <button
              key={product.id}
              onClick={() => {
                setTappedProductId(product.id);
                setTimeout(() => setTappedProductId(null), 120);
                handleAddProduct(product);
              }}
              className={`relative text-left p-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl transition-all duration-100 ${tappedProductId === product.id ? 'scale-95' : 'scale-100'}`}
            >
              {qtyInCart > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center z-10">{qtyInCart}</span>
              )}
              {(product as any).image ? (
                <div className="w-full h-16 mb-1.5 rounded-lg overflow-hidden bg-gray-100">
                  <img src={(product as any).image} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-full h-16 mb-1.5 rounded-lg flex items-center justify-center" style={{ backgroundColor: activeCatColor }}>
                  <span className="text-3xl leading-none">{activeCat ? emojiForCategory(activeCat, products) : '🍽️'}</span>
                </div>
              )}
              <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</p>
              <p className="text-sm font-bold text-purple-600">${fmt(product.price)}</p>
            </button>
          );
        })}
      </div>
    ) : (
      <p className="text-center text-sm text-gray-400 py-6">Sin productos en esta categoría</p>
    )}
</div>
  )
)}
          </div>

          {/* ── Columna ticket — Hotfix 245 C1 + C5 (OrderTicket compartido) ====== */}
          <div className="w-[420px] xl:w-[480px] shrink-0 border-l border-gray-200 flex flex-col min-h-0 overflow-hidden">
          <OrderTicket
            accent="purple"
            emptyIcon="truck"
            items={cart}
            onIncreaseQuantity={(itemId) => {
              const it = cart.find(i => i.id === itemId);
              if (it) handleUpdateQuantity(itemId, it.quantity + 1);
            }}
            onDecreaseQuantity={(itemId) => {
              const it = cart.find(i => i.id === itemId);
              if (it) handleUpdateQuantity(itemId, it.quantity - 1);
            }}
            onRemoveItem={handleRemoveItem}
            renderItemExtras={(item) => (
              <div className="border-t border-yellow-200 bg-white">
                <textarea
                  placeholder="Agrega un comentario aquí..."
                  value={(item as any).notes || ''}
                  onChange={(e) => {
                    const notes = e.target.value;
                    setCart(cart.map(i =>
                      i.id === item.id ? { ...i, notes: notes || undefined } as any : i
                    ));
                  }}
                  rows={2}
                  className="w-full text-xs px-3 py-2 resize-none focus:outline-none placeholder-gray-400 bg-white"
                />
              </div>
            )}
            formatPrice={fmt}
            subtotal={subtotal}
            total={total}
            extraTotals={
              <div className="flex justify-between text-sm text-purple-600">
                <span>Delivery</span>
                <span className="font-medium">${fmt(deliveryFeeValue)}</span>
              </div>
            }
            customerChip={
              /* ====== RESUMEN CLIENTE (paso 2) — chip editable en 1 tap ====== */
              <button
                onClick={() => { setStep('client'); setErrors([]); }}
                className="w-full text-left bg-purple-50 border-b-2 border-purple-100 px-4 py-2.5 flex-shrink-0 hover:bg-purple-100 transition-colors"
              >
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
              </button>
            }
            errorNode={
              errors.length > 0 ? (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  {errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-red-700">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              ) : undefined
            }
            footerExtra={
              <>
                {/* ====== MEDIO DE PAGO (paso 2) ====== */}
                <div className="mt-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider pb-2 mb-2 border-b border-indigo-100">
                    <CreditCard size={12} />Medio de pago
                  </p>
                  {paymentMethods.length === 0 ? (
                    <p className="text-xs text-gray-400">No hay medios de pago configurados.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map((m) => {
                        const selected = paymentMethodId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethodId(m.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                              selected
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300'
                            }`}
                          >
                            <CreditCard size={11} className="inline mr-1 -mt-0.5" />
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* HOTFIX 269: paga con (opcional) - solo efectivo */}
                  {isCash && (
                    <div className="mt-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1" htmlFor="delivery-cash-amount">Paga con (opcional)</label>
                      <input
                        id="delivery-cash-amount"
                        type="text"
                        inputMode="numeric"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder={`Ej: ${fmt(Math.ceil(total / 1000) * 1000 || 10000)}`}
                        className="w-full min-h-[44px] px-3 border-2 border-gray-200 rounded-xl text-sm font-bold focus:border-indigo-400 focus:outline-none"
                      />
                      {cashNum > 0 && (
                        <p className="text-xs mt-1 text-gray-600">
                          {cashNum >= total
                            ? <>Vuelto: <b>${fmt(cashNum - total)}</b></>
                            : <span className="text-red-600">Faltan <b>${fmt(total - cashNum)}</b> para el total</span>}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowPrintControl(true)}
                  disabled={cart.length === 0}
                  className="w-full mt-2 py-2 border-2 border-indigo-400 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer size={17} />
                  Imprimir control de mesa
                </button>
              </>
            }
            onConfirm={handleConfirm}
            saving={loading}
            onGuardarSinProductos={handleSaveEmpty}
            canSaveEmpty={customerName.trim().length > 0}
            confirmLabel={cart.length === 0 ? 'Crear Delivery' : `Crear Delivery $${fmt(total)}`}
          />
          </div>
        </div>
        )}

        {/* ========== FOOTER SOLO PASO 1 — Hotfix 245 C1 ========== */}
        {step === 'client' && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-4">
          <div className="mx-auto w-full max-w-lg">
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
            <button
              onClick={() => { if (validateClient()) { setStep('order'); setTimeout(() => searchInputRef.current?.focus(), 100); } }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-base font-bold hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 group"
            >
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              Continuar — Elegir productos
            </button>
          </div>
        </div>
        )}

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
    </>,
    document.body
  );
};

export default NewDeliveryModal;
