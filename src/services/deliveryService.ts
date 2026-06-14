import api from './api';

export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

export interface DeliveryOrder {
  id: string;
  orderId: string;
  customerId: string;
  driverId: string | null;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryNotes: string | null;
  status: DeliveryStatus;
  estimatedTime: number | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  customers: { id: string; name: string; phone: string | null } | null;
  users: { id: string; name: string } | null;
  orders: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    deliveryFee: number | null;
  } | null;
}

export interface DeliveryStats {
  total: number;
  pending: number;
  assigned: number;
  pickedUp: number;
  delivered: number;
  cancelled: number;
}

export interface CreateDeliveryDTO {
  orderId: string;
  customerId: string;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryNotes?: string;
  estimatedTime?: number;
  driverId?: string;
}

export interface DeliveryFilters {
  status?: DeliveryStatus;
  driverId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string | null;
}

export const deliveryService = {
  /**
   * Listar repartidores disponibles del tenant
   */
  async getDrivers(): Promise<DeliveryDriver[]> {
    const response = await api.get('/delivery/drivers');
    return response.data.data;
  },

  /**
   * Estadísticas de delivery
   */
  async getStats(from?: string, to?: string): Promise<DeliveryStats> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get('/delivery/stats', { params });
    return response.data.data;
  },

  /**
   * Listar pedidos de delivery
   */
  async listDeliveryOrders(filters?: DeliveryFilters) {
    const params: Record<string, unknown> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.driverId) params.driverId = filters.driverId;
    if (filters?.customerId) params.customerId = filters.customerId;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const response = await api.get('/delivery', { params });
    return response.data as { data: DeliveryOrder[]; meta: unknown };
  },

  /**
   * Obtener pedido por ID
   */
  async getDeliveryOrder(id: string): Promise<DeliveryOrder> {
    const response = await api.get(`/delivery/${id}`);
    return response.data.data;
  },

  /**
   * Crear pedido de delivery
   */
  async createDeliveryOrder(data: CreateDeliveryDTO): Promise<DeliveryOrder> {
    const response = await api.post('/delivery', data);
    return response.data.data;
  },

  /**
   * Actualizar info de entrega
   */
  async updateDeliveryOrder(
    id: string,
    data: { deliveryAddress?: string; deliveryPhone?: string; deliveryNotes?: string; estimatedTime?: number }
  ): Promise<DeliveryOrder> {
    const response = await api.put(`/delivery/${id}`, data);
    return response.data.data;
  },

  /**
   * Asignar repartidor
   */
  async assignDriver(id: string, driverId: string, estimatedTime?: number): Promise<DeliveryOrder> {
    const response = await api.patch(`/delivery/${id}/assign`, { driverId, estimatedTime });
    return response.data.data;
  },

  /**
   * Marcar como recogido
   */
  async markPickedUp(id: string): Promise<DeliveryOrder> {
    const response = await api.patch(`/delivery/${id}/picked-up`);
    return response.data.data;
  },

  /**
   * Marcar como entregado
   */
  async markDelivered(id: string): Promise<DeliveryOrder> {
    const response = await api.patch(`/delivery/${id}/delivered`);
    return response.data.data;
  },

  /**
   * Cancelar delivery
   */
  async cancelDelivery(id: string): Promise<void> {
    await api.patch(`/delivery/${id}/cancel`);
  },
};
