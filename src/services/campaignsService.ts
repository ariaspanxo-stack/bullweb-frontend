import api from './api';
import type {
  Campaign,
  CreateCampaignDTO,
  UpdateCampaignDTO,
  CampaignsFilters,
  CampaignsStats,
  CampaignPerformanceMetrics,
  CampaignDelivery,
  CampaignTemplate,
} from '@/types/campaigns.types';

/**
 * ============================================================================
 * CAMPAIGNS SERVICE - API Client
 * ============================================================================
 */

export const campaignsService = {
  /**
   * Obtener estadísticas generales de campañas
   */
  async getStats(): Promise<CampaignsStats> {
    const response = await api.get('/campaigns/stats/overview');
    const raw = response.data ?? {};
    // Backend devuelve avgOpenRate (decimal), frontend espera averageOpenRate, etc.
    return {
      totalCampaigns:        raw.totalCampaigns        ?? 0,
      activeCampaigns:       raw.activeCampaigns        ?? 0,
      totalRecipients:       raw.totalRecipients        ?? 0,
      totalDeliveries:       raw.totalDeliveries        ?? raw.completedCampaigns ?? 0,
      averageOpenRate:       raw.averageOpenRate        ?? raw.avgOpenRate  ?? 0,
      averageClickRate:      raw.averageClickRate       ?? raw.avgClickRate ?? 0,
      averageConversionRate: raw.averageConversionRate  ?? 0,
      totalRevenue:          raw.totalRevenue           ?? 0,
    };
  },

  /**
   * Listar campañas con filtros
   */
  async listCampaigns(filters?: CampaignsFilters) {
    const params: any = {};
    
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.type = filters.type;
    if (filters?.targetSegment) params.targetSegment = filters.targetSegment;
    if (filters?.startDate) params.startDate = filters.startDate.toISOString().slice(0, 10);
    if (filters?.endDate) params.endDate = filters.endDate.toISOString().slice(0, 10);
    if (filters?.search) params.search = filters.search;

    const response = await api.get('/campaigns', { params });
    const raw = response.data;
    // Normalizar: el backend puede devolver { campaigns: [] }, [] o { data: [] }
    const list: Campaign[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.campaigns)
        ? raw.campaigns
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
    return { campaigns: list, meta: raw?.meta ?? null };
  },

  /**
   * Obtener campaña por ID
   */
  async getCampaignById(id: string): Promise<Campaign> {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Crear nueva campaña
   */
  async createCampaign(data: CreateCampaignDTO): Promise<Campaign> {
    const response = await api.post('/campaigns', data);
    const campaign = response.data;
    if (!campaign?.id) {
      throw new Error('Respuesta inválida del servidor al crear campaña');
    }
    return campaign;
  },

  /**
   * Actualizar campaña
   */
  async updateCampaign(id: string, data: UpdateCampaignDTO): Promise<Campaign> {
    const response = await api.patch(`/campaigns/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar campaña (soft delete)
   */
  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  },

  /**
   * Programar campaña para envío
   */
  async scheduleCampaign(id: string, scheduledAt: Date): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/schedule`, {
      scheduledAt: scheduledAt.toISOString(),
    });
    return response.data;
  },

  /**
   * Enviar campaña inmediatamente
   */
  async sendCampaign(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/send`);
    return response.data;
  },

  /**
   * Pausar campaña en progreso
   */
  async pauseCampaign(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/pause`);
    return response.data;
  },

  /**
   * Cancelar campaña
   */
  async cancelCampaign(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/cancel`);
    return response.data;
  },

  /**
   * Obtener métricas de rendimiento de campaña
   */
  async getPerformanceMetrics(id: string): Promise<CampaignPerformanceMetrics> {
    const response = await api.get(`/campaigns/${id}/performance`);
    return response.data;
  },

  /**
   * Obtener deliveries (entregas) de una campaña
   */
  async getCampaignDeliveries(
    id: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<{ deliveries: CampaignDelivery[]; meta: any }> {
    const response = await api.get(`/campaigns/${id}/deliveries`, { params });
    return response.data;
  },

  /**
   * Obtener audiencia estimada para segmento
   */
  async estimateAudience(segment?: string, filters?: any): Promise<number> {
    const response = await api.post('/campaigns/estimate-audience', {
      targetSegment: segment,
      targetFilters: filters,
    });
    return response.data.count ?? response.data.estimatedAudience ?? 0;
  },

  // ================== TEMPLATES ==================

  /**
   * Listar templates disponibles
   */
  async listTemplates(type?: string): Promise<CampaignTemplate[]> {
    const params = type ? { type } : {};
    const response = await api.get('/campaigns/templates', { params });
    return response.data.templates ?? response.data;
  },

  /**
   * Obtener template por ID
   */
  async getTemplateById(id: string): Promise<CampaignTemplate> {
    const response = await api.get(`/campaigns/templates/${id}`);
    return response.data;
  },

  /**
   * Crear plantilla
   */
  async createTemplate(data: Partial<CampaignTemplate>): Promise<CampaignTemplate> {
    const response = await api.post('/campaigns/templates', data);
    return response.data;
  },

  /**
   * Usar plantilla (aumentar usageCount)
   */
  async useTemplate(id: string): Promise<CampaignTemplate> {
    const response = await api.post(`/campaigns/templates/${id}/use`);
    return response.data;
  },
};

export default campaignsService;
