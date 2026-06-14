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

export const attendancePublicService = {
  getToken: (tenantId?: string) =>
    publicApi.get<{ success: boolean; data: { token: string; expiresIn: number; windowSeconds: number; tenantId: string | null } }>(
      tenantId ? `/attendance/token?tenantId=${tenantId}` : '/attendance/token'
    ),

  getEmployees: (tenantId: string) =>
    publicApi.get<{ success: boolean; data: Employee[] }>(`/attendance/employees?tenantId=${tenantId}`),

  checkin: (employeeId: string, token: string, notes?: string, pin?: string, lat?: number | null, lon?: number | null) =>
    publicApi.post<{ success: boolean; data: { type: 'ENTRY' | 'EXIT'; employeeName: string; shift: string | null } }>('/attendance/checkin', {
      employeeId, token, notes, pin, lat, lon,
    }),

  startColacion: (employeeId: string) =>
    publicApi.post<{ success: boolean; data: { message: string; entryId: string } }>('/attendance/colacion/start', { employeeId }),

  endColacion: (employeeId: string) =>
    publicApi.post<{ success: boolean; data: { message: string; minutos: number } }>('/attendance/colacion/end', { employeeId }),

  getEmployeeStatus: (employeeId: string) =>
    publicApi.get<{ success: boolean; data: EmployeeStatus }>(`/attendance/employee-status/${employeeId}`),

  getTodayKiosk: (tenantId: string) =>
    publicApi.get<{ success: boolean; data: KioskEmployee[] }>(`/attendance/today-kiosk?tenantId=${tenantId}`),

  getTodaySummary: (tenantId: string) =>
    publicApi.get<{ success: boolean; data: TodaySummary }>(`/attendance/today-summary?tenantId=${tenantId}`),

  getRecentActions: (limit = 8, tenantId: string) =>
    publicApi.get<{ success: boolean; data: RecentAction[] }>(`/attendance/recent-actions?limit=${limit}&tenantId=${tenantId}`),
};
