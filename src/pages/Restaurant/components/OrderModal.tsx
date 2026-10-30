// ─────────────────────────────────────────────────────────────────────────
// ORDER MODAL v4 (Hotfix 246 Tanda A) — Drawer derecho SIN backdrop:
// el mapa de mesas queda visible y tocable detrás. Grilla de dos niveles
// (categorías → productos) + ticket compartido OrderTicket + jerarquía
// unificado (único botón relleno = Enviar a cocina). Móvil: fullscreen
// conservando mobileTab + selector de mesa con guard.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Search, Plus, Minus, ShoppingCart, CreditCard,
  Clock, Star, Users, MessageSquare, UserPlus, Loader2, Tag, Pencil,
  Printer, ChefHat, ClipboardList, CheckCircle, Mail, LayoutGrid, ArrowLeft,
} from 'lucide-react';
import { ModifierGroupsModal, hasModifierGroups } from '../../../components/restaurant/shared/ModifierGroupsModal'; // HOTFIX 291
import type {
  Table,
  Product,
  ProductCategory,
  CartItem,
  SaleItem
} from '../../../types/restaurant.types';
import customersService from '../../../services/customersService';
import { restaurantService } from '../../../services/restaurantService';
import { posService } from '../../../services/posService';
import { applyOrderDiscount, discountInputAllowed, discountLimitHint, useAdminPin } from '../../../components/pos/discountControl';
import CustomerAutocomplete from '../../../components/CustomerAutocomplete';
import toast from 'react-hot-toast';
import { usePermission } from '../../../hooks/usePermission';
import tablesService from '../../../services/tablesService';
import { useRemovalReason } from '../../../hooks/useRemovalReason';
import { useConfirmVoidOrder, leavesOrderEmpty } from '../../../components/restaurant/shared/ConfirmVoidOrderModal';
import { formatCurrency } from '../../../lib/utils';
import { OrderTicket } from '../../../components/restaurant/shared/OrderTicket';
import { ItemPrepList, ItemsProgress } from '../../../components/restaurant/shared/ItemPrepList'; // TAREA 280
import { colorForCategory, emojiForCategory, categoryLabel } from '../../../lib/categoryHelpers';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { useActivePromotions } from '../../../hooks/useActivePromotions'; // HOTFIX 299
import { priceCartWithPromotions, restaurantCartToPromoLines, type PromoLineResult } from '../../../utils/promoPricing'; // HOTFIX 299

interface OrderModalProps {
  table: Table;
  products: Product[];
  categories: ProductCategory[];
  cart: CartItem[];
  existingItems?: SaleItem[];
  numberOfPeople: number;
  existingOrderId?: string;
  onAddProduct: (product: Product) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveExistingItem?: (itemId: string, reason: string) => void;
  onEditOrder?: () => void;
  onAddNote: (itemId: string, note: string) => void;
  onUpdateModifiers?: (itemId: string, modifiers: any[], unitPrice: number) => void;
  onCheckout: (customerId?: string, customerName?: string | undefined, discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }) => void;
  onSendToKitchen: (customerId?: string, customerName?: string, customerPhone?: string, orderNote?: string) => void;
  onClose: () => void;
  setNumberOfPeople: (value: number) => void;
  isSubmitting?: boolean;
  tables?: Table[];
}

