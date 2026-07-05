import api from './api';

// ============================================================================
// TIPOS
// ============================================================================

export type PromotionType = 'PERCENTAGE' | 'FIXED_PRICE' | 'X_FOR_Y' | 'PACK_PRICE';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  buyQuantity: number;
  getQuantity: number;
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
  productIds: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePromotionDto {
  name: string;
  type: PromotionType;
  value: number;
  buyQuantity?: number;
  getQuantity?: number;
  startHour?: number;
  endHour?: number;
  daysOfWeek?: number[];
  productIds?: string[];
  active?: boolean;
}

export type UpdatePromotionDto = Partial<CreatePromotionDto>;

// ============================================================================
// SERVICIO DE PROMOCIONES
// ============================================================================

const BASE_URL = '/promotions';

export const promotionsService = {
  /**
   * Obtener todas las promociones del tenant actual
   */
  async getPromotions(): Promise<Promotion[]> {
    const { data } = await api.get<Promotion[]>(BASE_URL);
    // El httpClient desenvuelve data.data → data aquí es el array (o envoltura)
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  },

  /**
   * Crear una nueva promoción
   */
  async createPromotion(payload: CreatePromotionDto): Promise<Promotion> {
    const { data } = await api.post<Promotion>(BASE_URL, payload);
    return data;
  },

  /**
   * Actualizar una promoción existente
   */
  async updatePromotion(id: string, payload: UpdatePromotionDto): Promise<Promotion> {
    const { data } = await api.put<Promotion>(`${BASE_URL}/${id}`, payload);
    return data;
  },

  /**
   * Eliminar una promoción
   */
  async deletePromotion(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
  },
};