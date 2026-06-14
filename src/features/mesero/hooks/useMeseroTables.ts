// ═══════════════════════════════════════════════════════════════
// HOOK: useMeseroTables — carga y polling de mesas + WebSocket
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { meseroService }   from '../meseroService';
import { useMeseroSocket } from './useMeseroSocket';

export function useMeseroTables() {
  const [tables,          setTables]          = useState<any[]>([]);
  const [sections,        setSections]        = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { tables: t, sections: s } = await meseroService.getTables();
      setTables(t ?? []);
      setSections(s ?? []);
      // Auto-seleccionar primera sección (solo la primera vez)
      setSelectedSection(prev => {
        if (!prev && s?.length > 0) return s[0].id;
        return prev;
      });
    } catch {
      // silencioso — puede fallar por WiFi inestable
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => { load(); }, [load]);

  // Polling cada 15s (mesas cambian de estado)
  useEffect(() => {
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const filteredTables = selectedSection
    ? tables.filter(t => t.sectionId === selectedSection)
    : tables;

  // Ordenar numéricamente
  const sortedTables = [...filteredTables].sort(
    (a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0)
  );

  // ── WebSocket: actualización de estado optimista ────────────
  const handleOrderUpdated = useCallback((order: any) => {
    if (!order?.tableId) return;
    setTables(prev => prev.map(table => {
      if (table.id !== order.tableId) return table;
      if (order.status === 'PAID' || order.status === 'CANCELLED')
        return { ...table, status: 'AVAILABLE' };
      if (['PENDING', 'PREPARING', 'READY'].includes(order.status))
        return { ...table, status: 'OCCUPIED' };
      return table;
    }));
  }, []);

  const handleOrderReady = useCallback((_data: any) => { load(); }, [load]);

  useMeseroSocket({ onOrderUpdated: handleOrderUpdated, onOrderReady: handleOrderReady });

  return {
    tables: sortedTables,
    sections,
    loading,
    selectedSection,
    setSelectedSection,
    refresh: load,
  };
}
