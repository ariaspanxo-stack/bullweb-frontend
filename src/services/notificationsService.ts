import api from './api';

export type NotifEventType =
  | 'NEW_ORDER'
  | 'ORDER_READY'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'CASH_CLOSE'
  | 'TABLE_REQUEST';

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
    return data.data ?? [];
  },
};
