// ═══════════════════════════════════════════════════════════════
// RestaurantContext — Estado y handlers del POS Restaurant
// Extraído de Restaurant.tsx (1871 → ~150 líneas)
// ═══════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import hotToast from 'react-hot-toast';
import io, { type Socket } from 'socket.io-client';
import { AlertCircle, X } from 'lucide-react';
import type {
  Table,
  Product,
  ProductCategory,
  Sale,
  SaleItem,
  CartItem,
  RestaurantStats,
  Payment,
  CreateDineInSaleDTO,
  CreateCounterSaleDTO,
  CreateDeliverySaleDTO,
} from '../types/restaurant.types';
import { restaurantService } from '../services/restaurantService';
import { posService } from '../services/posService';
import { useToast } from '../components/Toast';
import { getActiveCashRegister } from '../utils/enterpriseHelpers';
import {
  cashRegistersService,
  type ActiveSessionResponse,
} from '../services/cashRegistersService';
import { useConfirm } from '../hooks/useConfirm';
import type { ConfirmDialogProps } from '../components/ui/ConfirmDialog';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

// ─── Tipos exportados ──────────────────────────────────────────
export type TabType = 'mesas' | 'mostrador' | 'delivery';

export interface BillRequest {
  orderId:    string;
  tableId:    string;
  tableName:  string;
  waiterName: string;
  total:      number;
  notes:      string;
  timestamp:  string;
}

// ─── Shape del contexto ────────────────────────────────────────
interface RestaurantContextValue {
  // Navegación / UI
  activeTab:           TabType;
  setActiveTab:        (t: TabType) => void;
  loading:             boolean;
  submittingKitchen:   boolean;
  searchQuery:         string;
  setSearchQuery:      (v: string) => void;
  selectedSection:     string;
  setSelectedSection:  (v: string) => void;
  selectedCategory:    string;
  setSelectedCategory: (v: string) => void;
  filterCapacity:      number | null;
  setFilterCapacity:   (v: number | null) => void;
  showFilterMenu:      boolean;
  setShowFilterMenu:   (v: boolean | ((p: boolean) => boolean)) => void;

  // Datos
  tables:          Table[];
  products:        Product[];
  categories:      ProductCategory[];
  mostradorOrders: Sale[];
  deliveryOrders:  Sale[];
  dineInOrders:    Sale[];
  stats:           RestaurantStats | null;
  sections:        Array<{ id: string; name: string }>;
  filteredTables:  Table[];

  // Flujo DINE_IN
  selectedTable:              Table | null;
  setSelectedTable:           (t: Table | null) => void;
  cart:                       CartItem[];
  setCart:                    (c: CartItem[]) => void;
  showCart:                   boolean;
  setShowCart:                (v: boolean) => void;
  existingItems:              SaleItem[];
  setExistingItems:           (i: SaleItem[]) => void;
  activeOrderId:              string | null;
  numberOfPeople:             number;
  setNumberOfPeople:          (n: number) => void;
  pendingOrderCustomerId:     string | undefined;
  setPendingOrderCustomerId:  (v: string | undefined) => void;
  pendingOrderCustomerName:   string | undefined;
  setPendingOrderCustomerName:(v: string | undefined) => void;
  pendingDiscount:            { type: 'PERCENTAGE' | 'FIXED'; value: number } | undefined;
  setPendingDiscount:         (v: { type: 'PERCENTAGE' | 'FIXED'; value: number } | undefined) => void;

  // Modales
  showPaymentModal:     boolean;
  setShowPaymentModal:  (v: boolean) => void;
  showMostradorModal:   boolean;
  setShowMostradorModal:(v: boolean) => void;
  showDeliveryModal:    boolean;
  setShowDeliveryModal: (v: boolean) => void;
  showCloseModal:       boolean;
  setShowCloseModal:    (v: boolean) => void;
  orderForEdit:         Sale | null;
  setOrderForEdit:      (o: Sale | null) => void;
  orderForPayment:      Sale | null;
  setOrderForPayment:   (o: Sale | null) => void;
  lastPaidOrderId:      string | null;
  setLastPaidOrderId:   (id: string | null) => void;

  // Caja / Turno
  cashSession:       ActiveSessionResponse | null;
  cashLoading:       boolean;
  reloadCashSession: () => void;

  // DTE
  dteIsConfigured: boolean;

  // Solicitudes cuenta
  billRequests:     BillRequest[];
  showBillPanel:    boolean;
  setShowBillPanel: (v: boolean | ((p: boolean) => boolean)) => void;
  newBillAlert:     boolean;
  setNewBillAlert:  (v: boolean) => void;

