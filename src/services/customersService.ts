import api from './api';
import type { Customer, CustomerTag } from '../types/customer.types';

// ── Helpers de normalización ─────────────────────────────────────────────────

/** BUG 1+2: Calcula tags a partir de datos reales del cliente */
function computeTags(raw: any): CustomerTag[] {
  const tags: CustomerTag[] = [];
  const totalOrders  = Number(raw.totalOrders ?? 0);
  const totalSpent   = Number(raw.totalSpent  ?? 0);
  const createdAt    = raw.createdAt ? new Date(raw.createdAt) : new Date();
  const lastVisitRaw = raw.lastVisit ?? raw.lastOrderAt ?? raw.lastOrder;
  const daysSinceCreated = (Date.now() - createdAt.getTime()) / 86_400_000;
  const daysSinceOrder   = lastVisitRaw
    ? (Date.now() - new Date(lastVisitRaw).getTime()) / 86_400_000
    : 999;

  if (daysSinceCreated < 30)                         tags.push('new');
  if (totalOrders >= 5)                              tags.push('frequent');
  if (totalSpent  >= 100_000)                        tags.push('vip');   // 100k CLP
  if (daysSinceOrder > 90 && totalOrders > 0)        tags.push('inactive');
  return tags;
}

/** BUG 1+2: Normaliza cualquier shape de cliente raw → Customer canónico */
function normalizeCustomer(raw: any): Customer {
  const totalOrders  = Number(raw.totalOrders  ?? raw._count?.orders ?? 0);
  const totalSpent   = Number(raw.totalSpent   ?? 0);
  return {
    ...raw,
    id:               String(raw.id ?? ''),
    tags:             Array.isArray(raw.tags) && raw.tags.length > 0
                        ? raw.tags
                        : computeTags(raw),
    totalOrders,
    totalSpent,
    averageTicket:    totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0,
    favoriteProducts: Array.isArray(raw.favoriteProducts) ? raw.favoriteProducts : [],
    loyaltyPoints:    Number(raw.loyalty_points?.points ?? raw.loyaltyPoints ?? raw.points ?? 0),
    points:           Number(raw.loyalty_points?.points ?? raw.points ?? raw.loyaltyPoints ?? 0),
  } as Customer;
}

// ── Helpers de top customers ─────────────────────────────────────────────────
type TopCustomerRow = { customer: any; totalSpent?: number; orders?: number } | any;

function normalizeTopCustomersPayload(raw: any): any[] {
  if (Array.isArray(raw))                                return raw;
  if (raw && Array.isArray(raw.customers))               return raw.customers;
  if (raw && Array.isArray(raw.data))                    return raw.data;
  if (raw && raw.data && Array.isArray(raw.data.customers)) return raw.data.customers;
  return [];
}

function toCustomerFromTopRow(row: TopCustomerRow): Customer {
  if (row && row.customer) {
    return normalizeCustomer({
      ...row.customer,
      totalOrders: row.orders    ?? row.customer.totalOrders ?? 0,
      totalSpent:  row.totalSpent ?? row.customer.totalSpent  ?? 0,
    });
  }
  return normalizeCustomer(row);
}

// ── Interfaz de paginación ───────────────────────────────────────────────────
export interface CustomersMeta {
  total:      number;
  page:       number;
  perPage:    number;
  totalPages: number;
}

export interface CustomersPage {
  customers: Customer[];
  meta:      CustomersMeta;
}

// ── Service ──────────────────────────────────────────────────────────────────
class CustomersService {
  /** BUG 7: getAll normaliza shape { success, data, meta } → CustomerPage */
  async getAll(params?: { search?: string; page?: number; perPage?: number }): Promise<CustomersPage> {
    const response = await api.get<any>('/customers', { params });
    const json = response.data;
    const rawArray: any[] = json?.data ?? (Array.isArray(json) ? json : []);
    return {
      customers: rawArray.map(normalizeCustomer),
      meta: json?.meta ?? { total: rawArray.length, page: 1, perPage: rawArray.length, totalPages: 1 },
    };
  }

