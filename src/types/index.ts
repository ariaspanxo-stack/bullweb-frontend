// ============================================================================
// TIPOS DE USUARIO Y AUTENTICACIÓN
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  active: boolean;
  roleId: string;
  tenantId?: string;
  tenantSlug?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  totp_enabled?: boolean;
  totp_verified?: boolean;
  last_2fa_at?: string | null;
  modules?: { fidelizacion?: boolean; cupones?: boolean; clientes?: boolean; [key: string]: boolean | undefined };
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  roleId: string;
}

// ============================================================================
// TIPOS DE API
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

// ============================================================================
// TIPOS DE PRODUCTO Y MENÚ
// ============================================================================

export interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sku: string | null;
  categoryId: string;
  category?: Category;
  stationId: string | null;
  station?: Station;
  price: number;
  cost: number | null;
  available: boolean;
  inStock: boolean;
  prepTime: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Modifier {
  id: string;
  name: string;
  type: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TIPOS DE ORDEN
// ============================================================================

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED';

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  userId: string;
  user?: User;
  tableId: string | null;
  table?: Table;
  waiterId: string;
  waiter?: User;
  customerId: string | null;
  customer?: Customer;
  items: OrderItem[];
  payments: Payment[];
  subtotal: number;
  discount: number;
  discountType: string | null;
  tax: number;
  tip: number;
  total: number;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  deletedAt: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  modifiers: any[];
  stationId: string | null;
  station?: Station;
  status: KitchenOrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentMethodId: string;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TIPOS DE MESA
// ============================================================================

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface Table {
  id: string;
  number: string;
  capacity: number;
  sectionId: string;
  section?: Section;
  status: TableStatus;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  shape: string;
  currentOrderId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Section {
  id: string;
  name: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TIPOS DE COCINA
// ============================================================================

export type KitchenOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED';

export interface Station {
  id: string;
  name: string;
  description: string | null;
  order: number;
  color: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenOrder {
  id: string;
  orderId: string;
  order?: Order;
  stationId: string;
  station?: Station;
  status: KitchenOrderStatus;
  priority: number;
  estimatedTime: number | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TIPOS DE CLIENTE
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthdate: string | null;
  allergies: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ============================================================================
// TIPOS DE INVENTARIO
// ============================================================================

export interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number | null;
  unitCost: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Recipe {
  id: string;
  productId: string;
  product?: Product;
  yield: number;
  yieldUnit: string;
  notes: string | null;
  items: RecipeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredient?: Ingredient;
  quantity: number;
  unit: string;
}

export type MovementType = 'PURCHASE' | 'SALE' | 'WASTE' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredient?: Ingredient;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  purchaseId: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

// ============================================================================
// TIPOS DE FORMULARIOS
// ============================================================================

export interface LoginForm {
  email: string;
  password: string;
}

export interface CreateOrderForm {
  type: OrderType;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
}

export interface AddItemsForm {
  items: {
    productId: string;
    quantity: number;
    modifiers?: any[];
    notes?: string;
  }[];
}

export interface RegisterPaymentForm {
  paymentMethodId: string;
  amount: number;
  reference?: string;
  notes?: string;
}
