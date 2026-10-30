// ═══════════════════════════════════════════════════════════════
// NEW MOSTRADOR MODAL - MODAL PARA NUEVA ORDEN PARA LLEVAR
// Similar a OrderModal pero sin mesa, con captura de nombre
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { createPortal } from 'react-dom';
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
  Mail,
  MessageSquare,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Printer,
  LayoutGrid
} from 'lucide-react';
import { emojiForCategory, categoryLabel, colorForCategory } from '../../../lib/categoryHelpers';
import { PrintControlModal } from '../../../components/print/PrintControlModal';
import { OrderTicket } from '../../../components/restaurant/shared/OrderTicket';
import type { PrintControlItem } from '../../../components/print/PrintControlModal';
import type { 
  Product, 
  ProductCategory,
  CartItem 
} from '../../../types/restaurant.types';
import type { ProductModifier } from '../../../types/sales.types';
import customersService from '../../../services/customersService';
import toast from 'react-hot-toast';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { ModifierGroupsModal, hasModifierGroups } from '../../../components/restaurant/shared/ModifierGroupsModal'; // HOTFIX 291

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
  // HOTFIX 262: clientes/CRM no está en Básico — sin búsqueda ni alta de clientes desde el POS
  // (el backend igual registra nombre y teléfono en el pedido).
  const { isBasico } = usePlan();
  // ========== ESTADO (drafts persistentes en el contexto) ==========
  // FIX: el carrito y los datos del cliente viven en el contexto para sobrevivir
  // al cierre del modal (antes se perdían porque eran useState local).
  const {
    mostradorCart: cart, setMostradorCart: setCart,
    mostradorDraft, setMostradorDraft,
    clearMostradorDraft,
  } = useRestaurant();
  const customerName = mostradorDraft.customerName;
  const deliveryPhone = mostradorDraft.deliveryPhone;
  const setCustomerName = (v: string) => setMostradorDraft({ ...mostradorDraft, customerName: v });
  const setDeliveryPhone = (v: string) => setMostradorDraft({ ...mostradorDraft, deliveryPhone: v });
  // Hotfix #88: email opcional (estado local) + opt-in de marketing DESMARCADO por defecto
  const [customerEmail, setCustomerEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [saveToCustomers, setSaveToCustomers] = useState(true);
  // pickupTime removed
  const [searchQuery, setSearchQuery] = useState('');
  // Hotfix 245 C3: null = nivel 1 (baldosas de categorías); id = nivel 2
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Hotfix 245 C4: animación de tap (~120ms, clase CSS scale, estado local puro)
  const [tappedProductId, setTappedProductId] = useState<string | null>(null);
  // Hotfix #244: toggle búsqueda↔grilla, preferencia persistida por dispositivo
  const [viewMode, setViewMode] = useState<'search' | 'grid'>(() =>
    (localStorage.getItem('bullweb_pos_viewmode_mostrador') as 'search' | 'grid') || 'grid'
  );
  const toggleViewMode = (mode: 'search' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('bullweb_pos_viewmode_mostrador', mode);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'client' | 'order'>(() =>
    (mostradorDraft.customerName.trim().length > 0 || cart.length > 0) ? 'order' : 'client'
  );
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
    if (!isBasico && value.trim().length >= 2) {
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
  }, [isBasico]);

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

  // HOTFIX 291: con grupos de modificadores abre el selector; sin grupos agrega directo
  const [modProduct, setModProduct] = useState<Product | null>(null);
  const pickProduct = (product: Product) => {
    if (hasModifierGroups(product)) { setModProduct(product); return; }
    handleAddProduct({ ...product, modifiers: [] } as any);
  };

  // Al hacer click en producto: selector si tiene grupos, si no directo al carrito
  const handleProductClick = (product: Product) => {
    setSearchQuery('');
    pickProduct(product);
  };

  // Toggle panel de comentario
  const handleToggleInline = (_itemId: string) => {};

  // Auto-guardar nota directamente al carrito
  const handleUpdateNotes = (itemId: string, notes: string) => {
    setCart(cart.map(i =>
      i.id === itemId ? { ...i, notes: notes || undefined } : i
    ));
  };

  // Toggle modificador con auto-guardado (afecta precio)
  const handleToggleModifier = (itemId: string, mod: ProductModifier) => {
    setCart(cart.map(item => {
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

  // Hotfix 245 C4: categoría activa (nivel 2) y su color de banda
  const activeCat = categories.find(c => c.id === selectedCategory) ?? null;
  const activeCatColor = activeCat ? colorForCategory(categories, activeCat.id) : '#3B82F6';

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
      if (!isBasico && customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: deliveryPhone.trim() || undefined,
            email: customerEmail.trim() || undefined,
            marketingOptIn,
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
      if (!isBasico && customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: deliveryPhone.trim() || undefined,
            email: customerEmail.trim() || undefined,
            marketingOptIn,
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
    // FIX: los datos ahora persisten en el contexto, no se pierden al cerrar.
    onClose();
  };

  return createPortal(
    <>
      {/* HOTFIX 291: selector de grupos de modificadores (obligatorio bloquea) */}
      {modProduct && (
        <ModifierGroupsModal
          product={modProduct}
          onConfirm={(mods) => { handleAddProduct({ ...modProduct, modifiers: mods } as any); setModProduct(null); }}
          onClose={() => setModProduct(null)}
        />
      )}
      {/* Overlay — sin onClick para no cerrar al hacer click fuera */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
      />

      {/* Modal fullscreen — Hotfix 245 C1 */}
      <div className="fixed inset-0 bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        
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
            {cart.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('¿Limpiar el carrito y los datos del cliente para empezar un pedido nuevo?')) {
                    clearMostradorDraft();
                    setStep('client');
                    setError('');
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

        {/* ========== FORMULARIO DEL CLIENTE (paso 1) ========== */}
        {step === 'client' && (
        <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 min-h-0">
        {/* Hotfix 245 C1: tarjeta centrada max-w-lg — campos y validaciones idénticos */}
        <div className="mx-auto w-full max-w-lg space-y-3">
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
            {/* ── Hotfix #88: Email opcional ── */}
            <div>
              <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Mail size={12} />Email
                <span className="text-gray-300 normal-case font-normal ml-1">— opcional</span>
              </label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
          {/* ── Hotfix #88: Opt-in de marketing (desmarcado por defecto) ── */}
          <button
            type="button"
            onClick={() => setMarketingOptIn(v => !v)}
            className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 transition-all ${
              marketingOptIn
                ? 'border-blue-400 bg-blue-50'
                : 'border-dashed border-gray-300 bg-white'
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              marketingOptIn ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
            }`}>
              {marketingOptIn && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <span className={`text-xs font-bold ${
              marketingOptIn ? 'text-blue-700' : 'text-gray-500'
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
        </div>
        )}

        {/* ====== PASO 2 · DOS COLUMNAS (catálogo · ticket) — Hotfix 245 C1 ====== */}
        {step === 'order' && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Columna catálogo ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
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
              className="w-full pl-10 pr-24 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Hotfix #244: toggle Búsqueda↔Categorías, persistido por dispositivo */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              <button
                onClick={() => toggleViewMode('search')}
                title="Búsqueda"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'search' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Search size={16} />
              </button>
              <button
                onClick={() => toggleViewMode('grid')}
                title="Categorías"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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

            {/* HOTFIX 292: con texto, tocar una categoría limpia el texto y muestra esa categoría (nivel 2) */}
            {searchQuery && (
              <div className="flex flex-wrap gap-1.5 pt-2" role="group" aria-label="Ver categoría">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSearchQuery(''); setSelectedCategory(cat.id); setViewMode('grid'); }}
                    className="h-11 px-3 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    {categoryLabel(cat)}
                  </button>
                ))}
              </div>
            )}
            {/* Dropdown de resultados de búsqueda — Hotfix 245 C6: visible en
                AMBOS modos; busca en toda la carta ignorando selectedCategory */}
            {searchQuery && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-500 rounded-lg shadow-xl max-h-[300px] overflow-y-auto z-50">
                {searchResults.map((product) => (
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
                          {hasModifierGroups(product) && (
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
            {searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 text-center z-50">
                <Search size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">No se encontraron productos</p>
              </div>
            )}
          </div>

        </div>

        {/* ── Hotfix 245 C3: nivel 1 = baldosas de categorías · nivel 2 = grilla
            de productos de la categoría (la selección LLAMA al handler existente
            handleProductClick) ── */}
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
                    className="text-left rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[120px] flex flex-col"
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
                        handleProductClick(product);
                      }}
                      className={`relative text-left p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-100 ${tappedProductId === product.id ? 'scale-95' : 'scale-100'}`}
                    >
                      {qtyInCart > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center z-10">{qtyInCart}</span>
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
                      <p className="text-sm font-bold text-blue-600">${fmt(product.price)}</p>
                      {hasModifierGroups(product) && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Con opciones</p>
                      )}
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
            accent="blue"
            emptyIcon="bag"
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
            renderItemExtras={(item) =>
              (expandedNotes[item.id] || (item.notes && item.notes.trim().length > 0)) ? (
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
              )
            }
            formatPrice={fmt}
            subtotal={subtotal}
            total={total}
            customerChip={
              /* ====== RESUMEN CLIENTE (paso 2) — chip editable en 1 tap ====== */
              <button
                onClick={() => { setStep('client'); setError(''); }}
                className="w-full text-left bg-blue-50 border-b-2 border-blue-100 px-4 py-2.5 flex-shrink-0 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-900 truncate">{customerName}</p>
                    <p className="text-xs text-blue-600 truncate">{deliveryPhone}</p>
                  </div>
                </div>
              </button>
            }
            errorNode={
              error ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 mb-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span className="text-xs font-medium">{error}</span>
                </div>
              ) : undefined
            }
            footerExtra={
              <button
                onClick={() => setShowPrintControl(true)}
                disabled={cart.length === 0}
                className="w-full mt-2 py-2 border-2 border-indigo-400 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={17} />
                Imprimir control de mesa
              </button>
            }
            onConfirm={handleConfirm}
            saving={loading}
            onGuardarSinProductos={handleSaveEmpty}
            canSaveEmpty={customerName.trim().length > 0}
            confirmLabel={`Crear Orden $${fmt(total)}`}
          />
        </div>
        </div>
        )}

        {/* Botón continuar - solo paso 1 */}
        {step === 'client' && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 flex-shrink-0">
            <div className="mx-auto w-full max-w-lg">
            <button
              onClick={() => { if (validateClient()) { setStep('order'); setTimeout(() => searchInputRef.current?.focus(), 100); } }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-base font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
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
    </>,
    document.body
  );
};

export default NewMostradorModal;
