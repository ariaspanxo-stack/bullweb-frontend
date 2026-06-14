/**
 * BULLWEB ENTERPRISE — Admin Service (Frontend)
 * Cliente HTTP para todos los endpoints de administración.
 */

import api from './api';

// ---------------------------------------------------------------------------
// Tipos compartidos
// ---------------------------------------------------------------------------
export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Permission {
  module:  string;
  action:  string;
  allowed: boolean;
}

export interface PermissionMatrix {
  [module: string]: { [action: string]: boolean };
}

export interface AdminRole {
  id:             string;
  name:           string;
  description:    string | null;
  isSystem:       boolean;
  isTemplate?:    boolean;
  color:          string | null;
  userCount:      number;
  permissionCount?: number;
  matrix:         PermissionMatrix;
}

export interface AdminUser {
  id:           string;
  email:        string;
  bullwebEmail?: string | null;
  loginEmail?:  string;
  name:         string;
  phone:        string | null;
  active:       boolean;
  roleId:       string;
  createdAt:    string;
  hasPin?:      boolean;
  roles:        { id: string; name: string; color: string | null } | null;
  user_security_profiles: {
    twoFactorEnabled: boolean;
    failedAttempts:   number;
    lockedUntil:      string | null;
    lastPasswordAt:   string | null;
  } | null;
}

export interface AuditLog {
  id:         string;
  action:     string;
  module:     string;
  severity:   AuditSeverity;
  actorEmail: string | null;
  targetDesc: string | null;
  ipAddress:  string | null;
  createdAt:  string;
  actor:      { id: string; name: string; email: string } | null;
  branch:     { id: string; name: string } | null;
}

export interface Branch {
  id:          string;
  name:        string;
  slug:        string;
  address:     string | null;
  phone:       string | null;
  email:       string | null;
  timezone:    string;
  currency:    string;
  taxRate:     number;
  isActive:    boolean;
  config:      Record<string, unknown>;
  userCount:   number;
  deviceCount: number;
  createdAt:   string;
  updatedAt:   string;
}

export interface BranchTemplate {
  id:          string;
  name:        string;
  description: string | null;
  config:      Record<string, unknown>;
}

export type DeviceType   = 'PRINTER' | 'DISPLAY' | 'KIOSK' | 'POS_TERMINAL' | 'KDS' | 'SCANNER';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNKNOWN';

export interface Device {
  id:              string;
  name:            string;
  type:            DeviceType;
  model:           string | null;
  ipAddress:       string | null;
  macAddress:      string | null;
  zone:            string | null;
  config:          Record<string, unknown>;
  status:          DeviceStatus;
  isActive:        boolean;
  lastSeenAt:      string | null;
  lastErrorAt:     string | null;
  lastErrorMsg:    string | null;
  paperLevel:      number | null;
  firmwareVersion: string | null;
  createdAt:       string;
  updatedAt:       string;
  branch:          { id: string; name: string; slug: string } | null;
}

export interface ApiKey {
  id:          string;
  name:        string;
  keyPrefix:   string;
  scopes:      string[];
  allowedIPs:  string[];
  lastUsedAt:  string | null;
  expiresAt:   string | null;
  isActive:    boolean;
  createdBy:   string | null;
  createdAt:   string;
}

export interface Webhook {
  id:          string;
  name:        string;
  url:         string;
  secret:      string;
  events:      string[];
  isActive:    boolean;
  lastSentAt:  string | null;
  lastStatus:  number | null;
  failCount:   number;
  createdAt:   string;
}

// ============================================================
// Sprint 4: Alerts / Settings
// ============================================================

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AdminAlert {
  id:           string;
  severity:     AlertSeverity;
  type:         string;
  message:      string;
  resolved:     boolean;
  branchId:     string | null;
  meta:         Record<string, unknown> | null;
  resolvedAt:   string | null;
  resolvedBy:   string | null;
  createdAt:    string;
}

export interface ConfigEntry {
  key:         string;
  value:       string;
  label:       string;
  group:       string;
  description: string | null;
  updatedAt:   string;
}

export type GroupedSettings = Record<string, ConfigEntry[]>;

export interface ServiceStatus {
  name:       string;
  status:     'ok' | 'degraded' | 'down';
  latencyMs:  number | null;
  details:    string;
}

export interface SystemMetrics {
  uptimeSeconds:  number;
  memoryUsedMB:   number;
  memoryTotalMB:  number;
  memoryPct:      number;
  cpuCount:       number;
  nodeVersion:    string;
  platform:       string;
  pid:            number;
  restartCount:   number | null;
}

export interface HealthReport {
  timestamp:     string;
  overallStatus: 'healthy' | 'degraded' | 'down';
  services:      ServiceStatus[];
  system:        SystemMetrics;
  recentErrors:  { last1h: number; last24h: number };
  activeAlerts:  number;
}

export interface DayPoint  { date: string; count: number }
export interface ModuleBar { module: string; count: number }
export interface ActionBar { action: string; count: number }
export interface SeverityBreakdown { severity: string; count: number }

export interface AnalyticsReport {
  activityLast7Days:    DayPoint[];
  activityLast30Days:   DayPoint[];
  topModules:           ModuleBar[];
  topActions:           ActionBar[];
  severityBreakdown:    SeverityBreakdown[];
  newUsersLast30Days:   DayPoint[];
  totalAuditLogs:       number;
  avgLogsPerDay:        number;
  peakDay:              DayPoint | null;
}

// ---------------------------------------------------------------------------
// Business Analytics
// ---------------------------------------------------------------------------
export interface BusinessKPIs {
  revenue:        number;
  orders:         number;
  avgTicket:      number;
  revenuePrev:    number;
  ordersPrev:     number;
  avgTicketPrev:  number;
  revenueGrowth:  number;
  ordersGrowth:   number;
}

export interface BizTrendPoint   { date: string; revenue: number; orders: number }
export interface BizTopProduct   { id: string; name: string; quantity: number; revenue: number }
export interface BizPaymentMethod{ name: string; amount: number; count: number }
export interface BizHourPoint    { hour: number; orders: number; revenue: number }
export interface BizOrderType    { type: string; count: number; revenue: number }

export interface BusinessAnalyticsReport {
  kpis:           BusinessKPIs;
  trend:          BizTrendPoint[];
  topProducts:    BizTopProduct[];
  paymentMethods: BizPaymentMethod[];
  byHour:         BizHourPoint[];
  orderTypes:     BizOrderType[];
}

