import api from './api';
import type { ApiResponse } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  topProducts: Array<{
    product: {
      id: string;
      name: string;
    };
    quantity: number;
    revenue: number;
  }>;
  salesByHour: Array<{
    hour: number;
    sales: number;
  }>;
  salesByWaiter: Array<{
    waiter: {
      id: string;
      name: string;
    };
    sales: number;
    orders: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    table?: {
      id: string;
      number: string;
    };
    waiter: {
      id: string;
      name: string;
    };
    total: number;
    status: string;
    createdAt: string;
  }>;
}

export interface SalesReport {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  salesByDate: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  salesByPaymentMethod: Array<{
    method: string;
    total: number;
    count: number;
  }>;
  salesByCategory: Array<{
    category: string;
    total: number;
  }>;
}

export interface ProductReport {
  topProducts: Array<{
    product: {
      id: string;
      name: string;
      category: string;
    };
    quantity: number;
    revenue: number;
  }>;
  productsByCategory: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  stationId?: string;
  waiterId?: string;
  paymentMethod?: string;
}

// ============================================================================
// SERVICIO DE REPORTES
// ============================================================================

export const reportsService = {
  /**
   * Obtener estadísticas del dashboard
   */
  async getDashboard(filters?: ReportFilters): Promise<DashboardStats> {
    const params = new URLSearchParams();
    
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    const { data } = await api.get<DashboardStats>(
      `/reports/dashboard${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (!data) throw new Error('Error al obtener estadísticas del dashboard');
    
    return data;
  },

  /**
   * Obtener reporte de ventas
   */
  async getSales(filters?: ReportFilters): Promise<SalesReport> {
    const params = new URLSearchParams();
    
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.waiterId) params.append('waiterId', filters.waiterId);
    if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    
    const { data } = await api.get<SalesReport>(
      `/reports/sales${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (!data) throw new Error('Error al obtener reporte de ventas');
    
    return data;
  },

  /**
   * Obtener reporte de productos
   */
  async getTopProducts(filters?: ReportFilters & { limit?: number }): Promise<ProductReport> {
    const params = new URLSearchParams();
    
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.waiterId) params.append('waiterId', filters.waiterId);
    
    const { data } = await api.get<ProductReport>(
      `/reports/products${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (!data) throw new Error('Error al obtener reporte de productos');
    
    return data;
  },

  /**
   * Obtener reporte de ventas detallado
   */
  async getSalesReport(filters?: ReportFilters & { groupBy?: string }): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.groupBy) params.append('groupBy', filters.groupBy);
    if (filters?.waiterId) params.append('waiterId', filters.waiterId);
    
    const { data } = await api.get<any>(
      `/reports/sales${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (!data) throw new Error('Error al obtener reporte de ventas');
    
    return data;
  },

  /**
   * Obtener reporte de flujo de caja
   */
  async getCashFlow(filters?: ReportFilters): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    const { data } = await api.get<any>(
      `/reports/cash-flow${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (!data) throw new Error('Error al obtener flujo de caja');
    
    return data;
  },

  async getWaitersReport(filters?: ReportFilters): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    const { data } = await api.get<any>(
      `/reports/waiters${params.toString() ? `?${params.toString()}` : ''}`
    );
    if (!data) throw new Error('Error al obtener reporte de meseros');
    return data;
  },

  async getKitchenReport(filters?: ReportFilters): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    const { data } = await api.get<any>(
      `/reports/kitchen${params.toString() ? `?${params.toString()}` : ''}`
    );
    if (!data) throw new Error('Error al obtener reporte de cocina');
    return data;
  },

  /**
   * Obtener reporte de mesas
   */
  async getTablesReport(filters?: ReportFilters): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    const { data } = await api.get<any>(
      `/reports/tables${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (!data) throw new Error('Error al obtener reporte de mesas');
    
    return data;
  },

  /**
   * Exportar reporte (descarga de archivo CSV o Excel)
   */
  async exportReport(type: string, params: any): Promise<void> {
    const format: string = params.format ?? 'excel';
    const response = await api.post(
      `/reports/export`,
      { type, ...params, format },
      { responseType: 'blob' }
    );
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const filename = `${type}_${params.dateFrom ?? ''}_${params.dateTo ?? ''}.${ext}`;
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Exportar reporte a Excel
   */
  async exportToExcel(reportType: 'sales' | 'products' | 'inventory', filters?: ReportFilters): Promise<Blob> {
    const response = await api.post(
      `/reports/export`,
      { type: reportType, ...filters, format: 'excel' },
      { responseType: 'blob' }
    );
    return response.data;
  }
};
