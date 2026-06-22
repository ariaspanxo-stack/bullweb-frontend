// ═══════════════════════════════════════════════════════════════
// DeliveryOrderModal — Modal para órdenes Delivery y Mostrador
// Se abre al hacer click en la tarjeta en /restaurant
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Search, Plus, Minus, Truck, ShoppingBag, MapPin,
  Phone, User, Printer, CreditCard, Pencil, ChefHat,
  Loader2, Tag, Clock,
} from 'lucide-react';
import { ModifiersModal } from '../../../pages/Restaurant/components/ModifiersModal';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { restaurantService } from '../../../services/restaurantService';
import { posService } from '../../../services/posService';
import type { Sale, Product, SaleItem, ProductModifier } from '../../../types/restaurant.types';
import toast from 'react-hot-toast';
import { usePermission } from '../../../hooks/usePermission';
import { useRemovalReason } from '../../../hooks/useRemovalReason';

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
    READY:     { label: 'Listo',           color: 'bg-green-100 text-green-700' },
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
  const [selectedCategory,  setSelectedCategory]  = useState('');

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

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Colores según variante ────────────────────────────────────
  const isDelivery = variant === 'delivery';
  const headerBg   = isDelivery ? 'bg-purple-600' : 'bg-blue-600';
  const accentRing = isDelivery ? 'ring-purple-300' : 'ring-blue-300';
  const accentBg   = isDelivery ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700';

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

  // ── Filtrado de productos ─────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchCat    = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && p.available;
  });

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
    setSubmitting(true);
    try {
      await restaurantService.applyDiscount(currentOrder.id, {
        type:  discountType === '%' ? 'PERCENTAGE' : 'FIXED',
        value,
      });
      toast.success('Descuento aplicado');
      await reloadOrder();
      onUpdate();
      setShowDiscount(false);
      setDiscountInput('10');
    } catch {
      toast.error('No se pudo aplicar el descuento');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  const { label: sLabel, color: sColor } = statusLabel(currentOrder.status as string);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* ── Panel ── */}
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
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
          <div className="flex flex-1 overflow-hidden divide-x divide-gray-100">

            {/* ── LEFT: Catálogo ── */}
            <div className="flex flex-col w-1/2 overflow-hidden bg-gray-50">
              {/* Búsqueda */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-purple-200"
                  />
                </div>
              </div>

              {/* Tabs categorías */}
              <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0 border-b border-gray-100 scrollbar-thin">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    !selectedCategory
                      ? `${isDelivery ? 'bg-purple-600' : 'bg-blue-600'} text-white`
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                      selectedCategory === cat.id
                        ? `${isDelivery ? 'bg-purple-600' : 'bg-blue-600'} text-white`
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Grid de productos */}
              <div className="flex-1 overflow-y-auto p-3">
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 mt-8">Sin productos</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => !submitting && handleProductClick(product)}
                        disabled={submitting}
                        className={`text-left p-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all group disabled:opacity-60 disabled:cursor-not-allowed ring-0 focus:ring-2 ${accentRing}`}
                      >
                        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-xs font-bold text-gray-700 mt-1">
                          {fmt(product.price)}
                        </p>
                        {product.modifiers && product.modifiers.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Con opciones</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Orden ── */}
            <div className="flex flex-col w-1/2 overflow-hidden">
              {/* Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">

                {/* ── Items pendientes (staging) ── */}
                {pendingItems.length > 0 && (
                  <>
                    <p className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider px-1 mb-1">
                      <Clock size={10} />
                      Pendientes de enviar
                    </p>
                    {pendingItems.map(pi => {
                      const modPrice = pi.modifiers.reduce((s, m) => s + (m.price ?? 0), 0);
                      const unitP    = pi.product.price + modPrice;
                      const isEditP  = editingPendingNote === pi.localId;
                      return (
                        <div key={pi.localId} className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                          <div className="flex items-center gap-1.5">
                            {/* Qty − + */}
                            <button
                              onClick={() => setPendingItems(prev => prev.map(p =>
                                p.localId === pi.localId ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p
                              ))}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700"
                            ><Minus size={10} /></button>
                            <span className="text-sm font-bold text-amber-600 w-5 text-center">{pi.quantity}×</span>
                            <button
                              onClick={() => setPendingItems(prev => prev.map(p =>
                                p.localId === pi.localId ? { ...p, quantity: p.quantity + 1 } : p
                              ))}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700"
                            ><Plus size={10} /></button>
                            <span className="text-sm font-semibold text-gray-800 flex-1 min-w-0 leading-snug">{pi.product.name}</span>
                            <span className="text-sm font-bold text-gray-700 flex-shrink-0">{fmt(unitP * pi.quantity)}</span>
                            {/* Nota */}
                            <button
                              onClick={() => setEditingPendingNote(isEditP ? null : pi.localId)}
                              title="Agregar nota"
                              className={`flex-shrink-0 p-1 rounded transition-colors ${
                                pi.note ? 'text-amber-500 hover:text-amber-700' : 'text-gray-300 hover:text-gray-500'
                              }`}
                            ><Pencil size={13} /></button>
                            {/* Quitar */}
                            <button
                              onClick={() => setPendingItems(prev => prev.filter(p => p.localId !== pi.localId))}
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-500"
                            ><X size={10} /></button>
                          </div>
                          {/* Modificadores */}
                          {pi.modifiers.length > 0 && (
                            <p className="ml-16 text-xs text-gray-500 mt-0.5">{pi.modifiers.map(m => m.name).join(', ')}</p>
                          )}
                          {/* Input nota */}
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
                              className="mt-1.5 ml-16 w-[80%] text-sm font-medium border-2 border-amber-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-700 bg-white"
                            />
                          )}
                          {!isEditP && pi.note && (
                            <p
                              className="ml-16 mt-1 text-sm font-medium text-amber-600 cursor-pointer hover:text-amber-700"
                              onClick={() => setEditingPendingNote(pi.localId)}
                            >✏️ {pi.note}</p>
                          )}
                        </div>
                      );
                    })}
                    <div className="border-t border-amber-200 my-1" />
                  </>
                )}

                {/* ── Items en BD ── */}
                {existingItems.length === 0 && pendingItems.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 mt-8">Sin ítems en la orden</p>
                ) : existingItems.length === 0 ? null : (
                  existingItems.map(item => {
                    const localNote = itemNotes[item.id] ?? item.notes ?? '';
                    const hasNote   = !!localNote;
                    const isEditing = editingNote === item.id;
                    const cancelled = !!item.isCancelled;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg px-2.5 py-2 transition-colors ${cancelled ? 'bg-red-50/60' : 'bg-gray-50 hover:bg-gray-100'}`}
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
                                    ? 'text-blue-500 hover:text-blue-700'
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
                  })
                )}
              </div>

              {/* Totales — siempre visibles, descuento desde BD */}
              <div className="border-t border-gray-100 p-3 space-y-1 flex-shrink-0">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {/* Descuento: solo visible si existe en BD */}
                {orderDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm font-semibold text-green-600">
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
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100 mt-1">
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>

              {/* Panel descuento — solo cuando showDiscount=true */}
              {showDiscount && (
                <div className="border-t border-gray-100 p-3 flex-shrink-0 bg-orange-50">
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
                      value={discountInput}
                      onChange={e => setDiscountInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleApplyDiscount(); }}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={submitting}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
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
              {/* Cocina — igual de prominente que Cobrar */}
              <button
                onClick={handleCocina}
                disabled={submitting || pendingItems.length === 0 || !canSendToKitchen}
                className={`flex-1 relative flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm text-white ${
                  pendingItems.length === 0
                    ? 'bg-amber-300 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600'
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
              {/* Cobrar */}
              <button
                onClick={handleCobrar}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl ${accentBg} text-white font-bold text-sm transition-colors shadow-sm`}
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
    </>
  );
}