export interface MaintenanceStatus {
  enabled:   boolean;
  message:   string;
  endAt:     string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------
export interface AuditLogRow {
  id:          string;
  actorId:     string | null;
  actorEmail:  string | null;
  actorRole:   string | null;
  action:      string;
  module:      string;
  targetType:  string | null;
  targetId:    string | null;
  targetDesc:  string | null;
  severity:    string;
  ipAddress:   string | null;
  createdAt:   string;
  before?:     unknown;
  after?:      unknown;
}

export interface LogsFilter {
  page?:       number;
  limit?:      number;
  actorEmail?: string;
  action?:     string;
  module?:     string;
  severity?:   string;
  from?:       string;
  to?:         string;
  search?:     string;
}

export interface LogsResult {
  data:  AuditLogRow[];
  total: number;
  page:  number;
  pages: number;
}

// ---------------------------------------------------------------------------
// IP Blocklist
// ---------------------------------------------------------------------------
export interface IpEntry {
  id:          string;
  ipAddress:   string;
  reason:      string | null;
  blockedBy:   string | null;
  blockedById: string | null;
  blockedAt:   string;
  expiresAt:   string | null;
  isActive:    boolean;
  notes:       string | null;
}

export interface IpBlocklistStats {
  total:   number;
  active:  number;
  expired: number;
}

export interface IpBlocklistResult {
  data:  IpEntry[];
  stats: IpBlocklistStats;
}

export interface BlockIpParams {
  ipAddress: string;
  reason?:   string;
  expiresAt?: string | null;
  notes?:    string;
}

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------
export interface FeatureFlag {
  key:         string;
  shortKey:    string;
  label:       string;
  description: string;
  category:    string;
  enabled:     boolean;
  updatedBy:   string | null;
  updatedAt:   string | null;
  definition:  {
    key: string; label: string; description: string;
    category: string; default: boolean; dangerous?: boolean;
  } | null;
}

export interface FeatureFlagsResult {
  data: FeatureFlag[];
}

// ---------------------------------------------------------------------------
// Email / SMTP
// ---------------------------------------------------------------------------
export interface SmtpConfig {
  host:      string;
  port:      number;
  secure:    boolean;
  user:      string;
  pass:      string;
  fromName:  string;
  fromEmail: string;
}

export interface EmailTemplate {
  id:        string;
  slug:      string;
  name:      string;
  subject:   string;
  htmlBody:  string;
  textBody?: string;
  variables: string[];
  isActive:  boolean;
  category:  string;
}

export interface EmailLogEntry {
  id:           string;
  toEmail:      string;
  toName?:      string;
  subject:      string;
  templateSlug?: string;
  status:       'sent' | 'failed';
  errorMessage?: string;
  sentBy:       string;
  sentAt:       string;
  messageId?:   string;
}

export interface EmailStats {
  total:  number;
  sent:   number;
  failed: number;
  today:  number;
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------
export interface BackupRecord {
  id:           string;
  filename:     string;
  sizeBytes:    number;
  status:       'pending' | 'running' | 'completed' | 'failed';
  type:         'manual' | 'scheduled' | 'pre-update';
  notes?:       string;
  createdBy?:   string;
  createdAt:    string;
  completedAt?: string;
  errorMsg?:    string;
}

export interface BackupStats {
  total:          number;
  completed:      number;
  failed:         number;
  lastBackupAt:   string | null;
  totalSizeBytes: number;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------
export interface ScheduledTask {
  id:             string;
  name:           string;
  description?:   string;
  cronExpression: string;
  action:         string;
  params:         Record<string, any>;
  enabled:        boolean;
  lastRunAt?:     string;
  nextRunAt?:     string;
  lastStatus?:    'success' | 'failed' | 'running';
  lastError?:     string;
  runCount:       number;
  createdBy?:     string;
  createdAt:      string;
  updatedAt:      string;
}

export interface SchedulerAction {
  value: string;
  label: string;
  params: Record<string, any>;
}

export const AVAILABLE_SCOPES = [
  'orders:read', 'orders:write',
  'menu:read',   'menu:write',
  'customers:read', 'customers:write',
  'reports:read',
  'webhooks:write',
  'admin:read',
] as const;

export const WEBHOOK_EVENTS = [
  'order.created',  'order.updated',  'order.completed', 'order.cancelled',
  'payment.success','payment.failed',
  'customer.created','customer.updated',
  'table.opened',   'table.closed',
  'inventory.low',
  'device.offline', 'device.error',
] as const;

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

// ---------------------------------------------------------------------------
// Admin Service
// ---------------------------------------------------------------------------
export const adminService = {

  // ============================================================
  // USERS
  // ============================================================
  async listUsers(params?: {
    search?:   string;
    roleId?:   string;
    branchId?: string;
    active?:   boolean;
    page?:     number;
    limit?:    number;
  }): Promise<PaginatedResponse<AdminUser>> {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },

  async getUser(id: string): Promise<AdminUser & { recentActivity: AuditLog[] }> {
    const { data } = await api.get(`/admin/users/${id}`);
    return data;
  },

  async createUser(input: {
    firstName:   string;
    lastName:    string;
    email:       string;
    roleId:      string;
    branchIds?:  string[];
    sendInvite?: boolean;
    comment?:    string;
    phone?:      string;
  }): Promise<AdminUser> {
    const { data } = await api.post('/admin/users', input);
    return data;
  },

  async updateUser(id: string, input: {
    firstName?: string;
    lastName?:  string;
    email?:     string;
    phone?:     string;
    active?:    boolean;
  }): Promise<AdminUser> {
    const { data } = await api.patch(`/admin/users/${id}`, input);
    return data;
  },

  async bulkAction(input: {
    ids:    string[];
    action: 'SUSPEND' | 'ACTIVATE' | 'RESET_PASSWORD' | 'REVOKE_SESSIONS' | 'DELETE';
  }): Promise<{ results: Array<{ id: string; success: boolean; error?: string }> }> {
    const { data } = await api.post('/admin/users/bulk-action', input);
    return data;
  },

  async assignRole(
    userId:  string,
    input:   { roleId: string; branchId?: string; expiresAt?: string; comment?: string }
  ): Promise<void> {
    await api.post(`/admin/users/${userId}/assign-role`, input);
  },

  async simulateSession(userId: string): Promise<{ token: string; expiresAt: string; user: { name: string; email: string } }> {
    const { data } = await api.post(`/admin/users/${userId}/simulate`);
    return data;
  },

  async resetUserPassword(userId: string): Promise<{ temporaryPassword: string; userName: string; userEmail: string }> {
    const { data } = await api.post(`/admin/users/${userId}/reset-password`);
    return data;
  },

  async setUserPin(userId: string, pin: string): Promise<void> {
    await api.patch(`/admin/users/${userId}/pin`, { pin });
  },

  async removeUserPin(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}/pin`);
  },

  // ============================================================
  // ROLES
  // ============================================================
  async listRoles(): Promise<AdminRole[]> {
    const { data } = await api.get('/admin/roles');
    // El backend devuelve { success: true, data: [...] }
    const result = (data as any).data ?? data;
    return Array.isArray(result) ? result : [];
  },

  /** Carga los roles del tenant y los mapea al formato CustomRole que usa la UI */
  async listMatrixRoles(): Promise<CustomRole[]> {
    const roles = await this.listRoles();
    return roles.map(r => ({
      id:               r.id,
      name:             r.name,
      description:      r.description,
      color:            r.color ?? '#6366f1',
      is_system:        r.isSystem,
      permission_count: r.permissionCount ?? 0,
      user_count:       r.userCount,
      created_at:       '',
      updated_at:       '',
    }));
  },

  /** Stats reales del tenant desde /admin/roles/stats */
  async getRolesStats(): Promise<RBACStats> {
    const d: any = await api.get('/admin/roles/stats');
    return {
      total_roles:        d.total        ?? 0,
      system_roles:       d.system       ?? 0,
      custom_roles_count: d.custom       ?? 0,
      total_permissions:  d.activePerms  ?? 0,
      modules_count:      0,
      actions:            [],
    };
  },

  async getRole(id: string): Promise<AdminRole> {
    const { data } = await api.get(`/admin/roles/${id}`);
    return data;
  },

  async getRoleTemplates(): Promise<Array<{ name: string; description: string; matrix: PermissionMatrix }>> {
    const { data } = await api.get('/admin/roles/templates');
    return data;
  },

  async createRole(input: {
    name:        string;
    description?: string;
    color?:       string;
    matrix?:      PermissionMatrix;
  }): Promise<AdminRole> {
    const { data } = await api.post('/admin/roles', input);
    return data;
  },

  async updateRole(roleId: string, input: { name?: string; description?: string; color?: string }): Promise<AdminRole> {
    const { data } = await api.patch(`/admin/roles/${roleId}`, input);
    return data;
  },

  async updateRoleMatrix(roleId: string, matrix: PermissionMatrix): Promise<void> {
    await api.patch(`/admin/roles/${roleId}/matrix`, matrix);
  },

  async cloneRole(roleId: string, newName: string): Promise<AdminRole> {
    const { data } = await api.post(`/admin/roles/${roleId}/clone`, { newName });
    return data;
  },

  async deleteRole(roleId: string): Promise<void> {
    await api.delete(`/admin/roles/${roleId}`);
  },

  // ============================================================
  // AUDIT
  // ============================================================
  async listAuditLogs(params?: {
    branchId?:   string;
    actorId?:    string;
    actorEmail?: string;
    module?:     string;
    action?:     string;
    severity?:   AuditSeverity;
    dateFrom?:   string;
    dateTo?:     string;
    search?:     string;
    page?:       number;
    limit?:      number;
  }): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await api.get('/admin/audit', { params });
    return data;
  },

  async getAuditStats(params?: { dateFrom?: string; dateTo?: string }) {
    const { data } = await api.get('/admin/audit/stats', { params });
    return data;
  },

  async exportAuditCSV(params?: { module?: string; severity?: string; dateFrom?: string; dateTo?: string }): Promise<void> {
    const response = await api.get('/admin/audit/export', { params, responseType: 'blob' });
    const blob     = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url      = URL.createObjectURL(blob);
    const link     = document.createElement('a');
    link.href      = url;
    link.download  = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // ============================================================
  // BRANCHES
  // ============================================================
  async listBranches(): Promise<Branch[]> {
    const { data } = await api.get<{ success: boolean; data: Branch[] } | Branch[]>('/admin/branches');
    // El backend responde { success: true, data: [...] }
    return Array.isArray(data) ? data : (data as any).data ?? [];
  },

  /** Listado ligero de sucursales del tenant — exclusivo para el dropdown de impresoras/agentes */
  async listBranchesForAgents(): Promise<{ id: string; name: string }[]> {
    const { data } = await api.get<{ data: { id: string; name: string }[] }>('/admin/agents/branches');
    return data.data ?? [];
  },

  async getBranch(id: string): Promise<Branch> {
    const { data } = await api.get(`/admin/branches/${id}`);
    return data;
  },

  async getBranchTemplates(): Promise<BranchTemplate[]> {
    const { data } = await api.get('/admin/branches/templates');
    return data;
  },

  async createBranch(input: {
    name:        string;
    slug?:       string;
    address?:    string;
    phone?:      string;
    email?:      string;
    timezone?:   string;
    currency?:   string;
    taxRate?:    number;
    templateId?: string;
  }): Promise<Branch> {
    const { data } = await api.post('/admin/branches', input);
    return data;
  },

  async updateBranch(id: string, input: Partial<{
    name:     string;
    address:  string;
    phone:    string;
    email:    string;
    timezone: string;
    currency: string;
    taxRate:  number;
    config:   Record<string, unknown>;
  }>): Promise<Branch> {
    const { data } = await api.patch(`/admin/branches/${id}`, input);
    return data;
  },

  async toggleBranchActive(id: string): Promise<Branch> {
    const { data } = await api.patch(`/admin/branches/${id}/toggle`);
    return data;
  },

  async deleteBranch(id: string): Promise<void> {
    await api.delete(`/admin/branches/${id}`);
  },

  // ============================================================
  // DEVICES
  // ============================================================
  async listDevices(params?: { branchId?: string; type?: string; status?: string }): Promise<Device[]> {
    const { data } = await api.get('/admin/devices', { params });
    return data;
  },

  async getDevice(id: string): Promise<Device> {
    const { data } = await api.get(`/admin/devices/${id}`);
    return data;
  },

  async createDevice(input: {
    branchId:   string;
    name:       string;
    type:       DeviceType;
    model?:     string;
    ipAddress?: string;
    macAddress?: string;
    zone?:      string;
  }): Promise<Device> {
    const { data } = await api.post('/admin/devices', input);
    return data;
  },

  async updateDevice(id: string, input: Partial<{
    name: string; model: string; ipAddress: string; macAddress: string;
    zone: string; firmwareVersion: string;
  }>): Promise<Device> {
    const { data } = await api.patch(`/admin/devices/${id}`, input);
    return data;
  },

  async toggleDeviceActive(id: string): Promise<Device> {
    const { data } = await api.patch(`/admin/devices/${id}/toggle`);
    return data;
  },

  async deleteDevice(id: string): Promise<void> {
    await api.delete(`/admin/devices/${id}`);
  },

  // ============================================================
  // API KEYS
  // ============================================================
  async listApiKeys(): Promise<ApiKey[]> {
    const { data } = await api.get('/admin/keys');
    return data;
  },

  async createApiKey(input: {
    name:        string;
    scopes:      string[];
    allowedIPs?: string[];
    expiresAt?:  string | null;
  }): Promise<ApiKey & { rawKey: string }> {
    const { data } = await api.post('/admin/keys', input);
    return data;
  },

  async toggleApiKeyActive(id: string): Promise<ApiKey> {
    const { data } = await api.patch(`/admin/keys/${id}/toggle`);
    return data;
  },

  async deleteApiKey(id: string): Promise<void> {
    await api.delete(`/admin/keys/${id}`);
  },

  // ============================================================
  // WEBHOOKS
  // ============================================================
  async listWebhooks(): Promise<Webhook[]> {
    const { data } = await api.get('/admin/webhooks');
    return data;
  },

  async createWebhook(input: {
    name:   string;
    url:    string;
    events: string[];
  }): Promise<Webhook> {
    const { data } = await api.post('/admin/webhooks', input);
    return data;
  },

  async updateWebhook(id: string, input: Partial<{ name: string; url: string; events: string[] }>): Promise<Webhook> {
    const { data } = await api.patch(`/admin/webhooks/${id}`, input);
    return data;
  },

  async toggleWebhookActive(id: string): Promise<Webhook> {
    const { data } = await api.patch(`/admin/webhooks/${id}/toggle`);
    return data;
  },

  async rotateWebhookSecret(id: string): Promise<Webhook> {
    const { data } = await api.post(`/admin/webhooks/${id}/rotate-secret`);
    return data;
  },

  async testWebhook(id: string): Promise<{ success: boolean; status: number; body: string }> {
    const { data } = await api.post(`/admin/webhooks/${id}/test`);
    return data;
  },

  async deleteWebhook(id: string): Promise<void> {
    await api.delete(`/admin/webhooks/${id}`);
  },

  // ============================================================
  // ALERTS
  // ============================================================
  async listAlerts(params?: { resolved?: boolean; severity?: AlertSeverity }): Promise<AdminAlert[]> {
    const { data } = await api.get('/admin/alerts', { params });
    return data;
  },

  async getAlertCount(): Promise<{ total: number; critical: number }> {
    const { data } = await api.get('/admin/alerts/count');
    return data;
  },

  async resolveAlert(id: string): Promise<void> {
    await api.patch(`/admin/alerts/${id}/resolve`);
  },

  async resolveAllAlerts(): Promise<void> {
    await api.post('/admin/alerts/resolve-all');
  },

  async deleteAlert(id: string): Promise<void> {
    await api.delete(`/admin/alerts/${id}`);
  },

  // ============================================================
  // SETTINGS
  // ============================================================
  async getSettings(): Promise<GroupedSettings> {
    const { data } = await api.get('/admin/settings');
    return data;
  },

  async getFlatSettings(): Promise<Record<string, string>> {
    const { data } = await api.get('/admin/settings/flat');
    return data;
  },

  async updateSettings(updates: Record<string, string>): Promise<ConfigEntry[]> {
    const { data } = await api.patch('/admin/settings', { updates });
    return data;
  },

  // ============================================================
  // HEALTH
  // ============================================================
  async getHealth(): Promise<HealthReport> {
    const { data } = await api.get('/admin/health');
    return data;
  },

  // ============================================================
  // ANALYTICS
  // ============================================================
  async getAnalytics(): Promise<AnalyticsReport> {
    const { data } = await api.get('/admin/analytics');
    return data;
  },

  async getBusinessAnalytics(params?: { dateFrom?: string; dateTo?: string }): Promise<BusinessAnalyticsReport> {
    const { data } = await api.get('/admin/analytics/business', { params });
    return data.data;
  },

  // ============================================================
  // MAINTENANCE
  // ============================================================
  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const { data } = await api.get('/admin/maintenance');
    return data;
  },

  async toggleMaintenance(params: { enabled: boolean; message?: string; endAt?: string | null }): Promise<MaintenanceStatus> {
    const { data } = await api.post('/admin/maintenance', params);
    return data;
  },

  // ============================================================
  // LOGS
  // ============================================================
  async getLogs(filter: LogsFilter): Promise<LogsResult> {
    const { data } = await api.get('/admin/logs', { params: filter });
    return data;
  },

  async getLogById(id: string): Promise<AuditLogRow> {
    const { data } = await api.get(`/admin/logs/${id}`);
    return data;
  },

  async getLogActions(): Promise<string[]> {
    const { data } = await api.get('/admin/logs/actions');
    return data;
  },

  // ============================================================
  // IP BLOCKLIST
  // ============================================================
  async getIpBlocklist(onlyActive = false): Promise<IpBlocklistResult> {
    const { data } = await api.get('/admin/ip-blocklist', { params: { active: onlyActive } });
    return data;
  },

  async blockIp(params: BlockIpParams): Promise<IpEntry> {
    const { data } = await api.post('/admin/ip-blocklist', params);
    return data;
  },

  async unblockIp(id: string): Promise<IpEntry> {
    const { data } = await api.patch(`/admin/ip-blocklist/${id}/unblock`);
    return data;
  },

  async deleteIpEntry(id: string): Promise<void> {
    await api.delete(`/admin/ip-blocklist/${id}`);
  },

  async checkIp(ip: string): Promise<{ ip: string; blocked: boolean }> {
    const { data } = await api.get(`/admin/ip-blocklist/check/${ip}`);
    return data;
  },

  // ============================================================
  // FEATURE FLAGS
  // ============================================================
  async getFeatureFlags(): Promise<FeatureFlagsResult> {
    const { data } = await api.get('/admin/feature-flags');
    return data;
  },

  async toggleFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    const { data } = await api.patch(`/admin/feature-flags/${key}/toggle`, { enabled });
    return data;
  },

  async resetFeatureFlag(key: string): Promise<FeatureFlag> {
    const { data } = await api.post(`/admin/feature-flags/${key}/reset`);
    return data;
  },

  async createFeatureFlag(params: { shortKey: string; label: string; description?: string; enabled?: boolean }): Promise<FeatureFlag> {
    const { data } = await api.post('/admin/feature-flags', params);
    return data;
  },

  // ---------------------------------------------------------------------------
  // EMAIL / SMTP
  // ---------------------------------------------------------------------------
  async getSmtpConfig(): Promise<SmtpConfig | null> {
    const { data } = await api.get('/admin/email/config');
    return data;
  },

  async saveSmtpConfig(config: SmtpConfig): Promise<void> {
    await api.post('/admin/email/config', config);
  },

  async testSmtp(payload: { testTo: string } & Partial<SmtpConfig>): Promise<{ ok: boolean; message: string; messageId?: string }> {
    const { data } = await api.post('/admin/email/test-smtp', payload);
    return data;
  },

  async listEmailTemplates(): Promise<EmailTemplate[]> {
    const { data } = await api.get('/admin/email/templates');
    return data;
  },

  async saveEmailTemplate(tpl: Partial<EmailTemplate> & { slug: string; name: string; subject: string; htmlBody: string }): Promise<EmailTemplate> {
    const { data } = await api.post('/admin/email/templates', tpl);
    return data;
  },

  async deleteEmailTemplate(id: string): Promise<void> {
    await api.delete(`/admin/email/templates/${id}`);
  },

  async getEmailLogs(limit = 100): Promise<{ data: EmailLogEntry[]; stats: EmailStats }> {
    const { data } = await api.get(`/admin/email/logs?limit=${limit}`);
    return data;
  },

  // ---------------------------------------------------------------------------
  // BACKUP
  // ---------------------------------------------------------------------------
  async listBackups(): Promise<{ data: BackupRecord[]; stats: BackupStats }> {
    const { data } = await api.get('/admin/backup');
    return data;
  },

  async createBackup(params?: { type?: string; notes?: string }): Promise<BackupRecord> {
    const { data } = await api.post('/admin/backup', params ?? { type: 'manual' });
    return data;
  },

  getBackupDownloadUrl(id: string): string {
    return `/api/admin/backup/${id}/download`;
  },

  async deleteBackup(id: string): Promise<void> {
    await api.delete(`/admin/backup/${id}`);
  },

  // ---------------------------------------------------------------------------
  // SCHEDULER
  // ---------------------------------------------------------------------------
  async listScheduledTasks(): Promise<ScheduledTask[]> {
    const { data } = await api.get('/admin/scheduler');
    return data;
  },

  async getSchedulerActions(): Promise<SchedulerAction[]> {
    const { data } = await api.get('/admin/scheduler/actions');
    return data;
  },

  async createScheduledTask(params: {
    name: string; description?: string; cronExpression: string;
    action: string; params?: Record<string, any>; enabled?: boolean;
  }): Promise<ScheduledTask> {
    const { data } = await api.post('/admin/scheduler', params);
    return data;
  },

  async updateScheduledTask(id: string, params: Partial<{
    name: string; description: string; cronExpression: string;
    action: string; params: Record<string, any>; enabled: boolean;
  }>): Promise<ScheduledTask> {
    const { data } = await api.patch(`/admin/scheduler/${id}`, params);
    return data;
  },

  async toggleScheduledTask(id: string): Promise<ScheduledTask> {
    const { data } = await api.patch(`/admin/scheduler/${id}/toggle`);
    return data;
  },

  async runScheduledTaskNow(id: string): Promise<{ ok: boolean; message: string }> {
    const { data } = await api.post(`/admin/scheduler/${id}/run`);
    return data;
  },

  async deleteScheduledTask(id: string): Promise<void> {
    await api.delete(`/admin/scheduler/${id}`);
  },

  // ── 2FA Management ─────────────────────────────────────────────────────────

  async list2FAUsers(): Promise<TwoFactorUser[]> {
    const { data } = await api.get('/admin/2fa/users');
    return data;
  },

  async get2FAStats(): Promise<TwoFactorStats> {
    const { data } = await api.get('/admin/2fa/stats');
    return data;
  },

  async setup2FA(userId: string): Promise<TwoFactorSetup> {
    const { data } = await api.post(`/admin/2fa/setup/${userId}`);
    return data;
  },

  async verify2FA(userId: string, token: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/admin/2fa/verify/${userId}`, { token });
    return data;
  },

