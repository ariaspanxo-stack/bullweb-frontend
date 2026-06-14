import api from './api';
import type { Sale, SalesFilters, SalesStats } from '../types/sales.types';
import { mapOrderToSale, mapSaleStatusToBackend, mapSaleTypeToBackend } from '../utils/orderMapper';

// Fix #6 — solo campos permitidos en PATCH
interface UpdateSaleDto {
  notes?:      string;
  persons?:    number;
  tableId?:    string | null;
  customerId?: string | null;
  orderType?:  string;
  waiterId?:   string | null;
}

class SalesService {
  private baseUrl = '/pos/orders';

  async getSales(filters: Partial<SalesFilters>): Promise<Sale[]> {
    try {
      const backendFilters: any = {};
      if (filters.startDate) backendFilters.dateFrom = filters.startDate.toISOString();
      if (filters.endDate)   backendFilters.dateTo   = filters.endDate.toISOString();
      if (filters.status)    backendFilters.status    = mapSaleStatusToBackend(filters.status);
      if (filters.type)      backendFilters.type      = mapSaleTypeToBackend(filters.type);
      if (filters.paymentMethod) backendFilters.paymentMethodName = filters.paymentMethod;
      if (filters.waiter)    backendFilters.waiterName = filters.waiter;
      if (filters.tableNumber) backendFilters.tableNumber = filters.tableNumber;
      if (filters.minAmount !== undefined) backendFilters.minAmount = filters.minAmount;
      if (filters.maxAmount !== undefined) backendFilters.maxAmount = filters.maxAmount;
      if (filters.search)    backendFilters.search    = filters.search;
      backendFilters.perPage = 1000;
      const response = await api.get(this.baseUrl, { params: backendFilters });
      return this.extractArray<any>(response.data).map(mapOrderToSale);
    } catch {
      return [];
    }
  }

