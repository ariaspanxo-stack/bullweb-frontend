// ═══════════════════════════════════════════════════════════════
// HOOK: useMeseroTables — carga y polling de mesas + WebSocket
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // ── WebSocket: recarga desde el backend ─────────────────────
  // HOTFIX 300 (B1-10): antes se marcaba la mesa libre/ocupada con el pedido del evento (una mesa con otro
  // pedido abierto quedaba libre). Ahora se recarga: el estado lo decide el backend con la regla del POS.
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadSoon = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(load, 300);
  }, [load]);
  useEffect(() => () => { if (reloadTimer.current) clearTimeout(reloadTimer.current); }, []);

  useMeseroSocket({ onOrderUpdated: reloadSoon, onOrderReady: reloadSoon, onOrdersChanged: reloadSoon });

  return {
    tables: sortedTables,
    sections,
    loading,
    selectedSection,
    setSelectedSection,
    refresh: load,
  };
}