  async disable2FA(userId: string): Promise<void> {
    await api.post(`/admin/2fa/disable/${userId}`);
  },

  async get2FALog(userId?: string, limit = 100): Promise<TwoFactorLogEntry[]> {
    const url = userId ? `/admin/2fa/log/${userId}` : '/admin/2fa/log';
    const { data } = await api.get(url, { params: { limit } });
    return data;
  },

  // ── Notifications ──────────────────────────────────────────────────────────

  async listNotifications(params?: {
    type?: string; category?: string; is_read?: boolean; limit?: number; offset?: number;
  }): Promise<AdminNotification[]> {
    const { data } = await api.get('/admin/notifications', { params });
    return data;
  },

  async getNotificationStats(): Promise<NotificationStats> {
    const { data } = await api.get('/admin/notifications/stats');
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get('/admin/notifications/unread-count');
    return data.count;
  },

  async createNotification(payload: {
    type: string; category: string; title: string; message: string; link?: string;
  }): Promise<AdminNotification> {
    const { data } = await api.post('/admin/notifications', payload);
    return data;
  },

  async markNotificationRead(id: string): Promise<void> {
    await api.patch(`/admin/notifications/${id}/read`);
  },

  async markAllNotificationsRead(): Promise<number> {
    const { data } = await api.patch('/admin/notifications/mark-all-read');
    return data.updated;
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/admin/notifications/${id}`);
  },

  async deleteReadNotifications(): Promise<number> {
    const { data } = await api.delete('/admin/notifications/read');
    return data.deleted;
  },

  // ── System Modules ───────────────────────────────────────────────────────────────

  async listModules(): Promise<SystemModule[]> {
    const { data } = await api.get('/admin/modules');
    return data;
  },

  async getModuleStats(): Promise<ModuleStats> {
    const { data } = await api.get('/admin/modules/stats');
    return data;
  },

  async toggleModule(key: string): Promise<SystemModule> {
    const { data } = await api.patch(`/admin/modules/${key}/toggle`);
    return data;
  },

  async updateModuleSettings(key: string, settings: Record<string, unknown>): Promise<SystemModule> {
    const { data } = await api.patch(`/admin/modules/${key}/settings`, { settings });
    return data;
  },

  async getModuleLog(key?: string, limit = 100): Promise<ModuleLogEntry[]> {
    const url = key ? `/admin/modules/${key}/log` : '/admin/modules/log';
    const { data } = await api.get(url, { params: { limit } });
    return data;
  },

  // ── Security Policy ──────────────────────────────────────────────────────
  async getSecurityPolicy(): Promise<SecurityPolicy> {
    const { data } = await api.get('/admin/security-policy');
    return data;
  },

  async updateSecurityPolicy(patch: Partial<SecurityPolicy> & { notes?: string }): Promise<SecurityPolicy> {
    const { data } = await api.patch('/admin/security-policy', patch);
    return data;
  },

  async getSecurityPolicyLog(limit = 50): Promise<PolicyLogEntry[]> {
    const { data } = await api.get('/admin/security-policy/log', { params: { limit } });
    return data;
  },

  async validatePassword(password: string, username?: string): Promise<{ valid: boolean; errors: string[] }> {
    const { data } = await api.post('/admin/security-policy/validate-password', { password, username });
    return data;
  },

  // ── Rate Limiter ───────────────────────────────────────────────────────────────
  async getRateLimiterStats(): Promise<RateLimitStats> {
    const { data } = await api.get('/admin/rate-limiter/stats');
    return data;
  },

  async listRateLimitRules(): Promise<RateLimitRule[]> {
    const { data } = await api.get('/admin/rate-limiter/rules');
    return data;
  },

  async createRateLimitRule(payload: Omit<RateLimitRule, 'id' | 'created_at' | 'updated_at'>): Promise<RateLimitRule> {
    const { data } = await api.post('/admin/rate-limiter/rules', payload);
    return data;
  },

  async updateRateLimitRule(id: string, patch: Partial<RateLimitRule>): Promise<RateLimitRule> {
    const { data } = await api.patch(`/admin/rate-limiter/rules/${id}`, patch);
    return data;
  },

  async toggleRateLimitRule(id: string): Promise<RateLimitRule> {
    const { data } = await api.patch(`/admin/rate-limiter/rules/${id}/toggle`);
    return data;
  },

  async deleteRateLimitRule(id: string): Promise<void> {
    await api.delete(`/admin/rate-limiter/rules/${id}`);
  },

  async listRateLimitEvents(limit = 100, onlyBlocked = false): Promise<RateLimitEvent[]> {
    const { data } = await api.get('/admin/rate-limiter/events', { params: { limit, blocked: onlyBlocked } });
    return data;
  },

  // ── Data Privacy & GDPR ─────────────────────────────────────────────────────────
  async getDataPrivacyStats(): Promise<DataPrivacyStats> {
    const { data } = await api.get('/admin/data-privacy/stats');
    return data;
  },

  async listDataRequests(params?: { status?: string; type?: string; limit?: number }): Promise<DataRequest[]> {
    const { data } = await api.get('/admin/data-privacy/requests', { params });
    return data;
  },

  async createDataRequest(payload: Pick<DataRequest, 'type'|'requester_email'|'requester_name'|'description'>): Promise<DataRequest> {
    const { data } = await api.post('/admin/data-privacy/requests', payload);
    return data;
  },

  async updateDataRequestStatus(
    id: string,
    action: 'start'|'complete'|'reject'|'cancel',
    opts?: { notes?: string; rejection_reason?: string; export_url?: string },
  ): Promise<DataRequest> {
    const { data } = await api.patch(`/admin/data-privacy/requests/${id}/${action}`, opts ?? {});
    return data;
  },

  async listConsentRecords(params?: { email?: string; type?: string; limit?: number }): Promise<ConsentRecord[]> {
    const { data } = await api.get('/admin/data-privacy/consents', { params });
    return data;
  },

  async listRetentionPolicies(): Promise<RetentionPolicy[]> {
    const { data } = await api.get('/admin/data-privacy/retention-policies');
    return data;
  },

  async updateRetentionPolicy(id: string, patch: Partial<RetentionPolicy>): Promise<RetentionPolicy> {
    const { data } = await api.patch(`/admin/data-privacy/retention-policies/${id}`, patch);
    return data;
  },

  // ── RBAC
  async getRBACStats(): Promise<RBACStats> {
    const { data } = await api.get('/admin/rbac/stats');
    return data;
  },
  async getRBACModules(): Promise<RBACModule[]> {
    const { data } = await api.get('/admin/rbac/modules');
    return data;
  },
  async listRBACRoles(): Promise<CustomRole[]> {
    const { data } = await api.get('/admin/rbac/roles');
    return data;
  },
  async getRBACRole(id: string): Promise<CustomRole> {
    const { data } = await api.get(`/admin/rbac/roles/${id}`);
    return data;
  },
  async createRBACRole(body: Partial<CustomRole> & { templateKey?: string }): Promise<CustomRole> {
    const { data } = await api.post('/admin/rbac/roles', body);
    return data;
  },
  async updateRBACRole(id: string, body: Partial<CustomRole>): Promise<CustomRole> {
    const { data } = await api.patch(`/admin/rbac/roles/${id}`, body);
    return data;
  },
  async deleteRBACRole(id: string): Promise<void> {
    await api.delete(`/admin/rbac/roles/${id}`);
  },
  async getRolePermissions(id: string): Promise<{ roleId: string; name: string; permissions: string[] }> {
    const { data } = await api.get(`/admin/roles/${id}/permissions`);
    // handleResponse ya ha desenvuelto data.data → data ES { roleId, name, permissions }
    const d = (data as any) ?? {};
    return { roleId: d.roleId ?? id, name: d.name ?? '', permissions: d.permissions ?? [] };
  },
  async setRolePermissions(roleId: string, permissions: string[]): Promise<{ roleId: string; name: string; permissions: string[]; total: number }> {
    const { data } = await api.put(`/admin/roles/${roleId}/permissions`, { permissions });
    // handleResponse ya ha desenvuelto data.data → data ES { roleId, name, permissions, total }
    const d = (data as any);
    if (!d) return { roleId, name: '', permissions, total: permissions.length };
    return d;
  },
  async cloneRBACRole(id: string, newName: string): Promise<CustomRole> {
    const { data } = await api.post(`/admin/rbac/roles/${id}/clone`, { newName });
    return data;
  },

  // ── Legacy Permission Catalog & individual add/remove ──────────────────────
  async getPermissionsCatalog(): Promise<Record<string, { label: string; permissions: Array<{ key: string; label: string }> }>> {
    const { data } = await api.get('/admin/roles/permissions/catalog');
    return data.data;
  },
  async addRolePermission(roleId: string, permission: string): Promise<{ roleId: string; permissions: string[] }> {
    const { data } = await api.post(`/admin/roles/${roleId}/permissions/${encodeURIComponent(permission)}`);
    return { roleId: (data as any)?.roleId ?? roleId, permissions: (data as any)?.permissions ?? [] };
  },
  async removeRolePermission(roleId: string, permission: string): Promise<{ roleId: string; permissions: string[] }> {
    const { data } = await api.delete(`/admin/roles/${roleId}/permissions/${encodeURIComponent(permission)}`);
    return { roleId: (data as any)?.roleId ?? roleId, permissions: (data as any)?.permissions ?? [] };
  },

  // ── User Permission Overrides
  async getUserOverrides(userId: string): Promise<Array<{ id: string; module: string; action: string; granted: boolean }>> {
    const { data } = await api.get(`/admin/users/${userId}/permission-overrides`);
    return data;
  },
  async setUserOverride(userId: string, input: { module: string; action: string; granted: boolean }): Promise<void> {
    await api.post(`/admin/users/${userId}/permission-overrides`, input);
  },
  async deleteUserOverride(userId: string, overrideId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}/permission-overrides/${overrideId}`);
  },