  async getSaleById(id: string): Promise<Sale> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return mapOrderToSale(response.data.data || response.data);
    } catch (error: any) {
      throw error;
    }
  }

  async createSale(sale: Partial<Sale>): Promise<Sale> {
    try {
      const createDto = {
        type: mapSaleTypeToBackend(sale.type || 'counter'),
        tableId: sale.tableNumber,
        items: (sale.items || []).map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          modifiers: item.modifiers,
          notes: item.notes
        }))
      };
      const response = await api.post(this.baseUrl, createDto);
      return mapOrderToSale(response.data.data || response.data);
    } catch (error: any) {
      throw error;
    }
  }

  // Fix #6 — envía solo campos permitidos por el backend
  async updateSale(id: string, data: UpdateSaleDto): Promise<Sale> {
    try {
      const payload: Record<string, unknown> = {};
      if (data.notes      !== undefined) payload.notes      = data.notes;
      if (data.persons    !== undefined) payload.persons    = data.persons;
      if (data.tableId    !== undefined) payload.tableId    = data.tableId;
      if (data.customerId !== undefined) payload.customerId = data.customerId;
      if (data.orderType  !== undefined) payload.orderType  = data.orderType;
      if (data.waiterId   !== undefined) payload.waiterId   = data.waiterId;
      const response = await api.patch(`${this.baseUrl}/${id}`, payload);
      return mapOrderToSale(response.data.data || response.data);
    } catch (error: any) {
      throw error;
    }
  }

  // Fix #3 Opción B — envía cancelReason al backend
  async cancelSale(id: string, reason?: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`, { data: { reason } });
    } catch (error: any) {
      throw error;
    }
  }

  // Anular venta cerrada (PAID) — queda marcada como ANULADA en DB
  async anularSale(id: string, motivo: string): Promise<void> {
    try {
      await api.patch(`${this.baseUrl}/${id}/anular`, { motivo });
    } catch (error: any) {
      throw error;
    }
  }

  // Mantener para compatibilidad con código existente que use deleteSale
  async deleteSale(id: string): Promise<void> {
    return this.cancelSale(id);
  }

  // Fix #4 — no envía payments[] (backend los ignora)
  async closeSale(id: string): Promise<Sale> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/close`);
      return mapOrderToSale(response.data.data || response.data);
    } catch (error: any) {
      throw error;
    }
  }

  async addPayment(id: string, payment: { method: string; amount: number; reference?: string }): Promise<Sale> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/payment`, payment);
      return mapOrderToSale(response.data.data || response.data);
    } catch (error: any) {
      throw error;
    }
  }

  async applyDiscount(id: string, discount: { type: 'PERCENTAGE' | 'FIXED'; value: number; reason?: string }): Promise<Sale> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/discount`, discount);
      return mapOrderToSale(response.data.data || response.data);
    } catch (error: any) {
      throw error;
    }
  }

  // Fix #1 — función pura, sin llamada a la API
  calculateStats(sales: Sale[]): SalesStats {
    if (!sales || sales.length === 0) {
      return {
        totalSales: 0, averagePerSale: 0, totalPeople: 0, averagePerPerson: 0,
        grandTotal: 0, paymentBreakdown: [], cancellations: 0, totalTips: 0,
        cancelledCount: 0, cancelledTotal: 0, cancelReasons: [],
        tipsCount: 0, topTipWaiters: [],
      };
    }
    // Excluir ventas anuladas/canceladas de todos los cálculos de totales
    const activeSales      = sales.filter(s => s.status !== 'cancelled');
    const grandTotal       = activeSales.reduce((sum, s) => sum + s.total, 0);
    const totalPeople      = activeSales.reduce((sum, s) => sum + (s.numberOfPeople ?? 1), 0);
    const averagePerSale   = activeSales.length > 0 ? grandTotal / activeSales.length : 0;
    const averagePerPerson = totalPeople > 0 ? grandTotal / totalPeople : 0;

    const paymentTotals: Record<string, number> = {};
    activeSales.forEach(s => {
      (s.payments ?? []).forEach(p => {
        paymentTotals[p.method] = (paymentTotals[p.method] ?? 0) + p.amount;
      });
    });
    const paymentBreakdown = Object.entries(paymentTotals).map(([method, amount]) => ({
      method: method as any,
      amount,
      percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    }));

    // Mejora #1 — cancelaciones
    const cancelled      = sales.filter(s => s.status === 'cancelled' || s.status === 'CANCELLED');
    const cancelledTotal = cancelled.reduce((s, v) => s + v.total, 0);
    const reasonMap      = new Map<string, number>();
    cancelled.forEach(s => {
      const r = (s as any).cancel_reason ?? '';
      reasonMap.set(r, (reasonMap.get(r) ?? 0) + 1);
    });
    const cancelReasons = [...reasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // Mejora #1 — propinas
    const tipsData    = sales.filter(s => (s.tips ?? []).reduce((a, t) => a + t.amount, 0) > 0);
    const totalTips   = tipsData.reduce((sum, s) => sum + (s.tips ?? []).reduce((a, t) => a + t.amount, 0), 0);
    const tipsCount   = tipsData.length;
    const waiterTipsMap = new Map<string, { name: string; total: number; count: number }>();
    tipsData.forEach(s => {
      const key  = s.waiterId ?? s.waiterName ?? 'unknown';
      const tip  = (s.tips ?? []).reduce((a, t) => a + t.amount, 0);
      const prev = waiterTipsMap.get(key) ?? { name: s.waiterName ?? 'Sin garzón', total: 0, count: 0 };
      waiterTipsMap.set(key, { name: prev.name, total: prev.total + tip, count: prev.count + 1 });
    });
    const topTipWaiters = [...waiterTipsMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    return {
      totalSales:      activeSales.length,
      averagePerSale,
      totalPeople,
      averagePerPerson,
      grandTotal,
      paymentBreakdown,
      cancellations:   cancelled.length,
      totalTips,
      cancelledCount:  cancelled.length,
      cancelledTotal,
      cancelReasons,
      tipsCount,
      topTipWaiters,
    };
  }

  // Fix #5 — métodos de cash registers centralizados
  async getActiveCashRegister(): Promise<any> {
    const resp = await api.get('/cash-registers/active');
    return resp?.data?.data ?? resp?.data ?? null;
  }

  async getCashRegisters(): Promise<any[]> {
    const resp = await api.get('/cash-registers');
    const raw = resp?.data?.data ?? resp?.data ?? {};
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.registers)) return raw.registers;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  }

  // Fix #5 — métodos de apoyo para tabs
  async getPaymentMethods(): Promise<any[]> {
    try {
      const resp = await api.get('/pos/payment-methods');
      const list = resp.data?.data ?? resp.data ?? [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  async getEmployees(perPage = 200): Promise<any[]> {
    try {
      const resp = await api.get(`/employees?perPage=${perPage}`);
      const raw = resp.data?.data ?? resp.data?.employees ?? resp.data ?? [];
      return (Array.isArray(raw) ? raw : []).map((e: any) => ({ id: e.id, name: e.name }));
    } catch {
      return [];
    }
  }

  private extractArray<T>(data: any): T[] {
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.orders && Array.isArray(data.orders)) return data.orders;
    if (data.success && Array.isArray(data.data)) return data.data;
    return [];
  }
}

export const salesService = new SalesService();
export default salesService;
