import api from './api';

export type NotifEventType =
  | 'NEW_ORDER'
  | 'ORDER_READY'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'CASH_CLOSE'
  | 'TABLE_REQUEST'
  | 'LOW_REVIEW' // HOTFIX 273 — reseña QR de 1 o 2 estrellas
  | 'COPILOT_SUMMARY' // LOTE COPILOTO 1
  | 'COPILOT_ALERT' // LOTE COPILOTO 1
  | 'BILLING_NOTICE'; // TAREA 332

export interface RecentNotification {
  id:        string;
  type:      NotifEventType;
  title:     string;
  body:      string;
  createdAt: string;
  read:      boolean;
}

export const notificationsService = {
  async getRecent(): Promise<RecentNotification[]> {
    const { data } = await api.get<{ success: boolean; data: RecentNotification[] }>(
      '/notifications/recent',
    );
    // HOTFIX 289: api.get ya desenvuelve { success, data } -> data es el arreglo (data.data era undefined: campana siempre vacia)
    return Array.isArray(data) ? data : ((data as any)?.data ?? []);
  },
};
