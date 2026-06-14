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

  // Listar meseros disponibles
  async listWaiters(): Promise<any[]> {
    const { data } = await api.get('/waiter/staff');
    return (data as any)?.data ?? data ?? [];
  }
}

export default new TablesService();
