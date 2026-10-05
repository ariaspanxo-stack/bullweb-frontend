import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Table } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

// ── F2 PROYECTO MODIFICADORES ──
// Modificador seleccionado desde los grupos nuevos (modifier_groups/options).
// En el payload de la orden se mapea a { modifierId, optionId, name, price, quantity }.
export interface CartModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number; // priceAdjustment desde la BD (el server re-verifica)
  quantity: number;
}

export interface CartItem {
  id: string; // temporal ID
  product: Product;
  quantity: number;
  // F2: puede ser string[] (legacy, tags simples) o CartModifier[] (grupos nuevos)
  modifiers: (string | CartModifier)[];
  notes?: string;
  subtotal: number;
}

/**
 * Promoción activa tal como la retorna el backend (GET /api/pos/promotions/active).
 * Contiene un array `productIds` con los IDs de productos a los que aplica.
 */
export interface ActivePromotion {
  id: string;
  productIds: string[];
  type: 'PERCENTAGE' | 'FIXED_PRICE' | 'X_FOR_Y' | 'PACK_PRICE';
  value: number;
  buyQuantity: number;
  getQuantity: number;
}

/**
 * Calcula el subtotal de un item aplicando la MISMA lógica de promociones
 * que usa el backend en `_createOrderTx` (pos.service.ts).
 *
 * Esto garantiza que el total mostrado en el POS coincida con el cobrado.
 *
 * NOTA (F2): los items pueden traer `modifiers` estructurados (CartModifier[]) con
 * priceAdjustment propio. El basePrice replica la fórmula del backend:
 * unitPrice = product.price + Σ(priceAdjustment × quantity) — misma regla de
 * _createOrderTx, y las promos se aplican sobre ese basePrice.
 */
export function _cartModifiersTotal(modifiers: (string | CartModifier)[]): number {
  return modifiers.reduce((sum, m) => {
    if (typeof m === 'string') return sum;
    return sum + (Number(m.price) || 0) * (m.quantity || 1);
  }, 0);
}

