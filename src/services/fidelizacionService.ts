import api from './api';

// HOTFIX #282: regla única de puntos (1 pt cada $100, 100 pts = $500, mínimo 100, vencen a los 12 meses sin compras)
export interface LoyaltyRules {
  pesosPerPoint:     number;
  redeemBlockPoints: number;
  redeemBlockValue:  number;
  minRedeemPoints:   number;
  expiryMonths:      number;
}

export interface AutomationSettings {
  autoInactiveEnabled: boolean;
  autoBirthdayEnabled: boolean;
  autoWelcomeEnabled:  boolean;
  autoVipEnabled:      boolean;
  inactiveDays:        number;
  inactiveDiscountPct: number;
  birthdayGift:        string;
  vipMinSpend:         number;
  loyalty?:            LoyaltyRules;   // HOTFIX #282
  returnPct?:          number;         // % del gasto que vuelve como descuento
  maxReturnPct?:       number;
}

export interface FidelizacionStats {
  totalSent:     number;
  last30Days:    number;
  byType:        Record<string, number>;
  inactiveCount: number;
  birthdayCount: number;
  welcomeCount:  number;
  vipCount:      number;
}

export interface CampaignLog {
  id:         string;
  type:       string;
  status:     string;
  sentAt:     string;
  createdAt:  string;
  customers?: { id: string; name: string; email: string } | null;
}

const fidelizacionService = {
  async getSettings(): Promise<AutomationSettings> {
    const res = await api.get('/fidelizacion/settings');
    return res.data;
  },

  async updateSettings(patch: Partial<Omit<AutomationSettings, 'loyalty'>> & { loyalty?: Partial<LoyaltyRules> }): Promise<AutomationSettings> {
    const res = await api.patch('/fidelizacion/settings', patch);
    return res.data;
  },

  async getStats(): Promise<FidelizacionStats> {
    const res = await api.get('/fidelizacion/stats');
    return res.data;
  },

  async getLogs(limit = 100): Promise<CampaignLog[]> {
    const res = await api.get('/fidelizacion/logs', { params: { limit } });
    return res.data;
  },

  async runTestEmail(type: 'inactive' | 'birthday' | 'welcome' | 'vip', email: string): Promise<{ message: string; messageId?: string }> {
    const res = await api.post(`/fidelizacion/test-email/${type}`, { email });
    return res.data.data ?? res.data;
  },

  async recalculatePoints(): Promise<{ updated: number; totalPointsAssigned: number; message: string }> {
    const res = await api.post('/fidelizacion/loyalty/recalculate');
    return res.data.data ?? res.data;
  },
};

export default fidelizacionService;
