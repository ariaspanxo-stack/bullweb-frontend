import type { Sale, SaleItem, Payment, Tip } from '../types/sales.types';

// Tipo temporal para Order del backend
interface BackendOrder {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'PAID' | 'CANCELLED';
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: string | null;
  tip: number;
  total: number;
  tableId?: string;
  waiterId?: string;
  customerId?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  items?: BackendOrderItem[];
  payments?: BackendPayment[];
  tables?: { number: string };   // nombre real del modelo Prisma
  table?: { number: string };    // alias legacy
  users_orders_waiterIdTousers?: { id: string; name: string; email: string };
  waiter?: { name: string };
  customer?: { name: string };   // alias legacy
  customers?: { name: string };  // nombre real Prisma (relación)
  customerName?: string;         // campo directo en tabla orders
  originalTotal?: number;        // total antes de anular
  cancelledItems?: any[];        // snapshot de items al anular
}

interface BackendOrderItem {
  id: string;
  productId: string;
  product?: { name: string };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  modifiers?: string[];
  notes?: string;
}

interface BackendPayment {
  id: string;
  paymentMethodId?: string;
  method?: string;       // legacy, puede no existir
  amount: number;
  reference?: string;
  createdAt: string;
  payment_methods?: {    // incluido por Prisma include
    id: string;
    name: string;
  };
}

/**
 * Mapea el status del backend al del frontend
 */
export function mapOrderStatus(backendStatus: string): Sale['status'] {
  const statusMap: Record<string, Sale['status']> = {
    'PENDING': 'open',
    'PREPARING': 'open',
    'READY': 'open',
    'DELIVERED': 'paying',
    'PAID': 'closed',
    'CANCELLED': 'cancelled',
    'ANULADA': 'cancelled',
  };
  
  return statusMap[backendStatus] || 'open';
}

/**
 * Mapea el type del backend al del frontend
 */
export function mapOrderType(backendType: string): Sale['type'] {
  const typeMap: Record<string, Sale['type']> = {
    'DINE_IN': 'dine_in',
    'TAKEAWAY': 'takeout',
    'DELIVERY': 'delivery'
  };
  
  return typeMap[backendType] || 'counter';
}

/**
 * Mapea el status del frontend al del backend
 */
export function mapSaleStatusToBackend(frontendStatus: Sale['status']): string {
  const statusMap: Record<Sale['status'], string> = {
    'open': 'ACTIVE',       // todos los estados activos: PENDING, PREPARING, READY
    'paying': 'DELIVERED',  // órden en proceso de cobro
    'closed': 'PAID',
    'cancelled': 'CANCELLED'
  };
  
  return statusMap[frontendStatus] || 'PENDING';
}

/**
 * Mapea el type del frontend al del backend
 */
export function mapSaleTypeToBackend(frontendType: Sale['type']): string {
  const typeMap: Record<Sale['type'], string> = {
    'dine_in': 'DINE_IN',
    'counter': 'DINE_IN',
    'delivery': 'DELIVERY',
    'takeout': 'TAKEAWAY'
  };
  
  return typeMap[frontendType] || 'DINE_IN';
}

/**
 * Extrae el nombre del método de pago desde el objeto de pago del backend.
 * El backend devuelve `payment_methods.name` via Prisma include.
 */
function extractPaymentMethodName(payment: BackendPayment): string {
  // 1. Nombre real desde la relación Prisma
  if (payment.payment_methods?.name) return payment.payment_methods.name;
  // 2. Fallback: campo method legacy (si existe)
  if (payment.method) return payment.method;
  // 3. Último recurso
  return 'Efectivo';
}

/**
 * Mapea un Order del backend a un Sale del frontend
 */
export function mapOrderToSale(order: BackendOrder): Sale {
  // Mapear items — backend devuelve `order_items` con relación `products` (Prisma)
  const rawItems: any[] = (order as any).order_items || order.items || [];
  const items: SaleItem[] = rawItems.map(item => ({
    id: item.id,
    productId: item.productId,
    productName: item.products?.name || item.product?.name || 'Producto',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.subtotal || (item.unitPrice * item.quantity),
    modifiers: item.modifiers,
    notes: item.notes
  }));

  // Mapear payments
  const payments: Payment[] = (order.payments || []).map(payment => ({
    id: payment.id,
    method: extractPaymentMethodName(payment),
    amount: payment.amount,
    reference: payment.reference,
    createdAt: new Date(payment.createdAt)
  }));

  // Tips (temporalmente vacío, agregar lógica después)
  const tips: Tip[] = order.tip > 0 ? [{
    id: `tip-${order.id}`,
    amount: order.tip,
    employeeId: order.waiterId || '',
    employeeName: order.waiter?.name || '',
    createdAt: new Date(order.createdAt)
  }] : [];

  // Construir Sale
  const sale: Sale = {
    id: order.id,
    saleNumber: order.orderNumber,
    startTime: new Date(order.createdAt),
    closeTime: order.completedAt ? new Date(order.completedAt) : undefined,
    status: mapOrderStatus(order.status),
    type: mapOrderType(order.type),
    tableNumber: order.tables?.number ?? order.table?.number,
    waiterName: order.users_orders_waiterIdTousers?.name ?? order.waiter?.name ?? 'Sin asignar',
    customerName: order.customers?.name ?? order.customer?.name ?? order.customerName,
    items,
    payments,
    tips,
    subtotal: order.subtotal,
    discount: order.discount,
    discountType: order.discountType,
    tax: order.tax,
    total: order.total,
    numberOfPeople: (order as any).persons ?? (order as any).numberOfPeople ?? 1,
    cancel_reason: (order as any).cancel_reason,
    cancelledAt: (order as any).cancelledAt ? new Date((order as any).cancelledAt) : undefined,
    cancelled_by: (order as any).cancelled_by,
    closedAt: order.completedAt ? new Date(order.completedAt) : undefined,
    originalTotal: (order as any).originalTotal ?? undefined,
    cancelledItems: (order as any).cancelledItems ?? undefined,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.completedAt || order.createdAt)
  };

  return sale;
}

/**
 * Mapea un Sale del frontend a CreateOrderDto del backend
 */
export function mapSaleToCreateOrder(sale: Partial<Sale>) {
  return {
    type: mapSaleTypeToBackend(sale.type || 'counter'),
    tableId: sale.tableNumber, // Ajustar si necesitas buscar ID real
    customerId: undefined, // Agregar lógica si tienes customerId
    items: (sale.items || []).map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiers: item.modifiers,
      notes: item.notes
    }))
  };
}
