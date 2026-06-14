import api from './api';
import type { ApiResponse } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface CreateOrderDTO {
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId?: string;
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    modifiers?: string[];
    notes?: string;
  }>;
  notes?: string;
}

export interface ApplyDiscountDTO {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  reason?: string;
}

export interface ProcessPaymentDTO {
  paymentMethodId: string;
  amount: number;
  tip?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  tableId?: string;
  table?: {
    id: string;
    number: string;
  };
  customerId?: string;
  waiterId: string;
  waiter: {
    id: string;
    name: string;
  };
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SERVICIO POS
// ============================================================================

export const posService = {
  /**
   * Crear nueva orden
   */
  async createOrder(data: CreateOrderDTO): Promise<Order> {
    const { data: response } = await api.post<ApiResponse<Order>>('/pos/orders', data);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Error al crear la orden');
    }
    
    return response.data;
  },

  /**
   * Listar órdenes activas
   */
  async getActiveOrders(): Promise<Order[]> {
    const { data } = await api.get<Order[]>('/pos/active-orders');
    return Array.isArray(data) ? data : [];
  },

  /**
   * Obtener detalle de orden
   */
  async getOrder(orderId: string): Promise<Order> {
    const { data } = await api.get<ApiResponse<Order>>(`/pos/orders/${orderId}`);
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al obtener la orden');
    }
    
    return data.data;
  },

  /**
   * Agregar items a orden existente
   */
  async addItems(orderId: string, items: CreateOrderDTO['items']): Promise<Order> {
    const { data } = await api.post<ApiResponse<Order>>(
      `/pos/orders/${orderId}/items`,
      { items }
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al agregar items');
    }
    
    return data.data;
  },

  /**
   * Quitar item de la orden
   */
  async removeItem(orderId: string, itemId: string): Promise<Order> {
    const { data } = await api.delete<ApiResponse<Order>>(
      `/pos/orders/${orderId}/items/${itemId}`
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al quitar el item');
    }
    
    return data.data;
  },

  /**
   * Aplicar descuento a la orden
   */
  async applyDiscount(orderId: string, discount: ApplyDiscountDTO): Promise<Order> {
    const { data } = await api.post<ApiResponse<Order>>(
      `/pos/orders/${orderId}/discount`,
      discount
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al aplicar descuento');
    }
    
    return data.data;
  },

  /**
   * Procesar pago
   */
  async processPayment(orderId: string, payment: ProcessPaymentDTO): Promise<any> {
    const { data } = await api.post<ApiResponse>(
      `/pos/orders/${orderId}/payment`,
      payment
    );
    
    if (!data.success) {
      throw new Error(data.message || 'Error al procesar el pago');
    }
    
    return data.data;
  },

  /**
   * Cerrar orden
   */
  async closeOrder(orderId: string): Promise<Order> {
    const { data } = await api.post<ApiResponse<Order>>(`/pos/orders/${orderId}/close`);
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al cerrar la orden');
    }
    
    return data.data;
  },

  /**
   * Listar órdenes con filtros y paginación
   */
  async getOrders(params: {
    search?: string;
    status?: string[];
    type?: string[];
    dateFrom?: string;
    dateTo?: string;
    waiterId?: string;
    tableId?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ orders: Order[]; meta: any }> {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key as keyof typeof params];
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v));
      } else if (value) {
        queryParams.append(key, value.toString());
      }
    });

    const { data } = await api.get<ApiResponse<{ orders: Order[]; meta: any }>>(
      `/pos/orders?${queryParams.toString()}`
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al obtener órdenes');
    }
    
    return data.data;
  },

  /**
   * Obtener estadísticas reales del día desde el backend
   */
  async getOrdersStats(): Promise<{
    pending: number;
    preparing: number;
    ready: number;
    delivered: number;
    activeOrders: number;
    paidToday: number;
    revenueToday: number;
    avgTicketToday: number;
  }> {
    const { data } = await api.get<any>('/pos/orders/stats');
    return data;
  },

  /**
   * Cancelar orden
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/pos/orders/${orderId}`, {
      data: { reason: reason ?? 'Cancelada por operador' },
    });
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cancelar la orden');
    }
  },

  /**
   * Reimprimir recibo de una orden
   */
  async reprintOrder(orderId: string): Promise<void> {
    const { data } = await api.post<ApiResponse>(`/pos/orders/${orderId}/print`);
    if (!data.success) {
      throw new Error(data.message || 'Error al reimprimir la orden');
    }
  },

  /**
   * Imprimir pre-cuenta (sin cerrar la orden) a la impresora de caja
   */
  async transferOrder(data: { fromTableId: string; toTableId: string; transferType: string }): Promise<any> {
    const res = await api.post(`/pos/orders/transfer`, data);
    return res.data;
  },

  async printPrecuenta(orderId: string): Promise<void> {
    const { data } = await api.post<ApiResponse>(`/pos/orders/${orderId}/print-precuenta`);
    if (!data.success) {
      throw new Error(data.message || 'Error al imprimir pre-cuenta');
    }
  },
};
