import { create } from 'zustand';
import type { Product, Table } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface CartItem {
  id: string; // temporal ID
  product: Product;
  quantity: number;
  modifiers: string[];
  notes?: string;
  subtotal: number;
}

interface PosState {
  // Tipo de orden
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') => void;

  // Mesa seleccionada
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;

  // Items del carrito
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number, modifiers?: string[], notes?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  // Cálculos
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  calculateTotals: () => void;

  // Descuento
  discountType: 'PERCENTAGE' | 'FIXED' | null;
  discountValue: number;
  applyDiscount: (type: 'PERCENTAGE' | 'FIXED', value: number) => void;
  removeDiscount: () => void;

  // Orden actual (cuando se crea)
  currentOrder: any | null;
  setCurrentOrder: (order: any) => void;
}

// ============================================================================
// STORE POS
// ============================================================================

export const usePosStore = create<PosState>((set, get) => ({
  // Tipo de orden
  orderType: 'DINE_IN',
  setOrderType: (type) => set({ orderType: type }),

  // Mesa seleccionada
  selectedTable: null,
  setSelectedTable: (table) => set({ selectedTable: table }),

  // Items del carrito
  cartItems: [],
  
  addToCart: (product, quantity, modifiers = [], notes) => {
    const cartItems = get().cartItems;
    
    // Buscar si existe un item idéntico (mismo producto y mismos modificadores)
    const existingItem = cartItems.find(
      item => item.product.id === product.id && 
      JSON.stringify(item.modifiers.sort()) === JSON.stringify(modifiers.sort()) &&
      item.notes === notes
    );

    if (existingItem) {
      // Si existe, solo aumentar cantidad
      set({
        cartItems: cartItems.map(item =>
          item.id === existingItem.id
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                subtotal: item.product.price * (item.quantity + quantity)
              }
            : item
        )
      });
    } else {
      // Si no existe, agregar nuevo item
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        product,
        quantity,
        modifiers,
        notes,
        subtotal: product.price * quantity
      };
      set({ cartItems: [...cartItems, newItem] });
    }
    
    get().calculateTotals();
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }
    
    set({
      cartItems: get().cartItems.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              quantity, 
              subtotal: item.product.price * quantity 
            }
          : item
      )
    });
    
    get().calculateTotals();
  },

  removeFromCart: (itemId) => {
    set({ cartItems: get().cartItems.filter(item => item.id !== itemId) });
    get().calculateTotals();
  },

  clearCart: () => {
    set({
      cartItems: [],
      selectedTable: null,
      currentOrder: null,
      discount: 0,
      discountType: null,
      discountValue: 0,
      subtotal: 0,
      tax: 0,
      total: 0
    });
  },

  // Cálculos
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,

  calculateTotals: () => {
    const cartItems = get().cartItems;
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calcular descuento
    const { discountType, discountValue } = get();
    let discount = 0;
    
    if (discountType === 'PERCENTAGE') {
      discount = (subtotal * discountValue) / 100;
    } else if (discountType === 'FIXED') {
      discount = discountValue;
    }
    
    // Asegurar que el descuento no sea mayor al subtotal
    discount = Math.min(discount, subtotal);
    
    // Calcular impuesto (18% IGV en Perú)
    const taxRate = 0.18;
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * taxRate;
    
    // Total
    const total = subtotal - discount + tax;

    set({ subtotal, tax, discount, total });
  },

  // Descuento
  discountType: null,
  discountValue: 0,
  
  applyDiscount: (type, value) => {
    set({ 
      discountType: type, 
      discountValue: value 
    });
    get().calculateTotals();
  },

  removeDiscount: () => {
    set({ 
      discountType: null, 
      discountValue: 0,
      discount: 0
    });
    get().calculateTotals();
  },

  // Orden actual
  currentOrder: null,
  setCurrentOrder: (order) => set({ currentOrder: order })
}));
