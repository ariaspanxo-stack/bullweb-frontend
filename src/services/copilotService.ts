// LOTE COPILOTO 1: pantalla Copiloto. api.get/put ya desenvuelven { success, data }: res.data es el objeto.
import api from './api';

export interface CopilotSettings {
  enabled: boolean;
  summaryEmail: string | null;
  effectiveEmail: string | null;
}

export interface CopilotFigures {
  fecha: string;
  ventas: number;
  pedidos: number;
  ticket: number;
  ventasSemanaAnterior: number;
  variacionPct: number | null;
  top: { nombre: string; cantidad: number; monto: number }[];
  propinas: number;
  arqueo: { turnos: number; cuadrados: number; diferencia: number; turnosAbiertos: number };
  pedidosAbiertos: number;
  devoluciones: { cantidad: number; monto: number };
}

export interface CopilotDigest {
  id: string;
  businessDate: string;
  figures: CopilotFigures;
  narrative: string | null;
  source: 'pendiente' | 'gemini' | 'tabla';
  emailTo: string | null;
  emailStatus: string | null;
  waLink: string;
}

export interface CopilotAlert {
  id: string;
  businessDate: string;
  kind: 'stock' | 'sin_ventas' | 'pedido_abierto';
  total: number;
  items: Record<string, any>[];
  waLink: string;
}

export interface CopilotHistory {
  plan: 'BASICO' | 'TODO';
  digests: CopilotDigest[];
  alerts: CopilotAlert[];
}

// LOTE 321: chat del dueño (pestaña Preguntar)
export interface CopilotChatItem {
  id: string;
  pregunta: string;
  status: 'ok' | 'tabla' | 'fuera_de_alcance' | 'error' | 'sin_clave';
  respuesta: string;
  tabla: { titulo: string; columnas: string[]; filas: string[][] } | null;
  sugerencias: string[];
  waLink: string;
  createdAt: string;
}

export interface CopilotChatDay {
  habilitado: boolean;
  mensaje?: string;
  fecha?: string;
  items: CopilotChatItem[];
  restantes: number;
  limiteDia?: number;
  ejemplos: string[];
}

export const copilotService = {
  async getChat(): Promise<CopilotChatDay> {
    return (await api.get<any>('/copilot/chat')).data as CopilotChatDay;
  },
  async ask(pregunta: string): Promise<CopilotChatItem> {
    // dos llamadas al modelo: 75 s (el resto de la app sigue con 10 s); el servidor corta cada llamada a los 15 s
    return (await api.post<any>('/copilot/chat', { pregunta }, { timeoutMs: 75_000 })).data as CopilotChatItem;
  },
  async getSettings(): Promise<CopilotSettings> {
    return (await api.get<any>('/copilot/settings')).data as CopilotSettings;
  },
  async saveSettings(enabled: boolean, summaryEmail: string): Promise<CopilotSettings> {
    return (await api.put<any>('/copilot/settings', { enabled, summaryEmail: summaryEmail.trim() || null })).data as CopilotSettings;
  },
  async getHistory(): Promise<CopilotHistory> {
    return (await api.get<any>('/copilot/history?limit=30')).data as CopilotHistory;
  },
  async markRead(): Promise<void> {
    await api.post<any>('/copilot/read', {});
  },
};
