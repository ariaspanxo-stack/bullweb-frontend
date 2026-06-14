// ═══════════════════════════════════════════════════════════════
// HOOK: useMeseroOrder — gestión de orden activa
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { meseroService } from '../meseroService';
import { withRetry } from '../../../utils/withRetry';

export interface CartItem {
  productId:      string;
  name:           string;
  price:          number;
  basePrice:      number;
  quantity:       number;
  modifiers:      any[];
  notes:          string;
  // Para ítems ya en la orden (de BD):
  orderItemId?:   string;
  sentToKitchen?: boolean;
}

export function useMeseroOrder(_table: any | null) {
  const [activeOrder,  setActiveOrder]  = useState<any | null>(null);
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);

  // Cargar orden activa de la mesa seleccionada
  const loadOrder = useCallback(async (tableId: string) => {
    setLoadingOrder(true);
    setCart([]);
    try {
      const order = await meseroService.getActiveOrder(tableId);
      setActiveOrder(order ?? null);

      // Hidratar carrito con ítems ya enviados (marcados como sentToKitchen)
      const rawItems = order?.items ?? order?.order_items;
      if (rawItems?.length) {
        const existingItems: CartItem[] = rawItems.map((item: any) => ({
          productId:     item.productId ?? item.product_id,
          name:          item.products?.name ?? item.productName ?? item.name ?? 'Producto',
          price:         Number(item.unitPrice ?? item.price ?? 0),
          basePrice:     Number(item.unitPrice ?? item.price ?? 0),
          quantity:      item.quantity,
          modifiers:     item.modifiers ?? [],
          notes:         item.notes ?? '',
          orderItemId:   item.id,
          sentToKitchen: true, // ya está en la BD
        }));
        setCart(existingItems);
      }
    } catch {
      setActiveOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  }, []);

  // Agregar producto al carrito local
  const addToCart = useCallback((
    product: any,
    modifiers: any[] = [],
    notes: string = ''
  ) => {
    const modTotal = modifiers.reduce((s: number, m: any) => s + (m.price ?? 0), 0);
    const price    = product.price + modTotal;
    const hasExtra = modifiers.length > 0 || !!notes;

    if (!hasExtra) {
      const existingIdx = cart.findIndex(
        i => i.productId === product.id && !i.sentToKitchen && !i.notes
      );
      if (existingIdx >= 0) {
        setCart(prev => prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        ));
        return;
      }
    }

    setCart(prev => [...prev, {
      productId:     product.id,
      name:          product.name,
      price,
      basePrice:     product.price,
      quantity:      1,
      modifiers,
      notes,
      sentToKitchen: false,
    }]);
  }, [cart]);

  // Quitar producto del carrito local
  const removeFromCart = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Cambiar cantidad en carrito local
  const updateQuantity = useCallback((index: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: qty } : item
    ));
  }, [removeFromCart]);

  // Actualizar nota de un ítem pendiente
  const updateNote = useCallback((index: number, note: string) => {
    setCart(prev => prev.map((item, i) =>
      i === index ? { ...item, notes: note } : item
    ));
  }, []);

  const newItems      = cart.filter(i => !i.sentToKitchen);
  const cartTotal     = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const newItemsTotal = newItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // Enviar a cocina
  const sendToKitchen = useCallback(async (
    tableId: string,
    persons: number = 1
  ) => {
    if (submitting || newItems.length === 0) return;
    setSubmitting(true);

    try {
      const itemsPayload = newItems.map(i => ({
        productId: i.productId,
        quantity:  i.quantity,
        modifiers: i.modifiers,
        notes:     i.notes || undefined,
      }));

      if (activeOrder) {
        // Orden existente → agregar ítems
        await withRetry(() => meseroService.addItems(activeOrder.id, itemsPayload));
      } else {
        // Mesa libre → crear orden nueva
        const newOrder = await withRetry(() => meseroService.createOrder({
          tableId,
          items: itemsPayload,
          persons,
        }));
        setActiveOrder(newOrder);
      }

      // Marcar ítems nuevos como enviados
      setCart(prev => prev.map(i =>
        i.sentToKitchen ? i : { ...i, sentToKitchen: true }
      ));

      return true;
    } catch (err: any) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [submitting, newItems, activeOrder]);

  // Solicitar la cuenta
  const requestBill = useCallback(async () => {
    if (!activeOrder || submitting) return;
    setSubmitting(true);
    try {
      await meseroService.requestBill(activeOrder.id);
      return true;
    } finally {
      setSubmitting(false);
    }
  }, [activeOrder, submitting]);

  // Limpiar al cerrar panel
  const clearOrder = useCallback(() => {
    setActiveOrder(null);
    setCart([]);
  }, []);

  return {
    activeOrder,
    cart,
    newItems,
    cartTotal,
    newItemsTotal,
    loadingOrder,
    submitting,
    loadOrder,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateNote,
    sendToKitchen,
    requestBill,
    clearOrder,
  };
}