export const OrderModal = ({
  table,
  products,
  categories,
  cart,
  existingItems = [],
  numberOfPeople,
  existingOrderId,
  onAddProduct,
  onUpdateQuantity,
  onRemoveItem,
  onRemoveExistingItem,
  onEditOrder,
  onAddNote,
  onCheckout,
  onSendToKitchen,
  onClose,
  setNumberOfPeople,
  isSubmitting = false,
  tables = [],
}: OrderModalProps) => {
  const [searchQuery, setSearchQuery]               = useState('');
  // Hotfix 246 CB: null = nivel 1 (baldosas de categorías); string = nivel 2
  const [selectedCategory, setSelectedCategory]     = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId]         = useState<string | null>(null);
  const [clientName, setClientName]                 = useState('');
  const [clientPhone, setClientPhone]               = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [saveToCustomers, setSaveToCustomers]       = useState(true);
  // HOTFIX 262: clientes/CRM no está en Básico — sin guardar en Clientes ni find-or-create
  const { isBasico } = usePlan();
  const [customerEmail, setCustomerEmail]           = useState('');
  const [marketingOptIn, setMarketingOptIn]         = useState(false);
  const [pendingProduct, setPendingProduct]         = useState<Product | null>(null);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [orderNote, setOrderNote]                 = useState('');
  const [existingStatus, setExistingStatus]       = useState<string | null>(null);
  // TAREA 280: ítems del pedido leídos del servidor para marcar su preparación (Básico)
  const [prepItems, setPrepItems]                 = useState<SaleItem[]>([]);
  const [updatingStatus, setUpdatingStatus]       = useState(false);
  const [showTransferModal, setShowTransferModal]   = useState(false);
  const [isTransferring, setIsTransferring]         = useState(false);
  const [mobileTab, setMobileTab]                   = useState<'menu' | 'order'>('menu');
  const [discountType, setDiscountType]             = useState<'%' | '$'>('%');
  const [discountInput, setDiscountInput]           = useState('10');
  // Hotfix #257: descuento con origen único en la orden; se edita aquí y en PaymentModal (mismo endpoint)
  const [discountApplied, setDiscountApplied]       = useState(false);
  const [showDiscountPopover, setShowDiscountPopover] = useState(false);
  // Borrador del popover: el estado guardado (discountType/discountInput) solo cambia al aplicar
  const [draftType, setDraftType]                   = useState<'%' | '$'>('%');
  const [draftInput, setDraftInput]                 = useState('');
  const [discountReason, setDiscountReason]         = useState('');
  const [applyingDiscount, setApplyingDiscount]     = useState(false);
  const [showWaiterPicker, setShowWaiterPicker] = useState(false);
  // Hotfix 246 CB: toggle grilla↔búsqueda (clave NUEVA, patrón gemelos #245)
  const [viewMode, setViewMode] = useState<'search' | 'grid'>(() =>
    (localStorage.getItem('bullweb_pos_viewmode_mesas') as 'search' | 'grid') || 'grid'
  );
  const toggleViewMode = (mode: 'search' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('bullweb_pos_viewmode_mesas', mode);
  };
  // Hotfix 246 CB: animación de tap ~120ms (estado local puro)
  const [tappedProductId, setTappedProductId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Hotfix 246 CE: selector móvil "Mesa N" — llama al MISMO camino de
  // handleSelectTable (con su guard de ítems sin enviar).
  const restaurantCtx = useRestaurant();

  // ── Hook para pedir motivo de eliminación ──
  const { promptReason, modalElement: removalReasonModal } = useRemovalReason();
  // Hotfix #286: quitar el ultimo producto anula el pedido (backend) -> confirmar antes
  const { askVoid, voidModal } = useConfirmVoidOrder();
  // Hotfix #257: PIN de administrador para descuentos sobre el umbral
  const { requestPin, pinModal } = useAdminPin();

  const { data: waiters = [] } = useQuery({
    queryKey: ['order-waiters'],
    queryFn: () => tablesService.listWaiters(),
    enabled: showWaiterPicker,
  });

  const assignWaiterMutation = useMutation({
    mutationFn: ({ tableId, waiterId }: { tableId: string; waiterId: string }) =>
      tablesService.assignWaiter(tableId, waiterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesero cambiado correctamente');
      setShowWaiterPicker(false);
    },
    onError: () => toast.error('Error al cambiar mesero'),
  });

  // ─── Permisos ───────────────────────────────────────────────
  const canCobrar   = usePermission('pos.cobrar');
  const canEdit     = usePermission('pos.edit_order');
  const canDiscount = usePermission('pos.discount_table');
  const canTransfer = usePermission('pos.transfer_order');
  const canSendToKitchen = usePermission('tables.order');

  const handleTransfer = async (newTableId: string) => {
    if (!existingOrderId) return;
    setIsTransferring(true);
    try {
      await posService.transferOrder({
        fromTableId: table.id,
        toTableId: newTableId,
        transferType: 'full'
      });
      toast.success('Mesa transferida exitosamente');
      setShowTransferModal(false);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Error al transferir mesa');
    } finally {
      setIsTransferring(false);
    }
  };

  // TAREA 280: estado por ítem desde el servidor (al abrir, al enviar ítems nuevos, tras cada cambio y cada 10 s)
  const refreshPrepItems = () => {
    if (!existingOrderId) return;
    restaurantService.getSaleById(existingOrderId).then(sale => {
      if (!sale) return;
      setPrepItems(sale.items ?? []);
      if (sale.status) setExistingStatus(sale.status);
    }).catch(() => { /* silencioso */ });
  };
  useEffect(() => {
    if (!existingOrderId || !isBasico) { setPrepItems([]); return; }
    refreshPrepItems();
    const t = setInterval(refreshPrepItems, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrderId, isBasico, existingItems.length]);

  // Cargar datos de orden existente
  useEffect(() => {
    if (existingOrderId) {
      restaurantService.getSaleById(existingOrderId).then(sale => {
        if (sale?.customerName) setClientName(sale.customerName);
        if (sale?.customerId)   setSelectedCustomerId(sale.customerId);
        if (sale?.customerPhone) setClientPhone(sale.customerPhone);
        if (sale?.status)       setExistingStatus(sale.status);
        const disc = Number((sale as any)?.discount ?? 0);
        const pct  = Number((sale as any)?.discountValue ?? 0);
        if (disc > 0) {
          setDiscountApplied(true);
          // Hotfix #257: si la orden guardó un %, se muestra el % (se recalcula con el subtotal)
          if ((sale as any)?.discountType === 'PERCENTAGE' && pct > 0) {
            setDiscountType('%');
            setDiscountInput(String(pct));
          } else {
            setDiscountType('$');
            setDiscountInput(String(disc));
          }
        }
      }).catch(e => console.warn('[OrderModal] error cargando orden', e));
    }
  }, [existingOrderId]);

  // ── Avanzar estado del pedido (PENDING → PREPARING → READY) ──
  // Usa el mismo servicio que OrderCardCompact (restaurantService.updateSaleStatus)
  const handleUpdateStatus = async (newStatus: 'PREPARING' | 'READY' | 'DELIVERED') => {
    if (!existingOrderId || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await restaurantService.updateSaleStatus(existingOrderId, newStatus);
      setExistingStatus(newStatus);
      toast.success(newStatus === 'PREPARING' ? 'Pedido en preparación' : 'Pedido listo para entregar');
      // Refrescar mesas y ventas para que la UI refleje el nuevo estado
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    } catch (err: any) {
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      toast.error(backendMsg || 'Error al actualizar el estado del pedido');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // (1-d-i) MISMO handler de agregar que usa la lista actual
  const handleProductClick = (product: Product) => {
    // HOTFIX 291: grupos de modificadores (modelo nuevo); obligatorio bloquea en el selector
    if (hasModifierGroups(product)) {
      setPendingProduct(product);
      setShowModifiersModal(true);
    } else {
      onAddProduct(product);
      setSearchQuery('');
    }
  };

  useEffect(() => { searchInputRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'f' && e.key !== 'F') || e.ctrlKey || e.metaKey || e.altKey) return;

      const el = document.activeElement as HTMLElement | null;

      // Si el foco ya está en el buscador, dejar que el usuario escriba la 'f' normalmente
      if (el === searchInputRef.current) return;

      const tag = el?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el?.isContentEditable;

      // Si el foco está en cualquier otro input editable, no interceptar la tecla
      if (isEditable) return;

      // Si no está en ningún input, interceptar la 'f' y enfocar el buscador
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Filtros ──
  const filteredProducts = products.filter(p => {
    const matchCat    = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && p.available;
  });

  // Hotfix 246 CB: búsqueda en TODA la carta ignorando selectedCategory
  // (patrón searchResults de los gemelos del #245)
  const searchResults = searchQuery
    ? products.filter(p =>
        p.available &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.description?.toLowerCase().includes(searchQuery.toLowerCase())))
    : [];

  // Hotfix 246 CB: categoría activa del nivel 2 + su color de la paleta #245
  const activeCat = categories.find(c => c.id === selectedCategory) ?? null;
  const activeCatColor = activeCat ? colorForCategory(categories, activeCat.id) : '#F97316';

  // ── Cálculos ──
  // Soft-delete visual: excluir items cancelados del total
  const existingSubtotal = existingItems
    .filter(i => !i.isCancelled)
    .reduce((s, i) => s + (i.total ?? 0), 0);
  const newListSubtotal  = cart.reduce((s, i) => s + i.subtotal, 0);
  // HOTFIX 299: los items nuevos se muestran con las promociones vigentes (pack agrupado, 2x1, %,
  // precio fijo), misma regla que el backend; solo mostrar: el carrito enviado no cambia.
  const activePromotions = useActivePromotions();
  const promoPricing     = priceCartWithPromotions(restaurantCartToPromoLines(cart, products), activePromotions);
  const promoLines: Record<string, PromoLineResult> = Object.fromEntries(cart.map((it, i) => [it.id, promoPricing.lines[i]]));
  const promoDiscount    = Math.min(newListSubtotal, promoPricing.discount);
  const newSubtotal      = newListSubtotal - promoDiscount;
  const subtotal         = existingSubtotal + newSubtotal;
  const discountValue    = parseFloat(discountInput) || 0;
  const discountAmount   = discountApplied
    ? discountType === '%'
      ? Math.round(subtotal * discountValue / 100)
      : Math.min(discountValue, subtotal)
    : 0;
  const total      = subtotal - discountAmount;
  const totalItems = cart.length + existingItems.length;

  // Formateador EXISTENTE sin el signo (OrderTicket antepone "$" sin espacio)
  const fmt = (n: number) => formatCurrency(n).replace('$', '');

  // Tiempo en mesa
  const tiempoEnMesa = (() => {
    if (!existingOrderId) return null;
    const since = (table as any).activeOrderCreatedAt ?? table.occupiedSince;
    if (!since) return null;
    const diff = Date.now() - new Date(since).getTime();
    if (diff < 0) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  const handlePrintPreBill = async () => {
    if (!existingOrderId) return;
    try { await posService.printPrecuenta(existingOrderId); } catch { /* silencioso */ }
  };

  // ── Hotfix #257: descuento guardado en la orden (topes + PIN de administrador) ──
  const discountKind = draftType === '%' ? 'PERCENTAGE' as const : 'FIXED' as const;
  const draftValue   = parseFloat(draftInput) || 0;
  const toggleDiscountPopover = () => {
    if (!showDiscountPopover) {
      setDraftType(discountType);
      setDraftInput(discountApplied ? discountInput : '');
    }
    setShowDiscountPopover(v => !v);
  };
  const persistDiscount = async (payload: { type: 'PERCENTAGE' | 'FIXED'; value: number; reason?: string }) => {
    if (!existingOrderId) return false;
    setApplyingDiscount(true);
    try {
      const ok = await applyOrderDiscount(existingOrderId, payload, requestPin);
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
      }
      return ok;
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo aplicar el descuento');
      return false;
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (draftValue <= 0) { toast.error('Ingresa un valor mayor a 0'); return; }
    if (!discountInputAllowed(discountKind, draftInput, existingSubtotal)) {
      toast.error(discountLimitHint(discountKind, existingSubtotal));
      return;
    }
    const ok = await persistDiscount({ type: discountKind, value: draftValue, reason: discountReason.trim() || undefined });
    if (ok) {
      setDiscountType(draftType);
      setDiscountInput(draftInput);
      setDiscountApplied(true);
      setShowDiscountPopover(false);
      toast.success('Descuento aplicado');
    }
  };

  const handleRemoveDiscount = async () => {
    const ok = await persistDiscount({ type: 'FIXED', value: 0 });
    if (ok) {
      setDiscountApplied(false);
      setDiscountInput('10');
      setDiscountType('%');
      setShowDiscountPopover(false);
      toast.success('Descuento eliminado');
    }
  };

  // ══════════════════════════════════════════════════════════════
  return createPortal(
    <>
      {/* ── CA: drawer derecho SIN backdrop — el mapa de mesas queda
          VISIBLE y TOCABLE detrás. Fullscreen < 1024px (mobileTab intacto),
          70% en lg, 60% min-900px en xl. Sombra a la izquierda. ── */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full lg:w-[70%] xl:w-[60%] xl:min-w-[900px] bg-white flex flex-col overflow-hidden shadow-[-8px_0_30px_rgba(0,0,0,0.25)]">

          {/* ── HEADER (CA): círculo de mesa como elemento más grande,
              garzón, "Cambiar mesa" secundario (mismo onClick) y X ── */}
          <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 bg-white text-orange-600 rounded-full flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-md">
                {table.number}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-lg leading-tight">Mesa {table.number}</h2>
                  {tiempoEnMesa && (
                    <span className="flex items-center gap-1 text-xs text-orange-100">
                      <Clock size={11} /> {tiempoEnMesa}
                    </span>
                  )}
                  {existingOrderId && <span className="text-xs text-orange-200">· Orden activa</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-orange-100">
                  <span className="flex items-center gap-1 relative">
                    <Users size={11} />
                    <span
                      onClick={() => setShowWaiterPicker(!showWaiterPicker)}
                      className="cursor-pointer hover:underline"
                    >
                      {table.waiterName ? table.waiterName.split(' ')[0] : 'Sin garzón'}
                    </span>
                  </span>
                </div>
                {/* CE: selector de mesa móvil — mismo camino de handleSelectTable (con guard) */}
                <select
                  aria-label="Cambiar de mesa"
                  value={table.id}
                  onChange={e => {
                    const t = tables.find(x => x.id === e.target.value);
                    if (t && t.id !== table.id) restaurantCtx.handleSelectTable(t);
                  }}
                  className="lg:hidden mt-1 bg-white/15 border border-white/30 rounded-lg text-xs text-white px-2 py-1 focus:outline-none max-w-[180px]"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id} className="text-gray-800">
                      Mesa {t.number}{t.status === 'OCCUPIED' ? ' · ocupada' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {existingOrderId && canTransfer && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="px-3 py-2 bg-white/15 hover:bg-white/30 border border-white/30 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cambiar mesa
                </button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── TABS MOVIL (conservados) ── */}
          <div className="lg:hidden flex-shrink-0 bg-orange-500 border-t border-white/20">
            <div className="flex">
              <button
                onClick={() => setMobileTab('menu')}
                className={`flex-1 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors ${
                  mobileTab === 'menu' ? 'bg-white/20 border-b-2 border-white' : 'hover:bg-white/10'
                }`}
              >
                <Search size={14} /> Agregar productos
              </button>
              <button
                onClick={() => setMobileTab('order')}
                className={`flex-1 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors ${
                  mobileTab === 'order' ? 'bg-white/20 border-b-2 border-white' : 'hover:bg-white/10'
                }`}
              >
                <ShoppingCart size={14} />
                Orden{totalItems > 0 ? ` (${totalItems})` : ''}
              </button>
            </div>
          </div>

          {/* ── BODY SPLIT ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── IZQUIERDA — Productos (lista o grilla de dos niveles) ── */}
            <div className={`flex flex-col min-w-0 border-r border-gray-100 overflow-y-hidden ${
              mobileTab === 'order' ? 'hidden lg:flex' : 'flex'
            } w-full lg:flex-1`}>

              {/* Búsqueda + toggle de vista (CB) */}
              <div className="flex-shrink-0 min-w-0 p-3 bg-white border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar producto... (F)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="w-full pl-9 pr-20 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-[76px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                  {/* Toggle grilla↔búsqueda (patrón gemelos #245, clave nueva) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => toggleViewMode('search')}
                      title="Búsqueda"
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === 'search' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Search size={16} />
                    </button>
                    <button
                      onClick={() => toggleViewMode('grid')}
                      title="Categorías"
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── CB: NIVEL 1 — baldosas de categorías ── */}
              {viewMode === 'grid' && !searchQuery && selectedCategory === null && (
                <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
                  <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                    {categories.map((cat, i) => {
                      const prevColor = i > 0 ? colorForCategory(categories, categories[i - 1].id) : undefined;
                      const color = colorForCategory(categories, cat.id, prevColor);
                      const count = products.filter(p => p.categoryId === cat.id && p.available).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className="text-left rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all min-h-[120px] flex flex-col active:scale-[0.98]"
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
              )}

              {/* ── CB: NIVEL 2 — chips + grilla de productos de la categoría ── */}
              {viewMode === 'grid' && !searchQuery && selectedCategory !== null && (
                <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
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
                  {/* Chips de TODAS las categorías (flex-wrap, activo naranja) */}
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
                  {/* Grilla de productos (auto-fill 160px) */}
                  {filteredProducts.length > 0 ? (
                    <div className="grid gap-2.5 p-3 pt-0" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                      {filteredProducts.map(product => {
                        const qtyInCart = cart.filter(i => i.productId === product.id).reduce((s, i) => s + i.quantity, 0);
                        return (
                          <button
                            key={product.id}
                            onClick={() => {
                              setTappedProductId(product.id);
                              setTimeout(() => setTappedProductId(null), 120);
                              handleProductClick(product);
                            }}
                            className={`relative text-left p-2.5 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl transition-all duration-100 ${tappedProductId === product.id ? 'scale-95' : 'scale-100'}`}
                          >
                            {qtyInCart > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center z-10">{qtyInCart}</span>
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
                            <p className="text-sm font-bold text-orange-600">${fmt(product.price)}</p>
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
              )}

              {/* ── Modo búsqueda: chips flex-wrap + lista clásica (buscador
                  existente conservado; al escribir busca en TODA la carta) ── */}
              {(searchQuery || viewMode === 'search') && (
                <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
                  <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        !selectedCategory ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Todos
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          // HOTFIX 292: con texto, tocar una categoría limpia el texto y muestra esa categoría
                          if (searchQuery) setSearchQuery('');
                          setSelectedCategory(cat.id);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  <div className="p-2 space-y-1.5">
                    {(searchQuery ? searchResults : filteredProducts).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <Search size={28} className="mb-2 opacity-50" />
                        <p className="text-sm">Sin resultados</p>
                      </div>
                    ) : (
                      (searchQuery ? searchResults : filteredProducts).map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] transition-all text-left shadow-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
                              {product.popular && <Star size={11} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                              {hasModifierGroups(product) && (
                                <MessageSquare size={11} className="text-orange-400 flex-shrink-0" />
                              )}
                            </div>
                            {product.description && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>
                            )}
                            {product.preparationTime && (
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock size={9} />{product.preparationTime}'
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-orange-500 text-sm">
                              {formatCurrency(product.price)}
                            </span>
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                              <Plus size={15} className="text-white" />
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TANDA B (Hotfix 246, NO implementar en esta tanda): bajo
                  1024px, barra inferior estilo carta QR + cierre del drawer
                  por tap en la mesa activa del mapa. */}
            </div>

            {/* ── DERECHA — Ticket compartido OrderTicket (CC + CD) ── */}
            <div className={`flex flex-col overflow-hidden bg-white ${
              mobileTab === 'menu' ? 'hidden lg:flex' : 'flex'
            } w-full lg:w-[400px] xl:w-[440px] shrink-0`}>

              <OrderTicket
                accent="orange"
                emptyIcon="bag"
                items={cart}
                onIncreaseQuantity={(itemId) => {
                  const it = cart.find(i => i.id === itemId);
                  if (it) onUpdateQuantity(itemId, it.quantity + 1);
                }}
                onDecreaseQuantity={(itemId) => {
                  const it = cart.find(i => i.id === itemId);
                  if (it) onUpdateQuantity(itemId, it.quantity - 1);
                }}
                onRemoveItem={onRemoveItem}
                renderItemExtras={(item) => (
                  <div className="px-2 pb-2">
                    {/* Modificadores en líneas sangradas */}
                    {(item.modifiers?.length ?? 0) > 0 && item.modifiers!.map((m: any, idx: number) => (
                      <p key={m.id ?? `${item.id}-mod-${idx}`} className="text-xs text-gray-500 pl-11 leading-5">
                        + {m.name}{Number(m.price) ? ` (+${fmt(Number(m.price))})` : ''}
                      </p>
                    ))}
                    {/* Nota de ítem tras ícono de comentario que expande al tocar */}
                    {expandedItemId === item.id ? (
                      <textarea
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        placeholder="Nota para cocina..."
                        value={item.notes || ''}
                        onChange={e => onAddNote(item.id, e.target.value)}
                        rows={2}
                        onBlur={() => setExpandedItemId(null)}
                        className="ml-11 w-[calc(100%-2.75rem)] text-xs px-2 py-1.5 bg-white border border-orange-200 rounded-lg resize-none focus:outline-none focus:border-orange-400 placeholder-gray-400"
                      />
                    ) : (
                      <button
                        onClick={() => setExpandedItemId(item.id)}
                        className="ml-11 flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5 max-w-[240px] hover:bg-amber-100 transition-colors"
                      >
                        <MessageSquare size={9} />
                        <span className="truncate">{item.notes || '+ nota'}</span>
                      </button>
                    )}
                  </div>
                )}
                formatPrice={fmt}
                subtotal={subtotal + promoDiscount}
                total={total}
                promoLines={promoLines}
                promoDiscount={promoDiscount}
                extraTotals={
                  <>
                    {/* Nota general en una línea (mismo estado y setter de hoy) */}
                    <div className="flex justify-between items-center gap-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <MessageSquare size={12} /> Nota general
                      </span>
                      <input
                        value={orderNote}
                        onChange={e => setOrderNote(e.target.value)}
                        placeholder="Alergias, preferencias..."
                        className="flex-1 min-w-0 max-w-[220px] text-right text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400 placeholder:text-gray-300"
                      />
                    </div>
                    {discountApplied && discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Descuento{discountType === '%' ? ` (${discountValue}%)` : ''}</span>
                        <span className="font-medium">-${fmt(discountAmount)}</span>
                      </div>
                    )}
                  </>
                }
                /* Bloque "En cocina" — ítems ya enviados (mismo render de hoy) */
                existingSection={existingItems.length > 0 ? (
                  <div className="flex-shrink-0 max-h-[35%] overflow-y-auto border-b border-gray-200 bg-white px-3 py-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 flex items-center gap-1.5">
                      <ChefHat size={12} /> En cocina
                    </p>
                    {/* TAREA 280: preparación por ítem en Básico (mismo componente que la tarjeta de Mostrador) */}
                    {isBasico && existingOrderId && prepItems.length > 0
                      && ['PENDING', 'PREPARING', 'READY'].includes(existingStatus ?? '') && (
                      <div className="pb-2 mb-1 border-b border-gray-200">
                        <ItemsProgress items={prepItems} />
                        <ItemPrepList orderId={existingOrderId} items={prepItems} onChanged={() => {
                          refreshPrepItems();
                          queryClient.invalidateQueries({ queryKey: ['tables'] });
                        }} />
                      </div>
                    )}
                    {existingItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 py-2 border-b border-gray-100 ${item.isCancelled ? 'opacity-60' : ''}`}
                      >
                        <div className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold flex-shrink-0 ${
                          item.isCancelled ? 'bg-red-100 text-red-400 line-through' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.quantity}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-medium truncate ${item.isCancelled ? 'text-slate-400 line-through' : 'text-gray-600'}`}>
                            {item.productName}
                          </p>
                          {item.isCancelled && item.cancelReason && (
                            <p className="text-xs text-red-500 truncate flex items-center gap-1">
                              ✕ {item.cancelReason}
                            </p>
                          )}
                          {!item.isCancelled && item.notes && (
                            <p className="text-xs text-amber-700 truncate flex items-center gap-1">
                              <MessageSquare size={10} /> {item.notes}
                            </p>
                          )}
                        </div>
                        <span className={`text-[14px] font-bold whitespace-nowrap flex-shrink-0 ${item.isCancelled ? 'text-slate-400 line-through' : 'text-gray-500'}`}>
                          {formatCurrency(item.total ?? 0)}
                        </span>
                        {onRemoveExistingItem && !item.isCancelled && (
                          <button
                            onClick={async () => {
                              // Hotfix #286: el ultimo producto anula el pedido y libera la mesa
                              const voidsOrder = leavesOrderEmpty(existingItems, [item.id]);
                              if (voidsOrder && !(await askVoid(`de la mesa ${table.number}`))) return;
                              const reason = await promptReason(item.productName);
                              if (!reason) return;
                              await onRemoveExistingItem(item.id, reason);
                              if (voidsOrder) onClose(); // pedido anulado: no se le puede agregar (409)
                            }}
                            className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {cart.length > 0 && (
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider py-2 flex items-center gap-1.5">
                        <ClipboardList size={12} /> Sin enviar
                      </p>
                    )}
                  </div>
                ) : undefined}
                customerChip={
                  <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {/* Personas — stepper con botones h-11 */}
                      <div className="flex-shrink-0">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Users size={9} /> Personas
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                            className="w-11 h-11 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:border-orange-400 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number" min={1} max={table.capacity || 20} value={numberOfPeople}
                            onChange={e => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 text-center py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                          />
                          <button
                            onClick={() => setNumberOfPeople(Math.min(table.capacity || 20, numberOfPeople + 1))}
                            className="w-11 h-11 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:border-orange-400 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      {/* Cliente (opcional) — mismo estado y setters de hoy */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <UserPlus size={9} /> Cliente (opcional)
                        </p>
                        {selectedCustomerId || (clientName.trim() && existingOrderId) ? (
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                            <span className="text-xs font-medium text-gray-900 flex-1 truncate">{clientName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(undefined);
                                setClientName('');
                                setClientPhone('');
                                if (existingOrderId) {
                                  restaurantService.updateOrderCustomer(existingOrderId, {
                                    customerId: null, customerName: null, customerPhone: null,
                                  }).catch(() => {});
                                }
                              }}
                              className="text-gray-400 hover:text-red-500 flex-shrink-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <CustomerAutocomplete
                            light
                            placeholder="Nombre del cliente"
                            onSaveNew={name => {
                              setClientName(name);
                              if (existingOrderId) {
                                restaurantService.updateOrderCustomer(existingOrderId, {
                                  customerId: null, customerName: name, customerPhone: null,
                                }).catch(() => {});
                              }
                            }}
                            onSelect={async c => {
                              setSelectedCustomerId(c.id);
                              setClientName(c.name);
                              setClientPhone(c.phone ?? '');
                              if (existingOrderId) {
                                await restaurantService.updateOrderCustomer(existingOrderId, {
                                  customerId: c.id, customerName: c.name, customerPhone: c.phone ?? null,
                                }).catch(() => {});
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                    {clientName.trim() && !existingOrderId && !isBasico && (
                      <button
                        type="button"
                        onClick={() => setSaveToCustomers(v => !v)}
                        className={`mt-2 flex items-center gap-2 w-full px-3 py-1.5 rounded-xl border-2 transition-all text-xs ${
                          saveToCustomers ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-dashed border-gray-300 bg-white text-gray-500'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${saveToCustomers ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                          {saveToCustomers && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                        </div>
                        <UserPlus size={11} />
                        <span className="font-bold">Guardar "{clientName.trim()}" en Clientes</span>
                      </button>
                    )}
                    {clientName.trim() && !selectedCustomerId && saveToCustomers && !isBasico && (
                      <div className="mt-2 space-y-2">
                        {/* ── Hotfix #115: Email opcional (solo creación nueva) ── */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <Mail size={9} /> Email
                            <span className="text-gray-300 normal-case font-normal ml-1">— opcional</span>
                          </label>
                          <input
                            type="email"
                            placeholder="cliente@ejemplo.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border-2 border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                          />
                        </div>
                        {/* ── Hotfix #115: Opt-in de marketing (desmarcado por defecto) ── */}
                        <button
                          type="button"
                          onClick={() => setMarketingOptIn(v => !v)}
                          className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-xl border-2 transition-all text-xs ${
                            marketingOptIn
                              ? 'border-orange-400 bg-orange-50 text-orange-700'
                              : 'border-dashed border-gray-300 bg-white text-gray-500'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${marketingOptIn ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                            {marketingOptIn && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                          </div>
                          <span className="font-bold">Quiero recibir ofertas y promociones por email</span>
                        </button>
                      </div>
                    )}
                  </div>
                }
                /* (CD) MISMA lógica del botón Enviar a Cocina de hoy */
                onConfirm={async () => {
                  let customerId: string | undefined = selectedCustomerId;
                  if (!customerId && saveToCustomers && !isBasico && clientName.trim().length >= 2) {
                    try {
                      const customer = await customersService.findOrCreate({
                        name: clientName.trim(),
                        phone: clientPhone.trim() || undefined,
                        email: customerEmail.trim() || undefined,
                        marketingOptIn,
                      });
                      customerId = customer.id;
                      toast.success('Vinculado');
                    } catch { /* no bloquear */ }
                  }
                  onSendToKitchen(customerId, clientName.trim() || undefined, clientPhone.trim() || undefined, orderNote.trim() || undefined);
                }}
                saving={isSubmitting}
                savingLabel="Enviando..."
                /* (CD) MISMA condición que hoy deshabilita el envío (1-d-ii) */
                confirmDisabled={cart.length === 0 || !canSendToKitchen}
                confirmLabel={`Enviar a cocina · ${cart.length} ${cart.length === 1 ? 'ítem' : 'ítems'}`}
                alwaysShowFooter
                /* (CC/CD) fila de 3 secundarios de contorno — mismos onClick/args */
                footerExtra={
                  <div className="mt-3 space-y-2">
                    {/* Hotfix #257: descuento guardado en la orden (mismo dato que PaymentModal y la pre-cuenta) */}
                    {showDiscountPopover && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Descuento de la orden</p>
                        <div className="flex gap-2">
                          {(['%', '$'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => { setDraftType(t); setDraftInput(''); }}
                              className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold border transition-colors ${
                                draftType === t ? 'border-slate-800 text-slate-900 bg-white' : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                              }`}
                            >{t === '%' ? '% Porcentaje' : '$ Monto'}</button>
                          ))}
                        </div>
                        <input
                          type="number" inputMode="numeric" min="0"
                          max={draftType === '%' ? 100 : Math.round(existingSubtotal)}
                          value={draftInput}
                          onChange={e => { if (discountInputAllowed(discountKind, e.target.value, existingSubtotal)) setDraftInput(e.target.value); }}
                          className="w-full min-h-[44px] px-3 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-slate-500"
                          placeholder={draftType === '%' ? 'Porcentaje' : 'Monto'}
                        />
                        <p className="text-xs text-slate-400">{discountLimitHint(discountKind, existingSubtotal)}</p>
                        <input
                          type="text" maxLength={200}
                          value={discountReason}
                          onChange={e => setDiscountReason(e.target.value)}
                          className="w-full min-h-[44px] px-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-500"
                          placeholder="Motivo (opcional)"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleRemoveDiscount}
                            disabled={applyingDiscount || !discountApplied}
                            className="min-h-[44px] bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 disabled:opacity-40"
                          >Quitar</button>
                          <button
                            onClick={handleApplyDiscount}
                            disabled={applyingDiscount}
                            className="min-h-[44px] bg-[#F97316] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-40"
                          >{applyingDiscount ? 'Aplicando…' : 'Aplicar'}</button>
                        </div>
                      </div>
                    )}

                    {/* Fila de 3 botones secundarios (contorno) */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={handlePrintPreBill}
                        disabled={!existingOrderId || (existingItems.length === 0 && cart.length === 0)}
                        className="py-2 bg-white border-2 border-gray-300 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Printer size={14} /> Pre-cuenta
                      </button>
                      <button
                        onClick={toggleDiscountPopover}
                        disabled={!canDiscount || !existingOrderId}
                        title={!existingOrderId ? 'Envía el pedido a cocina para aplicar descuento' : undefined}
                        className={`py-2 bg-white border-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                          discountApplied && discountAmount > 0
                            ? 'border-orange-400 text-orange-700'
                            : 'border-gray-300 text-gray-600 hover:border-orange-300 hover:text-orange-600'
                        }`}
                      >
                        <Tag size={14} />
                        {discountApplied && discountAmount > 0
                          ? `-${fmt(discountAmount)}${discountType === '%' ? ` ${discountValue}%` : ''}`
                          : 'Descuento'}
                      </button>
                      <button
                        onClick={async () => {
                          let customerId: string | undefined = selectedCustomerId;
                          if (!customerId && saveToCustomers && !isBasico && clientName.trim().length >= 2) {
                            try {
                              const customer = await customersService.findOrCreate({
                                name: clientName.trim(),
                                phone: clientPhone.trim() || undefined,
                                email: customerEmail.trim() || undefined,
                                marketingOptIn,
                              });
                              customerId = customer.id;
                              if (existingOrderId) {
                                await restaurantService.updateOrderCustomer(existingOrderId, {
                                  customerId: customer.id,
                                  customerName: customer.name,
                                  customerPhone: clientPhone.trim() || null,
                                }).catch(() => {});
                              }
                              toast.success('Vinculado a la orden');
                            } catch { /* no bloquear */ }
                          }
                          onCheckout(
                            customerId,
                            undefined,
                            discountApplied
                              ? { type: discountType === '%' ? 'PERCENTAGE' : 'FIXED', value: discountValue }
                              : undefined
                          );
                        }}
                        disabled={isSubmitting || !canCobrar}
                        className="py-2 bg-white border-2 border-gray-300 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 hover:border-orange-300 hover:text-orange-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        {existingOrderId ? `Cobrar ${fmt(total)}` : 'Cobrar mesa'}
                      </button>
                    </div>

                    {/* Avance de estado del pedido (secundarios, contorno) */}
                    {existingOrderId && existingStatus === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus('PREPARING')}
                        disabled={updatingStatus}
                        className="w-full min-h-[44px] py-2 bg-white border-2 border-blue-500 text-blue-600 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : <ChefHat size={16} />}
                        En Preparación
                      </button>
                    )}
                    {existingOrderId && existingStatus === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus('READY')}
                        disabled={updatingStatus}
                        className="w-full min-h-[44px] py-2 bg-white border-2 border-green-500 text-green-600 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Listo
                      </button>
                    )}

                    {/* Editar venta */}
                    {existingOrderId && onEditOrder && canEdit && (
                      <button
                        onClick={onEditOrder}
                        className="w-full py-2 bg-white border-2 border-purple-300 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Pencil size={15} /> Editar venta
                      </button>
                    )}
                  </div>
                }
              />
            </div>
          </div>
        </div>

      {/* ModifiersModal */}
      {showModifiersModal && pendingProduct && (
        <ModifierGroupsModal
          product={pendingProduct}
          withNotes
          onConfirm={(modifiers, notes) => {
            onAddProduct({ ...pendingProduct, modifiers, notes } as Product);
            setSearchQuery('');
            setShowModifiersModal(false);
            setPendingProduct(null);
          }}
          onClose={() => {
            setShowModifiersModal(false);
            setPendingProduct(null);
          }}
        />
      )}

      {/* Waiter picker — fixed portal fuera del overflow-hidden */}
      {showWaiterPicker && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowWaiterPicker(false)} />
          <div className="fixed z-[70] bg-white rounded-xl shadow-2xl border border-gray-300 min-w-[280px] max-h-80 overflow-y-auto"
            style={{ top: '50px', left: '80px' }}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <p className="text-sm text-gray-700 font-bold">👤 Cambiar Mesero</p>
              <p className="text-xs text-gray-400 mt-0.5">Selecciona el mesero para esta mesa</p>
            </div>
            {waiters.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-4">Sin meseros disponibles</p>
            ) : (
              waiters.map((w: any) => (
                <button
                  key={w.id}
                  onClick={() => assignWaiterMutation.mutate({ tableId: table.id, waiterId: w.id })}
                  disabled={assignWaiterMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left disabled:opacity-50 border-b border-gray-50 last:border-0"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold shadow-sm"
                    style={{ backgroundColor: w.avatarColor ?? '#FF6B35' }}>
                    {w.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-base text-gray-800 font-semibold">{w.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal transferir mesa */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg mb-1">Transferir a mesa</h3>
            <p className="text-xs text-gray-400 mb-4">Selecciona la mesa destino (disponible)</p>
            {tables.filter(t => t.status === 'AVAILABLE' && t.id !== table.id).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No hay mesas disponibles</p>
            ) : (
              <div className="max-h-72 overflow-y-auto mb-4 space-y-4">
                {(() => {
                  const available = tables.filter(t => t.status === 'AVAILABLE' && t.id !== table.id);
                  const sectionMap = new Map<string, typeof available>();
                  available.forEach(t => {
                    const sectionName = (t as any).section?.name || (t as any).sections?.name || 'Sin sección';
                    if (!sectionMap.has(sectionName)) sectionMap.set(sectionName, []);
                    sectionMap.get(sectionName)!.push(t);
                  });
                  const sections = Array.from(sectionMap.entries());
                  return sections.map(([sectionName, sectionTables]) => (
                    <div key={sectionName}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{sectionName}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {sectionTables.map(t => (
                          <button
                            key={t.id}
                            onClick={() => handleTransfer(t.id)}
                            disabled={isTransferring}
                            className="aspect-square rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {isTransferring ? '...' : t.number}
                          </button>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
            <button
              onClick={() => setShowTransferModal(false)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de motivo de eliminación */}
      {removalReasonModal}
      {/* Hotfix #286: confirmacion al quitar el ultimo producto */}
      {voidModal}
      {pinModal}

    </>,
    document.body
  );
};

export default OrderModal;
