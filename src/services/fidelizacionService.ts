import api from './api';

export interface AutomationSettings {
  autoInactiveEnabled: boolean;
  autoBirthdayEnabled: boolean;
  autoWelcomeEnabled:  boolean;
  autoVipEnabled:      boolean;
  inactiveDays:        number;
  inactiveDiscountPct: number;
  birthdayGift:        string;
  pointsPerPeso:       number;
  vipMinSpend:         number;
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

  async updateSettings(patch: Partial<AutomationSettings>): Promise<AutomationSettings> {
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

  async runTest(type: 'inactive' | 'birthday' | 'welcome'): Promise<{ message: string }> {
    const res = await api.post(`/fidelizacion/test/${type}`);
    return res.data.data;
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
