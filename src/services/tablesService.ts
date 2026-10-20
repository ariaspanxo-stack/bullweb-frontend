import api from './api';

export interface Table {
  id: string;
  number: number;
  capacity: number;
  sectionId?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  currentOrder?: {
    id: string;
    orderNumber: string;
    total: number;
    guests: number;
  };
}

// HOTFIX 262: el formulario usa 'RECTANGULAR'; el backend acepta 'RECTANGLE'.
const toApiShape = (payload: any) =>
  payload?.shape === 'RECTANGULAR' ? { ...payload, shape: 'RECTANGLE' } : payload;

class TablesService {
  // Obtener todas las mesas
  async getAll(): Promise<Table[]> {
    const response = await api.get<Table[]>('/tables');
    return response.data;
  }

  // Obtener mesa por ID
  async getById(id: string): Promise<Table> {
    const response = await api.get<Table>(`/tables/${id}`);
    return response.data;
  }

  // Abrir mesa
  async open(tableId: string, guests: number): Promise<Table> {
    const response = await api.post<Table>(`/tables/${tableId}/open`, { guests });
    return response.data;
  }

  // Cerrar mesa
  async close(tableId: string): Promise<Table> {
    const response = await api.post<Table>(`/tables/${tableId}/close`);
    return response.data;
  }

  // Cambiar estado
  async updateStatus(tableId: string, status: string): Promise<Table> {
    const response = await api.patch<Table>(`/tables/${tableId}/status`, { status });
    return response.data;
  }

  // Asignar mesero a mesa
  async assignWaiter(tableId: string, waiterId: string): Promise<any> {
    const { data } = await api.post(`/tables/${tableId}/assign`, { waiterId });
    return data;
  }

  // HOTFIX 262: métodos de la página Gestión de Mesas (rutas reales de tables.routes.ts)
  async getTables(): Promise<{ tables: any[]; sections: any[] }> {
    const { data } = await api.get('/tables');
    return { tables: (data as any)?.tables ?? [], sections: (data as any)?.sections ?? [] };
  }

  async getTable(id: string): Promise<any> {
    const { data } = await api.get(`/tables/${id}`);
    return data;
  }

  async getSections(): Promise<any[]> {
    const { data } = await api.get('/tables/sections');
    return Array.isArray(data) ? data : ((data as any)?.sections ?? []);
  }

  async createSection(payload: { name: string; description?: string }): Promise<any> {
    const { data } = await api.post('/tables/sections', payload);
    return data;
  }

  async createTable(payload: any): Promise<any> {
    const { data } = await api.post('/tables', toApiShape(payload));
    return data;
  }

  async updateTable(id: string, payload: any): Promise<any> {
    const { data } = await api.patch(`/tables/${id}`, toApiShape(payload));
    return data;
  }

  async updateTableStatus(tableId: string, status: string): Promise<any> {
    const { data } = await api.patch(`/tables/${tableId}/status`, { status });
    return data;
  }

  // Liberar mesa = volver a AVAILABLE (no existe endpoint propio)
  async releaseTable(tableId: string): Promise<any> {
    return this.updateTableStatus(tableId, 'AVAILABLE');
  }

  async deleteTable(id: string): Promise<void> {
    await api.delete(`/tables/${id}`);
  }

  // Listar meseros disponibles
  async listWaiters(): Promise<any[]> {
    const { data } = await api.get('/waiter/staff');
    return (data as any)?.data ?? data ?? [];
  }
}

export default new TablesService();
