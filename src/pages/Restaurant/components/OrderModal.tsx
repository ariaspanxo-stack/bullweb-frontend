// ─────────────────────────────────────────────────────────────────────────
// ORDER MODAL v3 – Desktop: split modal 90vw x 90vh | Mobile: drawer + tabs
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Search, Plus, Minus, ShoppingCart, CreditCard, FileText,
  Clock, Star, Users, MessageSquare, UserPlus, Loader2, Tag, Pencil,
  Printer, ChefHat, ClipboardList,
} from 'lucide-react';
import { ModifiersModal } from './ModifiersModal';
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
import CustomerAutocomplete from '../../../components/CustomerAutocomplete';
import toast from 'react-hot-toast';
import { usePermission } from '../../../hooks/usePermission';
import tablesService from '../../../services/tablesService';

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
  onRemoveExistingItem?: (itemId: string) => void;
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
  const [selectedCategory, setSelectedCategory]     = useState('');
  const [expandedItemId, setExpandedItemId]         = useState<string | null>(null);
  const [clientName, setClientName]                 = useState('');
  const [clientPhone, setClientPhone]               = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [saveToCustomers, setSaveToCustomers]       = useState(true);
  const [pendingProduct, setPendingProduct]         = useState<Product | null>(null);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [orderNote, setOrderNote]                   = useState('');
  const [showTransferModal, setShowTransferModal]   = useState(false);
  const [isTransferring, setIsTransferring]         = useState(false);
  const [mobileTab, setMobileTab]                   = useState<'menu' | 'order'>('menu');
  const [discountType, setDiscountType]             = useState<'%' | '$'>('%');
  const [discountInput, setDiscountInput]           = useState('10');
  const [discountApplied, setDiscountApplied]       = useState(false);
  const [showDiscountPopover, setShowDiscountPopover] = useState(false);
  const [showWaiterPicker, setShowWaiterPicker] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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

  // Cargar datos de orden existente
  useEffect(() => {
    if (existingOrderId) {
      restaurantService.getSaleById(existingOrderId).then(sale => {
        if (sale?.customerName) setClientName(sale.customerName);
        if (sale?.customerId)   setSelectedCustomerId(sale.customerId);
        if (sale?.customerPhone) setClientPhone(sale.customerPhone);
        const disc = Number((sale as any)?.discount ?? 0);
        if (disc > 0) {
          setDiscountApplied(true);
          setDiscountType('$');
          setDiscountInput(String(disc));
        }
      }).catch(e => console.warn('[OrderModal] error cargando orden', e));
    }
  }, [existingOrderId]);

  const handleProductClick = (product: Product) => {
    if (product.modifiers && product.modifiers.length > 0) {
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
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
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

  // ── Cálculos ──
  const existingSubtotal = existingItems.reduce((s, i) => s + (i.total ?? 0), 0);
  const newSubtotal      = cart.reduce((s, i) => s + i.subtotal, 0);
  const subtotal         = existingSubtotal + newSubtotal;
  const discountValue    = parseFloat(discountInput) || 0;
  const discountAmount   = discountApplied
    ? discountType === '%'
      ? Math.round(subtotal * discountValue / 100)
      : Math.min(discountValue, subtotal)
    : 0;
  const total      = subtotal - discountAmount;
  const totalItems = cart.length + existingItems.length;

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

  const handleApplyDiscount = async () => {
    if (discountValue <= 0) { toast.error('Ingresa un valor mayor a 0'); return; }
    setDiscountApplied(true);
    setShowDiscountPopover(false);
    if (existingOrderId) {
      try {
        await posService.applyDiscount(existingOrderId, {
          type: discountType === '%' ? 'PERCENTAGE' : 'FIXED',
          value: discountValue,
        });
        toast.success('Descuento aplicado');
      } catch { /* silencioso */ }
    }
  };

  const handleRemoveDiscount = async () => {
    setDiscountApplied(false);
    setDiscountInput('10');
    setShowDiscountPopover(false);
    if (existingOrderId) {
      try {
        await posService.applyDiscount(existingOrderId, { type: 'FIXED', value: 0 });
      } catch { /* silencioso */ }
    }
  };

  // ══════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Overlay + modal centrado ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white flex flex-col overflow-hidden w-full h-full lg:w-[90vw] lg:h-[90vh] lg:rounded-2xl lg:shadow-2xl">

          {/* ── HEADER ── */}
          <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0">
                {table.number}
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">Mesa {table.number}</h2>
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
                  {tiempoEnMesa && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {tiempoEnMesa}
                    </span>
                  )}
                  {existingOrderId && <span className="text-orange-200">· Orden activa</span>}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── TABS MOVIL ── */}
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

            {/* ── IZQUIERDA 55% — Productos ── */}
            <div className={`flex flex-col border-r border-gray-100 overflow-hidden ${
              mobileTab === 'order' ? 'hidden lg:flex' : 'flex'
            } w-full lg:w-[55%]`}>

              {/* Búsqueda + categorías */}
              <div className="flex-shrink-0 p-3 bg-white border-b border-gray-100">
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
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                {/* Categorías */}
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      !selectedCategory ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista productos scrollable */}
              <div className="flex-1 overflow-y-auto p-2 bg-gray-50 space-y-1.5">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <Search size={28} className="mb-2 opacity-50" />
                    <p className="text-sm">Sin resultados</p>
                  </div>
                ) : (
                  filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] transition-all text-left shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
                          {product.popular && <Star size={11} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                          {(product.modifiers?.length ?? 0) > 0 && (
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
                          ${product.price.toLocaleString()}
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

            {/* ── DERECHA 45% — Orden ── */}
            <div className={`flex flex-col overflow-hidden bg-white ${
              mobileTab === 'menu' ? 'hidden lg:flex' : 'flex'
            } w-full lg:w-[45%]`}>

              {/* Cliente + personas */}
              <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {/* Personas */}
                  <div className="flex-shrink-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Users size={9} /> Personas
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                        className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:border-orange-400 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number" min={1} max={table.capacity || 20} value={numberOfPeople}
                        onChange={e => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 text-center py-0.5 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                      />
                      <button
                        onClick={() => setNumberOfPeople(Math.min(table.capacity || 20, numberOfPeople + 1))}
                        className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:border-orange-400 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  {/* Cliente */}
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
                {clientName.trim() && !existingOrderId && (
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
                    <span className="font-bold">Guardar &quot;{clientName.trim()}&quot; en Clientes</span>
                  </button>
                )}
              </div>

              {/* Items orden — scrollable flex-1 */}
              <div className="flex-1 overflow-y-auto px-3 py-1 bg-white">
                {cart.length === 0 && existingItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                    <ShoppingCart size={36} className="mb-2 opacity-40" />
                    <p className="text-sm font-medium">Carrito vacio</p>
                    <p className="text-xs mt-1">Agrega productos desde el menu</p>
                  </div>
                ) : (
                  <>
                    {/* Items ya en cocina */}
                    {existingItems.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 flex items-center gap-1.5">
                          <ChefHat size={12} /> En cocina
                        </p>
                        {existingItems.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 py-2 border-b border-gray-100"
                          >
                            <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-gray-500 text-xs font-bold flex-shrink-0">
                              {item.quantity}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-gray-600 font-medium truncate">{item.productName}</p>
                              {item.notes && (
                                <p className="text-xs text-amber-700 truncate flex items-center gap-1">
                                  <MessageSquare size={10} /> {item.notes}
                                </p>
                              )}
                            </div>
                            <span className="text-[14px] font-bold text-gray-500 whitespace-nowrap flex-shrink-0">
                              ${(item.total ?? 0).toLocaleString()}
                            </span>
                            {onRemoveExistingItem && (
                              <button
                                onClick={() => onRemoveExistingItem(item.id)}
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
                      </>
                    )}

                    {/* Nuevos items */}
                    {cart.map(item => (
                      <div key={item.id} className="border-b border-gray-100">
                        <div className="flex items-center gap-2 py-2">
                          {/* [-] qty [+] */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 bg-orange-100 hover:bg-orange-200 rounded flex items-center justify-center transition-colors"
                            >
                              <Minus size={11} className="text-orange-700" />
                            </button>
                            <div className="w-6 h-6 bg-orange-500 text-white rounded flex items-center justify-center font-bold text-xs">
                              {item.quantity}
                            </div>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 bg-orange-500 hover:bg-orange-600 rounded flex items-center justify-center transition-colors"
                            >
                              <Plus size={11} className="text-white" />
                            </button>
                          </div>
                          {/* Nombre + nota */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-gray-900 truncate">{item.productName}</p>
                            {item.notes && expandedItemId !== item.id && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  onClick={() => setExpandedItemId(item.id)}
                                  className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 max-w-[140px] hover:bg-amber-100 transition-colors"
                                >
                                  <MessageSquare size={9} />
                                  <span className="truncate">{item.notes}</span>
                                </button>
                                <button
                                  onClick={() => onAddNote(item.id, '')}
                                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            )}
                            {!item.notes && expandedItemId !== item.id && (
                              <button
                                onClick={() => setExpandedItemId(item.id)}
                                className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                              >
                                + nota
                              </button>
                            )}
                          </div>
                          {/* Precio + eliminar */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[14px] font-bold text-gray-900 whitespace-nowrap">
                              ${item.subtotal.toLocaleString()}
                            </span>
                            <button
                              onClick={() => { onRemoveItem(item.id); setExpandedItemId(id => id === item.id ? null : id); }}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                        {/* Nota expandida */}
                        {expandedItemId === item.id && (
                          <div className="bg-orange-50/40 px-2 pb-2">
                            <textarea
                              // eslint-disable-next-line jsx-a11y/no-autofocus
                              autoFocus
                              placeholder="Nota para cocina..."
                              value={item.notes || ''}
                              onChange={e => onAddNote(item.id, e.target.value)}
                              rows={2}
                              onBlur={() => setExpandedItemId(null)}
                              className="w-full text-xs px-2 py-1.5 bg-white border border-orange-200 rounded-lg resize-none focus:outline-none focus:border-orange-400 placeholder-gray-400"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* FOOTER FIJO — totales + botones */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 pt-2.5 pb-3 space-y-2">
                {/* Nota general */}
                <textarea
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  placeholder="Nota general (alergias, preferencias...)"
                  rows={1}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-orange-400 placeholder:text-gray-400"
                />

                {/* Totales */}
                <div className="space-y-0.5 pb-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-medium">${subtotal.toLocaleString()}</span>
                  </div>
                  {discountApplied && discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento{discountType === '%' ? ` (${discountValue}%)` : ''}</span>
                      <span className="font-medium">-${discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-orange-500">${total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Popover descuento */}
                {showDiscountPopover && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Descuento</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDiscountType('%')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                          discountType === '%' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                        }`}
                      >% Porcentaje</button>
                      <button
                        onClick={() => setDiscountType('$')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                          discountType === '$' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                        }`}
                      >$ Monto</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" max={discountType === '%' ? 100 : undefined}
                        value={discountInput}
                        onChange={e => setDiscountInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-orange-400"
                      />
                      <span className="text-sm font-bold text-gray-500 w-6">{discountType}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleApplyDiscount}
                        className="flex-1 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
                      >Aplicar</button>
                      <button
                        onClick={handleRemoveDiscount}
                        className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                      >Quitar</button>
                    </div>
                  </div>
                )}

                {/* Cambiar mesa */}
                {existingOrderId && canTransfer && (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="w-full py-1.5 bg-white border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Cambiar mesa
                  </button>
                )}

                {/* Boton Descuento */}
                <button
                  onClick={() => setShowDiscountPopover(v => !v)}
                  disabled={!canDiscount || (!existingOrderId && cart.length === 0)}
                  className={`w-full py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                    discountApplied && discountAmount > 0
                      ? 'bg-green-50 border-green-400 text-green-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
                  }`}
                >
                  <Tag size={15} />
                  {discountApplied && discountAmount > 0
                    ? `Descuento${discountType === '%' ? ` ${discountValue}%` : ''} (-$${discountAmount.toLocaleString()})`
                    : 'Descuento'}
                </button>

                {/* Pre-cuenta */}
                <button
                  onClick={handlePrintPreBill}
                  disabled={!existingOrderId || (existingItems.length === 0 && cart.length === 0)}
                  className="w-full py-2 bg-white border-2 border-gray-300 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer size={16} /> Pre-cuenta
                </button>

                {/* Editar venta */}
                {existingOrderId && onEditOrder && canEdit && (
                  <button
                    onClick={onEditOrder}
                    className="w-full py-2 bg-white border-2 border-purple-300 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil size={15} /> Editar venta
                  </button>
                )}

                {/* Cobrar */}
                <button
                  onClick={async () => {
                    let customerId: string | undefined = selectedCustomerId;
                    if (!customerId && saveToCustomers && clientName.trim().length >= 2) {
                      try {
                        const customer = await customersService.findOrCreate({
                          name: clientName.trim(),
                          phone: clientPhone.trim() || undefined,
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
                  className="w-full py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  {existingOrderId ? `Cobrar $${total.toLocaleString()}` : `Pagar Directo $${total.toLocaleString()}`}
                </button>

                {/* Enviar a cocina */}
                <button
                  onClick={async () => {
                    let customerId: string | undefined = selectedCustomerId;
                    if (!customerId && saveToCustomers && clientName.trim().length >= 2) {
                      try {
                        const customer = await customersService.findOrCreate({
                          name: clientName.trim(),
                          phone: clientPhone.trim() || undefined,
                        });
                        customerId = customer.id;
                        toast.success('Vinculado');
                      } catch { /* no bloquear */ }
                    }
                    onSendToKitchen(customerId, clientName.trim() || undefined, clientPhone.trim() || undefined, orderNote.trim() || undefined);
                  }}
                  disabled={cart.length === 0 || isSubmitting || !canSendToKitchen}
                  className="w-full py-2 bg-white border-2 border-orange-500 text-orange-500 rounded-xl font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                  {isSubmitting ? 'Enviando...' : (existingOrderId ? 'Agregar Items a Cocina' : 'Enviar a Cocina')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ModifiersModal */}
      {showModifiersModal && pendingProduct && (
        <ModifiersModal
          isOpen={showModifiersModal}
          productName={pendingProduct.name}
          availableModifiers={pendingProduct.modifiers ?? []}
          selectedModifiers={[]}
          basePrice={pendingProduct.price}
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

    </>
  );
};

export default OrderModal;
