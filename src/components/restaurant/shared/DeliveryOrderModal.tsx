// ═══════════════════════════════════════════════════════════════
// DeliveryOrderModal — Modal para órdenes Delivery y Mostrador
// Se abre al hacer click en la tarjeta en /restaurant
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Plus, Minus, Truck, ShoppingBag, MapPin,
  Phone, User, Printer, CreditCard, Pencil, ChefHat,
  Loader2, Tag, Clock, LayoutGrid,
} from 'lucide-react';
import { ModifiersModal } from '../../../pages/Restaurant/components/ModifiersModal';
import { OrderTicket } from './OrderTicket';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { restaurantService } from '../../../services/restaurantService';
import { posService } from '../../../services/posService';
import type { Sale, Product, SaleItem, ProductModifier, CartItem } from '../../../types/restaurant.types';
import { emojiForCategory, categoryLabel, colorForCategory } from '../../../lib/categoryHelpers';
import toast from 'react-hot-toast';
import { usePermission } from '../../../hooks/usePermission';
import { useRemovalReason } from '../../../hooks/useRemovalReason';
import { applyOrderDiscount, discountInputAllowed, discountLimitHint, useAdminPin } from '../../pos/discountControl';

// ─── Props ──────────────────────────────────────────────────────
interface DeliveryOrderModalProps {
  order: Sale;
  variant: 'delivery' | 'mostrador';
  onClose: () => void;
  onUpdate: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);
}

function statusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    PENDING:   { label: 'Pendiente',       color: 'bg-red-100 text-red-700'    },
    PREPARING: { label: 'En Preparación',  color: 'bg-yellow-100 text-yellow-700' },
    READY:     { label: 'Listo',       color: 'bg-orange-100 text-orange-700' },
    DELIVERED: { label: 'Entregado',       color: 'bg-blue-100 text-blue-700'  },
  };
  return map[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' };
}

