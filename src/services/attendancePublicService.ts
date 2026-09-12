import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface Employee {
  id:          string;
  name:        string;
  roleName?:   string | null;
  hasPin?:     boolean;
  shift?:      string | null;
  rutPartial?: string | null;
}

export interface EmployeeStatus {
  lastActionToday: 'ENTRY' | 'EXIT' | null;
  lastActionTime:  string | null;
  inColacion:      boolean;
  nextAction:      'ENTRY' | 'EXIT';
}

export interface KioskEmployee {
  employeeId: string;
  name:       string;
  entryTime:  string;
  inColacion: boolean;
}

export interface RecentAction {
  shortName:  string;
  type:       'ENTRY' | 'EXIT';
  timestamp:  string;
}

export interface TodaySummary {
  presentes:  number;
  enColacion: number;
}

// Cliente sin interceptor de auth (endpoints públicos de asistencia)
const publicApi = axios.create({ baseURL: API_BASE });

// Hotfix #146 — tenantRef: slug o UUID del tenant del kiosco. TODA llamada
// pública lo envía (el backend resuelve slug→UUID y aísla las queries).
export const attendancePublicService = {
  getToken: (tenantRef?: string) =>
    publicApi.get<{ success: boolean; data: { token: string; expiresIn: number; windowSeconds: number; tenantId: string | null } }>(
      tenantRef ? `/attendance/token?tenant=${encodeURIComponent(tenantRef)}` : '/attendance/token'
    ),

  getEmployees: (tenantRef: string) =>
    publicApi.get<{ success: boolean; data: Employee[] }>(`/attendance/employees?tenant=${encodeURIComponent(tenantRef)}`),

  checkin: (
    employeeId: string,
    token:      string,
    tenantRef:  string,
    notes?:     string,
    pin?:       string,
    lat?:       number | null,
    lon?:       number | null,
  ) =>
    publicApi.post<{ success: boolean; data: { type: 'ENTRY' | 'EXIT'; employeeName: string; shift: string | null } }>('/attendance/checkin', {
      employeeId, token, tenant: tenantRef, notes, pin, lat, lon,
    }),

  startColacion: (employeeId: string, tenantRef: string) =>
    publicApi.post<{ success: boolean; data: { message: string; entryId: string } }>('/attendance/colacion/start', { employeeId, tenant: tenantRef }),

  endColacion: (employeeId: string, tenantRef: string) =>
    publicApi.post<{ success: boolean; data: { message: string; minutos: number } }>('/attendance/colacion/end', { employeeId, tenant: tenantRef }),

  getEmployeeStatus: (employeeId: string, tenantRef: string) =>
    publicApi.get<{ success: boolean; data: EmployeeStatus }>(`/attendance/employee-status/${employeeId}?tenant=${encodeURIComponent(tenantRef)}`),

  getTodayKiosk: (tenantRef: string) =>
    publicApi.get<{ success: boolean; data: KioskEmployee[] }>(`/attendance/today-kiosk?tenant=${encodeURIComponent(tenantRef)}`),

  getTodaySummary: (tenantRef: string) =>
    publicApi.get<{ success: boolean; data: TodaySummary }>(`/attendance/today-summary?tenant=${encodeURIComponent(tenantRef)}`),

  getRecentActions: (limit = 8, tenantRef: string) =>
    publicApi.get<{ success: boolean; data: RecentAction[] }>(`/attendance/recent-actions?limit=${limit}&tenant=${encodeURIComponent(tenantRef)}`),
};
