import api from './api';

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id:            string;
  tenantId:      string;
  userId:        string | null;
  userName:      string | null;
  actorEmail:    string | null;
  action:        string;
  entity:        string;
  entityId:      string | null;
  previousValue: Record<string, unknown> | null;
  newValue:      Record<string, unknown> | null;
  metadata:      Record<string, unknown> | null;
  ipAddress:     string | null;
  createdAt:     string;
}

export interface AuditLogMeta {
  page:      number;
  perPage:   number;
  total:     number;
  totalPages: number;
}

export interface AuditLogResponse {
  data:  AuditLogEntry[];
  meta:  AuditLogMeta;
}

export interface AuditLogFilters {
  page?:      number;
  limit?:     number;
  action?:    string;
  entity?:    string;
  userId?:    string;
  startDate?: string;
  endDate?:   string;
}

// ── Servicio ────────────────────────────────────────────────────────────────
export const auditService = {
  /**
   * Obtiene la lista de logs de auditoría con paginación y filtros.
   * Endpoint: GET /api/audit-logs
   */
  getLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogResponse> => {
    const { data } = await api.get<AuditLogResponse>('/audit-logs', { params: filters });
    return data;
  },
};