// ═══════════════════════════════════════════════════════════════
export function DeliveryOrderModal({
  order: initialOrder,
  variant,
  onClose,
  onUpdate,
}: DeliveryOrderModalProps) {
  // ── Context ──────────────────────────────────────────────────
  const {
    products,
    categories,
    handlePayOrderFromCard,
    setOrderForEdit,
    handleRefresh,
  } = useRestaurant();

  // ── Estado local ─────────────────────────────────────────────
  const [currentOrder, setCurrentOrder] = useState<Sale>(initialOrder);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);

  // Productos
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState<string | null>(null);
  // Hotfix #244: toggle búsqueda↔grilla, preferencia persistida por dispositivo
  const [viewMode, setViewMode] = useState<'search' | 'grid'>(() =>
    (localStorage.getItem('bullweb_pos_viewmode_edit') as 'search' | 'grid') || 'grid'
  );
  const toggleViewMode = (mode: 'search' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('bullweb_pos_viewmode_edit', mode);
    // modo grid = exactamente #243: sin texto de búsqueda residual filtrando
    if (mode === 'grid') setSearchQuery('');
  };
  // Hotfix 251 C2: animación de tap (~120ms) — estado local puro
  const [tappedProductId, setTappedProductId] = useState<string | null>(null);

  // Modificadores
  const [pendingProduct,    setPendingProduct]    = useState<Product | null>(null);
  const [showModifiers,     setShowModifiers]     = useState(false);

  // Items pendientes (staged — aún no guardados en BD)
  interface PendingItem {
    localId: string;
    product: Product;
    modifiers: ProductModifier[];
    quantity: number;
    note: string;
  }
  const [pendingItems,       setPendingItems]       = useState<PendingItem[]>([]);
  const [editingPendingNote, setEditingPendingNote] = useState<string | null>(null);

  // Notas por item
  const [itemNotes,    setItemNotes]    = useState<Record<string, string>>({});
  const [editingNote,  setEditingNote]  = useState<string | null>(null);

  // Descuento
  const [showDiscount,      setShowDiscount]      = useState(false);
  const [discountType,      setDiscountType]      = useState<'%' | '$'>('%');
  const [discountInput,     setDiscountInput]     = useState('10');

  const canSendToKitchen = usePermission('pos.create_order');

  // ── Hook para pedir motivo de eliminación ──
  const { promptReason, modalElement: removalReasonModal } = useRemovalReason();
  // Hotfix #257: PIN de administrador para descuentos sobre el umbral
  const { requestPin, pinModal } = useAdminPin();

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Colores según variante ────────────────────────────────────
  const isDelivery = variant === 'delivery';
  const headerBg   = isDelivery ? 'bg-purple-600' : 'bg-blue-600';
  const accentRing = isDelivery ? 'ring-purple-300' : 'ring-blue-300';
  // Hotfix 251 C4: accentBg retirado — Cobrar pasa a contorno con texto del acento

  // ── Cargar orden fresca ────────────────────────────────────────
  const reloadOrder = useCallback(async () => {
    setLoadingOrder(true);
    try {
      const fresh = await restaurantService.getSaleById(initialOrder.id);
      if (fresh) setCurrentOrder(fresh);
    } catch {
      // silent — seguimos con la orden actual
    } finally {
      setLoadingOrder(false);
    }
  }, [initialOrder.id]);

  useEffect(() => { reloadOrder(); }, [reloadOrder]);

  // Sincronizar notas: primero desde BD (item.notes), luego sobreescribir con localStorage
  useEffect(() => {
    const stored = (() => {
      try {
        const raw = localStorage.getItem(`bw_item_notes_${currentOrder.id}`);
        return raw ? JSON.parse(raw) as Record<string, string> : {};
      } catch { return {}; }
    })();
    const serverNotes: Record<string, string> = {};
    (currentOrder.items ?? []).forEach(item => {
      if (item.notes) serverNotes[item.id] = item.notes;
    });
    // Merge: localStorage primero, servidor tiene prioridad si tiene valor
    setItemNotes({ ...stored, ...serverNotes });
  }, [currentOrder.id, currentOrder.items]);

  // Focus en búsqueda al abrir
  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 150); }, []);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Datos derivados de la orden ───────────────────────────────
  const deliveryAddress = (currentOrder as any).customerAddress ?? (currentOrder as any).deliveryAddress ?? null;
  const customerCity    = (currentOrder as any).customerCity    ?? null;
  const customerPhone   = (currentOrder as any).customerPhone   ?? null;
  const deliveryFee     = isDelivery ? (Number((currentOrder as any).deliveryFee) || 0) : 0;
  const existingItems: SaleItem[] = currentOrder.items ?? [];

  // ── Cálculos de totales ────────────────────────────────────────
  const pendingSubtotal = pendingItems.reduce((s, pi) => {
    const modP = pi.modifiers.reduce((a, m) => a + (m.price ?? 0), 0);
    return s + (pi.product.price + modP) * pi.quantity;
  }, 0);
  // Soft-delete visual: excluir items cancelados del total
  const subtotal      = existingItems
    .filter(i => !i.isCancelled)
    .reduce((s, i) => s + (i.total ?? i.unitPrice * i.quantity), 0) + pendingSubtotal;
  // Descuento: siempre desde BD. El panel solo calcula preview local.
  const orderDiscount = Number(currentOrder.discount ?? 0);
  const total         = subtotal - orderDiscount + deliveryFee;
  // Hotfix #257: el tope del monto es el subtotal guardado en la orden (sin pendientes de enviar)
  const savedSubtotal = subtotal - pendingSubtotal;
  const discountKind  = discountType === '%' ? 'PERCENTAGE' as const : 'FIXED' as const;

  // ── Filtrado de productos ─────────────────────────────────────
  const filteredProducts = products.filter(p => {
    // Hotfix 251 C2: búsqueda global — al escribir busca TODA la carta (ignora selectedCategory)
    const matchCat    = !searchQuery || !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && p.available;
  });

  // ── Hotfix #243 (→ #244 DRY): emojiForCategory y categoryLabel viven ahora
  // en src/lib/categoryHelpers.ts (módulo compartido, importado arriba).

  // ── Handlers ─────────────────────────────────────────────────

  /** Click sobre un producto */
  function handleProductClick(product: Product) {
    if (product.modifiers && product.modifiers.length > 0) {
      setPendingProduct(product);
      setShowModifiers(true);
    } else {
      doAddProduct(product, []);
    }
  }

  /** Confirmar desde ModifiersModal */
  function handleModifiersConfirm(modifiers: ProductModifier[]) {
    if (!pendingProduct) return;
    doAddProduct(pendingProduct, modifiers);
    setShowModifiers(false);
    setPendingProduct(null);
  }

  /** Agregar producto a la lista pendiente (staging local) */
  function doAddProduct(product: Product, modifiers: ProductModifier[]) {
    const modKey = modifiers.map(m => m.id ?? m.name).sort().join(',');
    setPendingItems(prev => {
      const existing = prev.find(
        p => p.product.id === product.id &&
             p.modifiers.map(m => m.id ?? m.name).sort().join(',') === modKey
      );
      if (existing) {
        return prev.map(p =>
          p.localId === existing.localId ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, {
        localId:   crypto.randomUUID(),
        product,
        modifiers,
        quantity:  1,
        note:      '',
      }];
    });
    toast.success(`${product.name} agregado`);
  }

  /** Quitar un item de la orden */
  async function handleRemoveItem(item: SaleItem) {
    // Pedir motivo obligatorio antes de eliminar
    const reason = await promptReason(item.productName);
    if (!reason) return; // cancelado

    setSubmitting(true);
    try {
      await restaurantService.removeItemFromOrder(currentOrder.id, item.id, reason);
      // Soft-delete visual: marcar como cancelado en estado local
      // NO recargar del servidor porque pisaría el flag isCancelled
      setCurrentOrder(prev => prev
        ? {
            ...prev,
            items: (prev.items ?? []).map(i =>
              i.id === item.id
                ? { ...i, isCancelled: true, cancelReason: reason }
                : i
            ),
          }
        : prev
      );
      onUpdate();
    } catch {
      toast.error('No se pudo quitar el producto');
    } finally {
      setSubmitting(false);
    }
  }

  /** Pre-cuenta */
  async function handlePrecuenta() {
    setSubmitting(true);
    try {
      await posService.printPrecuenta(currentOrder.id);
      toast.success('Pre-cuenta enviada a imprimir');
    } catch {
      toast.error('Error al imprimir pre-cuenta');
    } finally {
      setSubmitting(false);
    }
  }

  /** Agregar a Cocina: guarda solo los items pendientes en BD.
   *  El backend (pos.service.ts → addItems) dispara automáticamente
   *  la comanda de cocina SOLO con los ítems nuevos. No reimprimir
   *  la orden completa. */
  async function handleCocina() {
    if (pendingItems.length === 0) return;
    setSubmitting(true);
    try {
      const itemsPayload = pendingItems.map(pi => {
        const modifiersPrice = pi.modifiers.reduce((s, m) => s + (m.price ?? 0), 0);
        return {
          productId:      pi.product.id,
          quantity:       pi.quantity,
          unitPrice:      pi.product.price + modifiersPrice,
          modifiers:      pi.modifiers.length ? pi.modifiers : undefined,
          modifiersPrice: pi.modifiers.length ? modifiersPrice : undefined,
          notes:          pi.note || undefined,
        };
      });
      await restaurantService.addItemsToSale(currentOrder.id, itemsPayload);
      setPendingItems([]);
      await reloadOrder();
      onUpdate();
      toast.success('Productos enviados a cocina');
    } catch {
      toast.error('Error al enviar a cocina');
    } finally {
      setSubmitting(false);
    }
  }

  /** Cobrar */
  function handleCobrar() {
    handlePayOrderFromCard(currentOrder);
    onClose();
  }

  /** Editar venta */
  function handleEdit() {
    setOrderForEdit(currentOrder);
    onClose();
  }

  /** Guardar nota en localStorage — no toca el servidor */
  function handleSaveNote(item: SaleItem, note: string) {
    const trimmed = note.trim();
    const updated = { ...itemNotes, [item.id]: trimmed };
    setItemNotes(updated);
    // Persistir en localStorage para que sobreviva cierre/apertura del modal
    try {
      localStorage.setItem(
        `bw_item_notes_${currentOrder.id}`,
        JSON.stringify(updated)
      );
    } catch { /* sin espacio en disco — ignorar */ }
  }

  /** Eliminar descuento — envía value:0 al mismo endpoint */
  async function handleRemoveDiscount() {
    setSubmitting(true);
    try {
      await restaurantService.applyDiscount(currentOrder.id, { type: 'FIXED', value: 0 });
      toast.success('Descuento eliminado');
      await reloadOrder();
      onUpdate();
    } catch {
      toast.error('No se pudo eliminar el descuento');
    } finally {
      setSubmitting(false);
    }
  }

  /** Aplicar descuento — persiste en BD luego recarga orden */
  async function handleApplyDiscount() {
    const value = parseFloat(discountInput);
    if (!value || value <= 0) {
      toast.error('Ingresa un valor válido');
      return;
    }
    if (!discountInputAllowed(discountKind, discountInput, savedSubtotal)) {
      toast.error(discountLimitHint(discountKind, savedSubtotal));
      return;
    }
    setSubmitting(true);
    try {
      // Hotfix #257: mismo endpoint y PIN de administrador si supera el umbral
      const applied = await applyOrderDiscount(currentOrder.id, { type: discountKind, value }, requestPin);
      if (!applied) return;
      toast.success('Descuento aplicado');
      await reloadOrder();
      onUpdate();
      setShowDiscount(false);
      setDiscountInput('10');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo aplicar el descuento');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  const { label: sLabel, color: sColor } = statusLabel(currentOrder.status as string);

  // ── Hotfix 251 C2: baldosa de producto (nivel 2 / búsqueda global) ──
  const renderProductTile = (product: Product) => {
    const cat       = categories.find(c => c.id === product.categoryId);
    const catColor  = colorForCategory(categories, product.categoryId);
    const inPending = pendingItems
      .filter(pi => pi.product.id === product.id)
      .reduce((s, pi) => s + pi.quantity, 0);
    return (
      <button
        key={product.id}
        onClick={() => {
          if (submitting) return;
          setTappedProductId(product.id);
          setTimeout(() => setTappedProductId(null), 120);
          handleProductClick(product);
        }}
        disabled={submitting}
        className={`text-left bg-white rounded-xl border overflow-hidden transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed ring-0 focus:ring-2 ${accentRing} ${
          tappedProductId === product.id
            ? 'scale-95 border-[#F97316]'
            : 'scale-100 border-gray-100 hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        {(product as any).image ? (
          <div className="w-full h-20 bg-gray-100 overflow-hidden">
            <img src={(product as any).image} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-full h-8 flex items-center justify-center" style={{ backgroundColor: catColor }}>
            <span className="text-sm leading-none">{(product as any).emoji || (cat ? emojiForCategory(cat, products) : '🍽️')}</span>
          </div>
        )}
        <div className="p-2">
          <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
            {product.name}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm font-bold text-gray-700">{fmt(product.price)}</p>
            {inPending > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#F97316] text-white text-[10px] font-bold">
                {inPending}
              </span>
            )}
          </div>
          {product.modifiers && product.modifiers.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">Con opciones</p>
          )}
        </div>
      </button>
    );
  };

  // ── Hotfix 251 C3: carrito del ticket (pendientes → CartItem, contrato OrderTicket) ──
  const ticketItems: CartItem[] = pendingItems.map(pi => {
    const modPrice = pi.modifiers.reduce((s, m) => s + (m.price ?? 0), 0);
    const unitP    = pi.product.price + modPrice;
    return {
      id:             pi.localId,
      productId:      pi.product.id,
      productName:    pi.product.name,
      quantity:       pi.quantity,
      unitPrice:      unitP,
      total:          unitP * pi.quantity,
      subtotal:       unitP * pi.quantity,
      modifiers:      pi.modifiers,
      modifiersPrice: pi.modifiers.length ? modPrice : undefined,
      notes:          pi.note || undefined,
    };
  });
  // OrderTicket antepone '$' al formatear (líneas 159/181/187 de su contrato) —
  // fmt() ya incluye el signo: envoltorio que lo quita. Misma función, cero aritmética.
  const ticketFmt = (n: number) => fmt(n).replace(/[$\s\u00A0]/g, '');

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        {/* ── Panel ── */}
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1200px] max-h-[92vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >

          {/* ════ HEADER ════ */}
          <div className={`${headerBg} text-white px-5 py-4 flex-shrink-0`}>
            <div className="flex items-start justify-between gap-3">
              {/* Icono + título */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  {isDelivery
                    ? <Truck  size={18} />
                    : <ShoppingBag size={18} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wide">
                    {isDelivery ? 'Delivery' : 'Para Llevar'}
                  </p>
                  <h2 className="text-lg font-bold leading-tight truncate">
                    #{currentOrder.saleNumber ?? currentOrder.orderNumber ?? currentOrder.id.slice(-6)}
                    {currentOrder.customerName && (
                      <span className="font-normal text-white/80 ml-2">— {currentOrder.customerName}</span>
                    )}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Badge estado */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sColor}`}>
                  {sLabel}
                </span>
                {/* Loading spinner */}
                {loadingOrder && <Loader2 size={14} className="animate-spin text-white/70" />}
                {/* Cerrar */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Info cliente — solo delivery */}
            {isDelivery && (deliveryAddress || customerPhone) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {deliveryAddress && (
                  <span className="flex items-center gap-1 text-xs text-white/80">
                    <MapPin size={12} />
                    {deliveryAddress}
                    {customerCity && <span className="text-white/60">, {customerCity}</span>}
                  </span>
                )}
                {customerPhone && (
                  <span className="flex items-center gap-1 text-xs text-white/80">
                    <Phone size={12} />
                    {customerPhone}
                  </span>
                )}
              </div>
            )}

            {/* Info cliente — mostrador */}
            {!isDelivery && currentOrder.customerName && (
              <div className="mt-1 flex items-center gap-1 text-xs text-white/80">
                <User size={12} />
                {currentOrder.customerName}
              </div>
            )}
          </div>

          {/* ════ BODY ════ */}
          {/* Hotfix 251 C5: bajo lg una sola columna (catálogo arriba, ticket abajo) con scroll del body completo */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 divide-x lg:divide-gray-100">

            {/* ── LEFT: Catálogo ── */}
            <div className="flex flex-col w-full lg:w-1/2 min-h-0 lg:overflow-hidden bg-gray-50">
              {/* Búsqueda — Hotfix 251 C2: SIEMPRE visible; toggle #244 a la derecha (misma clave) */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-8 pr-16 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-purple-200"
                  />
                  {/* Hotfix #244: toggle Búsqueda↔Categorías, persistido por dispositivo */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1">
                    <button
                      onClick={() => toggleViewMode('search')}
                      title="Búsqueda"
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === 'search' ? `${isDelivery ? 'bg-purple-600' : 'bg-blue-600'} text-white` : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Search size={14} />
                    </button>
                    <button
                      onClick={() => toggleViewMode('grid')}
                      title="Categorías"
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === 'grid' ? `${isDelivery ? 'bg-purple-600' : 'bg-blue-600'} text-white` : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hotfix 251 C2 — catálogo de dos niveles:
                  · búsqueda activa → resultados sobre TODA la carta (ignora categoría)
                  · modo search sin texto → grilla plana de disponibles
                  · modo grid sin texto → NIVEL 1 (baldosas) → NIVEL 2 (categoría) */}
              <div className="flex-1 lg:overflow-y-auto p-3">
                {searchQuery.trim() !== '' || viewMode === 'search' ? (
                  /* Grilla plana: búsqueda global o modo search */
                  filteredProducts.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 mt-8">Sin productos</p>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                      {filteredProducts.map(renderProductTile)}
                    </div>
                  )
                ) : selectedCategory === null ? (
                  /* NIVEL 1 — baldosas de categorías */
                  categories.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 mt-8">Sin categorías</p>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                      {categories.map(cat => {
                        const catColor       = colorForCategory(categories, cat.id);
                        const availableCount = products.filter(p => p.categoryId === cat.id && p.available).length;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className="relative text-left min-h-[120px] rounded-xl overflow-hidden bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
                          >
                            {(cat as any).image ? (
                              <img src={(cat as any).image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: catColor }}>
                                <span className="text-4xl leading-none">{emojiForCategory(cat, products)}</span>
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1.5">
                              <p className="text-[15px] font-semibold text-white leading-tight truncate">{categoryLabel(cat)}</p>
                            </div>
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-bold">
                              {availableCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* NIVEL 2 — categoría seleccionada */
                  <>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="h-11 w-full flex items-center gap-2 px-3 mb-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <LayoutGrid size={14} className="text-[#F97316]" />
                      ← Categorías
                    </button>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            selectedCategory === cat.id
                              ? 'bg-[#F97316] text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
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
                    {filteredProducts.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 mt-8">Sin productos</p>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                        {filteredProducts.map(renderProductTile)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── RIGHT: Ticket — Hotfix 251 C3: OrderTicket compartido ── */}
            <div className="flex flex-col w-full lg:w-1/2 min-h-0 lg:overflow-hidden">
              <OrderTicket
                items={ticketItems}
                onIncreaseQuantity={localId =>
                  setPendingItems(prev => prev.map(p =>
                    p.localId === localId ? { ...p, quantity: p.quantity + 1 } : p
                  ))
                }
                onDecreaseQuantity={localId =>
                  setPendingItems(prev => prev.map(p =>
                    p.localId === localId ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p
                  ))
                }
                onRemoveItem={localId =>
                  setPendingItems(prev => prev.filter(p => p.localId !== localId))
                }
                renderItemExtras={item => {
                  const pi = pendingItems.find(p => p.localId === item.id);
                  if (!pi) return null;
                  const isEditP = editingPendingNote === pi.localId;
                  return (
                    <div className="px-2 pb-1.5">
                      {pi.modifiers.length > 0 && (
                        <p className="ml-14 text-xs text-gray-500 mt-0.5">{pi.modifiers.map(m => m.name).join(', ')}</p>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          onClick={() => setEditingPendingNote(isEditP ? null : pi.localId)}
                          title="Agregar nota"
                          className={`flex-shrink-0 p-1 rounded transition-colors ${
                            pi.note ? 'text-amber-500 hover:text-amber-700' : 'text-gray-300 hover:text-gray-500'
                          }`}
                        ><Pencil size={13} /></button>
                        {isEditP && (
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nota para cocina..."
                            value={pi.note}
                            onChange={e => setPendingItems(prev => prev.map(p =>
                              p.localId === pi.localId ? { ...p, note: e.target.value } : p
                            ))}
                            onBlur={() => setEditingPendingNote(null)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingPendingNote(null); }}
                            className="flex-1 text-sm font-medium border-2 border-amber-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-700 bg-white"
                          />
                        )}
                        {!isEditP && pi.note && (
                          <p
                            className="text-sm font-medium text-amber-600 cursor-pointer hover:text-amber-700"
                            onClick={() => setEditingPendingNote(pi.localId)}
                          >✏️ {pi.note}</p>
                        )}
                      </div>
                    </div>
                  );
                }}
                formatPrice={ticketFmt}
                subtotal={subtotal}
                total={total}
                extraTotals={<>
                  {/* Descuento: solo visible si existe en BD */}
                  {orderDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm font-semibold text-[#F97316]">
                      <span>Descuento</span>
                      <div className="flex items-center gap-2">
                        <span>− {fmt(orderDiscount)}</span>
                        <button
                          onClick={handleRemoveDiscount}
                          disabled={submitting}
                          title="Eliminar descuento"
                          className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-500 text-xs font-bold leading-none transition-colors disabled:opacity-40"
                        >×</button>
                      </div>
                    </div>
                  )}
                  {isDelivery && deliveryFee > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Despacho</span>
                      <span>{fmt(deliveryFee)}</span>
                    </div>
                  )}
                </>}
                onConfirm={handleCobrar}
                saving={submitting}
                confirmLabel={`Cobrar $${ticketFmt(total)}`}
                accent={isDelivery ? 'purple' : 'blue'}
                emptyIcon={isDelivery ? 'truck' : 'bag'}
                alwaysShowFooter
                existingSection={existingItems.length > 0 || pendingItems.length > 0 ? (
                  <div className="lg:overflow-y-auto lg:max-h-[45%] p-3 space-y-1 border-b border-gray-200 bg-gray-50">
                    {/* ── Items en BD (contrato: existingSection, sobre los nuevos) ── */}
                    {existingItems.map(item => {
                      const localNote = itemNotes[item.id] ?? item.notes ?? '';
                      const hasNote   = !!localNote;
                      const isEditing = editingNote === item.id;
                      const cancelled = !!item.isCancelled;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg px-2.5 py-2 transition-colors ${cancelled ? 'bg-red-50/60' : 'bg-white hover:bg-gray-100 border border-gray-200'}`}
                        >
                          {/* Fila principal */}
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold w-6 text-center flex-shrink-0 ${cancelled ? 'text-red-300 line-through' : 'text-gray-400'}`}>
                              {item.quantity}×
                            </span>
                            <span className={`text-sm font-semibold flex-1 min-w-0 leading-snug ${cancelled ? 'text-slate-400 line-through' : 'text-gray-800'}`}>
                              {item.productName}
                            </span>
                            <span className={`text-sm font-bold flex-shrink-0 ${cancelled ? 'text-slate-400 line-through' : 'text-gray-700'}`}>
                              {fmt(item.total ?? item.unitPrice * item.quantity)}
                            </span>
                            {/* Botones: ocultos si está cancelado */}
                            {cancelled ? (
                              <span className="text-xs text-red-500 flex-shrink-0">✕</span>
                            ) : (
                              <>
                                {/* Botón nota */}
                                <button
                                  onClick={() => setEditingNote(isEditing ? null : item.id)}
                                  title="Agregar nota"
                                  className={`flex-shrink-0 p-1 rounded transition-colors ${
                                    hasNote
                                      ? 'text-[#F97316] hover:text-[#ea6a0a]'
                                      : 'text-gray-300 hover:text-gray-500'
                                  }`}
                                >
                                  <Pencil size={13} />
                                </button>
                                {/* Botón quitar */}
                                <button
                                  onClick={() => !submitting && handleRemoveItem(item)}
                                  disabled={submitting}
                                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-500 transition-colors disabled:opacity-40"
                                >
                                  <Minus size={10} />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Motivo de cancelación */}
                          {cancelled && item.cancelReason && (
                            <p className="ml-7 mt-0.5 text-xs text-red-500 flex items-center gap-1">
                              ✕ {item.cancelReason}
                            </p>
                          )}

                          {/* Input de nota */}
                          {isEditing && !cancelled && (
                            <input
                              autoFocus
                              type="text"
                              placeholder="Nota: ej. sin mayonesa, término 3/4..."
                              value={localNote ?? ''}
                              onChange={e => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onBlur={() => {
                                handleSaveNote(item, itemNotes[item.id] ?? '');
                                setEditingNote(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleSaveNote(item, itemNotes[item.id] ?? '');
                                  setEditingNote(null);
                                }
                                if (e.key === 'Escape') { setEditingNote(null); }
                              }}
                              className="mt-1.5 ml-7 w-[90%] text-sm font-medium border-2 border-orange-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 bg-white"
                            />
                          )}

                          {/* Nota guardada visible */}
                          {!isEditing && !cancelled && hasNote && (
                            <p
                              className="ml-7 mt-1 text-sm font-medium text-orange-500 cursor-pointer hover:text-orange-700"
                              onClick={() => setEditingNote(item.id)}
                            >
                              ✏️ {localNote}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {/* Encabezado ámbar de pendientes — queda justo sobre la lista de nuevos (contrato) */}
                    {pendingItems.length > 0 && (
                      <p className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider px-1 mb-1">
                        <Clock size={10} />
                        Pendientes de enviar
                      </p>
                    )}
                  </div>
                ) : null}
                footerExtra={showDiscount && (
                  <div className="mt-3 border-t border-gray-100 pt-3 bg-orange-50">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Aplicar descuento</p>
                    <div className="flex gap-2 items-center">
                      <div className="flex rounded-lg overflow-hidden border border-gray-200">
                        <button
                          onClick={() => setDiscountType('%')}
                          className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountType === '%' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500'}`}
                        >%</button>
                        <button
                          onClick={() => setDiscountType('$')}
                          className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountType === '$' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500'}`}
                        >$</button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={discountType === '%' ? 100 : Math.round(savedSubtotal)}
                        value={discountInput}
                        onChange={e => { if (discountInputAllowed(discountKind, e.target.value, savedSubtotal)) setDiscountInput(e.target.value); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleApplyDiscount(); }}
                        title={discountLimitHint(discountKind, savedSubtotal)}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none"
                      />
                      <button
                        onClick={handleApplyDiscount}
                        disabled={submitting}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => setShowDiscount(false)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          {/* ════ FOOTER — Acciones ════ */}
          <div className="border-t border-gray-100 p-3 flex-shrink-0 bg-white space-y-2">
            {/* Fila superior — acciones secundarias */}
            <div className="flex gap-2">
              {/* Descuento */}
              <button
                onClick={() => setShowDiscount(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Tag size={13} />
                Descuento
              </button>
              {/* Pre-cuenta */}
              <button
                onClick={handlePrecuenta}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Printer size={13} />
                Pre-cuenta
              </button>
            </div>

            {/* Fila principal — Cocina + Cobrar al mismo nivel */}
            <div className="flex gap-2">
              {/* Cocina — igual de prominente que Cobrar (Hotfix 251 C4: naranja #F97316) */}
              <button
                onClick={handleCocina}
                disabled={submitting || pendingItems.length === 0 || !canSendToKitchen}
                className={`flex-1 relative flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm transition-colors shadow-sm text-white ${
                  pendingItems.length === 0
                    ? 'bg-[#FDBA74] cursor-not-allowed'
                    : 'bg-[#F97316] hover:bg-[#ea6a0a]'
                } disabled:opacity-60`}
              >
                <ChefHat size={16} />
                Enviar a Cocina
                {pendingItems.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {pendingItems.length}
                  </span>
                )}
              </button>
              {/* Cobrar — Hotfix 251 C4: contorno con texto del acento de la variante */}
              <button
                onClick={handleCobrar}
                className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 font-bold text-sm transition-colors ${
                  isDelivery
                    ? 'border-purple-600 text-purple-600 hover:bg-purple-50'
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                <CreditCard size={16} />
                Cobrar {fmt(total)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ModifiersModal ── */}
      {showModifiers && pendingProduct && (
        <ModifiersModal
          isOpen={showModifiers}
          productName={pendingProduct.name}
          availableModifiers={pendingProduct.modifiers ?? []}
          selectedModifiers={[]}
          basePrice={pendingProduct.price}
          onConfirm={(mods) => handleModifiersConfirm(mods)}
          onClose={() => { setShowModifiers(false); setPendingProduct(null); }}
        />
      )}

      {/* Modal de motivo de eliminación */}
      {removalReasonModal}
      {pinModal}
    </>,
    document.body
  );
}