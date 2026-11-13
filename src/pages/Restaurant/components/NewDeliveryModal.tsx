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
import ClienteDePaso, { type ClienteElegido } from '../../../components/ClienteDePaso'; // LOTE 322 (CLI-03)
import { paymentMethodsService } from '../../../services/paymentMethodsService';
import toast from 'react-hot-toast';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { useStockConfirm } from '../../../components/restaurant/shared/StockConfirm'; // HOTFIX 305
import { ModifierGroupsModal, hasModifierGroups } from '../../../components/restaurant/shared/ModifierGroupsModal'; // HOTFIX 291
import { useActivePromotions } from '../../../hooks/useActivePromotions'; // HOTFIX 299
import { priceCartWithPromotions, restaurantCartToPromoLines, type PromoLineResult } from '../../../utils/promoPricing'; // HOTFIX 299
import { deliveryZonesService, fmtKm, MOTIVOS_CAMBIO_ENVIO, textoCotizacion, type CotizacionEnvio, type PlacesConfig } from '../../../services/deliveryZonesService'; // LOTE 314; LOTE 333
import { AddressAutocomplete } from '../../../components/delivery/AddressAutocomplete'; // LOTE 333

interface NewDeliveryModalProps {
  products: Product[];
  categories: ProductCategory[];
  onConfirm: (cart: CartItem[], customerName: string, customerPhone: string, customerAddress: string, deliveryCity: string, deliveryNotes: string, deliveryCost: number, paymentMethod?: string, customerId?: string, cashAmount?: number, deliveryFeeReason?: string) => Promise<void>;
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
  // LOTE 322 (CLI-03): ficha elegida con el selector (busca por telefono primero); null = Cliente de paso.
  // Delivery sigue exigiendo nombre, telefono real y direccion; sin ficha, el telefono liga o crea la ficha en el servidor.
  const [ficha, setFicha] = useState<ClienteElegido | null>(null);
  const onFichaChange = (v: ClienteElegido | null) => {
    setFicha(v);
    setDeliveryDraft({ ...deliveryDraft, customerName: v?.name ?? '', customerPhone: v?.phone ?? '' });
    setErrors([]);
  };
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
  // HOTFIX 291: con grupos de modificadores abre el selector; sin grupos agrega directo
  const [modProduct, setModProduct] = useState<Product | null>(null);
  const { withStockCheck, stockDialog } = useStockConfirm(); // HOTFIX 305 (B6-04): aviso de stock en 0
  const pickProduct = (product: Product) => withStockCheck(product as any, () => {
    if (hasModifierGroups(product)) { setModProduct(product); return; }
    handleAddProduct({ ...product, modifiers: [] } as any);
  });

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
  // HOTFIX 299: total con promociones vigentes (pack agrupado, 2x1, %, precio fijo), misma regla
  // que el backend; solo para mostrar: el carrito enviado no cambia y el backend cobra.
  const activePromotions = useActivePromotions();
  const promoPricing = priceCartWithPromotions(restaurantCartToPromoLines(cart, products), activePromotions);
  const promoLines: Record<string, PromoLineResult> = Object.fromEntries(cart.map((it, i) => [it.id, promoPricing.lines[i]]));
  const promoDiscount = Math.min(subtotal, promoPricing.discount);
  const total = subtotal - promoDiscount + deliveryFeeValue;
  // HOTFIX 269: el vuelto se calcula sobre el total a cobrar (subtotal + despacho)
  const selectedMethodName = (paymentMethods.find((m: any) => m.id === paymentMethodId)?.name ?? '') as string;
  const isCash = /efectivo|cash/i.test(selectedMethodName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const cashNum = parseInt(cashAmount) || 0;
  const cashToSend = isCash && cashNum > 0 ? cashNum : undefined;

  // ========== LOTE 314: ENVIO POR TRAMOS ==========
  // Local con tramos: el servidor sugiere el costo con km; cambiarlo exige motivo (auditoria). FIJO: todo como antes.
  const [envioPos, setEnvioPos] = useState<CotizacionEnvio | null>(null);
  const [envioMotivo, setEnvioMotivo] = useState('');
  // LOTE 333: costo fijo del local (modo FIJO), cotizacion inmediata al elegir o salir del campo, costo bloqueado con "Editar"
  const [envioFijo, setEnvioFijo] = useState<number | null>(null);
  const [envioEditando, setEnvioEditando] = useState(false);
  const [envioYa, setEnvioYa] = useState(0);
  const envioYaVisto = useRef(0);
  const [placesCfg, setPlacesCfg] = useState<PlacesConfig | null>(null);
  useEffect(() => { deliveryZonesService.places().then(setPlacesCfg).catch(() => setPlacesCfg(null)); }, []);
  useEffect(() => {
    const dir = [customerAddress, deliveryCity].filter(s => s?.trim()).join(', ');
    if (customerAddress.trim().length < 4) { setEnvioPos(null); return; }
    let vivo = true;
    const inmediata = envioYa !== envioYaVisto.current;
    envioYaVisto.current = envioYa;
    const t = setTimeout(() => {
      deliveryZonesService.cotizar(dir)
        .then(r => {
          if (!vivo) return;
          setEnvioPos(r?.modo === 'TRAMOS' ? r : null);
          setEnvioFijo(r?.modo === 'FIJO' && r.costo != null ? Number(r.costo) : null);
        })
        .catch(() => { if (vivo) setEnvioPos(null); });
    }, inmediata ? 0 : 700);
    return () => { vivo = false; clearTimeout(t); };
  }, [customerAddress, deliveryCity, envioYa]);
  const cotizarYa = () => setEnvioYa(n => n + 1);
  const envioCotizado = !!envioPos && !envioPos.sin_cotizacion && !envioPos.fuera_de_zona && envioPos.costo_tramo != null;
  const envioSugerido: number | null = envioCotizado
    ? (envioPos!.envio_gratis_desde != null && (subtotal - promoDiscount) >= envioPos!.envio_gratis_desde ? 0 : Number(envioPos!.costo_tramo))
    : null;
  useEffect(() => {
    if (envioSugerido != null) { setDeliveryCost(String(envioSugerido)); setEnvioMotivo(''); setEnvioEditando(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envioSugerido]);
  useEffect(() => {
    // FIJO: el costo fijo del local se prellena si el cajero no escribio uno (sigue editable, como antes)
    if (envioFijo != null && !deliveryCost.trim()) setDeliveryCost(String(envioFijo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envioFijo]);
  const envioBloqueado = envioCotizado && !envioEditando;
  const envioTexto = textoCotizacion(envioPos, envioSugerido);
  const envioCambiado = envioSugerido != null && deliveryFeeValue !== envioSugerido;
  const envioMotivoFalta = envioCambiado && !envioMotivo;

  // ========== VALIDACIÓN PASO 1 (solo cliente) ==========
  const validateClient = (): boolean => {
    const newErrors: string[] = [];
    if (!customerName.trim()) newErrors.push('El nombre es requerido');
    if (!customerPhone.trim()) newErrors.push('El teléfono es requerido');
    else if (customerPhone.replace(/[^0-9]/g, '').length < 8) newErrors.push('El teléfono debe tener 8 dígitos o más'); // LOTE 322
    if (ficha?.isGeneric) newErrors.push('Esa es una ficha genérica: para delivery pide el teléfono real del cliente'); // LOTE 322
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

    if (envioMotivoFalta) {
      newErrors.push('Elige el motivo del cambio del costo de envío'); // LOTE 314
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
      let customerId: string | undefined = ficha?.id; // LOTE 322 (CLI-03)
      if (!customerId && !isBasico && customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
            email: customerEmail.trim() || undefined,
            marketingOptIn,
          });
          customerId = customer.id || undefined;
          if (customerId) toast.success(`✓ ${customerName.trim()} vinculado a la orden`); // LOTE 322: telefono generico no liga
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
        cashToSend,
        envioCambiado ? envioMotivo : undefined // LOTE 314
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
      let customerId: string | undefined = ficha?.id; // LOTE 322 (CLI-03)
      if (!customerId && !isBasico && customerName.trim().length >= 2) {
        try {
          const customer = await customersService.findOrCreate({
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
            email: customerEmail.trim() || undefined,
            marketingOptIn,
          });
          customerId = customer.id || undefined;
          if (customerId) toast.success(`✓ ${customerName.trim()} vinculado a la orden`); // LOTE 322: telefono generico no liga
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
        cashToSend,
        envioCambiado ? envioMotivo : undefined // LOTE 314
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
      {stockDialog}
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] text-slate-900"
      />

      {/* Modal fullscreen — Hotfix 245 C1 */}
      <div className="fixed inset-0 bg-white shadow-2xl z-[100] flex flex-col overflow-hidden text-slate-900">
        
        {/* ========== HEADER ========== */}
        <div className=" text-slate-900 px-5 py-4 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {step === 'order' ? (
              <button
                onClick={() => { setStep('client'); setErrors([]); }}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center w-11 h-11 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
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
              <p className="text-slate-500 text-xs font-medium">
                {step === 'client' ? 'Paso 1 · Datos del cliente' : `Paso 2 · Productos · ${cart.length} ${cart.length === 1 ? 'item' : 'items'}`}
              </p>
            </div>
          </div>
          <div className="flex-wrap flex items-center gap-2">
            <div className="flex items-center gap-1 mr-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'client' ? 'bg-white text-slate-700' : 'bg-white/25 text-white/70'}`}>1</div>
              <div className="w-3 h-px bg-white/40" />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'order' ? 'bg-white text-slate-700' : 'bg-white/25 text-white/70'}`}>2</div>
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
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center w-9 h-9 bg-white/20 hover:bg-red-500/80 rounded-lg flex items-center justify-center transition-colors"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
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
                <User size={12} className="text-slate-500" />Datos del cliente
              </p>
              {/* LOTE 322 (CLI-03): parte en Cliente de paso; Agregar cliente busca por telefono primero */}
              <ClienteDePaso value={ficha} onChange={onFichaChange} allowFichas={!isBasico} />
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
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
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all pr-8"
                  />
                  {searchingCustomer && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {/* Dropdown sugerencias */}
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => handleSelectCustomer(c)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 transition-colors text-left border-b border-gray-100 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User size={13} className="text-slate-700" />
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Phone size={12} />Teléfono *
                </label>
                <input
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setErrors([]); }}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>
            {/* ── Card: Dirección de entrega ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
                <MapPin size={12} />Dirección de entrega
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin size={12} />Dirección *
                </label>
                <AddressAutocomplete
                  placeholder="Calle, número, depto..."
                  value={customerAddress}
                  onChange={(v) => { setCustomerAddress(v); setErrors([]); }}
                  onCommit={cotizarYa}
                  config={placesCfg}
                  testId="pos-envio-direccion"
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MapPin size={12} />Ciudad *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Santiago"
                    value={deliveryCity}
                    onChange={(e) => { setDeliveryCity(e.target.value); setErrors([]); }}
                    onBlur={cotizarYa}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Truck size={12} />Costo envío
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      placeholder="2000"
                      value={deliveryCost}
                      onChange={(e) => setDeliveryCost(e.target.value)}
                      readOnly={envioBloqueado}
                      aria-readonly={envioBloqueado}
                      data-testid="pos-envio-costo"
                      className={`w-full pl-7 ${envioBloqueado ? 'pr-20 bg-slate-100 cursor-not-allowed' : 'pr-3 bg-gray-50'} py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all`}
                    />
                    {/* LOTE 333: costo calculado bloqueado; "Editar" lo libera y el cambio exige motivo (auditado en el servidor) */}
                    {envioBloqueado && (
                      <button
                        type="button"
                        onClick={() => setEnvioEditando(true)}
                        data-testid="pos-envio-editar"
                        className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] px-3 rounded-lg border-2 border-orange-500 text-orange-600 text-xs font-bold bg-white hover:bg-orange-50"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* LOTE 314: sugerencia por tramos y motivo si el cajero cambia el costo */}
              {envioFijo != null && !envioPos && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" data-testid="pos-envio-fijo">
                  <p className="text-slate-700">Envío fijo del local <span className="font-bold">${fmt(envioFijo)}</span></p>
                </div>
              )}
              {envioPos && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm space-y-2" data-testid="pos-envio-sugerido">
                  {envioPos.fuera_de_zona ? (
                    <p className="text-amber-700 font-semibold">Fuera de zona{envioPos.km != null ? ` (${fmtKm(envioPos.km)})` : ''}: ingresa el costo a mano.</p>
                  ) : envioPos.sin_cotizacion ? (
                    <p className="text-slate-600">No se pudo ubicar la dirección: costo manual.</p>
                  ) : (
                    <p className="text-slate-700" data-testid="pos-envio-texto">
                      <span className="font-bold">{envioTexto}</span>
                      {envioPos.comuna_agregada ? <span className="text-slate-500"> · comuna {envioPos.comuna_agregada}</span> : null}
                    </p>
                  )}
                  {envioCotizado && envioPos.pedido_minimo != null && (subtotal - promoDiscount) < envioPos.pedido_minimo && (
                    <p className="text-amber-700">Bajo el pedido mínimo del tramo (<span className="font-bold">${fmt(envioPos.pedido_minimo)}</span>). Puedes continuar.</p>
                  )}
                  {envioCambiado && (
                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Motivo del cambio *</span>
                      <select
                        value={envioMotivo}
                        onChange={(e) => { setEnvioMotivo(e.target.value); setErrors([]); }}
                        data-testid="pos-envio-motivo"
                        className="w-full min-h-[44px] px-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Elige un motivo</option>
                        {MOTIVOS_CAMBIO_ENVIO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              )}
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
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
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
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>
            {/* ── Hotfix #88: Opt-in de marketing (desmarcado por defecto) ── */}
            <button
              type="button"
              onClick={() => setMarketingOptIn(v => !v)}
              className={`min-h-[44px] flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 transition-all ${
                marketingOptIn
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-dashed border-gray-300 bg-white'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                marketingOptIn ? 'bg-slate-500 border-slate-200' : 'border-gray-300 bg-white'
              }`}>
                {marketingOptIn && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <span className={`text-xs font-bold ${
                marketingOptIn ? 'text-slate-700' : 'text-gray-500'
              }`}>
                Quiero recibir ofertas y promociones por email
              </span>
            </button>
            {/* ── Toggle guardar cliente ── */}
            {customerName.trim() && (
              <button
                type="button"
                onClick={() => setSaveToCustomers(v => !v)}
                className={`min-h-[44px] flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 transition-all ${
                  saveToCustomers
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-dashed border-gray-300 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  saveToCustomers ? 'bg-slate-500 border-slate-200' : 'border-gray-300 bg-white'
                }`}>
                  {saveToCustomers && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                <UserPlus size={13} className={saveToCustomers ? 'text-slate-700' : 'text-gray-400'} />
                <span className={`text-xs font-bold ${
                  saveToCustomers ? 'text-slate-700' : 'text-gray-500'
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
                className="w-full pl-10 pr-24 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {/* Hotfix #244: toggle Búsqueda↔Categorías, persistido por dispositivo */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => toggleViewMode('search')}
                  title="Búsqueda"
                  className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                    viewMode === 'search' ? 'bg-orange-50 text-orange-700 border border-orange-300' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Search size={16} />
                </button>
                <button
                  onClick={() => toggleViewMode('grid')}
                  title="Categorías"
                  className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-orange-50 text-orange-700 border border-orange-300' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              {searchQuery && viewMode === 'search' && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                      className="min-h-[44px] h-11 px-3 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      {categoryLabel(cat)}
                    </button>
                  ))}
                </div>
              )}

              {/* Dropdown de resultados — Hotfix 245 C6: visible en AMBOS modos;
                  busca en toda la carta ignorando selectedCategory */}
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-[300px] overflow-y-auto z-50">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        pickProduct(product);
                        setSearchQuery('');
                      }}
                      className="min-h-[44px] w-full p-3 hover:bg-slate-100 transition-colors text-left border-b border-gray-100 last:border-0"
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
                          <span className="text-lg font-bold text-slate-500">${fmt(product.price)}</span>
                        </div>
                        <div className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
            className="text-left rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-100 transition-all min-h-[120px] flex flex-col"
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
        className="min-h-[44px] h-11 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-colors flex-shrink-0"
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
          className={`min-h-[44px] px-3 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
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
                pickProduct(product);
              }}
              className={`min-h-[44px] relative text-left p-2.5 bg-gray-50 hover:bg-slate-100 border border-gray-200 hover:border-slate-300 rounded-xl transition-all duration-100 ${tappedProductId === product.id ? 'scale-95' : 'scale-100'}`}
            >
              {qtyInCart > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-slate-500 text-white text-xs font-bold flex items-center justify-center z-10">{qtyInCart}</span>
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
              <p className="text-sm font-bold text-slate-700">${fmt(product.price)}</p>
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
            promoLines={promoLines}
            promoDiscount={promoDiscount}
            extraTotals={
              <div className="flex justify-between text-sm text-slate-700">
                <span>Delivery</span>
                <span className="font-medium">${fmt(deliveryFeeValue)}</span>
              </div>
            }
            customerChip={
              /* ====== RESUMEN CLIENTE (paso 2) — chip editable en 1 tap ====== */
              <button
                onClick={() => { setStep('client'); setErrors([]); }}
                className="min-h-[44px] w-full text-left bg-slate-50 border-b-2 border-slate-200 px-4 py-2.5 flex-shrink-0 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-slate-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{customerName}</p>
                    <p className="text-xs text-slate-700 truncate">{customerPhone} · {customerAddress}, {deliveryCity}</p>
                    {deliveryNotes && <p className="text-xs text-slate-500 italic truncate">{deliveryNotes}</p>}
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
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 mb-2 border-b border-slate-200">
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
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                              selected
                                ? 'border-slate-200 bg-slate-50 text-slate-700'
                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-slate-300'
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
                        className="w-full min-h-[44px] px-3 border-2 border-gray-200 rounded-xl text-sm font-bold focus:border-orange-500 focus:outline-none"
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
                  className="min-h-[44px] w-full mt-2 py-2 border-2 border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="min-h-[44px] w-full py-4 text-white rounded-xl text-base font-bold bg-[#F97316] hover:bg-[#ea6a0a] transition-all shadow-lg flex items-center justify-center gap-2 group"
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