  /** Obtener cliente por ID */
  async getById(id: string): Promise<Customer> {
    const response = await api.get<any>(`/customers/${id}`);
    const raw = response.data?.data?.customer ?? response.data?.data ?? response.data;
    return normalizeCustomer(raw);
  }

  /** BUG 7: search normaliza shape igual que getAll */
  async search(query: string, perPage = 50): Promise<Customer[]> {
    const response = await api.get<any>('/customers', {
      params: { search: query, perPage },
    });
    const json = response.data;
    const rawArray: any[] = json?.data ?? (Array.isArray(json) ? json : []);
    return rawArray.map(normalizeCustomer);
  }

  /** Crear cliente */
  async create(data: Partial<Customer>): Promise<Customer> {
    const response = await api.post<any>('/customers', data);
    const raw = response.data?.data ?? response.data;
    return normalizeCustomer(raw);
  }

  /** Alias compatibilidad */
  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    return this.create(data);
  }

  /** Actualizar cliente */
  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await api.patch<any>(`/customers/${id}`, data);
    const raw = response.data?.data ?? response.data;
    return normalizeCustomer(raw);
  }

  /** Alias compatibilidad */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return this.update(id, data);
  }

  /** Eliminar cliente */
  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  }

  /** Alias compatibilidad */
  async deleteCustomer(id: string): Promise<void> {
    return this.delete(id);
  }

  /** Paginado con filtros (alias de getAll) */
  async getCustomers(params?: { search?: string; page?: number; perPage?: number }): Promise<CustomersPage> {
    return this.getAll(params);
  }

  /** BUG 3: Obtener órdenes reales de un cliente */
  async getOrders(customerId: string): Promise<any[]> {
    const response = await api.get<any>(`/customers/${customerId}/orders`);
    const raw = response.data?.data ?? response.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }

  /** BUG 17: Stats detalladas del cliente para el modal de detalle */
  async getDetailedStats(customerId: string): Promise<any> {
    const response = await api.get<any>(`/customers/${customerId}/detailed-stats`);
    return response.data?.data ?? response.data ?? null;
  }

  /** BUG 8: Analytics globales del tenant */
  async getAnalytics(): Promise<any> {
    const response = await api.get<any>('/customers/analytics/overview');
    return response.data?.data ?? response.data ?? null;
  }

  /** Top clientes por gasto */
  async getTopCustomers(params?: { limit?: number }): Promise<Customer[]> {
    try {
      const response = await api.get<any>(`/customers/top`, { params: { limit: params?.limit ?? 5 } });
      const payload = response.data?.data ?? response.data;
      const rows = normalizeTopCustomersPayload(payload);
      return rows.map(toCustomerFromTopRow).filter(Boolean);
    } catch {
      return [];
    }
  }

  /** Buscar por teléfono */
  async findByPhone(phone: string): Promise<Customer | null> {
    try {
      const results = await this.search(phone);
      return results.find(c => c.phone === phone) ?? null;
    } catch {
      return null;
    }
  }

  /** Busca o crea cliente (POS/Delivery) */
  async findOrCreate(data: { name: string; phone?: string; email?: string }): Promise<Customer> {
    const response = await api.post<any>('/customers/find-or-create', data);
    const raw = response.data?.data ?? response.data;
    return normalizeCustomer(raw);
  }

  /** Saldo de puntos de un cliente */
  async getPointsBalance(customerId: string): Promise<any> {
    const response = await api.get<any>(`/customers/${customerId}/points`);
    return response.data?.data ?? response.data ?? null;
  }

  /** Historial de puntos de un cliente */
  async getPointsHistory(customerId: string): Promise<any[]> {
    const response = await api.get<any>(`/customers/${customerId}/points/history`);
    const raw = response.data?.data ?? response.data ?? null;
    return raw?.data ?? (Array.isArray(raw) ? raw : []);
  }

  /** Exportar clientes como CSV (devuelve Blob) */
  async exportToCsv(): Promise<Blob> {
    const response = await api.get<Blob>('/customers/export', { responseType: 'blob' });
    return response.data;
  }
}

export default new CustomersService();
