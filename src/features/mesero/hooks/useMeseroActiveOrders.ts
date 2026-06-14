// ═══════════════════════════════════════════════════════════════
// HOOK: useMeseroActiveOrders — mesas ocupadas con órdenes activas
// Actualización en tiempo real vía WebSocket + polling 20s fallback
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { meseroService } from '../meseroService';
import { useMeseroSocket } from './useMeseroSocket';

export interface TableWithOrder {
  id:          string;
  number:      string;
  status:      string;
  capacity?:   number;
  section:     any;
  activeOrder: any;
}

export function useMeseroActiveOrders() {
  const [tables,  setTables]  = useState<TableWithOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await meseroService.getOccupiedTablesWithOrders();
      setTables(data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => { load(); }, [load]);

  // Polling cada 20s como fallback
  useEffect(() => {
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  // WebSocket — actualizar en tiempo real
  const handleOrderUpdated = useCallback((order: any) => {
    if (!order) return;

    setTables(prev => {
      // Si la orden se pagó/canceló → quitar la mesa de la lista
      if (['PAID', 'CANCELLED'].includes(order.status)) {
        return prev.filter(t => t.activeOrder?.id !== order.id);
      }

      // Verificar si ya tenemos esta orden
      const exists = prev.some(t => t.activeOrder?.id === order.id);
      if (!exists) {
        // Mesa nueva ocupada → forzar refresh para obtener datos completos
        load();
        return prev;
      }

      // Actualizar el estado de la orden en la mesa correspondiente
      return prev.map(t => {
        if (t.activeOrder?.id !== order.id) return t;
        return {
          ...t,
          activeOrder: {
            ...t.activeOrder,
            ...order,
            items: order.items ?? order.order_items
              ?? t.activeOrder.items
              ?? t.activeOrder.order_items,
          },
        };
      });
    });
  }, [load]);

  const handleOrderReady = useCallback((data: any) => {
    if (!data?.orderId) return;
    // Marcar la orden como lista en la lista local
    setTables(prev => prev.map(t => {
      if (t.activeOrder?.id !== data.orderId) return t;
      return {
        ...t,
        activeOrder: { ...t.activeOrder, status: 'READY' },
      };
    }));
  }, []);

  useMeseroSocket({
    onOrderUpdated: handleOrderUpdated,
    onOrderReady:   handleOrderReady,
  });

  const readyCount     = tables.filter(t => t.activeOrder?.status === 'READY').length;
  const preparingCount = tables.filter(t => t.activeOrder?.status === 'PREPARING').length;

  return {
    tables,
    loading,
    readyCount,
    preparingCount,
    refresh: load,
  };
}
