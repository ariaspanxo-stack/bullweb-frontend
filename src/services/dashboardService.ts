import api from './api';

export interface DashboardStats {
  today: {
    total: number;
    orders: number;
    items: number;
    avgTicket: number;
    topProduct: {
      id: string;
      name: string;
      quantity: number;
    };
  };
  yesterday: {
    total: number;
    change: number;
  };
  week: {
    total: number;
  };
  cash: number;
}

export interface SalesData {
  hour: string;
  sales: number;
  orders: number;
}

export interface ProductSale {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

export interface CategorySale {
  category: string;
  amount: number;
  percentage: number;
}

export interface PaymentMethodData {
  method: string;
  amount: number;
  percentage: number;
  count: number;
}

class DashboardService {
  // Obtener KPIs del dashboard
  async getStats(period: 'today' | 'week' | 'month' = 'today'): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>(`/reports/dashboard?period=${period}`);
    return response.data;
  }

  // Obtener ventas por hora
  async getHourlySales(date?: string): Promise<SalesData[]> {
    const params = date ? { date } : {};
    const response = await api.get<SalesData[]>('/reports/sales', { params });
    return response.data;
  }

  // Obtener top productos
  async getTopProducts(limit: number = 10): Promise<ProductSale[]> {
    const response = await api.get<ProductSale[]>(`/reports/products?limit=${limit}`);
    return response.data;
  }

  // Obtener ventas por categoría
  async getCategorySales(): Promise<CategorySale[]> {
    const response = await api.get<CategorySale[]>('/reports/sales?groupBy=category');
    return response.data;
  }

  // Obtener métodos de pago
  async getPaymentMethods(): Promise<PaymentMethodData[]> {
    const response = await api.get<PaymentMethodData[]>('/reports/cash-flow');
    return response.data;
  }
}

export default new DashboardService();
