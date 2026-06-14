// ═══════════════════════════════════════════════════════════════
// RESTAURANT SERVICE - ENTERPRISE LEVEL (UNIFIED WITH SALES)
// Arquitectura basada en salesService exitoso (sin loops)
// API: /sales (enterprise endpoints)
// ═══════════════════════════════════════════════════════════════

import api from './api';
import { withRetry } from '../utils/withRetry';
import type { 
  Table, 
  Product, 
  ProductCategory, 
  Sale,
  CreateDineInSaleDTO,
  CreateCounterSaleDTO,
  CreateDeliverySaleDTO,
  AddSaleItemDTO,
  Payment,
  RestaurantStats 
} from '../types/restaurant.types';

// ═══════════════════════════════════════════════════════════════
// MAPPER: API response → frontend Sale model
//
// El backend devuelve:
//   order.order_items[].products.name  → item.productName
//   order.order_items[].subtotal       → item.total
//   order.deliveryAddress              → sale.customerAddress
//   order.customerPhone                → sale.customerPhone
//   order.tables.status                → (para saber si mesa está OCCUPIED)
// ═══════════════════════════════════════════════════════════════
function mapOrder(raw: any): Sale {
  const items = (raw.order_items || raw.items || []).map((i: any) => ({
    id: i.id,
    productId: i.productId,
    productName: i.products?.name || i.productName || i.name || 'Producto',
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice) || 0,
    total: Number(i.subtotal ?? i.total ?? 0),
    subtotal: Number(i.subtotal ?? i.total ?? 0),
    modifiers: i.modifiers || [],
    modifiersPrice: Number(i.modifiersPrice || 0),
    notes: i.notes || undefined,
  }));

  return {
    id: raw.id,
    saleNumber: raw.orderNumber || raw.saleNumber || raw.id,
    orderNumber: raw.orderNumber,
    startTime: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    closeTime: raw.completedAt ? new Date(raw.completedAt) : undefined,
    status: raw.status,
    type: raw.type,
    tableId: raw.tableId || raw.tables?.id,
    tableNumber: raw.tables?.number,
    waiterName: raw.users_orders_waiterIdTousers?.name || raw.waiterName || '',
    waiterId: raw.waiterId,
    customerName: raw.customerName || undefined,
    customerId: raw.customerId || undefined,
    customerAddress: raw.deliveryAddress || raw.customerAddress || undefined,
    customerPhone: raw.customerPhone || undefined,
    deliveryFee: Number(raw.deliveryFee) || 0,
    items,
    payments: raw.payments || [],
    tips: raw.tips || [],
    subtotal: Number(raw.subtotal) || 0,
    discount: Number(raw.discount) || 0,
    tax: Number(raw.tax) || 0,
    total: Number(raw.total) || 0,
    numberOfPeople: raw.numberOfPeople || 1,
    notes: raw.notes || undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

// Cache local + timestamp para evitar llamadas excesivas
let _ordersCache: Sale[] = [];
let _ordersCacheTs = 0;
let _tablesCache: Table[] = [];
let _tablesCacheTs = 0;
const CACHE_TTL = 8000; // 8s

class RestaurantService {

  // ═══════════════════════════════════════════════════════════
  // MESAS
  // ═══════════════════════════════════════════════════════════

  async getTables(forceRefresh = false): Promise<Table[]> {
    const now = Date.now();
    if (!forceRefresh && _tablesCache.length && (now - _tablesCacheTs) < CACHE_TTL) {
      return _tablesCache;
    }
    try {
      const response = await api.get('/tables');
      let rawTables: any[] = [];
      if (Array.isArray(response.data)) rawTables = response.data;
      else if (Array.isArray(response.data?.data)) rawTables = response.data.data;
      else if (Array.isArray(response.data?.tables)) rawTables = response.data.tables;

      // Enriquecer con datos de la orden activa
      const tables: Table[] = rawTables.map((t: any) => {
        const activeOrder = t.orders?.[0];
        const itemsTotal = activeOrder?.order_items
          ?.reduce((s: number, i: any) => s + Number(i.subtotal ?? 0), 0) ?? 0;
        const preparingCount = activeOrder?.order_items
          ?.filter((i: any) => i.status === 'PREPARING' || i.status === 'SENT').length ?? 0;
        return {
          ...t,
          waiterName:          activeOrder?.users_orders_waiterIdTousers?.name
                                 ?? t.waiterName
                                 ?? undefined,
          waiterId:            activeOrder?.waiterId ?? t.waiterId ?? undefined,
          currentTotal:        itemsTotal > 0 ? itemsTotal : Number(activeOrder?.total ?? 0),
          activeOrderCreatedAt: activeOrder?.createdAt ?? null,
          preparingItemsCount: preparingCount,
        };
      });

      _tablesCache = tables;
      _tablesCacheTs = now;
      console.log(`[RS] ✅ Mesas: ${tables.length}`);
      return tables;
    } catch (error) {
      if ((error as any)?.status === 403) {
        return []; // cajero sin tables.view — silencio esperado
      }
      console.error('[RS] ❌ getTables:', error);
      return _tablesCache; // fallback a cache anterior
    }
  }

  invalidateTablesCache() {
    _tablesCache = [];
    _tablesCacheTs = 0;
  }

  async getTableById(id: string): Promise<Table | null> {
    try {
      const response = await api.get(`/tables/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`[RS] ❌ getTableById ${id}:`, error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCTOS Y CATEGORÍAS
  // ═══════════════════════════════════════════════════════════

  async getProducts(): Promise<Product[]> {
    try {
      const response = await api.get('/menu/products', { params: { perPage: 500 } });
      const raw: any[] = Array.isArray(response.data?.data) ? response.data.data
        : Array.isArray(response.data) ? response.data : [];
      // Mapear product_modifiers (formato BD) → modifiers (formato frontend)
      return raw.map((p: any) => ({
        ...p,
        modifiers: (p.product_modifiers || [])
          .map((pm: any) => ({
            id:       pm.modifiers?.id    || pm.modifierId,
            name:     pm.modifiers?.name  || '',
            price:    Number(pm.modifiers?.price ?? 0),
            category: pm.modifiers?.type === 'MULTIPLE' ? 'Múltiple' : 'General',
          }))
          .filter((m: any) => m.id && m.name),
      }));
    } catch (error) {
      console.error('[RS] ❌ getProducts:', error);
      return [];
    }
  }

  async getCategories(): Promise<ProductCategory[]> {
    try {
      const response = await api.get('/menu/categories');
      const categories = Array.isArray(response.data?.data) ? response.data.data
        : Array.isArray(response.data) ? response.data : [];
      console.log(`[RS] ✅ Categorías: ${categories.length}`);
      return categories;
    } catch (error) {
      console.error('[RS] ❌ getCategories:', error);
      return [];
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await api.get('/menu/products', { params: { search: query, perPage: 500 } });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('[RS] ❌ searchProducts:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VENTAS / ÓRDENES
  // ═══════════════════════════════════════════════════════════

  async createSale(
    saleData: CreateDineInSaleDTO | CreateCounterSaleDTO | CreateDeliverySaleDTO
  ): Promise<Sale> {
    try {
      const typeMap: Record<string, string> = {
        'dine_in': 'DINE_IN', 'counter': 'TAKEAWAY', 'delivery': 'DELIVERY',
        'DINE_IN': 'DINE_IN', 'TAKEAWAY': 'TAKEAWAY', 'DELIVERY': 'DELIVERY',
      };
      const backendType = typeMap[saleData.type] || 'TAKEAWAY';

      const payload: any = {
        type: backendType,
        items: saleData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          // Convertir ProductModifier[] → [{modifierId, quantity}] que espera el backend
          ...(item.modifiers?.length ? {
            modifiers: item.modifiers.map((m: any) => ({
              modifierId: m.id || m.modifierId,
              name:       m.name,
              price:      m.price ?? 0,
              quantity:   1,
            }))
          } : {}),
          ...(item.notes ? { notes: item.notes } : {}),
        })),
        notes: saleData.notes || undefined,
      };

      if (backendType === 'DINE_IN') {
        const d = saleData as CreateDineInSaleDTO;
        if (d.tableId) payload.tableId = d.tableId;
        if (d.numberOfPeople) payload.numberOfPeople = d.numberOfPeople;
        if (d.customerId)   payload.customerId   = d.customerId;
      }

      if (backendType === 'TAKEAWAY') {
        const d = saleData as CreateCounterSaleDTO;
        if (d.customerName) payload.customerName = d.customerName;
        if (d.customerId)   payload.customerId   = d.customerId;
      }

      if (backendType === 'DELIVERY') {
        const d = saleData as CreateDeliverySaleDTO;
        payload.customerName    = d.customerName;
        payload.customerPhone   = d.customerPhone;
        payload.deliveryAddress = d.customerAddress;       // backend field name
        payload.deliveryFee     = d.deliveryFee ?? 0;      // siempre enviar, aunque sea 0
        if (d.customerId)       payload.customerId = d.customerId;
      }

      console.log('[RS] 📤 POST /pos/orders:', JSON.stringify(payload, null, 2));
      const response = await withRetry(() => api.post('/pos/orders', payload));
      const raw = response.data?.data || response.data;

      // Invalidar cache
      _ordersCache = [];
      _ordersCacheTs = 0;
      _tablesCache = [];
      _tablesCacheTs = 0;

      return mapOrder(raw);
    } catch (error: any) {
      console.error('[RS] ❌ createSale:', error.response?.data || error);
      throw error;
    }
  }

  async getSales(filters?: { type?: string; status?: string; tableId?: string; perPage?: number }): Promise<Sale[]> {
    const now = Date.now();
    if (!filters && _ordersCache.length && (now - _ordersCacheTs) < CACHE_TTL) {
      return _ordersCache;
    }
    try {
      // Siempre pedir hasta 100 para no perder órdenes activas por paginación
      const params = { perPage: 100, ...filters };
      const response = await api.get('/pos/orders', { params });
      const raw: any[] = Array.isArray(response.data) ? response.data
        : Array.isArray(response.data?.data) ? response.data.data : [];

      const sales = raw.map(mapOrder);

      if (!filters) {
        _ordersCache = sales;
        _ordersCacheTs = now;
      }

      console.log(`[RS] ✅ Órdenes mapeadas: ${sales.length}`);
      return sales;
    } catch (error) {
      console.error('[RS] ❌ getSales:', error);
      return _ordersCache; // fallback
    }
  }

  /** Alias para compatibilidad */
  async getOrders(filters?: { type?: string; status?: string; tableId?: string }): Promise<Sale[]> {
    return this.getSales(filters);
  }

  /** Obtener la orden activa de una mesa específica */
  async getActiveOrderByTable(tableId: string): Promise<Sale | null> {
    const ACTIVE = ['PENDING', 'PREPARING', 'READY', 'DELIVERED'];
    try {
      // 1. Buscar en cache primero (fast path)
      const cached = _ordersCache.find(o =>
        o.tableId === tableId && ACTIVE.includes(o.status as string)
      );
      if (cached) return cached;

      // 2. Consultar directamente por tableId en el backend (evita problema de paginación)
      const response = await api.get('/pos/orders', {
        params: { tableId, perPage: 20 }
      });
      const raw: any[] = Array.isArray(response.data) ? response.data
        : Array.isArray(response.data?.data) ? response.data.data : [];

      const match = raw.map(mapOrder).find(o =>
        o.tableId === tableId && ACTIVE.includes(o.status as string)
      );
      if (match) return match;

      // 3. Fallback: refrescar todas las DINE_IN (puede haber cambiado el estado)
      const all = await this.getSales({ type: 'DINE_IN' });
      return all.find(o => o.tableId === tableId && ACTIVE.includes(o.status as string)) || null;
    } catch (error) {
      console.error('[RS] ❌ getActiveOrderByTable:', error);
      return null;
    }
  }

  async getSaleById(id: string): Promise<Sale | null> {
    try {
      const response = await api.get(`/pos/orders/${id}`);
      const raw = response.data?.id ? response.data : response.data?.data || response.data;
      return mapOrder(raw);
    } catch (error) {
      console.error(`[RS] ❌ getSaleById ${id}:`, error);
      return null;
    }
  }

  async updateSaleStatus(saleId: string, status: string): Promise<void> {
    try {
      await withRetry(() => api.patch(`/pos/orders/${saleId}`, { status }));
      _ordersCache = [];
      _ordersCacheTs = 0;
    } catch (error) {
      console.error('[RS] ❌ updateSaleStatus:', error);
      throw error;
    }
  }

  async cancelOrder(saleId: string): Promise<void> {
    try {
      await api.delete(`/pos/orders/${saleId}`);
      _ordersCache = [];
      _ordersCacheTs = 0;
      console.log(`[RS] ✅ Orden cancelada: ${saleId}`);
    } catch (error) {
      console.error('[RS] ❌ cancelOrder:', error);
      throw error;
    }
  }

  async addItemsToSale(saleId: string, items: AddSaleItemDTO[]): Promise<void> {
    try {
      await withRetry(() => api.post(`/pos/orders/${saleId}/items`, { items }));
      _ordersCache = [];
      _ordersCacheTs = 0;
      console.log(`[RS] ✅ Items agregados a ${saleId}`);
    } catch (error) {
      console.error('[RS] ❌ addItemsToSale:', error);
      throw error;
    }
  }

  async removeItemFromOrder(orderId: string, itemId: string): Promise<void> {
    try {
      await api.delete(`/pos/orders/${orderId}/items/${itemId}`);
      _ordersCache = [];
      _ordersCacheTs = 0;
    } catch (error) {
      console.error('[RS] ❌ removeItemFromOrder:', error);
      throw error;
    }
  }

  async updateOrderCustomer(orderId: string, data: {
    customerId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
  }): Promise<void> {
    try {
      await api.patch(`/pos/orders/${orderId}`, data);
      _ordersCache = [];
      _ordersCacheTs = 0;
    } catch (error) {
      console.error('[RS] ❌ updateOrderCustomer:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PAGOS
  // ═══════════════════════════════════════════════════════════

  /**
   * Registra un pago para una orden.
   * `payment.method` debe ser el UUID del payment_method (obtenido desde
   * paymentMethodsService donde PaymentMethod.id = UUID de la BD).
   */
  async addPayment(saleId: string, payment: Payment, tip = 0): Promise<void> {
    try {
      const body = {
        paymentMethodId: payment.method,   // ya es el UUID real de la BD
        amount: Math.round(payment.amount),
        tip: Math.round(tip),
      };

      console.log(`[RS] 💳 addPayment ${saleId}:`, body);
      await api.post(`/pos/orders/${saleId}/payment`, body);
      _ordersCache = [];
      _ordersCacheTs = 0;
    } catch (error) {
      console.error('[RS] ❌ addPayment:', error);
      throw error;
    }
  }

  async applyDiscount(saleId: string, discount: { type: 'PERCENTAGE' | 'FIXED'; value: number }): Promise<void> {
    try {
      await api.post(`/pos/orders/${saleId}/discount`, discount);
      _ordersCache = [];
      _ordersCacheTs = 0;
    } catch (error) {
      console.error('[RS] ❌ applyDiscount:', error);
      throw error;
    }
  }

  async closeSale(saleId: string): Promise<void> {
    try {
      console.log(`[RS] 🔒 closeSale ${saleId}`);
      await api.post(`/pos/orders/${saleId}/close`, {});
      _ordersCache = [];
      _ordersCacheTs = 0;
      _tablesCache = [];
      _tablesCacheTs = 0;
    } catch (error) {
      console.error('[RS] ❌ closeSale:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════

  async getStats(): Promise<RestaurantStats> {
    try {
      const [tables, sales] = await Promise.all([
        this.getTables(),
        this.getSales()
      ]);

      const ACTIVE = ['PENDING', 'PREPARING', 'READY', 'IN_PROGRESS'];
      const activeSales = sales.filter(s => ACTIVE.includes(s.status as string));

      return {
        totalTables: tables.length,
        occupiedTables: tables.filter(t => t.status === 'OCCUPIED').length,
        availableTables: tables.filter(t => t.status === 'AVAILABLE').length,
        activeSales: activeSales.length,
        pendingOrders: sales.filter(s => s.status === 'PENDING').length,
        preparingOrders: sales.filter(s => s.status === 'PREPARING').length,
        readyOrders: sales.filter(s => s.status === 'READY').length,
        totalRevenue: sales
          .filter(s => s.status === 'PAID' || s.status === 'CLOSED' || s.status === 'COMPLETED')
          .reduce((sum, s) => sum + s.total, 0),
        averageTicket: sales.length > 0
          ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length
          : 0,
        totalPeople: activeSales.reduce((sum, s) => sum + (s.numberOfPeople || 0), 0),
      };
    } catch (error) {
      console.error('[RS] ❌ getStats:', error);
      return { totalTables: 0, occupiedTables: 0, availableTables: 0, totalRevenue: 0 };
    }
  }

  /** Invalidar todo el cache (llamar después de acciones externas) */
  invalidateCache() {
    _ordersCache = [];
    _ordersCacheTs = 0;
    _tablesCache = [];
    _tablesCacheTs = 0;
  }

  /** Liberar una mesa (OCCUPIED → AVAILABLE) cuando no tiene orden activa */
  async freeOrphanTable(tableId: string): Promise<boolean> {
    try {
      await api.patch(`/tables/${tableId}/status`, { status: 'AVAILABLE' });
      this.invalidateCache();
      console.log(`[RS] ✅ Mesa liberada: ${tableId}`);
      return true;
    } catch (error) {
      console.error('[RS] ❌ freeOrphanTable:', error);
      return false;
    }
  }
}

export const restaurantService = new RestaurantService();
export default restaurantService;
