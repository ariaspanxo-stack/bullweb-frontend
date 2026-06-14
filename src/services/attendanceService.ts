import api from './api';

// ─── Tipos ─────────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  tipo: 'entrada' | 'salida' | 'colacion_inicio' | 'colacion_fin';
  timestamp: string;
  turno: string;
  tardanza: boolean;
  editNote?: string;
}

export interface Justificativo {
  id: string;
  employeeId: string;
  fecha: string;
  tipo: 'medico' | 'personal' | 'vacaciones' | 'feriado' | 'licencia';
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  descripcion?: string;
  documentoUrl?: string;
}

export interface AlertaAsistencia {
  id: string;
  employeeId: string;
  tipo: 'ausencia' | 'tardanza' | 'sin_salida';
  mensaje: string;
  leida: boolean;
  fecha: string;
}

export interface CalendarioDia {
  date: string;
  estado: 'P' | 'A' | 'T' | 'J' | '';
  entrada?: string;
  salida?: string;
  minutos?: number;
}

export interface CalendarioEmpleado {
  employeeId: string;
  employeeName: string;
  dias: CalendarioDia[];
  stats: { presentes: number; ausentes: number; tardanzas: number; justificados: number };
}

const qs = (params?: Record<string, any>) => {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const attendanceService = {
  // ─── Justificativos ────────────────────────────────────────────────────────

  /** Listar justificativos (requiere employees.view) */
  async getJustificativos(params?: { employeeId?: string; estado?: string; from?: string; to?: string }) {
    const { data } = await api.get(`/attendance/justificativos${qs(params)}`);
    return data.data as Justificativo[];
  },

  /** Crear justificativo (sin auth — puede usarse desde admin también) */
  async createJustificativo(payload: {
    employeeId: string;
    fecha: string;
    tipo: Justificativo['tipo'];
    descripcion?: string;
  }) {
    const { data } = await api.post('/attendance/justificativos', payload);
    return data.data as Justificativo;
  },

  /** Aprobar o rechazar justificativo (requiere employees.manage) */
  async approveJustificativo(id: string, estado: 'aprobado' | 'rechazado') {
    const { data } = await api.patch(`/attendance/justificativos/${id}`, { estado });
    return data.data as Justificativo;
  },

  /** Subir documento PDF/JPG/PNG para un justificativo (requiere employees.manage) */
  async uploadDocumento(id: string, file: File, onProgress?: (pct: number) => void) {
    const form = new FormData();
    form.append('documento', file);
    const { data } = await api.post(`/attendance/justificativos/${id}/documento`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (evt) => {
            if (evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        : undefined,
    });
    return data.data;
  },

  // ─── Alertas ───────────────────────────────────────────────────────────────

  /** Listar alertas no leídas (requiere employees.view) */
  async getAlertas() {
    const { data } = await api.get('/attendance/alertas');
    return data.data as AlertaAsistencia[];
  },

  /** Marcar alerta como leída (requiere employees.view) */
  async marcarAlertaLeida(id: string) {
    const { data } = await api.patch(`/attendance/alertas/${id}/leer`);
    return data.data as AlertaAsistencia;
  },

  /** Marcar todas las alertas como leídas (endpoint batch) */
  async marcarTodasLeidas() {
    const { data } = await api.put('/attendance/alertas/leer-todas');
    return data.data;
  },

  // ─── Calendario ────────────────────────────────────────────────────────────

  /** Calendario mensual de un empleado */
  async getCalendario(userId: string, year: number, month: number) {
    const { data } = await api.get(`/attendance/calendario${qs({ userId, year, month })}`);
    return data.data as { dias: CalendarioDia[]; stats: CalendarioEmpleado['stats'] };
  },

  /** Calendario mensual de todos los empleados (vista equipo) */
  async getCalendarioEquipo(year: number, month: number) {
    const { data } = await api.get(`/attendance/calendario/equipo${qs({ year, month })}`);
    return data.data as CalendarioEmpleado[];
  },

  // ─── PDF export ────────────────────────────────────────────────────────────

  /** Descargar Libro de Asistencia en PDF */
  async downloadPdf(params?: { from?: string; to?: string; employeeId?: string }) {
    const resp = await api.get(`/attendance/export/pdf${qs(params)}`, { responseType: 'blob' });
    const url  = URL.createObjectURL(resp.data as Blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `libro_asistencia_${params?.from ?? 'all'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