  // ── Branding
  async getBranding(): Promise<BrandingSetting[]> {
    const { data } = await api.get('/admin/branding');
    return data;
  },
  async getBrandingPublic(): Promise<Record<string, string | null>> {
    const { data } = await api.get('/admin/branding/public');
    return data;
  },
  async getBrandingByCategory(category: string): Promise<BrandingSetting[]> {
    const { data } = await api.get(`/admin/branding/${category}`);
    return data;
  },
  async updateBranding(key: string, value: string): Promise<BrandingSetting> {
    const { data } = await api.patch(`/admin/branding/${key}`, { value });
    return data;
  },
  async bulkUpdateBranding(settings: { key: string; value: string }[]): Promise<{ updated: number }> {
    const { data } = await api.patch('/admin/branding/bulk', { settings });
    return data;
  },
  async resetBrandingCategory(category: string): Promise<{ reset: number }> {
    const { data } = await api.post(`/admin/branding/reset/${category}`);
    return data;
  },

  // ── Integraciones
  async getIntegrationsMeta(): Promise<{ types: IntegrationType[]; events: IntegrationEvent[] }> {
    const { data } = await api.get('/admin/integrations/meta');
    return data;
  },
  async getIntegrationsStats(): Promise<IntegrationStats> {
    const { data } = await api.get('/admin/integrations/stats');
    return data;
  },
  async listIntegrationChannels(): Promise<IntegrationChannel[]> {
    const { data } = await api.get('/admin/integrations');
    return data;
  },
  async createIntegrationChannel(body: Partial<IntegrationChannel>): Promise<IntegrationChannel> {
    const { data } = await api.post('/admin/integrations', body);
    return data;
  },
  async updateIntegrationChannel(id: string, body: Partial<IntegrationChannel>): Promise<IntegrationChannel> {
    const { data } = await api.patch(`/admin/integrations/${id}`, body);
    return data;
  },
  async deleteIntegrationChannel(id: string): Promise<void> {
    await api.delete(`/admin/integrations/${id}`);
  },
  async testIntegrationChannel(id: string): Promise<{ ok: boolean; message: string }> {
    const { data } = await api.post(`/admin/integrations/${id}/test`);
    return data;
  },
  async getIntegrationLogs(channelId?: string, limit = 50): Promise<IntegrationLog[]> {
    const params = new URLSearchParams();
    if (channelId) params.set('channel_id', channelId);
    params.set('limit', String(limit));
    const { data } = await api.get(`/admin/integrations/logs?${params}`);
    return data;
  },

