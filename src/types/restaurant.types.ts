// ═══════════════════════════════════════════════════════════════
// RESTAURANT TYPES - UNIFIED WITH SALES (ENTERPRISE)
// ═══════════════════════════════════════════════════════════════
// Este archivo EXTIENDE sales.types.ts con tipos específicos de Restaurant
// NO duplica tipos que ya existen en Sales
// ═══════════════════════════════════════════════════════════════

import type { 
  Sale, 
  SaleItem, 
  SaleStatus, 
  SaleType, 
  PaymentMethod,
  ShiftType,
  ProductModifier,
  Payment,
  PaymentSplit,
  Tip
} from './sales.types';

// ═══════════════════════════════════════════════════════════════
// TIPOS ESPECÍFICOS DE RESTAURANT (No existen en Sales)
// ═══════════════════════════════════════════════════════════════

// ========== MESAS ==========
export interface Table {
  id: string;
  number: string;
  capacity: number;
  sectionId: string;
  section?: Section;    // alias frontend
  sections?: Section;   // nombre real del backend (plural)
  status: TableStatus;
  currentSaleId?: string;
  currentSale?: Sale;
  occupiedSince?: Date;
  waiterName?: string;
  waiterId?: string;
  numberOfPeople?: number;
  currentTotal?: number;
  activeOrderCreatedAt?: string | Date | null;   // createdAt de la orden activa
  preparingItemsCount?: number;                  // ítems en preparación
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface Section {
  id: string;
  name: string;
  description?: string;
  image?: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ========== PRODUCTOS ==========
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  category?: ProductCategory;
  available: boolean;
  imageUrl?: string;
  preparationTime?: number;
  popular?: boolean;
  modifiers?: ProductModifier[];  // ADD: Modificadores disponibles
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  icon?: string;
  color?: string;
}

// ========== CARRITO ==========
// CartItem es compatible con SaleItem pero con campos adicionales para UI
export interface CartItem extends Omit<SaleItem, 'id'> {
  id: string;       // ID temporal en frontend (uuid)
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;     // unitPrice * quantity + modifiersPrice
  subtotal: number;  // alias de total para compatibilidad con UI
  modifiers?: ProductModifier[];
  modifiersPrice?: number;
  notes?: string;
}

// ========== FILTROS ==========
export interface RestaurantFilters {
  section?: string;
  tableStatus?: TableStatus;
  saleStatus?: SaleStatus;
  saleType?: SaleType;
  searchQuery?: string;
  shift?: ShiftType;
  waiterId?: string;
}

// ========== ESTADÍSTICAS ==========
export interface RestaurantStats {
  totalTables: number;
  occupiedTables: number;
  availableTables: number;
  activeSales: number;
  pendingOrders?: number;
  preparingOrders?: number;
  readyOrders?: number;
  totalRevenue: number;
  averageTicket?: number;
  totalPeople?: number;
}

// ═══════════════════════════════════════════════════════════════
// DTOs PARA API (Backend Integration)
// ═══════════════════════════════════════════════════════════════

export interface CreateDineInSaleDTO {
  // Campos requeridos
  type: 'dine_in';
  tableId: string;
  cashRegisterId: string;
  
  // Campos opcionales
  waiterId?: string;
  customerId?: string;
  customerName?: string;   // nombre si no tiene customerId
  customerPhone?: string;  // teléfono si no tiene customerId
  numberOfPeople?: number;
  
  // Items
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    modifiers?: ProductModifier[];
    modifiersPrice?: number;
    notes?: string;
  }[];
  
  // Notas
  notes?: string;
}

export interface CreateCounterSaleDTO {
  type: 'counter';
  cashRegisterId: string;
  waiterId?: string;
  customerId?: string;
  customerName?: string;
  items: CreateDineInSaleDTO['items'];
  notes?: string;
}

export interface CreateDeliverySaleDTO {
  type: 'delivery';
  cashRegisterId: string;
  waiterId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryFee?: number;
  items: CreateDineInSaleDTO['items'];
  notes?: string;
}

export interface AddSaleItemDTO {
  productId: string;
  quantity: number;
  unitPrice: number;
  modifiers?: ProductModifier[];
  modifiersPrice?: number;
  notes?: string;
}

export interface UpdateSaleItemDTO {
  quantity?: number;
  modifiers?: ProductModifier[];
  modifiersPrice?: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS (Para compatibilidad con código existente)
// ═══════════════════════════════════════════════════════════════

export type {
  Sale,
  SaleItem,
  SaleStatus,
  SaleType,
  PaymentMethod,
  ShiftType,
  ProductModifier,
  Payment,
  PaymentSplit,
  Tip
};

// Aliases para migración gradual (DEPRECAR después de Sprint 1.1)
/** @deprecated Use Sale instead */
export type Order = Sale;

/** @deprecated Use SaleItem instead */
export type OrderItem = SaleItem;

/** @deprecated Use 'dine_in' instead */
export const ORDER_TYPE_DINE_IN = 'dine_in' as const;

/** @deprecated Use 'counter' instead */
export const ORDER_TYPE_TAKEAWAY = 'counter' as const;

/** @deprecated Use 'delivery' instead */
export const ORDER_TYPE_DELIVERY = 'delivery' as const;
