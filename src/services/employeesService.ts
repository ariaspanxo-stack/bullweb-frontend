import api from './api';
import type { ApiResponse } from '@/types';

const qs = (params?: Record<string, any>) => {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const employeesService = {
  // ─── Empleados ────────────────────────────────────────────────
  async getEmployees(params?: any) {
    const { data } = await api.get<ApiResponse>(`/employees${qs(params)}`);
    // paginatedResponse devuelve { success, data: [...], meta } con meta en top-level
    // handleResponse lo retorna sin desempaquetar → reconstruimos la forma esperada
    if (Array.isArray((data as any)?.data)) {
      return { employees: (data as any).data, meta: (data as any).meta };
    }
    return data;
  },

  async getEmployeeById(id: string) {
    const { data } = await api.get<ApiResponse>(`/employees/${id}`);
    return data;
  },

  async createEmployee(payload: any) {
    const { data } = await api.post<ApiResponse>('/employees', payload);
    return data;
  },

  async updateEmployee(id: string, payload: any) {
    const { data } = await api.patch<ApiResponse>(`/employees/${id}`, payload);
    return data;
  },

  async deleteEmployee(id: string) {
    const { data } = await api.delete<ApiResponse>(`/employees/${id}`);
    return data;
  },

  async getEmployeeSales(id: string, params?: any) {
    const { data } = await api.get<ApiResponse>(`/employees/${id}/sales${qs(params)}`);
    return data;
  },

  // ─── Roles ────────────────────────────────────────────────────
  async getRoles() {
    const { data } = await api.get<ApiResponse>('/employees/roles');
    return data;
  },

  async getRole(id: string) {
    const { data } = await api.get<ApiResponse>(`/employees/roles/${id}`);
    return data;
  },

  async createRole(payload: any) {
    const { data } = await api.post<ApiResponse>('/employees/roles', payload);
    return data;
  },

  async updateRole(id: string, payload: any) {
    const { data } = await api.patch<ApiResponse>(`/employees/roles/${id}`, payload);
    return data;
  },

  async deleteRole(id: string) {
    const { data } = await api.delete<ApiResponse>(`/employees/roles/${id}`);
    return data;
  },
};
