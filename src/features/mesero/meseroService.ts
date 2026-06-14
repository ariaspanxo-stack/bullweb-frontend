// ═══════════════════════════════════════════════════════════════
// MESERO SERVICE — App Mesero Fase 1
// Todas las llamadas usan el waiterToken (JWT de mesero).
// ═══════════════════════════════════════════════════════════════

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

function getWaiterHeaders(): Record<string, string> {
  const token  = localStorage.getItem('waiterToken') ?? '';
  const tenant = localStorage.getItem('waiterTenant') ?? '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
  };

  if (tenant) headers['x-tenant-slug'] = tenant;

  return headers;
}

async function waiterFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...getWaiterHeaders(), ...(init?.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? json.message ?? 'Error de red');
  return json;
}

export interface MeseroHistorialOrder {
  id:        string;
  createdAt: string;
  total:     number;
  status:    string;
  tables: {
    name:   string;
    number: number;
  } | null;
  order_items: {
    id:       string;
    quantity: number;
    products: { name: string } | null;
  }[];
}

export const meseroService = {

  // Cargar mesas con secciones
  getTables: async (): Promise<{ tables: any[]; sections: any[] }> => {
    const d = await waiterFetch('/waiter/tables');
    // El endpoint puede devolver el array directo o un objeto { tables, sections }
    if (Array.isArray(d)) {
      return { tables: d, sections: [] };
    }
    if (d?.tables || d?.data?.tables) {
      const inner = d.tables ? d : d.data;
      return {
        tables:   Array.isArray(inner.tables)   ? inner.tables   : [],
        sections: Array.isArray(inner.sections) ? inner.sections : [],
      };
    }
    return { tables: [], sections: [] };
  },

  // Orden activa de una mesa
  getActiveOrder: async (tableId: string): Promise<any | null> => {
    try {
      const d = await waiterFetch(`/waiter/orders/table/${tableId}/active`);
      // El backend devuelve { success, data: order|null } — desenvolver
      const order = d?.data !== undefined ? d.data : d;
      return order ?? null;
    } catch {
      return null; // mesa sin orden activa
    }
  },

  // Crear orden nueva DINE_IN
  createOrder: async (payload: {
    tableId: string;
    items: { productId: string; quantity: number; modifiers?: any[]; notes?: string }[];
    persons?: number;
    customerId?: string;
  }): Promise<any> => {
    const d = await waiterFetch('/waiter/orders', {
      method: 'POST',
      body:   JSON.stringify({ type: 'DINE_IN', ...payload }),
    });
    return d?.data !== undefined ? d.data : d;
  },

  // Agregar ítems a orden existente
  addItems: async (
    orderId: string,
    items: { productId: string; quantity: number; modifiers?: any[]; notes?: string }[]
  ): Promise<any> => {
    return waiterFetch(`/waiter/orders/${orderId}/items`, {
      method: 'POST',
      body:   JSON.stringify({ items }),
    });
  },

  // Quitar un ítem de la orden
  removeItem: async (orderId: string, itemId: string): Promise<any> => {
    return waiterFetch(`/waiter/orders/${orderId}/items/${itemId}`, { method: 'DELETE' });
  },

  // Solicitar la cuenta (nota en la orden → backend emite bill.requested por WebSocket)
  requestBill: async (orderId: string): Promise<any> => {
    return waiterFetch(`/waiter/orders/${orderId}`, {
      method: 'PATCH',
      body:   JSON.stringify({ notes: '⚡ CUENTA SOLICITADA' }),
    });
  },

  // Cargar categorías
  getCategories: async (): Promise<any[]> => {
    const d = await waiterFetch('/waiter/menu/categories');
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  },

  // Cargar productos
  getProducts: async (categoryId?: string, search?: string): Promise<any[]> => {
    const p = new URLSearchParams();
    if (categoryId) p.set('categoryId', categoryId);
    if (search)     p.set('search', search);
    const qs = p.toString() ? `?${p}` : '';
    const d = await waiterFetch(`/waiter/menu/products${qs}`);
    if (Array.isArray(d))              return d;
    if (Array.isArray(d?.data))        return d.data;
    if (Array.isArray(d?.products))    return d.products;
    if (Array.isArray(d?.data?.products)) return d.data.products;
    return [];
  },

  // Mesas ocupadas con su orden activa (para Mis Órdenes)
  getOccupiedTablesWithOrders: async (): Promise<any[]> => {
    const d = await waiterFetch('/waiter/tables?status=OCCUPIED');
    const tables: any[] =
      Array.isArray(d)            ? d
      : Array.isArray(d?.tables)  ? d.tables
      : Array.isArray(d?.data?.tables) ? d.data.tables
      : [];

    const results = await Promise.allSettled(
      tables.map(async (table: any) => {
        try {
          const orderData = await waiterFetch(`/waiter/orders/table/${table.id}/active`);
          // El backend devuelve { success, data: order } — desenvolver igual que getActiveOrder
          const order = orderData?.data !== undefined ? orderData.data : orderData;
          return { ...table, activeOrder: order ?? null };
        } catch {
          return { ...table, activeOrder: null };
        }
      })
    );

    return results
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => r.value)
      .filter((t: any) => t.activeOrder !== null);
  },

  // Split de cuenta por items
  splitBill: async (
    orderId: string,
    items:   { itemId: string; quantity: number }[]
  ): Promise<{ originalOrder: any; newOrder: any }> => {
    return waiterFetch(`/waiter/orders/${orderId}/split`, {
      method: 'POST',
      body:   JSON.stringify({ items }),
    });
  },

  // Transferencia completa de mesa
  transferOrder: async (
    fromTableId: string,
    toTableId:   string,
  ): Promise<any> => {
    return waiterFetch('/waiter/orders/transfer', {
      method: 'POST',
      body:   JSON.stringify({ fromTableId, toTableId, transferType: 'full' }),
    });
  },

  // Historial del mesero logueado (solo PAID)
  getMyOrders: async (params: {
    waiterId: string;
    dateFrom?: string;
    dateTo?:   string;
    page?:     number;
    perPage?:  number;
  }): Promise<{ orders: MeseroHistorialOrder[]; meta: { total: number; page: number; perPage: number } }> => {
    const p = new URLSearchParams();
    p.set('waiterId', params.waiterId);
    p.set('status',   'PAID');
    p.set('page',     String(params.page    ?? 1));
    p.set('perPage',  String(params.perPage ?? 30));
    if (params.dateFrom) p.set('dateFrom', params.dateFrom);
    if (params.dateTo)   p.set('dateTo',   params.dateTo);
    return waiterFetch(`/waiter/orders?${p}`);
  },

  // ── Cobrar orden (waiter JWT) ─────────────────────────────
  chargeOrder: async (
    orderId:  string,
    opts:     { paymentMethod: string; discountPct?: number }
  ): Promise<any> => {
    return waiterFetch(`/waiter/orders/${orderId}/charge`, {
      method: 'POST',
      body:   JSON.stringify(opts),
    });
  },

  // ── Cerrar mesa sin cobrar (waiter JWT) ───────────────────
  closeTable: async (tableId: string): Promise<void> => {
    await waiterFetch(`/waiter/tables/${tableId}/close`, { method: 'DELETE' });
  },

  // ── Solicitar impresión de boleta (waiter JWT) ────────────
  printReceipt: async (orderId: string): Promise<void> => {
    await waiterFetch(`/waiter/orders/${orderId}/print`, { method: 'POST' });
  },
};
