import api from './api';
import type { ApiResponse } from '@/types';

// ============================================================================
// SERVICIO DE COCINA (KITCHEN)
// ============================================================================

export const kitchenService = {
  /**
   * Obtener órdenes de cocina
   * @param stationId - ID de estación (opcional)
   * @param status - Estado de items (opcional): PENDING, PREPARING, READY
   */
  async getOrders(stationId?: string, status?: string) {
    const params = new URLSearchParams();
    if (stationId) params.append('stationId', stationId);
    if (status) params.append('status', status);

    const queryString = params.toString();
    const url = `/kitchen/orders${queryString ? `?${queryString}` : ''}`;

    const { data } = await api.get<ApiResponse>(url);
    
    if (!data.success) {
      throw new Error(data.message || 'Error al obtener órdenes de cocina');
    }
    
    return data.data || [];
  },

  /**
   * Obtener estaciones de cocina
   */
  async getStations() {
    const { data } = await api.get<ApiResponse>('/kitchen/stations');
    
    if (!data.success) {
      throw new Error(data.message || 'Error al obtener estaciones');
    }
    
    return data.data || [];
  },

  /**
   * Actualizar estado de un item de cocina
   * @param itemId - ID del item
   * @param status - Nuevo estado: PENDING, PREPARING, READY
   */
  async updateItemStatus(itemId: string, status: string) {
    const { data } = await api.post<ApiResponse>(
      `/kitchen/items/${itemId}/status`,
      { status }
    );
    
    if (!data.success) {
      throw new Error(data.message || 'Error al actualizar estado del item');
    }
    
    return data.data;
  },

  /**
   * Marcar item como listo (shortcut)
   * @param itemId - ID del item
   */
  async markItemReady(itemId: string) {
    const { data } = await api.patch<ApiResponse>(
      `/kitchen/items/${itemId}/ready`
    );
    
    if (!data.success) {
      throw new Error(data.message || 'Error al marcar item como listo');
    }
    
    return data.data;
  },

  /**
   * Obtener estadísticas de cocina
   */
  async getStats() {
    const { data } = await api.get<ApiResponse>('/kitchen/stats');
    
    if (!data.success) {
      throw new Error(data.message || 'Error al obtener estadísticas');
    }
    
    return data.data || {
      pending: 0,
      preparing: 0,
      completedToday: 0,
      avgTime: 0
    };
  },

  /**
   * Obtener orden específica de cocina
   * @param orderId - ID de la orden
   */
  async getOrder(orderId: string) {
    const { data } = await api.get<ApiResponse>(`/kitchen/orders/${orderId}`);
    
    if (!data.success) {
      throw new Error(data.message || 'Error al obtener orden');
    }
    
    return data.data;
  }
};