  // ConfirmDialog — renderizar en Restaurant.tsx
  confirmDialogProps: ConfirmDialogProps;

  // Funciones
  hasTabPerm:                 (tab: TabType) => boolean;
  loadInitialData:            () => Promise<void>;
  loadOrders:                 () => Promise<void>;
  refreshAfterPayment:        () => Promise<void>;
  handleRefresh:              () => Promise<void>;
  handleTabChange:            (tab: TabType) => Promise<void>;
  handleSelectTable:          (table: Table) => Promise<void>;
  handleAddToCart:            (product: Product) => void;
  handleUpdateQuantity:       (itemId: string, quantity: number) => void;
  handleRemoveItem:           (itemId: string) => void;
  handleAddNote:              (itemId: string, note: string) => void;
  handleUpdateModifiers:      (itemId: string, modifiers: any[], unitPrice: number) => void;
  handleCheckout:             (customerId?: string, customerName?: string, discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }) => void;
  handleConfirmPayment:       (payments: Payment[], tip: number, discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }) => Promise<void>;
  handlePayOrderFromCard:     (order: Sale) => void;
  handleConfirmOrderPayment:  (payments: Payment[], tip: number, discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }) => Promise<void>;
  handleSendToKitchen:        (customerId?: string, customerName?: string, customerPhone?: string, orderNote?: string) => Promise<void>;
  handleCreateMostradorOrder: (cart: CartItem[], customerName: string, deliveryPhone: string, pickupTime?: string, paymentMethod?: string, customerId?: string) => Promise<void>;
  handleCreateDeliveryOrder:  (cart: CartItem[], customerName: string, customerPhone: string, customerAddress: string, deliveryCity: string, deliveryNotes: string, deliveryCost: number, paymentMethod?: string, customerId?: string) => Promise<void>;
  handleCloseCart:            () => void;
  handleRemoveExistingItem:   (itemId: string) => Promise<void>;
  handleUpdateMostradorStatus:(order: Sale, newStatus: string) => Promise<void>;
  handleCancelOrder:          (order: Sale) => Promise<void>;
  handleOrderEdited:          () => Promise<void>;
  handleUpdateDeliveryStatus: (order: Sale, newStatus: string) => Promise<void>;
  dismissBillRequest:         (orderId: string) => void;
  dismissAllBillRequests:     () => void;
  resetOrderState:            () => void;
}

// ─── Contexto ─────────────────────────────────────────────────
const RestaurantCtx = createContext<RestaurantContextValue>(null!);

