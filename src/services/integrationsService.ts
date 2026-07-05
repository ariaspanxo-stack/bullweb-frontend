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
    // httpClient.post/get ya desempaqueta el envelope del backend ({success, data})
    // así que response.data ya es el array, no el envelope completo.
    const result = response.data as any;
    return Array.isArray(result) ? result : (result?.data ?? result ?? []);
  },

  /** Guardar / actualizar credenciales de una plataforma */
  async saveConfig(platform: string, data: SaveConfigDTO): Promise<PlatformConfig> {
    const response = await api.post(`/integrations/config/${platform}`, data);
    // httpClient.post ya desempaqueta el envelope ({success, data}) en response.data
    const result = response.data as any;
    return result?.data ?? result;
  },

  /** Activar / desactivar integración */
  async togglePlatform(platform: string, active: boolean): Promise<void> {
    await api.patch(`/integrations/config/${platform}/toggle`, { active });
  },

  /** Test de conexión
   *
   * El backend responde con el envelope estándar:
   *   { success: true, data: { ok: true, message: "..." } }
   *
   * `httpClient.post` desempaqueta UNA capa (data.data ?? data), por lo que
   * normalmente `response.data` ya es `{ ok, message }`.
   * Sin embargo, blindamos todos los casos posibles para evitar
   * `Cannot read properties of undefined (reading 'ok')`:
   *   1) response.data = { ok, message }            ← caso normal
   *   2) response.data = { success, data: {ok,...}} ← envelope sin desempaquetar
   *   3) response.data = undefined / null           ← respuesta vacía/inesperada
   */
  async testConnection(platform: string): Promise<{ ok: boolean; message: string }> {
    const response = await api.post(`/integrations/test/${platform}`);
    const payload  = (response?.data ?? response) as any;

    // Caso 1 y 2: si viene envuelto en .data (envelope crudo), bajar una capa
    const candidate =
      payload && typeof payload === 'object' && 'ok' in payload
        ? payload
        : payload?.data;

    // Caso 3: garantizar siempre un objeto con `ok` definido
    if (candidate && typeof candidate === 'object' && 'ok' in candidate) {
      return {
        ok:      Boolean(candidate.ok),
        message: candidate.message ?? (candidate.ok ? 'Conexión exitosa' : 'Sin detalles'),
      };
    }

    // Última red de seguridad: nunca devolver undefined
    return { ok: false, message: 'Respuesta inesperada del servidor' };
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
    // httpClient.get ya desempaqueta el envelope del backend
    const result = response.data as any;
    return Array.isArray(result) ? result : (result?.data ?? []);
  },

  /** Construir URL del webhook para una plataforma y tenantId */
  buildWebhookUrl(platform: string, tenantId: string): string {
    const baseUrl = 'https://api.bullwebchile.com';
    return `${baseUrl}/api/integrations/webhook/${platform}?tenantId=${tenantId}`;
  },
};