  // ── Sprint 25: License Manager ──────────────────────────────────────────────
  async getLicenseStats(): Promise<LicenseStats> {
    const { data } = await api.get('/admin/license/stats');
    return data;
  },
  async listLicensePlans(): Promise<LicensePlan[]> {
    const { data } = await api.get('/admin/license/plans');
    return data;
  },
  async createLicensePlan(payload: Partial<LicensePlan>): Promise<LicensePlan> {
    const { data } = await api.post('/admin/license/plans', payload);
    return data;
  },
  async updateLicensePlan(id: string, payload: Partial<LicensePlan>): Promise<LicensePlan> {
    const { data } = await api.patch(`/admin/license/plans/${id}`, payload);
    return data;
  },
  async deleteLicensePlan(id: string): Promise<void> {
    await api.delete(`/admin/license/plans/${id}`);
  },
  async listLicenseSubscriptions(): Promise<LicenseSubscription[]> {
    const { data } = await api.get('/admin/license/subscriptions');
    return data;
  },
  async getCurrentLicenseSubscription(): Promise<LicenseSubscription | null> {
    const { data } = await api.get('/admin/license/subscriptions/current');
    return data;
  },
  async activateLicensePlan(payload: { plan_id: string; billing_cycle: string; ends_at?: string; trial_ends_at?: string; notes?: string }): Promise<LicenseSubscription> {
    const { data } = await api.post('/admin/license/subscriptions/activate', payload);
    return data;
  },
  async cancelLicenseSubscription(id: string): Promise<void> {
    await api.patch(`/admin/license/subscriptions/${id}/cancel`);
  },
  async getLicenseHistory(limit = 50): Promise<LicenseHistoryEntry[]> {
    const { data } = await api.get(`/admin/license/history?limit=${limit}`);
    return data;
  },

