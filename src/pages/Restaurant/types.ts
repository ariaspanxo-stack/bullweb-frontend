// Re-export del tipo canónico Customer desde el módulo central.
// Todos los componentes de la sección Clientes deben importar desde aquí
// o directamente desde '@/types/customer.types'.
export type { Customer, CustomerTag, CustomerFormData, CustomerStats } from '@/types/customer.types';

// CustomerOrder — tipo específico del historial de pedidos en el modal de detalle
export interface CustomerOrder {
  id: string;
  orderNumber: string;
  type: 'mostrador' | 'delivery';
  date: Date | string;
  total: number;
  items: number;
  products: Array<{ name: string; quantity: number; price: number }>;
  status: string;
}
