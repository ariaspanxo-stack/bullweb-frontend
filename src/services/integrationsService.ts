import api from './api';

export type PlatformId = 'ubereats' | 'rappi' | 'pedidosya' | 'justeat';

export interface PlatformConfig {
  id: string;
  platform: PlatformId;
  active: boolean;
  storeId: string | null;
  menuSyncedAt: string | null;
  lastOrderAt: string | null;
  webhookUrl?: string;
  config: Record<string, unknown>;
}

export interface SaveConfigDTO {
  storeId?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  config?: Record<string, unknown>;
}

export interface PlatformOrder {
  id: string;
  platform: string;
  platformOrderId: string;
  orderId: string | null;
  status: string;
  customerName: string;
  total: number;
  receivedAt: string;
  errorMessage: string | null;
}

export const integrationsService = {
  /** Obtener configuración de todas las plataformas */
  async getConfigs(): Promise<PlatformConfig[]> {
    const response = await api.get('/integrations/config');
    return response.data.data ?? [];
  },

  /** Guardar / actualizar credenciales de una plataforma */
  async saveConfig(platform: string, data: SaveConfigDTO): Promise<PlatformConfig> {
    const response = await api.post(`/integrations/config/${platform}`, data);
    return response.data.data;
  },

  /** Activar / desactivar integración */
  async togglePlatform(platform: string, active: boolean): Promise<void> {
    await api.patch(`/integrations/config/${platform}/toggle`, { active });
  },

  /** Test de conexión */
  async testConnection(platform: string): Promise<{ ok: boolean; message: string }> {
    const response = await api.post(`/integrations/test/${platform}`);
    return response.data.data;
  },

  /** Historial de pedidos recibidos */
  async getPlatformOrders(params?: {
    platform?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<PlatformOrder[]> {
    const response = await api.get('/integrations/orders', { params });
    return response.data.data ?? [];
  },

  /** Construir URL del webhook para una plataforma y tenantId */
  buildWebhookUrl(platform: string, tenantId: string): string {
    const baseUrl = 'https://api.bullwebchile.com';
    return `${baseUrl}/api/integrations/webhook/${platform}?tenantId=${tenantId}`;
  },
};
