import api from './api';

export interface Printer {
  id: string;
  name: string;
  type: 'receipt' | 'kitchen' | 'bar' | 'label';
  connection_type: 'ethernet' | 'usb' | 'serial' | 'os_driver';
  ip_address: string | null;
  port: number | null;
  protocol: string | null;
  paper_width: number | null;
  is_active: boolean;
  notes: string | null;
  branch_id: string | null;
  agent_id: string | null;
  serial_port: string | null;
  serial_baud: number | null;
  usb_vendor_id: string | null;
  usb_product_id: string | null;
  os_printer_name: string | null;
  last_test_at: string | null;
  created_at: string;
  updated_at: string;
  branches?: { id: string; name: string } | null;
  print_agents?: { id: string; name: string } | null;
}

export interface CreatePrinterDTO {
  name: string;
  type?: 'receipt' | 'kitchen' | 'bar' | 'label';
  connection_type?: 'ethernet' | 'usb' | 'serial' | 'os_driver';
  ip_address?: string;
  port?: number;
  protocol?: string;
  paper_width?: number;
  is_active?: boolean;
  notes?: string;
  branch_id?: string;
  agent_id?: string | null;
  serial_port?: string | null;
  serial_baud?: number | null;
  usb_vendor_id?: string | null;
  usb_product_id?: string | null;
  os_printer_name?: string | null;
}

export interface UpdatePrinterDTO extends Partial<CreatePrinterDTO> {}

export interface PrinterTestResult {
  success: boolean;
  printer_id: string;
  printer_name: string;
  ip_address: string | null;
  port: number | null;
  tested_at: string;
  message: string;
}

export const printersService = {
  /**
   * Listar impresoras
   */
  async listPrinters(filters?: {
    type?: string;
    is_active?: boolean;
    branch_id?: string;
  }): Promise<Printer[]> {
    const params: Record<string, unknown> = {};
    if (filters?.type) params.type = filters.type;
    if (filters?.branch_id) params.branch_id = filters.branch_id;
    if (filters?.is_active !== undefined) params.is_active = String(filters.is_active);

    const response = await api.get('/printers', { params });
    return response.data.data;
  },

  /**
   * Obtener impresora por ID
   */
  async getPrinter(id: string): Promise<Printer> {
    const response = await api.get(`/printers/${id}`);
    return response.data.data;
  },

  /**
   * Crear impresora
   */
  async createPrinter(data: CreatePrinterDTO): Promise<Printer> {
    const response = await api.post('/printers', data);
    return response.data.data;
  },

  /**
   * Actualizar impresora
   */
  async updatePrinter(id: string, data: UpdatePrinterDTO): Promise<Printer> {
    const response = await api.put(`/printers/${id}`, data);
    return response.data.data;
  },

  /**
   * Desactivar impresora
   */
  async deletePrinter(id: string): Promise<void> {
    await api.delete(`/printers/${id}`);
  },

  /**
   * Test de conexión
   */
  async testPrinter(id: string): Promise<PrinterTestResult> {
    const response = await api.post(`/printers/${id}/test`);
    return response.data.data;
  },
};