function _calculateItemSubtotal(
  product: Product,
  quantity: number,
  activePromotions: ActivePromotion[],
  modifiers: (string | CartModifier)[] = []
): number {
  const basePrice = product.price + _cartModifiersTotal(modifiers);
  console.log('[DEBUG PROMO] Evaluando product.id:', product.id, '| Array activePromotions:', JSON.stringify(activePromotions));
  const promo = activePromotions.find((p) => p.productIds?.includes(product.id));

  // Sin promo: precio base * cantidad
  if (!promo) {
    return basePrice * quantity;
  }

  if (promo.type === 'PERCENTAGE') {
    // Descuento porcentual sobre el precio base
    const discountFactor = promo.value / 100;
    const finalUnitPrice = basePrice * (1 - discountFactor);
    return finalUnitPrice * quantity;
  }

  if (promo.type === 'FIXED_PRICE') {
    // Precio fijo promocional (ej: Pizza a $5.990)
    const finalUnitPrice = promo.value; // + modifierPriceTotal (0 en POS store)
    return finalUnitPrice * quantity;
  }

  if (promo.type === 'X_FOR_Y' && promo.buyQuantity > 0) {
    // Lógica 2x1 (o 3x2, etc). Se pagan 'buyQuantity' y se llevan 'getQuantity' gratis.
    const totalSets = Math.floor(quantity / (promo.buyQuantity + promo.getQuantity));
    const paidItems = totalSets * promo.buyQuantity;
    const remainingItems = quantity - totalSets * (promo.buyQuantity + promo.getQuantity);
    const paidAmount = (paidItems + remainingItems) * basePrice;
    return paidAmount;
  }

  if (promo.type === 'PACK_PRICE' && promo.buyQuantity > 0) {
    // Precio por pack (ej: 2 Mojitos por $5.500)
    const totalPacks = Math.floor(quantity / promo.buyQuantity);
    const remainingItems = quantity % promo.buyQuantity;
    const packAmount = totalPacks * promo.value;
    const remainingAmount = remainingItems * basePrice;
    return packAmount + remainingAmount;
  }

  // Fallback: precio base * cantidad
  return basePrice * quantity;
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
  // F2: firma de combinación (productId + opciones ordenadas + notes)
  _cartFingerprint: (
    product: Product | { id: string },
    modifiers: (string | CartModifier)[],
    notes?: string
  ) => string;
  addToCart: (product: Product, quantity: number, modifiers?: (string | CartModifier)[], notes?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  // Promociones activas (cargadas desde el backend al montar el POS)
  activePromotions: ActivePromotion[];
  setActivePromotions: (promos: ActivePromotion[]) => void;

  // Cálculos
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  calculateTotals: () => void;
  recalcCartSubtotals: () => void;

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

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
  // Tipo de orden
  orderType: 'DINE_IN',
  setOrderType: (type) => set({ orderType: type }),

  // Mesa seleccionada
  selectedTable: null,
  setSelectedTable: (table) => set({ selectedTable: table }),

  // Items del carrito
  cartItems: [],
  
  // ── F2: firma de combinación del carrito ──
  // El mismo producto con distinta combinación de opciones (ej: Doble+tocino vs
  // Simple) son DOS líneas separadas, no una acumulada (el bug latente de la carta,
  // aplicado aquí también). La firma es determinística: productId + optionIds
  // ordenados + cantidad por opción + notes.
  _cartFingerprint(product: Product | { id: string }, modifiers: (string | CartModifier)[], notes?: string): string {
    const stringMods = modifiers
      .filter((m): m is string => typeof m === 'string')
      .sort()
      .join('|');
    const structMods = modifiers
      .filter((m): m is CartModifier => typeof m !== 'string')
      .map((m) => `${m.optionId}x${m.quantity || 1}`)
      .sort()
      .join('|');
    return [product.id, stringMods, structMods, notes ?? ''].join('::');
  },

  addToCart: (product, quantity, modifiers = [], notes) => {
    const cartItems = get().cartItems;
    const fingerprint = get()._cartFingerprint(product, modifiers, notes);

    // Buscar si existe un item idéntico (mismo producto y MISMA combinación de opciones)
    const existingItem = cartItems.find(
      item => get()._cartFingerprint(item.product, item.modifiers, item.notes) === fingerprint
    );

    if (existingItem) {
      // Si existe, solo aumentar cantidad y recalcular subtotal con promos
      set({
        cartItems: cartItems.map(item =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: _calculateItemSubtotal(item.product, item.quantity + quantity, get().activePromotions, item.modifiers)
              }
            : item
        )
      });
    } else {
      // Si no existe, agregar nuevo item con subtotal calculado (con promos)
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        product,
        quantity,
        modifiers,
        notes,
        subtotal: _calculateItemSubtotal(product, quantity, get().activePromotions, modifiers)
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

    const activePromotions = get().activePromotions;
    set({
      cartItems: get().cartItems.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantity,
              subtotal: _calculateItemSubtotal(item.product, quantity, activePromotions, item.modifiers)
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

  // Promociones activas (cargadas desde el backend al montar el POS)
  activePromotions: [],
  setActivePromotions: (promos) => {
    set({ activePromotions: promos });
    // Re-calcular los subtotales de todos los items del carrito con las nuevas promos
    get().recalcCartSubtotals();
  },

  // Cálculos
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,

  recalcCartSubtotals: () => {
    const activePromotions = get().activePromotions;
    set({
      cartItems: get().cartItems.map(item => ({
        ...item,
        subtotal: _calculateItemSubtotal(item.product, item.quantity, activePromotions, item.modifiers)
      }))
    });
    get().calculateTotals();
  },

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
    
    // FIX: Alinear con el backend — el backend NO calcula impuesto (tax = 0).
    // Antes se aplicaba un 18% de IGV (Perú) que el backend no consideraba,
    // causando discrepancia entre el total mostrado en el POS y el cobrado.
    const tax = 0;

    // Total: subtotal - descuento (sin impuesto). El deliveryFee se gestiona
    // en el backend y no está presente en este store del POS.
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
    }),
    {
      name: 'bullweb-pos-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cartItems: state.cartItems,
        selectedTable: state.selectedTable,
        orderType: state.orderType,
        discountType: state.discountType,
        discountValue: state.discountValue,
      }),
      onRehydrateStorage: () => (state) => {
        // Recalcular totales derivados después de restaurar desde localStorage
        state?.calculateTotals();
      },
    }
  )
);