  // ── Sprint 26: Report Builder ──────────────────────────────────────────────
  async getReportMeta(): Promise<{ modules: ReportModuleDef[] }> {
    const { data } = await api.get('/admin/reports/meta');
    return data;
  },
  async listReportTemplates(): Promise<ReportTemplate[]> {
    const { data } = await api.get('/admin/reports/templates');
    return data;
  },
  async createReportTemplate(payload: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data } = await api.post('/admin/reports/templates', payload);
    return data;
  },
  async updateReportTemplate(id: string, payload: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data } = await api.patch(`/admin/reports/templates/${id}`, payload);
    return data;
  },
  async deleteReportTemplate(id: string): Promise<void> {
    await api.delete(`/admin/reports/templates/${id}`);
  },
  async executeReport(config: ReportExecuteConfig): Promise<{ rows: Record<string, unknown>[]; duration_ms: number; row_count: number }> {
    const { data } = await api.post('/admin/reports/execute', config);
    return data;
  },
  async getReportHistory(limit = 30): Promise<ReportExecution[]> {
    const { data } = await api.get(`/admin/reports/history?limit=${limit}`);
    return data;
  },

  // ── Data Import ──────────────────────────────────────────────────────────────
  async getImportMeta(): Promise<ImportModuleDef[]> {
    const { data } = await api.get('/admin/import/meta');
    return data;
  },
  async validateImport(payload: ImportValidatePayload): Promise<ImportValidateResult> {
    const { data } = await api.post('/admin/import/validate', payload);
    return data;
  },
  async confirmImport(jobId: string): Promise<{ job_id: string; imported_rows: number; status: string }> {
    const { data } = await api.post(`/admin/import/confirm/${jobId}`);
    return data;
  },
  async listImportJobs(limit = 20): Promise<ImportJob[]> {
    const { data } = await api.get(`/admin/import/jobs?limit=${limit}`);
    return data;
  },
  async getImportJob(jobId: string): Promise<ImportJob & { errors: ImportJobError[] }> {
    const { data } = await api.get(`/admin/import/jobs/${jobId}`);
    return data;
  },
  async deleteImportJob(jobId: string): Promise<void> {
    await api.delete(`/admin/import/jobs/${jobId}`);
  },

  // ── Multi-Tenant ──────────────────────────────────────────────────────────────
  async getTenantStats(): Promise<TenantStats> {
    const { data } = await api.get('/admin/tenants/stats');
    return data;
  },
  async listTenants(search?: string): Promise<Tenant[]> {
    const { data } = await api.get('/admin/tenants', { params: search ? { search } : {} });
    return data;
  },
  async getTenant(id: string): Promise<Tenant> {
    const { data } = await api.get(`/admin/tenants/${id}`);
    return data;
  },
  async createTenant(payload: Partial<Tenant>): Promise<Tenant> {
    const { data } = await api.post('/admin/tenants', payload);
    return data;
  },
  async updateTenant(id: string, payload: Partial<Tenant>): Promise<Tenant> {
    const { data } = await api.patch(`/admin/tenants/${id}`, payload);
    return data;
  },
  async toggleTenant(id: string): Promise<{ id: string; name: string; is_active: boolean }> {
    const { data } = await api.patch(`/admin/tenants/${id}/toggle`);
    return data;
  },
  async deleteTenant(id: string): Promise<void> {
    await api.delete(`/admin/tenants/${id}`);
  },
  async getTenantAuditLog(tenantId?: string, limit = 50): Promise<TenantAuditEntry[]> {
    const { data } = await api.get('/admin/tenants/audit', { params: { tenant_id: tenantId, limit } });
    return data;
  },
  async assignBranchToTenant(tenantId: string, branchId: string): Promise<void> {
    await api.post(`/admin/tenants/${tenantId}/branches`, { branch_id: branchId });
  },

  // ============================================================
  // IMPRESORAS
  // ============================================================
  async getPrinterStats(): Promise<PrinterStats> {
    const { data } = await api.get('/admin/printers/stats');
    return data;
  },
  async listPrinters(branchId?: string): Promise<Printer[]> {
    const { data } = await api.get('/admin/printers', { params: branchId ? { branch_id: branchId } : undefined });
    return data;
  },
  async createPrinter(dto: Partial<Printer>): Promise<Printer> {
    const { data } = await api.post('/admin/printers', dto);
    return data;
  },
  async updatePrinter(id: string, dto: Partial<Printer>): Promise<Printer> {
    const { data } = await api.patch(`/admin/printers/${id}`, dto);
    return data;
  },
  async togglePrinter(id: string): Promise<{ is_active: boolean }> {
    const { data } = await api.patch(`/admin/printers/${id}/toggle`);
    return data;
  },
  async testPrinter(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/admin/printers/${id}/test`);
    return data;
  },
  async deletePrinter(id: string): Promise<void> {
    await api.delete(`/admin/printers/${id}`);
  },
  async getFailedJobs(printerId?: string): Promise<any[]> {
    const url = printerId
      ? `/admin/printers/${printerId}/failed-jobs`
      : '/admin/printers/failed-jobs';
    const { data } = await api.get(url);
    return data;
  },
  async retryFailedJob(jobId: string): Promise<void> {
    await api.post(`/admin/printers/jobs/${jobId}/retry`);
  },
  async cancelFailedJob(jobId: string): Promise<void> {
    await api.post(`/admin/printers/jobs/${jobId}/cancel`);
  },
  async getPrinterHistory(printerId: string): Promise<any[]> {
    const { data } = await api.get(`/admin/printers/${printerId}/history`);
    return data;
  },
  async getRecentFailures(printerId: string): Promise<any[]> {
    const { data } = await api.get(`/admin/printers/${printerId}/recent-failures`);
    return data;
  },
  async toggleMaintenanceMode(id: string, enabled: boolean): Promise<void> {
    await api.patch(`/admin/printers/${id}/maintenance`, { enabled });
  },
  async reorderPrinters(items: { id: string; sort_order: number }[]): Promise<void> {
    await api.patch('/admin/printers/reorder', { items });
  },
  async getPrinterJobHistory(printerId: string, limit = 50): Promise<PrintJobHistory[]> {
    const { data } = await api.get('/admin/agents/jobs/history', { params: { printer_id: printerId, limit } });
    return data;
  },
  async retryPrintJob(jobId: string): Promise<void> {
    await api.post(`/admin/agents/jobs/${jobId}/retry`);
  },
  async cancelPrintJob(jobId: string): Promise<void> {
    await api.patch(`/admin/agents/jobs/${jobId}/cancel`);
  },
  async cleanupPrintJobs(days = 7): Promise<{ deleted: number }> {
    const { data } = await api.delete('/admin/agents/jobs/cleanup', { params: { days } });
    return data;
  },
  async getPrintersHealth(): Promise<PrintersHealth> {
    const { data } = await api.get('/admin/agents/health');
    return data;
  },
  async getJobStatus(jobId: string): Promise<PrintJobHistory> {
    const { data } = await api.get(`/admin/agents/jobs/${jobId}/status`);
    return data;
  },
  async reprintJobFromHistory(jobId: string, printerId?: string, type?: 'kitchen' | 'receipt'): Promise<{ job_id: string }> {
    const { data } = await api.post(`/admin/agents/jobs/${jobId}/reprint`, { printer_id: printerId, type });
    return data;
  },
  async reprintOrder(orderId: string, printerId: string, type: 'kitchen' | 'receipt'): Promise<{ job_id: string }> {
    const { data } = await api.post('/printers/reprint', { order_id: orderId, printer_id: printerId, type });
    return data;
  },
  async getDailyStats(date?: string): Promise<PrintDailyStats> {
    const { data } = await api.get('/admin/printers/daily-stats', date ? { params: { date } } : {});
    return data;
  },

  // ============================================================
  // PRINT AGENTS
  // ============================================================
  async listAgents(branchId?: string): Promise<PrintAgent[]> {
    const { data } = await api.get('/admin/agents', { params: branchId ? { branch_id: branchId } : undefined });
    return Array.isArray(data) ? data : (data as any).data ?? [];
  },
  async createAgent(dto: { name: string; branch_id?: string }): Promise<PrintAgent> {
    const { data } = await api.post('/admin/agents', dto);
    return (data as any).data ?? data;
  },
  async deleteAgent(id: string): Promise<void> {
    await api.delete(`/admin/agents/${id}`);
  },
  async getAgentDownloadInfo(): Promise<AgentDownloadInfo> {
    const { data } = await api.get<AgentDownloadInfo | { data: AgentDownloadInfo }>('/admin/agents/download');
    // el backend puede envolver en { data: {...} } o devolverte directamente el objeto
    return (data as any).platforms ? (data as AgentDownloadInfo) : (data as any).data as AgentDownloadInfo;
  },
  async getAgentLogs(agentId: string, limit = 100, level?: string): Promise<AgentLog[]> {
    const { data } = await api.get<AgentLog[]>(`/admin/agents/${agentId}/logs`, {
      params: { limit, ...(level && level !== 'all' ? { level } : {}) },
    });
    return data;
  },
  async getAgentRelease(): Promise<AgentRelease | null> {
    const { data } = await api.get<{ data: AgentRelease | null }>('/admin/agents/release');
    return data.data ?? null;
  },
  async getExtensionConfig(): Promise<{
    extensionVersion: string;
    downloadUrl: string;
    installerUrl: string;
    nativeHostName: string;
  }> {
    const { data } = await api.get('/admin/print/extension-config');
    return (data as any).data ?? data;
  },
  async getPendingJobsForExtension(): Promise<any[]> {
    const { data } = await api.get('/admin/agents/pending-ext');
    return (data as any).data ?? [];
  },
  async ackExtensionJob(jobId: string, status: 'printed' | 'failed', error_msg?: string): Promise<void> {
    await api.patch(`/admin/agents/jobs/${jobId}/ext-ack`, { status, error_msg });
  },
  async publishRelease(dto: {
    version: string;
    download_url: string;
    checksum_sha256?: string;
    release_notes?: string;
    min_compatible_version?: string;
    force_update?: boolean;
  }): Promise<AgentRelease> {
    const { data } = await api.post<{ data: AgentRelease }>('/admin/agents/release', dto);
    return data.data;
  },
  async submitTestJob(agentId: string, printerId: string): Promise<{ job_id?: string; id?: string }> {
    const { data } = await api.post('/admin/agents/submit-job', { agent_id: agentId, printer_id: printerId });
    return data;
  },

  // ============================================================
  // NOTIFICACIONES DE IMPRESIÓN (Fase 6)
  // ============================================================
  async getPrintNotificationSettings(branchId?: string): Promise<PrintNotificationSettings | null> {
    const { data } = await api.get('/admin/print-notifications/settings', {
      params: branchId ? { branch_id: branchId } : {},
    });
    return data.data ?? null;
  },
  async savePrintNotificationSettings(dto: Partial<PrintNotificationSettings>, branchId?: string): Promise<PrintNotificationSettings> {
    const { data } = await api.post('/admin/print-notifications/settings', dto, {
      params: branchId ? { branch_id: branchId } : {},
    });
    return data.data;
  },
  async testPrintWebhook(branchId?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const { data } = await api.post('/admin/print-notifications/test-webhook', {}, {
      params: branchId ? { branch_id: branchId } : {},
    });
    return data;
  },
  async getPrintNotificationLogs(branchId?: string, limit = 50): Promise<PrintNotificationLog[]> {
    const { data } = await api.get('/admin/print-notifications/logs', {
      params: { limit, ...(branchId ? { branch_id: branchId } : {}) },
    });
    return data.data ?? [];
  },

  // ============================================================
  // REGLAS DE ENRUTAMIENTO (Fase 6)
  // ============================================================
  async listRoutingRules(branchId?: string): Promise<PrinterRoutingRule[]> {
    const { data } = await api.get('/admin/printers/routing-rules', {
      params: branchId ? { branch_id: branchId } : {},
    });
    return data.data ?? [];
  },
  async createRoutingRule(dto: {
    branch_id:    string;
    printer_id:   string;
    category_ids?: string[];
    product_ids?:  string[];
    order_types?:  string[];
    priority?:     number;
    copies?:       number;
    label?:        string;
  }): Promise<PrinterRoutingRule> {
    const { data } = await api.post('/admin/printers/routing-rules', dto);
    return data.data;
  },
  async updateRoutingRule(id: string, dto: Partial<PrinterRoutingRule>): Promise<PrinterRoutingRule> {
    const { data } = await api.put(`/admin/printers/routing-rules/${id}`, dto);
    return data.data;
  },
  async deleteRoutingRule(id: string): Promise<void> {
    await api.delete(`/admin/printers/routing-rules/${id}`);
  },

  // BLUETOOTH PORTS
  async getBluetoothPorts(agentId: string): Promise<Array<{ path: string; manufacturer?: string }>> {
    const { data } = await api.get<{ data: Array<{ path: string; manufacturer?: string }> }>(`/admin/agents/${agentId}/bluetooth-ports`);
    return data.data;
  },

  // OS PRINTERS (Driver SO)
  async getOsPrinters(agentId: string): Promise<Array<{ name: string; driverName?: string }>> {
    const { data } = await api.get<{ data: Array<{ name: string; driverName?: string }> }>(`/admin/agents/${agentId}/os-printers`);
    return data.data;
  },

  // TICKET TEMPLATES
  async listTicketTemplates(branchId?: string): Promise<TicketTemplate[]> {
    const { data } = await api.get('/admin/ticket-templates', { params: branchId ? { branch_id: branchId } : undefined });
    return data.data;
  },
  async createTicketTemplate(dto: Partial<TicketTemplate>): Promise<TicketTemplate> {
    const { data } = await api.post('/admin/ticket-templates', dto);
    return data.data;
  },
  async updateTicketTemplate(id: string, dto: Partial<TicketTemplate>): Promise<TicketTemplate> {
    const { data } = await api.put(`/admin/ticket-templates/${id}`, dto);
    return data.data;
  },
  async duplicateTicketTemplate(id: string): Promise<TicketTemplate> {
    const { data } = await api.post(`/admin/ticket-templates/${id}/duplicate`);
    return data.data;
  },
  async deleteTicketTemplate(id: string): Promise<void> {
    await api.delete(`/admin/ticket-templates/${id}`);
  },
};

// ── 2FA types ────────────────────────────────────────────────────────────────

export interface TwoFactorUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  totp_enabled: boolean;
  totp_verified: boolean;
  last_2fa_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface TwoFactorStats {
  total: number;
  enabled: number;
  disabled: number;
  adoptionPct: number;
}

export interface TwoFactorSetup {
  secret: string;
  qrDataUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface TwoFactorLogEntry {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  event: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ── Notification types ────────────────────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'security' | 'backup' | 'scheduler' | 'user' | '2fa';
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  actor_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

// ── System Module types ──────────────────────────────────────────────────────────────────

export interface SystemModule {
  id:              string;
  key:             string;
  name:            string;
  description:     string | null;
  category:        string;
  icon:            string | null;
  version:         string;
  is_enabled:      boolean;
  is_core:         boolean;
  dependencies:    string[];
  settings:        Record<string, unknown>;
  routes:          string[];
  enabled_at:      string | null;
  disabled_at:     string | null;
  last_updated_at: string;
  created_at:      string;
}

export interface ModuleStats {
  total:    number;
  enabled:  number;
  disabled: number;
  byCategory: Record<string, { total: number; enabled: number }>;
}

export interface ModuleLogEntry {
  id:          string;
  module_key:  string;
  action:      string;
  actor_email: string | null;
  before:      Record<string, unknown> | null;
  after:       Record<string, unknown> | null;
  created_at:  string;
}

// ── Security Policy types ─────────────────────────────────────────────────────

export interface SecurityPolicy {
  id:                       string;
  pwd_min_length:           number;
  pwd_require_uppercase:    boolean;
  pwd_require_lowercase:    boolean;
  pwd_require_numbers:      boolean;
  pwd_require_symbols:      boolean;
  pwd_max_age_days:         number;
  pwd_history_count:        number;
  pwd_prevent_username:     boolean;
  login_max_attempts:       number;
  login_lockout_minutes:    number;
  login_cooldown_seconds:   number;
  login_require_2fa_roles:  string[];
  session_timeout_minutes:  number;
  session_max_concurrent:   number;
  session_refresh_enabled:  boolean;
  ip_allowlist_admin:       string[];
  ip_allowlist_enabled:     boolean;
  audit_login_events:       boolean;
  audit_data_exports:       boolean;
  audit_sensitive_reads:    boolean;
  updated_at:               string;
  updated_by:               string | null;
}

export interface PolicyLogEntry {
  id:          string;
  actor_email: string | null;
  before:      Partial<SecurityPolicy> | null;
  after:       Partial<SecurityPolicy> | null;
  notes:       string | null;
  created_at:  string;
}

// ── Rate Limiter types ─────────────────────────────────────────────────────

export interface RateLimitRule {
  id:               string;
  name:             string;
  description:      string | null;
  endpoint_pattern: string;
  http_method:      string;
  scope:            'global' | 'role' | 'ip';
  role_target:      string | null;
  ip_pattern:       string | null;
  max_requests:     number;
  window_seconds:   number;
  burst_allowance:  number;
  block_duration_s: number;
  is_enabled:       boolean;
  priority:         number;
  created_at:       string;
  updated_at:       string;
  created_by:       string | null;
}

export interface RateLimitEvent {
  id:            string;
  rule_id:       string | null;
  rule_name:     string | null;
  ip_address:    string | null;
  user_id:       string | null;
  user_email:    string | null;
  endpoint:      string | null;
  http_method:   string | null;
  requests_made: number;
  blocked:       boolean;
  created_at:    string;
}

export interface RateLimitStats {
  total_rules:    number;
  enabled_rules:  number;
  disabled_rules: number;
  total_events:   number;
  blocked_events: number;
  top_blocked_endpoints: Array<{ endpoint: string; count: number }>;
}

// ── Data Privacy types ─────────────────────────────────────────────────────

export interface DataRequest {
  id:               string;
  type:             'export' | 'delete' | 'rectify' | 'restrict' | 'portability';
  status:           'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  requester_email:  string;
  requester_name:   string | null;
  user_id:          string | null;
  description:      string | null;
  notes:            string | null;
  due_date:         string | null;
  completed_at:     string | null;
  rejected_at:      string | null;
  rejection_reason: string | null;
  export_url:       string | null;
  processed_by:     string | null;
  created_at:       string;
  updated_at:       string;
}

export interface ConsentRecord {
  id:           string;
  user_id:      string | null;
  user_email:   string;
  consent_type: string;
  granted:      boolean;
  ip_address:   string | null;
  granted_at:   string | null;
  revoked_at:   string | null;
  source:       string | null;
  notes:        string | null;
  created_at:   string;
}

export interface RetentionPolicy {
  id:             string;
  data_category:  string;
  description:    string | null;
  retention_days: number;
  auto_delete:    boolean;
  last_purge_at:  string | null;
  created_at:     string;
  updated_at:     string;
}

export interface DataPrivacyStats {
  total_requests:     number;
  pending_requests:   number;
  overdue_requests:   number;
  completed_requests: number;
  rejected_requests:  number;
  by_type:            Record<string, number>;
  total_consents:     number;
  active_consents:    number;
}

// ── RBAC
export interface RBACModule {
  key:      string;
  label:    string;
  category: string;
}
export interface RolePermission {
  module: string;
  action: string;
}
export interface CustomRole {
  id:               string;
  name:             string;
  description:      string | null;
  color:            string;
  is_system:        boolean;
  permission_count: number;
  user_count?:      number;
  permissions?:     RolePermission[];
  created_at:       string;
  updated_at:       string;
}
export interface RBACStats {
  total_roles:        number;
  system_roles:       number;
  custom_roles_count: number;
  total_permissions:  number;
  modules_count:      number;
  actions:            { key: string; label: string }[];
}

// ── Branding
export interface BrandingSetting {
  id:          string;
  key:         string;
  value:       string | null;
  type:        'string' | 'color' | 'image' | 'boolean' | 'json';
  category:    string;
  label:       string | null;
  description: string | null;
  updated_at:  string;
  updated_by:  string | null;
}

// ── Integraciones
export interface IntegrationType  { key: string; label: string; fields: string[] }
export interface IntegrationEvent { key: string; label: string }
export interface IntegrationChannel {
  id:           string;
  name:         string;
  type:         string;
  enabled:      boolean;
  webhook_url:  string | null;
  token:        string | null;
  chat_id:      string | null;
  events:       string[];
  config:       Record<string, unknown>;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  log_count:    number;
  fail_count:   number;
  created_at:   string;
  updated_at:   string;
}
export interface IntegrationLog {
  id:           string;
  channel_id:   string;
  channel_name: string;
  channel_type: string;
  event:        string | null;
  payload:      unknown;
  status:       'pending' | 'sent' | 'failed';
  response:     string | null;
  error:        string | null;
  sent_at:      string;
}
export interface IntegrationStats {
  total_channels:   number;
  enabled_channels: number;
  total_sent:       number;
  total_failed:     number;
  last_24h:         number;
}

// ── Sprint 25: License Manager ───────────────────────────────────────────────
export interface LicensePlan {
  id:            string;
  name:          string;
  slug:          string;
  description:   string | null;
  price_monthly: number;
  price_yearly:  number;
  max_branches:  number;  // -1 = ilimitado
  max_devices:   number;
  max_users:     number;
  features:      string[];
  is_active:     boolean;
  is_default:    boolean;
  sort_order:    number;
  created_at:    string;
  updated_at:    string;
}
export interface LicenseSubscription {
  id:            string;
  plan_id:       string;
  plan_name:     string;
  plan_slug:     string;
  status:        'active' | 'trial' | 'expired' | 'cancelled' | 'suspended';
  billing_cycle: 'monthly' | 'yearly' | 'lifetime';
  starts_at:     string;
  ends_at:       string | null;
  trial_ends_at: string | null;
  notes:         string | null;
  created_by:    string | null;
  created_at:    string;
  updated_at:    string;
  days_remaining: number | null;
}
export interface LicenseHistoryEntry {
  id:              string;
  subscription_id: string | null;
  plan_name:       string;
  action:          string;
  from_plan:       string | null;
  to_plan:         string | null;
  actor_email:     string | null;
  notes:           string | null;
  created_at:      string;
}
export interface LicenseStats {
  current_plan:   string;
  current_status: string;
  days_remaining: number | null;
  total_plans:    number;
  active_sub:     boolean;
}

// ── Sprint 26: Report Builder ───────────────────────────────────────────────
export interface ReportColumnDef {
  key:   string;
  label: string;
  type:  'string' | 'number' | 'datetime' | 'boolean';
}
export interface ReportModuleDef {
  key:     string;
  label:   string;
  columns: ReportColumnDef[];
}
export interface ReportTemplate {
  id:          string;
  name:        string;
  description: string | null;
  module:      string;
  columns:     string[];
  filters:     Record<string, unknown>;
  sort_by:     string | null;
  sort_dir:    string;
  is_public:   boolean;
  created_by:  string | null;
  created_at:  string;
  updated_at:  string;
}
export interface ReportExecuteConfig {
  module:       string;
  columns:      string[];
  filters:      Record<string, unknown>;
  sort_by?:     string;
  sort_dir?:    string;
  template_id?:   string;
  template_name?: string;
}
export interface ReportExecution {
  id:            string;
  template_id:   string | null;
  template_name: string;
  module:        string;
  row_count:     number;
  duration_ms:   number | null;
  export_format: string | null;
  executed_by:   string | null;
  executed_at:   string;
}

// ── Data Import ──────────────────────────────────────────────────────────────
export interface ImportFieldDef {
  key:      string;
  label:    string;
  required: boolean;
  type:     'string' | 'number' | 'email';
}
export interface ImportModuleDef {
  key:    string;
  label:  string;
  fields: ImportFieldDef[];
}
export interface ImportValidatePayload {
  module:     string;
  headers:    string[];
  rows:       string[][];
  column_map: Record<string, string>;
  filename?:  string;
}
export interface ImportValidateResult {
  job_id:      string;
  total_rows:  number;
  error_count: number;
  can_import:  boolean;
  errors:      { row_number: number; field: string; message: string; raw_value: string }[];
  preview:     Record<string, string>[];
}
export interface ImportJob {
  id:            string;
  module:        string;
  original_name: string;
  status:        string;
  total_rows:    number;
  imported_rows: number;
  error_count:   number;
  dry_run:       boolean;
  created_at:    string;
  completed_at:  string | null;
}
export interface ImportJobError {
  row_number: number;
  field:      string;
  message:    string;
  raw_value:  string;
}

// ── Multi-Tenant ──────────────────────────────────────────────────────────────
export interface Tenant {
  id:            string;
  name:          string;
  slug:          string;
  domain:        string | null;
  plan:          string;
  logo_url:      string | null;
  theme_color:   string;
  contact_email: string | null;
  contact_phone: string | null;
  settings:      Record<string, unknown>;
  is_active:     boolean;
  branch_count:  number;
  created_at:    string;
  updated_at:    string;
}
export interface TenantStats {
  total:    number;
  active:   number;
  inactive: number;
  by_plan:  { plan: string; count: number }[];
  plans:    string[];
}
export interface TenantAuditEntry {
  id:           string;
  action:       string;
  changes:      Record<string, unknown> | null;
  created_at:   string;
  tenant_name:  string;
  tenant_slug:  string;
}

// ── Impresoras ────────────────────────────────────────────────────────────────
export interface Printer {
  id:              string;
  branch_id:       string | null;
  branch_name:     string | null;
  name:            string;
  type:            string;
  ip_address:      string | null;
  port:            number;
  protocol:        string;
  paper_width:     number;
  is_active:       boolean;
  notes:           string | null;
  last_test_at:    string | null;
  created_at:      string;
  updated_at:      string;
  // Print Agent fields
  connection_type:  'ethernet' | 'usb' | 'serial' | 'os_driver' | 'bluetooth' | null;
  agent_id:         string | null;
  agent_name:       string | null;
  serial_port:      string | null;
  serial_baud:      number | null;
  com_port:         string | null;
  usb_vendor_id:    string | null;
  usb_product_id:   string | null;
  os_printer_name:  string | null;
  last_printed_at:  string | null;
  // Fase 6: QR en recibo
  print_qr:         boolean | null;
  qr_type:          string | null;
  qr_custom_url:    string | null;
  // Mejoras
  maintenance_mode: boolean | null;
  sort_order:       number | null;
}

export interface PrintAgent {
  id:              string;
  name:            string;
  api_key:         string;
  branch_id:       string | null;
  branch_name:     string | null;
  platform:        string | null;
  version:         string | null;
  is_online:       boolean;
  ip_address:      string | null;
  last_seen_at:    string | null;
  available_ports: Array<{ path: string; manufacturer?: string }>;
  created_at:      string;
}

export interface AgentLog {
  id:         string;
  level:      'debug' | 'info' | 'warn' | 'error';
  event:      string;
  job_id:     string | null;
  data:       Record<string, any> | null;
  logged_at:  string;
}

export interface AgentRelease {
  version:               string;
  download_url:          string;
  checksum_sha256:       string | null;
  release_notes:         string | null;
  min_compatible_version: string;
  force_update:          boolean;
  released_at:           string;
}

export interface AgentDownloadInfo {
  version:   string;
  platforms: { name: string; label: string; url: string; sha256: string | null }[];
  docs_url:  string;
}
export interface PrinterStats {
  total:   number;
  active:  number;
  by_type: { type: string; count: number }[];
}

export interface PrintJobHistory {
  id:           string;
  status:       'pending' | 'sent' | 'printed' | 'failed' | 'cancelled';
  trigger_type: string | null;
  order_number: string | null;
  attempts:     number;
  error_msg:    string | null;
  created_at:   string;
  printed_at:   string | null;
  updated_at:   string | null;
}

export interface PrintDailyStats {
  date:               string;
  total_jobs:         number;
  printed:            number;
  failed:             number;
  cancelled:          number;
  reprints:           number;
  avg_print_time_ms:  number | null;
  busiest_hour:       string | null;
  by_printer: {
    name:    string;
    printed: number;
    failed:  number;
    avg_ms:  number | null;
  }[];
}

export interface PrintersHealth {
  total_printers:         number;
  active_printers:        number;
  printers_with_agent:    number;
  printers_without_agent: number;
  agents_online:          number;
  agents_offline:         number;
  pending_jobs:           number;
  failed_jobs:            number;
  alerts: { level: 'error' | 'warning'; printer: string; message: string }[];
}

// ── Fase 6: Notificaciones + Routing + QR ─────────────────────────────────────

export interface PrintNotificationSettings {
  id?:              string;
  branch_id?:       string | null;
  notify_webhook:   boolean;
  notify_email:     boolean;
  email_recipients: string[];
  webhook_url:      string | null;
  webhook_secret:   string | null;
  on_print_failed:  boolean;
  on_agent_offline: boolean;
  on_agent_online:  boolean;
  on_stale_jobs:    boolean;
  cooldown_minutes: number;
}

export interface PrintNotificationLog {
  id:            string;
  event_type:    string;
  channel:       string;
  status:        'sent' | 'failed';
  error_message: string | null;
  sent_at:       string;
}

export interface PrinterRoutingRule {
  id:           string;
  branch_id:    string | null;
  branch_name?: string | null;
  printer_id:   string;
  printer_name: string;
  printer_type: string;
  category_ids: string[] | null;
  product_ids:  string[] | null;
  order_types:  string[] | null;
  priority:     number;
  is_active:    boolean;
  copies:       number;
  label:        string | null;
  created_at:   string;
}

// ── Fase 7: Plantillas de Ticket ─────────────────────────────────────────────

export interface TicketTemplate {
  id:                     string;
  branch_id:              string | null;
  name:                   string;
  type:                   'kitchen_ticket' | 'receipt' | 'label';
  is_default:             boolean;
  // Header
  header_logo_text:       string | null;
  header_show_address:    boolean;
  header_show_phone:      boolean;
  header_show_rut:        boolean;
  header_custom_line_1:   string | null;
  header_custom_line_2:   string | null;
  // Body
  show_order_number:      boolean;
  show_table_name:        boolean;
  show_waiter_name:       boolean;
  show_datetime:          boolean;
  show_item_price:        boolean;
  show_modifiers:         boolean;
  show_notes:             boolean;
  item_name_uppercase:    boolean;
  font_size:              'small' | 'normal' | 'large';
  // Footer
  footer_message:         string;
  footer_show_powered_by: boolean;
  footer_custom_line:     string | null;
  // QR
  print_qr:               boolean;
  qr_type:                'receipt' | 'custom';
  qr_custom_url:          string | null;
  qr_size:                number;
  // Separador
  separator_style:        'dashes' | 'stars' | 'equals' | 'scissors';
  created_at:             string;
  updated_at:             string;
}
