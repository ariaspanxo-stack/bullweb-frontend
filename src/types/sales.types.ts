export type SaleStatus = 'open' | 'paying' | 'closed' | 'cancelled';
export type SaleType = 'dine_in' | 'counter' | 'delivery' | 'takeout';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer' | 'unpaid';

// Shift type para enterprise
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'full_day';

export interface CancelledItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  orderNumber?: string;       // nombre real del backend
  startTime: Date;
  closeTime?: Date;
  closedAt?: Date;
  cancelledAt?: Date;
  cancel_reason?: string;
  cancelled_by?: string;
  tip?: number;               // propina total de la orden (campo backend)
  status: SaleStatus | string;  // backend usa uppercase: PENDING, PREPARING etc.
  type: SaleType | string;      // backend usa uppercase: TAKEAWAY, DINE_IN etc.
  shift?: ShiftType;
  tableNumber?: string;
  tableId?: string;
  waiterName: string;
  waiterId?: string;
  customerName?: string;
  customerId?: string;
  customerAddress?: string;    // delivery
  customerPhone?: string;      // delivery
  deliveryFee?: number;        // delivery — costo de despacho
  cashRegisterId?: string;
  items: SaleItem[];
  payments: Payment[];
  tips: Tip[];
  subtotal: number;
  discount: number;
  discountType?: string | null;
  tax: number;
  total: number;
  originalTotal?: number;       // total antes de anular (snapshot)
  cancelledItems?: CancelledItem[]; // items guardados al anular
  numberOfPeople: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  modifiers?: ProductModifier[];  // CHANGE: De string[] a objeto completo
  modifiersPrice?: number;  // ADD: Precio total de modificadores
  notes?: string;
  subtotal?: number;
  isCancelled?: boolean;   // Soft-delete visual: el backend ya canceló el item
  cancelReason?: string;   // Motivo de la cancelación (para mostrar en UI)
  cancelledAt?: string | null;  // Fecha de cancelación (ISO string)
}

// ADD: Tipo para modificadores estructurados
export interface ProductModifier {
  id: string;
  name: string;
  price: number;
  category?: string;  // ej: "Adicionales", "Sin ingredientes"
}

export interface Payment {
  id?: string;
  orderId?: string;
  method: string;  // 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED' | any backend value
  amount: number;
  reference?: string;
  createdAt?: Date;
}

export interface PaymentSplit {
  method: 'CASH' | 'CARD' | 'TRANSFER';
  amount: number;
}

export interface Tip {
  id: string;
  amount: number;
  method: PaymentMethod;
  waiterName: string;
  createdAt: Date;
}

export interface SalesFilters {
  startDate: Date;
  endDate: Date;
  shift?: string;
  status?: SaleStatus;
  type?: SaleType;
  waiter?: string;
  paymentMethod?: string;
  tableNumber?: string;
  invoiceStatus?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface SalesStats {
  totalSales: number;
  averagePerSale: number;
  totalPeople: number;
  averagePerPerson: number;
  grandTotal: number;
  paymentBreakdown: {
    method: PaymentMethod;
    amount: number;
    percentage: number;
  }[];
  cancellations: number;
  totalTips: number;
  // Mejora #1 — campos nuevos para modales
  cancelledCount: number;
  cancelledTotal: number;
  cancelReasons: { reason: string; count: number }[];
  tipsCount: number;
  topTipWaiters: { name: string; total: number; count: number }[];
}