// ─── Provider ─────────────────────────────────────────────────
export function RestaurantProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { confirm, dialogProps: confirmDialogProps } = useConfirm();
  const location = useLocation();
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore(s => s.user);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const hasTabPerm = (tab: TabType): boolean => {
    const perms = (user?.role?.permissions ?? []) as string[];
    return perms.includes('ALL_PERMISSIONS') || user?.role?.name === 'Administrador' || perms.includes(`pos.${tab}`);
  };

  // ── Navegación / UI ────────────────────────────────────────
  const getInitialTab = (): TabType => {
    const perms = (user?.role?.permissions ?? []) as string[];
    const hasPerm = (p: string) =>
      perms.includes('ALL_PERMISSIONS') || user?.role?.name === 'Administrador' || perms.includes(p);
    const openTab = (location.state as any)?.openTab as TabType | undefined;
    if (openTab === 'delivery'  && hasPerm('pos.delivery'))  return 'delivery';
    if (openTab === 'mostrador' && hasPerm('pos.mostrador')) return 'mostrador';
    if (openTab === 'mesas'     && hasPerm('pos.mesas'))     return 'mesas';
    if (hasPerm('pos.mesas'))     return 'mesas';
    if (hasPerm('pos.mostrador')) return 'mostrador';
    if (hasPerm('pos.delivery'))  return 'delivery';
    return 'mesas'; // fallback (handleTabChange mostrará toast si no hay permiso)
  };
  const [activeTab, setActiveTab] = useState<TabType>('mesas');
  const [tabInitialized, setTabInitialized] = useState(false);

  useEffect(() => {
    if (!user || tabInitialized) return;   // esperar que user cargue, solo una vez
    setActiveTab(getInitialTab());
    setTabInitialized(true);
  }, [user]);                              // se ejecuta cuando user esté disponible

  const [loading,            setLoading]            = useState(false);
  const [submittingKitchen,  setSubmittingKitchen]  = useState(false);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedCategory,   setSelectedCategory]   = useState<string>('');
  const [selectedSection,    setSelectedSection]    = useState<string>('');
  const [filterCapacity,     setFilterCapacity]     = useState<number | null>(null);
  const [showFilterMenu,     setShowFilterMenu]     = useState(false);

  // ── Datos ──────────────────────────────────────────────────
  const [tables,          setTables]          = useState<Table[]>([]);
  const [products,        setProducts]        = useState<Product[]>([]);
  const [categories,      setCategories]      = useState<ProductCategory[]>([]);
  const [mostradorOrders, setMostradorOrders] = useState<Sale[]>([]);
  const [deliveryOrders,  setDeliveryOrders]  = useState<Sale[]>([]);
  const [dineInOrders,    setDineInOrders]    = useState<Sale[]>([]);
  const [stats,           setStats]           = useState<RestaurantStats | null>(null);

  // ── Flujo DINE_IN ──────────────────────────────────────────
  const [selectedTable,              setSelectedTable]              = useState<Table | null>(null);
  const [numberOfPeople,             setNumberOfPeople]             = useState<number>(1);
  const [cart,                       setCart]                       = useState<CartItem[]>([]);
  const [showCart,                   setShowCart]                   = useState(false);
  const [showPaymentModal,           setShowPaymentModal]           = useState(false);
  const [existingItems,              setExistingItems]              = useState<SaleItem[]>([]);
  const [activeOrderId,              setActiveOrderId]              = useState<string | null>(null);
  const [pendingOrderCustomerId,     setPendingOrderCustomerId]     = useState<string | undefined>(undefined);
  const [pendingOrderCustomerName,   setPendingOrderCustomerName]   = useState<string | undefined>(undefined);
  const [pendingDiscount,            setPendingDiscount]            = useState<{ type: 'PERCENTAGE' | 'FIXED'; value: number } | undefined>(undefined);
  const [orderForPayment,            setOrderForPayment]            = useState<Sale | null>(null);

  // ── Modales ────────────────────────────────────────────────
  const [showMostradorModal, setShowMostradorModal] = useState(false);
  const [showDeliveryModal,  setShowDeliveryModal]  = useState(false);
  const [showCloseModal,     setShowCloseModal]     = useState(false);
  const [orderForEdit,       setOrderForEdit]       = useState<Sale | null>(null);
  const [lastPaidOrderId,    setLastPaidOrderId]    = useState<string | null>(null);
  const [dteIsConfigured,  setDteIsConfigured]  = useState(false);

  // ── Caja ───────────────────────────────────────────────────
  const [cashSession, setCashSession] = useState<ActiveSessionResponse | null>(null);
  const [cashLoading, setCashLoading] = useState(true);

  // ── Solicitudes cuenta ─────────────────────────────────────
  const [billRequests,  setBillRequests]  = useState<BillRequest[]>([]);
  const [showBillPanel, setShowBillPanel] = useState(false);
  const [newBillAlert,  setNewBillAlert]  = useState(false);

  // ── Derivados ─────────────────────────────────────────────
  const sections = useMemo(() => {
    const sectionsMap = new Map<string, any>();
    tables.forEach(t => {
      const sec = (t as any).sections ?? (t as any).section;
      if (sec?.id) sectionsMap.set(sec.id, sec);
    });
    return Array.from(sectionsMap.values());
  }, [tables]);

  const filteredTables = useMemo(() =>
    tables
      .filter(t => {
        const matchesSection  = !selectedSection || t.sectionId === selectedSection;
        const matchesSearch   = !searchQuery ||
          t.number.toString().toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCapacity = filterCapacity === null || (t.capacity ?? 0) >= filterCapacity;
        return matchesSection && matchesSearch && matchesCapacity;
      })
      .sort((a, b) => {
        const numA = parseInt(a.number.toString()) || 0;
        const numB = parseInt(b.number.toString()) || 0;
        return numA - numB;
      })
  , [tables, selectedSection, searchQuery, filterCapacity]);

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES DE CARGA
  // ═══════════════════════════════════════════════════════════

  const loadOrders = async () => {
    try {
      const allOrders = await restaurantService.getOrders();
      const activeStatuses = ['PENDING', 'PREPARING', 'READY', 'IN_PROGRESS'];

      const mostradorData = allOrders.filter((o: Sale) =>
        (o.type === 'TAKEAWAY' || ((o as any).source === 'QR_CARTA' && o.type !== 'DELIVERY')) &&
        activeStatuses.includes(o.status)
      );
      const deliveryData = allOrders.filter((o: Sale) =>
        o.type === 'DELIVERY' && activeStatuses.includes(o.status)
      );
      const dineInData = allOrders.filter((o: Sale) =>
        o.type === 'DINE_IN' && !(o as any).source && activeStatuses.includes(o.status)
      );

      setMostradorOrders(mostradorData);
      setDeliveryOrders(deliveryData);
      setDineInOrders(dineInData);

      // Bug #5: actualizar stats después de cada carga de órdenes
      const freshStats = await restaurantService.getStats();
      if (freshStats) setStats(freshStats);
    } catch {
      // silencioso
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tablesData, productsData, categoriesData, statsData] = await Promise.all([
        restaurantService.getTables(),
        restaurantService.getProducts(),
        restaurantService.getCategories(),
        restaurantService.getStats(),
      ]);

      const tArr = Array.isArray(tablesData) ? tablesData : [];
      setTables(tArr);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setStats(statsData);

      // Auto-seleccionar Salón la primera vez que se cargan las mesas
      const secMap = new Map<string, any>();
      tArr.forEach((t: any) => {
        const sec = t.sections ?? t.section;
        if (sec?.id) secMap.set(sec.id, sec);
      });
      const defaultSec =
        Array.from(secMap.values()).find((s: any) => s.name === 'Salón') ??
        Array.from(secMap.values())[0];
      if (defaultSec) setSelectedSection(prev => prev || defaultSec.id);

      // Siempre cargar órdenes
      await loadOrders();
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  const refreshAfterPayment = async () => {
    try {
      restaurantService.invalidateTablesCache();
      const [tablesData] = await Promise.all([
        restaurantService.getTables(true),
      ]);
      if (Array.isArray(tablesData) && tablesData.length > 0) setTables(tablesData);
      await loadOrders();
    } catch {
      // silencioso — no interrumpir flujo de pago
    }
  };

  const reloadCashSession = () => {
    cashRegistersService.getActive().then(data => setCashSession(data));
  };

  // ═══════════════════════════════════════════════════════════
  // EFECTOS DE MONTAJE
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if ((location.state as any)?.openTab) {
      window.history.replaceState({}, '', '/restaurant');
    }
    loadInitialData();
    const perms = (user?.role?.permissions ?? []) as string[];
    const hasBillingPerm =
      perms.includes('ALL_PERMISSIONS') || perms.some(p => p.startsWith('billing.'));
    if (hasBillingPerm) {
      api.get('/dte/engine/config')
        .then(({ data }) => setDteIsConfigured(!!(data as any)?.active))
        .catch((err: any) => {
          if (err?.status === 403 || err?.status === 404) {
            setDteIsConfigured(false);
          }
        });
    } else {
      setDteIsConfigured(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const openTab = (location.state as any)?.openTab as TabType | undefined;
    if (openTab === 'mostrador' && hasTabPerm('mostrador')) setActiveTab('mostrador');
    else if (openTab === 'delivery' && hasTabPerm('delivery')) setActiveTab('delivery');
  }, [location.state]);

  useEffect(() => {
    cashRegistersService.getActive()
      .then(data => setCashSession(data))
      .catch(() => setCashSession({ isOpen: false, register: null, session: null }))
      .finally(() => setCashLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════
  // SOCKET.IO
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const SOCKET_URL =
      (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api', '')
      ?? 'http://localhost:4200';

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path:       '/socket.io',
    });

    socketRef.current.on('connect', () => {
      const tid = userRef.current?.tenantId;
      if (tid) {
        socketRef.current?.emit('joinTenantRoom', { tenantId: tid, room: 'pos' });
        socketRef.current?.emit('joinTenantRoom', { tenantId: tid, room: 'mesero' });
      }
      restaurantService.invalidateCache();
      loadOrders();
    });

    socketRef.current.on('disconnect', (reason: string) => {
      console.warn('[POS] Socket desconectado:', reason);
    });

    socketRef.current.on('bill.requested', (data: BillRequest) => {
      setBillRequests(prev => {
        if (prev.some(r => r.orderId === data.orderId)) return prev;
        return [data, ...prev];
      });
      setNewBillAlert(true);
      setTimeout(() => setNewBillAlert(false), 3000);

      try {
        const ctx2 = new AudioContext();
        const o1   = ctx2.createOscillator();
        const g1   = ctx2.createGain();
        o1.connect(g1); g1.connect(ctx2.destination);
        o1.frequency.value = 880;
        g1.gain.setValueAtTime(0.3, ctx2.currentTime);
        g1.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.3);
        o1.start(ctx2.currentTime); o1.stop(ctx2.currentTime + 0.3);
        const o2 = ctx2.createOscillator();
        const g2 = ctx2.createGain();
        o2.connect(g2); g2.connect(ctx2.destination);
        o2.frequency.value = 1100;
        g2.gain.setValueAtTime(0.2, ctx2.currentTime + 0.15);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.45);
        o2.start(ctx2.currentTime + 0.15); o2.stop(ctx2.currentTime + 0.45);
      } catch { /* AudioContext bloqueado */ }

      hotToast(`🧾 ${data.tableName} pide la cuenta`, {
        duration: 5000,
        position: 'top-right',
        style: { background: '#1f2937', color: '#f9fafb', fontWeight: '600' },
      });
    });

    socketRef.current.on('order.new', () => {
      restaurantService.invalidateCache();
      loadOrders();
    });

    socketRef.current.on('qr_order_confirmed', () => {
      restaurantService.invalidateCache();
      loadOrders();
    });

    socketRef.current.on('order.updated', () => {
      restaurantService.invalidateCache();
      loadOrders();
      restaurantService.getTables(true).then(t => {
        if (t.length > 0) setTables(t);
      });
    });

    return () => {
      socketRef.current?.emit('leaveStation', 'pos');
      socketRef.current?.emit('leaveStation', 'mesero');
      socketRef.current?.off('connect');
      socketRef.current?.off('disconnect');
      socketRef.current?.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const resetOrderState = () => {
    setCart([]);
    setExistingItems([]);
    setActiveOrderId(null);
    setSelectedTable(null);
    setShowCart(false);
    setNumberOfPeople(1);
    setPendingOrderCustomerId(undefined);
    setPendingOrderCustomerName(undefined);
    setPendingDiscount(undefined);
  };

  const handleRefresh = async () => {
    await loadInitialData();
  };

  const handleTabChange = async (tab: TabType) => {
    if (!hasTabPerm(tab)) {
      const names: Record<TabType, string> = { mesas: 'Mesas', mostrador: 'Mostrador', delivery: 'Delivery' };
      toast.error(`Sin permiso para acceder a ${names[tab]}`);
      return;
    }
    setActiveTab(tab);
    if (tab === 'mostrador' || tab === 'delivery') {
      await loadOrders();
    }
  };

  const dismissBillRequest = (orderId: string) => {
    setBillRequests(prev => {
      const next = prev.filter(r => r.orderId !== orderId);
      if (next.length === 0) setShowBillPanel(false);
      return next;
    });
    socketRef.current?.emit('bill.dismissed', { orderId });
  };

  const dismissAllBillRequests = () => {
    setBillRequests([]);
    setShowBillPanel(false);
  };

  const handleSelectTable = async (table: Table) => {
    if (table.status === 'OCCUPIED') {
      let existingOrder = dineInOrders.find(o => o.tableId === table.id);

      if (!existingOrder) {
        toast.info(`Cargando orden de Mesa ${table.number}...`);
        existingOrder = await restaurantService.getActiveOrderByTable(table.id);
        if (existingOrder) {
          setDineInOrders(prev => {
            const exists = prev.find(x => x.id === existingOrder!.id);
            return exists ? prev : [...prev, existingOrder!];
          });
        }
      }

      if (existingOrder) {
        setActiveOrderId(existingOrder.id);
        setExistingItems(existingOrder.items || []);
        setCart([]);
        setSelectedTable(table);
        setShowCart(true);
      } else {
        const ok = await confirm({
          title: `Mesa ${table.number} sin orden activa`,
          message: `La mesa ${table.number} figura como ocupada pero no tiene una orden activa.\n¿Deseas liberar la mesa o seguir usándola?`,
          confirmLabel: 'Sí, liberar mesa',
          cancelLabel: 'Seguir usando mesa',
          variant: 'warning',
        });
        if (!ok) {
          setActiveOrderId(null);
          setExistingItems([]);
          setCart([]);
          setSelectedTable(table);
          setShowCart(true);
          return;
        }
        const freed = await restaurantService.freeOrphanTable(table.id);
        if (freed) {
          const freshTables = await restaurantService.getTables(true);
          setTables(freshTables);
          toast.info(`Mesa ${table.number} liberada. Puedes iniciar una nueva orden.`);
          setActiveOrderId(null);
          setSelectedTable({ ...table, status: 'AVAILABLE' });
          setCart([]);
          setShowCart(true);
        } else {
          toast.warning(`Mesa ${table.number}: no se encontró una orden activa`);
        }
      }
      return;
    }

    setActiveOrderId(null);
    setSelectedTable(table);
    setCart([]);
    setShowCart(true);
  };

  const handleAddToCart = (product: Product) => {
    const selectedMods: any[] = (product as any).modifiers ?? [];
    const hasModifiers = selectedMods.length > 0;
    const modifiersPrice = selectedMods.reduce((s: number, m: any) => s + (Number(m.price) || 0), 0);
    const notes: string | undefined = (product as any).notes || undefined;
    const effectiveUnitPrice = product.price + modifiersPrice;

    if (!hasModifiers) {
      const existingItem = cart.find(item => item.productId === product.id && !(item.modifiers?.length));
      if (existingItem) {
        setCart(cart.map(item =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
                total:    (item.quantity + 1) * item.unitPrice,
              }
            : item
        ));
        if (!showCart) setShowCart(true);
        return;
      }
    }

    const newItem: CartItem = {
      id:          `cart-${Date.now()}-${Math.random()}`,
      productId:   product.id,
      productName: product.name,
      quantity:    1,
      unitPrice:   effectiveUnitPrice,
      subtotal:    effectiveUnitPrice,
      total:       effectiveUnitPrice,
      ...(hasModifiers && { modifiers: selectedMods, modifiersPrice }),
      ...(notes          && { notes }),
    };
    setCart([...cart, newItem]);
    if (!showCart) setShowCart(true);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity, subtotal: quantity * item.unitPrice, total: quantity * item.unitPrice }
        : item
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleAddNote = (itemId: string, note: string) => {
    setCart(cart.map(item => item.id === itemId ? { ...item, notes: note } : item));
  };

  const handleUpdateModifiers = (itemId: string, modifiers: any[], unitPrice: number) => {
    setCart(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            modifiers,
            modifiersPrice: unitPrice - (products.find(p => p.id === item.productId)?.price ?? unitPrice),
            unitPrice,
            subtotal: unitPrice * item.quantity,
            total:    unitPrice * item.quantity,
          }
        : item
    ));
  };

  const handleCheckout = (customerId?: string, customerName?: string, discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }) => {
    if (customerId)    setPendingOrderCustomerId(customerId);
    if (customerName)  setPendingOrderCustomerName(customerName);
    setPendingDiscount(discount);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (
    payments: Payment[],
    tip: number,
    discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number },
  ) => {
    try {
      let orderId = activeOrderId;

      if (!orderId) {
        if (!selectedTable) throw new Error('No hay mesa seleccionada');
        if (cart.length === 0)  throw new Error('El carrito está vacío');

        const cashRegister = await getActiveCashRegister();
        // El arqueo es opcional — nunca bloquear el cobro

        const saleData: CreateDineInSaleDTO = {
          type:            'dine_in',
          tableId:         selectedTable.id,
          cashRegisterId:  cashRegister.id,
          numberOfPeople,
          customerId:      pendingOrderCustomerId || undefined,
          items:           cart.map(item => ({
            productId:      item.productId,
            quantity:       item.quantity,
            unitPrice:      item.unitPrice,
            modifiers:      item.modifiers || [],
            modifiersPrice: item.modifiersPrice || 0,
            notes:          item.notes || '',
          })),
          notes: `Mesa ${selectedTable.number} - ${numberOfPeople} personas`,
        };
        const sale = await restaurantService.createSale(saleData);
        orderId = sale.id;
        setPendingOrderCustomerId(undefined);
      }

      if (discount && discount.value > 0) {
        await restaurantService.applyDiscount(orderId, discount);
      }

      let tipAsignado = false;
      for (const payment of payments) {
        await restaurantService.addPayment(orderId, payment, !tipAsignado ? tip : 0);
        tipAsignado = true;
      }

      await restaurantService.closeSale(orderId);

      resetOrderState();
      setShowPaymentModal(false);
      await refreshAfterPayment();

      toast.success('¡Pago procesado exitosamente!');
      setLastPaidOrderId(orderId);
    } catch (error: any) {
      throw error;
    }
  };

  const handlePayOrderFromCard = (order: Sale) => {
    setOrderForPayment(order);
    setShowPaymentModal(true);
  };

  const handleConfirmOrderPayment = async (
    payments: Payment[],
    _tip: number,
    discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number },
  ) => {
    if (!orderForPayment) return;
    try {
      if (discount && discount.value > 0) {
        await restaurantService.applyDiscount(orderForPayment.id, discount);
      }

      let tipAsignado2 = false;
      for (const payment of payments) {
        await restaurantService.addPayment(orderForPayment.id, payment, !tipAsignado2 ? _tip : 0);
        tipAsignado2 = true;
      }

      await restaurantService.closeSale(orderForPayment.id);

      setShowPaymentModal(false);
      setOrderForPayment(null);
      resetOrderState();
      await loadOrders();

      toast.success('¡Pago registrado exitosamente!');
      setLastPaidOrderId(orderForPayment.id);
    } catch (error: any) {
      throw error;
    }
  };

  const handleSendToKitchen = async (
    customerId?: string,
    customerName?: string,
    customerPhone?: string,
    orderNote?: string,
  ) => {
    if (!selectedTable)      return;
    if (submittingKitchen)   return;
    if (cart.length === 0) {
      toast.warning('Agrega productos al carrito primero');
      return;
    }
    setSubmittingKitchen(true);
    try {
      const cashRegister = await getActiveCashRegister();

      if (activeOrderId) {
        await restaurantService.addItemsToSale(activeOrderId, cart.map(item => ({
          productId:      item.productId,
          quantity:       item.quantity,
          unitPrice:      item.unitPrice,
          modifiers:      item.modifiers || [],
          modifiersPrice: item.modifiersPrice || 0,
          notes:          item.notes || '',
        })));
      } else {
        const saleData: CreateDineInSaleDTO = {
          type:            'dine_in',
          tableId:         selectedTable.id,
          cashRegisterId:  cashRegister.id,
          numberOfPeople,
          customerId:      customerId || undefined,
          customerName:    !customerId && customerName  ? customerName  : undefined,
          customerPhone:   !customerId && customerPhone ? customerPhone : undefined,
          items:           cart.map(item => ({
            productId:      item.productId,
            quantity:       item.quantity,
            unitPrice:      item.unitPrice,
            modifiers:      item.modifiers || [],
            modifiersPrice: item.modifiersPrice || 0,
            notes:          item.notes || '',
          })),
          notes: orderNote || `Mesa ${selectedTable.number} - ${numberOfPeople} personas`,
        };
        const sale = await restaurantService.createSale(saleData);
        setActiveOrderId(sale.id);
      }

      setExistingItems(prev => [...prev, ...cart]);
      setCart([]);

      setTables(prev => prev.map(t =>
        t.id === selectedTable.id ? { ...t, status: 'OCCUPIED' as any } : t
      ));

      setShowCart(false);
      setSelectedTable(null);
      await refreshAfterPayment();

      toast.success(`Orden de Mesa ${selectedTable.number} enviada a cocina`);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar orden a cocina');
    } finally {
      setSubmittingKitchen(false);
    }
  };

  const handleCreateMostradorOrder = async (
    cartItems:      CartItem[],
    customerName:   string,
    _deliveryPhone: string,
    pickupTime?:    string,
    _paymentMethod?:string,
    customerId?:    string,
  ) => {
    try {
      const cashRegister = await getActiveCashRegister();
      if (!cashRegister.isOpen) {
        console.warn(`[Mostrador] Caja ${cashRegister.name} sin sesión abierta`);
      }

      const saleData: CreateCounterSaleDTO = {
        type:           'counter',
        cashRegisterId: cashRegister.id,
        customerName:   customerName || 'Cliente Mostrador',
        customerId:     customerId || undefined,
        items:          cartItems.map(item => ({
          productId:      item.productId,
          quantity:       item.quantity,
          unitPrice:      item.unitPrice,
          modifiers:      item.modifiers || [],
          modifiersPrice: item.modifiersPrice || 0,
          notes:          item.notes || '',
        })),
        notes: pickupTime ? `Retiro: ${pickupTime}` : '',
      };

      await restaurantService.createSale(saleData);
      setShowMostradorModal(false);
      await loadOrders();
      toast.success('Orden para llevar creada exitosamente');
    } catch (error) {
      throw error;
    }
  };

  const handleCreateDeliveryOrder = async (
    cartItems:       CartItem[],
    customerName:    string,
    customerPhone:   string,
    customerAddress: string,
    deliveryCity:    string,
    deliveryNotes:   string,
    deliveryCost:    number,
    _paymentMethod?: string,
    customerId?:     string,
  ) => {
    try {
      if (!customerName || !customerPhone || !customerAddress) {
        throw new Error('Datos del cliente incompletos');
      }

      const cashRegister = await getActiveCashRegister();
      if (!cashRegister.isOpen) {
        console.warn(`[Delivery] Caja ${cashRegister.name} sin sesión abierta`);
      }

      const saleData: CreateDeliverySaleDTO = {
        type:            'delivery',
        cashRegisterId:  cashRegister.id,
        customerName,
        customerPhone,
        customerAddress: [customerAddress, deliveryCity].filter(s => s?.trim()).join(', '),
        customerId:      customerId || undefined,
        deliveryFee:     deliveryCost,
        items:           cartItems.map(item => ({
          productId:      item.productId,
          quantity:       item.quantity,
          unitPrice:      item.unitPrice,
          modifiers:      item.modifiers || [],
          modifiersPrice: item.modifiersPrice || 0,
          notes:          item.notes || '',
        })),
        notes: deliveryNotes || undefined,
      };

      await restaurantService.createSale(saleData);
      setShowDeliveryModal(false);
      await loadOrders();
      toast.success('Orden delivery creada exitosamente');
    } catch (error) {
      throw error;
    }
  };

  const handleCloseCart = () => {
    setShowCart(false);
    setSelectedTable(null);
    setActiveOrderId(null);
    setCart([]);
    setExistingItems([]);
  };

  const handleRemoveExistingItem = async (itemId: string) => {
    if (!activeOrderId) return;
    try {
      await restaurantService.removeItemFromOrder(activeOrderId, itemId);
      setExistingItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err: any) {
      hotToast.error(err.response?.data?.error ?? 'No se puede eliminar el ítem');
    }
  };

  const handleUpdateMostradorStatus = async (order: Sale, newStatus: string) => {
    try {
      await restaurantService.updateSaleStatus(order.id, newStatus);
      setMostradorOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: newStatus } : o
      ));
      toast.success(newStatus === 'PREPARING' ? 'En preparación 🍳' : 'Listo para entregar ✅');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar estado');
    }
  };

  const handleCancelOrder = async (order: Sale) => {
    const ok = await confirm({
      title:        'Cancelar orden',
      message:      `¿Estás seguro de cancelar la orden #${order.orderNumber || order.id.slice(-6).toUpperCase()}?\nEsta acción no se puede deshacer.`,
      confirmLabel: 'Sí, cancelar orden',
      cancelLabel:  'Volver',
      variant:      'danger',
    });
    if (!ok) return;
    try {
      await restaurantService.cancelOrder(order.id);
      await loadOrders();
      toast.success('Orden cancelada');
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar');
    }
  };

  const handleOrderEdited = async () => {
    await loadOrders();
    toast.success('Venta actualizada correctamente');
  };

  const handleUpdateDeliveryStatus = async (order: Sale, newStatus: string) => {
    try {
      await restaurantService.updateSaleStatus(order.id, newStatus);
      setDeliveryOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: newStatus } : o
      ));
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // PROVIDER
  // ═══════════════════════════════════════════════════════════

  return (
    <RestaurantCtx.Provider value={{
      activeTab,          setActiveTab,
      loading,
      submittingKitchen,
      searchQuery,        setSearchQuery,
      selectedSection,    setSelectedSection,
      selectedCategory,   setSelectedCategory,
      filterCapacity,     setFilterCapacity,
      showFilterMenu,     setShowFilterMenu,
      tables, products, categories,
      mostradorOrders, deliveryOrders, dineInOrders,
      stats, sections, filteredTables,
      selectedTable,      setSelectedTable,
      cart,               setCart,
      showCart,           setShowCart,
      existingItems,      setExistingItems,
      activeOrderId,
      numberOfPeople,     setNumberOfPeople,
      pendingOrderCustomerId,    setPendingOrderCustomerId,
      pendingOrderCustomerName,  setPendingOrderCustomerName,
      pendingDiscount,           setPendingDiscount,
      showPaymentModal,   setShowPaymentModal,
      showMostradorModal, setShowMostradorModal,
      showDeliveryModal,  setShowDeliveryModal,
      showCloseModal,     setShowCloseModal,
      orderForEdit,       setOrderForEdit,
      orderForPayment,    setOrderForPayment,
      lastPaidOrderId,    setLastPaidOrderId,
      cashSession, cashLoading, reloadCashSession,
      dteIsConfigured,
      billRequests,
      showBillPanel,      setShowBillPanel,
      newBillAlert,       setNewBillAlert,
      confirmDialogProps,
      hasTabPerm,
      loadInitialData,
      loadOrders,
      refreshAfterPayment,
      handleRefresh,
      handleTabChange,
      handleSelectTable,
      handleAddToCart,
      handleUpdateQuantity,
      handleRemoveItem,
      handleAddNote,
      handleUpdateModifiers,
      handleCheckout,
      handleConfirmPayment,
      handlePayOrderFromCard,
      handleConfirmOrderPayment,
      handleSendToKitchen,
      handleCreateMostradorOrder,
      handleCreateDeliveryOrder,
      handleCloseCart,
      handleRemoveExistingItem,
      handleUpdateMostradorStatus,
      handleCancelOrder,
      handleOrderEdited,
      handleUpdateDeliveryStatus,
      dismissBillRequest,
      dismissAllBillRequests,
      resetOrderState,
    }}>
      {children}
    </RestaurantCtx.Provider>
  );
}

// ─── Hook público ──────────────────────────────────────────────
export const useRestaurant = () => useContext(RestaurantCtx);
