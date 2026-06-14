export interface Order {
  id: string;
  orderNumber: string;
  status: 'completed' | 'cancelled' | 'pending';
  paymentMethod: 'cash' | 'card' | 'transfer';
  subtotal: number;
  modifiersTotal: number;
  total: number;
  notes?: string;
  customerName?: string;
  customerTable?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers?: string; // JSON string
  modifiersPrice: number;
  subtotal: number;
  total: number;
  notes?: string;
  createdAt: string;
  product?: any;
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedModifiers: SelectedModifier[];
  modifiersPrice: number;
  subtotal: number;
  total: number;
  notes?: string;
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

export interface OrderStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
}

export interface CreateOrderData {
  items: {
    productId: string;
    quantity: number;
    modifiers?: SelectedModifier[];
    modifiersPrice: number;
    notes?: string;
  }[];
  paymentMethod: string;
  notes?: string;
  customerName?: string;
  customerTable?: string;
}
