// LOTE MP-A: Mercado Pago en el panel (Configuracion -> Pagos y estado de pago en las tarjetas del POS).
import api from './api';

export interface MpStatus {
  enabled:     boolean;
  available:   boolean;
  connected:   boolean;
  status:      'connected' | 'expired' | 'revoked' | 'disconnected';
  account:     string | null;
  expiresAt:   string | null;
  connectedAt: string | null;
  feePct:      number;
  liveMode:    boolean;
}

export interface MpOrderState {
  orderId:        string;
  status:         string;
  amount:         number;
  withoutSession: boolean;
  adoptedAt:      string | null;
  reviewReason:   string | null;
}

export interface MpReviewPayment {
  id:           string;
  amount:       number;
  reviewReason: string;
  mpOrderId:    string | null;
  createdAt:    string;
  customerName: string | null;
}

export const mercadoPagoService = {
  // Local fuera de la lista blanca: { enabled: false } y nada mas
  async status(): Promise<MpStatus> {
    const res = await api.get('/payments/mp/status');
    return res.data as MpStatus;
  },
  async connectUrl(): Promise<string> {
    const res = await api.post('/payments/mp/oauth/start', {});
    return (res.data as { url: string }).url;
  },
  async disconnect(): Promise<void> {
    await api.post('/payments/mp/disconnect', {});
  },
  async orderStates(): Promise<{ orders: MpOrderState[]; review: MpReviewPayment[] }> {
    const res = await api.get('/payments/mp/order-states');
    return res.data as { orders: MpOrderState[]; review: MpReviewPayment[] };
  },
};
