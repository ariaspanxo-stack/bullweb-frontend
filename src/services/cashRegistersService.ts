import api from './api';
import type { ApiResponse } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CashSession {
  id:                   string;
  registerId:           string;
  openedById:           string;
  closedById:           string | null;
  openedAt:             string;
  closedAt:             string | null;
  openingCash:          number;
  closingCash:          number | null;
  status:               'OPEN' | 'CLOSED';
  notes:                string | null;
  snapshotTotalSales?:  number | null;
  snapshotTotalOrders?: number | null;
  snapshotCashSales?:   number | null;
  snapshotExpectedCash?:number | null;
  closingByMethod?:     Record<string, number> | null;
  // HOTFIX 299: unica fuente de la diferencia del cierre = efectivo contado - efectivo esperado
  difference?:          number | null;
  justification?:       string | null;
}

export interface CashRegister {
  id:       string;
  name:     string;
  branchId: string;
  active:   boolean;
}

export interface ActiveSessionResponse {
  isOpen:   boolean;
  register: CashRegister | null;
  session:  CashSession  | null;
}

export interface CuadreItem {
  method:   string;
  methodId: string;
  count:    number;
  total:    number;
}

/** Hotfix #256: propinas (payments.isTip) de la sesión; no son venta */
export interface CuadreTips {
  total:    number;
  cash:     number;
  byMethod: CuadreItem[];
}

export interface CuadreResponse {
  registerId:    string;
  registerName:  string;
  sessionId:     string;
  sessionStatus: 'OPEN' | 'CLOSED';
  openedAt:      string;
  closedAt:      string | null;
  openingCash:   number;
  cashSales:     number;
  expectedCash:  number;
  totalSales:    number;
  totalOrders:   number;
  byMethod:      CuadreItem[];
  tips?:         CuadreTips;
  // HOTFIX 299: ingresos/retiros manuales de la sesion
  totalCashIn?:  number;
  totalCashOut?: number;
  movements?:    Array<{ id: string; type: 'CASH_IN' | 'CASH_OUT'; amount: number; reason: string | null; performedByName?: string | null; createdAt: string }>;
}

export interface CloseSessionSnapshot {
  totalSales:   number;
  totalOrders:  number;
  cashSales:    number;
  expectedCash: number;
  closingCash:  number;
  difference:   number;
  byMethod:     CuadreItem[];
  tips?:        CuadreTips;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const qs = (params?: Record<string, any>) => {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const cashRegistersService = {
  // ─── Registers ───────────────────────────────────────────────
  async getRegisters(params?: any) {
    const { data } = await api.get<ApiResponse>(`/cash-registers${qs(params)}`);
    return data;
  },

  async getRegisterById(id: string) {
    const { data } = await api.get<ApiResponse>(`/cash-registers/${id}`);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async getActiveRegister() {
    const { data } = await api.get('/cash-registers/active');
    return data;
  },

  /** Retorna sesión activa en formato normalizado para los modales de turno */
  async getActive(): Promise<ActiveSessionResponse> {
    const { data } = await api.get('/cash-registers/active');
    const raw = data; // api.get ya desempaqueta data.data vía handleResponse
    // Verificamos que raw tenga un id válido (guarda contra null o envelope inesperado)
    if (!raw || !raw.id) return { isOpen: false, register: null, session: null };
    return {
      isOpen: raw.isOpen,
      register: {
        id:       raw.id,
        name:     raw.name,
        branchId: raw.branchId ?? '',
        active:   raw.active ?? true,
      },
      session: raw.session ? {
        id:          raw.session.id,
        registerId:  raw.id,
        openedById:  '',
        closedById:  null,
        openedAt:    String(raw.session.openedAt),
        closedAt:    null,
        openingCash: Number(raw.session.openingCash),
        closingCash: null,
        status:      'OPEN' as const,
        notes:       null,
      } : null,
    };
  },

  /** Cuadre de la sesión activa — ventas agrupadas por método de pago */
  async getCuadre(registerId: string): Promise<CuadreResponse> {
    const { data } = await api.get<ApiResponse>(`/cash-registers/${registerId}/cuadre`);
    return data;
  },

  async createRegister(payload: any) {
    const { data } = await api.post<ApiResponse>('/cash-registers', payload);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async updateRegister(id: string, payload: any) {
    const { data } = await api.patch<ApiResponse>(`/cash-registers/${id}`, payload);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async deleteRegister(id: string) {
    const { data } = await api.delete<ApiResponse>(`/cash-registers/${id}`);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  // ─── Sessions ─────────────────────────────────────────────────
  async getSessions(registerId: string, params?: any) {
    const { data } = await api.get<ApiResponse>(`/cash-registers/${registerId}/sessions${qs(params)}`);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async getAllSessions(params?: any) {
    const { data } = await api.get<ApiResponse>(`/cash-registers/sessions/all${qs(params)}`);
    return data;
  },

  async openSession(registerId: string, payload: { openingCash: number; notes?: string; openedAt?: string }) {
    const { data } = await api.post<ApiResponse>(`/cash-registers/${registerId}/open`, payload);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async closeSession(registerId: string, payload: { closingCash: number; notes?: string; closingByMethod?: Record<string, number>; expectedCash?: number; justification?: string }): Promise<{ session: CashSession; snapshot: CloseSessionSnapshot }> {
    const { data } = await api.post<{ session: CashSession; snapshot: CloseSessionSnapshot }>(`/cash-registers/${registerId}/close`, payload);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async addMovement(sessionId: string, payload: { type: 'CASH_IN' | 'CASH_OUT'; amount: number; reason: string }) {
    const { data } = await api.post<ApiResponse>(`/cash-registers/sessions/${sessionId}/movements`, payload);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async listMovements(sessionId: string) {
    const { data } = await api.get<ApiResponse>(`/cash-registers/sessions/${sessionId}/movements`);
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  // HOTFIX 299 (B2-05): justificacion obligatoria, en el body y en ?justification=
  async deleteSession(sessionId: string, justification: string) {
    const { data } = await api.delete<ApiResponse>(
      `/cash-registers/sessions/${sessionId}?justification=${encodeURIComponent(justification)}`,
      { justification },
    );
    return data; // HOTFIX 299: api ya desenvuelve { success, data }
  },

  async printShiftClose(
    registerId: string,
    sessionId:  string,
    printerId:  string,
  ): Promise<{ queued: number; warnings: string[] }> {
    const { data } = await api.post<any>(
      `/cash-registers/${registerId}/print-close`,
      { sessionId, printerId },
    );
    return data as { queued: number; warnings: string[] };
  },

  // HOTFIX 271 — imprimir arqueo (cerrado o parcial) en la impresora de caja del tenant
  async printArqueo(sessionId: string): Promise<{ job_id: string; printer: string; partial: boolean }> {
    const { data } = await api.post<any>(`/cash-registers/sessions/${sessionId}/print-arqueo`, {});
    // HOTFIX 273: api.post ya desenvuelve { success, data }; antes data.data era undefined (toast sin impresora ni "parcial")
    return (data?.job_id ? data : data?.data) as { job_id: string; printer: string; partial: boolean };
  },

  async getSessionCuadre(registerId: string) {
    const { data } = await api.get<ApiResponse>(`/cash-registers/${registerId}/cuadre`);
    return data;
  },

  async getSessionCuadreById(sessionId: string) {
    const { data } = await api.get<ApiResponse>(`/cash-registers/sessions/${sessionId}/cuadre`);
    return data;
  },
};
