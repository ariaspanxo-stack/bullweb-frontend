const SA_API = import.meta.env.VITE_API_URL || 'http://localhost:4200/api';

function saHeaders(): HeadersInit {
  const token = localStorage.getItem('superadmin_token');
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function saFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SA_API}${path}`, { ...init, headers: saHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Hotfix #219 (lección #218): propagar status y retryAfter del 429 para
    // que la UI pueda mostrar "reintenta en {N}s" — el mensaje solo no basta.
    const e = new Error(err?.error || err?.message || `HTTP ${res.status}`) as Error & {
      status?: number; retryAfter?: number;
    };
    e.status = res.status;
    (e as any).code = err?.code; (e as any).data = err?.data; // LOTE 325: aviso de perdidas del 409
    if (err?.retryAfter != null) e.retryAfter = Number(err.retryAfter);
    throw e;
  }
  const body = await res.json();
  return (body?.data ?? body) as T;
}

// TAREA 332: cobranza
export interface CobranzaSA {
  status: string; plan: string | null; planLabel: 'BÁSICO' | 'FULL'; priceCLP: number | null; graceDays: number;
  dueAt: string | null; daysToDue: number | null; inGrace: boolean; payUntil: string | null; blockAt: string | null; blocked: boolean;
  graceConfigurable?: boolean; giveDaysOptions?: number[]; maxGraceDays?: number;
}
export interface CarteraRow extends CobranzaSA {
  id: string; name: string; slug: string; isTest: boolean; lastOrderAt: string | null; lastPaymentAt: string | null;
  onlinePaymentsEnabled: boolean; mpConnected: boolean; onlinePaymentsConnected: boolean; copilotOn: boolean;
  severity: 'rojo' | 'amarillo' | null;
}

// LOTE 325: plan, precio y modulos por local
export interface TenantModuleSA { key: string; label: string; enabled: boolean; source: 'plan' | 'forced'; state: 'plan' | 'on' | 'off'; planDefault: boolean }
export interface TenantModulesSA { plan: 'BASICO' | 'TODO'; modules: TenantModuleSA[] }
export interface PlanImpactSA {
  from: 'BASICO' | 'TODO'; to: 'BASICO' | 'TODO'; losesSomething: boolean; targetPriceCLP?: number | null;
  figures: { ingredientes: number; compras7d: number; clientes: number; movimientosPuntos7d: number; estaciones: number; estacionesSobreTope: number };
  modulesLost: { key: string; label: string }[];
  warnings: string[];
}

// LOTE 324
export interface OnlinePaymentsCfg {
  available:    boolean;
  enabled:      boolean;
  feeOnlinePct: number;
  feePointPct:  number;
  source:       'db' | 'env';
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
  trialEndsAt?: string | null;
  created_at: string;
  is_active: boolean;
  isTest?: boolean;
  isArchived?: boolean;
  lastLogin?: string | null;
  subscriptions?: Subscription | null;
  _count: { users: number };
  adminEmail?: string | null;
}

export interface TenantDetail extends Omit<Tenant, '_count'> {
  _count: { users: number; orders: number; products: number; tables: number };
  lastPayment?: { amount: number; paidAt: string; status: string } | null;
  modules?: { fidelizacion: boolean; cupones: boolean; clientes: boolean };
}

export interface Subscription {
  id: string;
  plan: string;
  priceCLP: number;
  status: string;
  currentPeriodEnd: string;
  flowSubscriptionId?: string | null;
}

/** Respuesta del endpoint PATCH /superadmin/tenants/:id/extend-period (Hotfix #208) */
export interface ExtendPeriodResult {
  ok:               boolean;
  newPeriodEnd:     string;
  previousPeriodEnd: string | null;
  plan:             string;
}

export interface SuperAdminMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;     // legacy: activos + vencidos (compat)
  trialActive?: number;     // trials vigentes (no vencidos)
  trialExpired?: number;    // trials vencidos (incluye sin fecha)
  newToday: number;
  mrr: number;
  mrrFormatted: string;
  arr?: number;
  churnRate?: number;
  conversionRate?: number;
  revenueAtRisk?: number;
  riskTenantCount?: number;
  mrrHistory?: Array<{ month: string; mrr: number }>;
  planCounts?: Record<string, number>;
}

export interface Payment {
  id: string;
  tenantId: string;
  flowOrderId?: string | null;
  amount: number;
  currency: string;
  status: string;
  concept?: string | null;
  paidAt?: string | null;
  createdAt: string;
  tenant: { name: string; plan: string; slug: string };
}

export interface PaymentPage {
  payments: Payment[];
  total: number;
  page: number;
  totalPages: number;
  totalAmount: number;
}

export interface PaymentPeriod { amount: number; count: number; }
export interface PaymentSummary {
  thisMonth:        PaymentPeriod;
  lastMonth:        PaymentPeriod;
  allTime:          PaymentPeriod;
  failedThisMonth:  number;
  annualProjection: number;
  recentMonthLabel?: string;
}

export interface ImpersonateResult {
  token:     string;
  userId:    string;
  tenantId:  string;
  expiresIn: string;
}

export interface TenantHealthRow {
  id:          string;
  name:        string;
  plan:        string;
  status:      string;
  lastLogin:   string | null;
  orders7d:    number;
  trialEndsAt: string | null;
  semaforo:    'green' | 'yellow' | 'red';
}

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface Alert {
  id:           string;
  type:         string;
  severity:     AlertSeverity;
  title:        string;
  message:      string;
  tenantId?:    string;
  tenantName?:  string;
  actionLabel?: string;
  actionUrl?:   string;
  createdAt:    string;
  data?:        Record<string, any>;
}

export interface AlertsResponse {
  alerts:   Alert[];
  total:    number;
  critical: number;
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
  plan: string;
  adminEmail: string;
  adminName: string;
}

export interface PlanConfig {
  id: string;
  plan: string;
  displayName: string;
  priceCLP: number;
  trialDays: number;
  maxUsers: number;
  maxTables: number;
  features: string[];
  isActive: boolean;
  updatedBy?: string | null;
  updatedAt: string;
  createdAt: string;
}

/** Respuesta del endpoint POST /superadmin/tenants/reactivate-campaign */
export interface ReactivationCampaignResult {
  success: boolean;
  dispatched: number;
  message?: string;
  details?: Array<{ tenantId: string; tenantName: string; email: string }>;
  triggeredBy?: string;
}

const superadminService = {
  getMetrics:    () => saFetch<SuperAdminMetrics>('/superadmin/metrics'),

  // Campaña de reactivación para tenants pausados (SUSPENDED)
  sendReactivationCampaign: () =>
    saFetch<ReactivationCampaignResult>('/superadmin/tenants/reactivate-campaign', { method: 'POST' }),

  listTenants:   (params?: { page?: number; limit?: number; search?: string; archived?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.page)     qs.set('page',     String(params.page));
    if (params?.limit)    qs.set('limit',    String(params.limit));
    if (params?.search)   qs.set('search',   params.search);
    if (params?.archived) qs.set('archived', 'true');
    const query = qs.toString();
    return saFetch<{ tenants: Tenant[]; total: number; page: number; pages: number; limit: number }>(
      `/superadmin/tenants${query ? `?${query}` : ''}`
    );
  },
  getTenant:     (id: string) => saFetch<TenantDetail>(`/superadmin/tenants/${id}`),
  createTenant:  (dto: CreateTenantDTO) => saFetch<{ tenant: Tenant; tempPassword: string }>('/superadmin/tenants', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),
  suspendTenant:   (id: string) => saFetch<Tenant>(`/superadmin/tenants/${id}/suspend`,   { method: 'PATCH' }),
  activateTenant:  (id: string) => saFetch<Tenant>(`/superadmin/tenants/${id}/activate`,  { method: 'PATCH' }),
  archiveTenant:   (id: string) => saFetch<Tenant>(`/superadmin/tenants/${id}/archive`,   { method: 'PATCH' }),
  unarchiveTenant: (id: string) => saFetch<Tenant>(`/superadmin/tenants/${id}/unarchive`, { method: 'PATCH' }),
  changePlan:     (id: string, plan: string) => saFetch<Tenant>(`/superadmin/tenants/${id}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan }),
  }),
  extendTrial:    (id: string, days: number) => saFetch<{ newTrialEndsAt: string }>(`/superadmin/tenants/${id}/extend-trial`, {
    method: 'PUT',
    body: JSON.stringify({ days }),
  }),
  // Hotfix #219: prórroga de período de SUSCRIPCIÓN (cortesía, sin cobro) sobre
  // el endpoint oficial del #208 — audit EXTEND_PERIOD, base = max(now, periodEnd).
  extendPeriod:   (id: string, days: number) => saFetch<ExtendPeriodResult>(`/superadmin/tenants/${id}/extend-period`, {
    method: 'PATCH',
    body: JSON.stringify({ days }),
  }),

  deleteTenant: (id: string) => saFetch<{ deleted: boolean }>(`/superadmin/tenants/${id}`, { method: 'DELETE' }),

  impersonate: (id: string) => saFetch<ImpersonateResult>(`/superadmin/tenants/${id}/impersonate`, { method: 'POST' }),

  getPayments: (params?: { tenantId?: string; status?: string; month?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tenantId) qs.set('tenantId', params.tenantId);
    if (params?.status)   qs.set('status',   params.status);
    if (params?.month)    qs.set('month',     params.month);
    if (params?.page)     qs.set('page',      String(params.page));
    if (params?.limit)    qs.set('limit',     String(params.limit));
    const q = qs.toString();
    return saFetch<PaymentPage>(`/superadmin/payments${q ? `?${q}` : ''}`);
  },

  getPaymentsSummary: () => saFetch<PaymentSummary>('/superadmin/payments/summary'),

  getAlerts: () => saFetch<AlertsResponse>('/superadmin/alerts'),

  getTenantHealth: () => saFetch<TenantHealthRow[]>('/superadmin/tenants/health'),

  // 2FA
  setup2FA:   () => saFetch<{ secret: string; qrCodeUrl: string }>('/superadmin/2fa/setup', { method: 'POST' }),
  verify2FA:  (code: string) => saFetch<{ enabled: boolean }>('/superadmin/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ totpCode: code }),
  }),
  disable2FA: () => saFetch<{ enabled: boolean }>('/superadmin/2fa', { method: 'DELETE' }),

  // Configuración de planes
  getPlans: () => saFetch<PlanConfig[]>('/superadmin/config/plans'),
  updatePlan: (plan: string, dto: Partial<Omit<PlanConfig, 'id' | 'plan' | 'createdAt' | 'updatedAt'>>) =>
    saFetch<PlanConfig>(`/superadmin/config/plans/${plan}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  // Limpieza de datos de prueba
  cleanDemo: (id: string) => saFetch<{ orders: number; customers: number; products: number; categories: number }>(
    `/superadmin/tenants/${id}/clean-demo`,
    { method: 'POST' },
  ),

  // Actividad por tenant
  getTenantsActivity: () => saFetch<{ tenants: any[]; kpis: any }>('/superadmin/tenants/activity'),

  // Gráfico actividad 14 días
  getActivityChart: () => saFetch<{ day: string; count: number }[]>('/superadmin/activity/chart'),

  // Gráfico pagos 6 meses
  getPaymentsChart: () => saFetch<{ month: string; paid: number; overdue: number; totalAmount: number }[]>('/superadmin/payments/chart'),

  // Historial pagos por tenant
  getTenantPayments: (id: string) => saFetch<{ payments: any[]; totalPaid: number }>(`/superadmin/tenants/${id}/payments`),

  // Registro manual de pago
  createSubscriptionPayment: (data: {
    tenantId: string; amount: string; plan?: string; method?: string;
    invoiceNumber?: string; notes?: string; status?: string; concept?: string;
  }) => saFetch<any>('/superadmin/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Log de auditoría
  getAuditLogs: (params?: { page?: number; limit?: number; action?: string; tenantId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)     qs.set('page',     String(params.page));
    if (params?.limit)    qs.set('limit',    String(params.limit));
    if (params?.action)   qs.set('action',   params.action);
    if (params?.tenantId) qs.set('tenantId', params.tenantId);
    const q = qs.toString();
    return saFetch<{ logs: any[]; total: number; page: number; pages: number }>(`/superadmin/audit${q ? `?${q}` : ''}`);
  },

  // Resetear contraseña del admin del tenant
  resetPassword: (id: string, password: string) =>
    saFetch<{ email: string; canLogin: boolean }>(`/superadmin/tenants/${id}/reset-password`, {
      method: 'PATCH',
      body:   JSON.stringify({ password }),
    }),

  // Ficha completa del tenant
  getTenantDetail: (id: string) => saFetch<any>(`/superadmin/tenants/${id}/detail`),

  // LOTE 324: pagos en linea por local (switch y comisiones BullWeb), con auditoria superadmin
  getOnlinePayments: (id: string) => saFetch<OnlinePaymentsCfg>(`/superadmin/tenants/${id}/online-payments`),
  updateOnlinePayments: (id: string, body: Partial<Pick<OnlinePaymentsCfg, 'enabled' | 'feeOnlinePct' | 'feePointPct'>>) =>
    saFetch<OnlinePaymentsCfg>(`/superadmin/tenants/${id}/online-payments`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Notas internas
  getTenantNotes:    (id: string)                   => saFetch<any[]>(`/superadmin/tenants/${id}/notes`),
  createTenantNote:  (id: string, note: string)     => saFetch<any>(`/superadmin/tenants/${id}/notes`, {
    method: 'POST', body: JSON.stringify({ note }),
  }),
  deleteTenantNote:  (tenantId: string, noteId: string) => saFetch<any>(`/superadmin/tenants/${tenantId}/notes/${noteId}`, { method: 'DELETE' }),

  // LOTE 325: plan, precio y modulos por local (reemplaza los modulos premium viejos, cuyo endpoint no existia)
  getTenantModules: (id: string) => saFetch<TenantModulesSA>(`/superadmin/tenants/${id}/modules`),
  setTenantModule: (id: string, module: string, state: 'plan' | 'on' | 'off') =>
    saFetch<TenantModulesSA>(`/superadmin/tenants/${id}/modules/${module}`, { method: 'PUT', body: JSON.stringify({ state }) }),
  getPlanImpact: (id: string, plan: 'BASICO' | 'TODO') => saFetch<PlanImpactSA>(`/superadmin/tenants/${id}/plan-impact?plan=${plan}`),
  changePlanConfirmed: (id: string, plan: 'BASICO' | 'TODO') =>
    saFetch<Tenant>(`/superadmin/tenants/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan, confirm: true }) }),
  changePrice: (id: string, priceCLP: number) =>
    saFetch<{ plan: string; priceCLP: number; previousPriceCLP: number }>(`/superadmin/tenants/${id}/price`, { method: 'PATCH', body: JSON.stringify({ priceCLP }) }),

  // TAREA 332: cartera, cobranza por local, Dar dias y dias de gracia
  getCartera: () => saFetch<CarteraRow[]>('/superadmin/cartera'),
  getTenantCobranza: (id: string) => saFetch<CobranzaSA>(`/superadmin/tenants/${id}/cobranza`),
  giveDays: (id: string, days: number, reason: string) =>
    saFetch<CobranzaSA & { kind: 'trial' | 'periodo'; days: number }>(`/superadmin/tenants/${id}/give-days`, { method: 'POST', body: JSON.stringify({ days, reason }) }),
  setGraceDays: (id: string, graceDays: number) =>
    saFetch<CobranzaSA>(`/superadmin/tenants/${id}/grace`, { method: 'PATCH', body: JSON.stringify({ graceDays }) }),
};

export default superadminService;