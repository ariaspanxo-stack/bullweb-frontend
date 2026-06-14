// ═══════════════════════════════════════════════════════════════
// MESERO PAGE — página principal de la app mesero (PWA Fase 2)
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MeseroLayout }       from '../../features/mesero/components/MeseroLayout';
import { MeseroTableGrid }    from '../../features/mesero/components/MeseroTableGrid';
import { MeseroOrderView }    from '../../features/mesero/components/MeseroOrderView';
import { MeseroActiveOrders } from '../../features/mesero/components/MeseroActiveOrders';
import { useMeseroTables }       from '../../features/mesero/hooks/useMeseroTables';
import { useMeseroMenu }         from '../../features/mesero/hooks/useMeseroMenu';
import { useMeseroOrder }        from '../../features/mesero/hooks/useMeseroOrder';
import { useMeseroActiveOrders } from '../../features/mesero/hooks/useMeseroActiveOrders';
import { useMeseroNotifications } from '../../features/mesero/hooks/useMeseroNotifications';

export function MeseroPage() {
  const [activeView,    setActiveView]    = useState<'mesas' | 'mis-ordenes'>('mesas');
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // ── Hooks — mesas, menú, orden, órdenes activas, notificaciones ─
  const {
    tables, sections, loading: loadingTables,
    selectedSection, setSelectedSection, refresh: refreshTables,
  } = useMeseroTables();

  const {
    categories, productsByCategory, products, selectedCategory,
    setSelectedCategory, loading: loadingMenu,
  } = useMeseroMenu();

  const {
    activeOrder, cart, newItems,
    newItemsTotal, cartTotal,
    loadingOrder, submitting,
    loadOrder, addToCart, removeFromCart,
    updateQuantity, updateNote, sendToKitchen,
    requestBill, clearOrder,
  } = useMeseroOrder(selectedTable);

  const {
    tables: activeTables,
    loading: loadingActive,
    readyCount,
    preparingCount,
    refresh: refreshActive,
  } = useMeseroActiveOrders();

  const { requestPermission, notifyOrderReady, vibrate } = useMeseroNotifications();

  // Solicitar permiso de notificaciones al montar
  useEffect(() => { requestPermission(); }, []);

  // Disparar notificación cuando haya nuevos platos listos
  const prevReadyRef = useRef(0);
  useEffect(() => {
    if (readyCount > prevReadyRef.current) {
      const readyTable = activeTables.find(
        t => t.activeOrder?.status === 'READY'
      );
      if (readyTable) {
        notifyOrderReady(readyTable.number);
        vibrate([200, 100, 200, 100, 400]);
      }
    }
    prevReadyRef.current = readyCount;
  }, [readyCount, activeTables]);

  // ───── Handlers ─────

  const handleSelectTable = useCallback(async (table: any) => {
    setSelectedTable(table);
    await loadOrder(table.id);
  }, [loadOrder]);

  // Navegar a una mesa desde Mis Órdenes
  const handleSelectActiveTable = useCallback(async (tableData: any) => {
    setSelectedTable(tableData);
    await loadOrder(tableData.id);
  }, [loadOrder]);

  const handleClosePanel = useCallback(() => {
    setSelectedTable(null);
    clearOrder();
  }, [clearOrder]);

  const handleSendKitchen = useCallback(async () => {
    if (!selectedTable) return;
    try {
      await sendToKitchen(selectedTable.id);
      await refreshTables();
      toast.success('¡Orden enviada a cocina! 👨‍🍳');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al enviar a cocina');
    }
  }, [selectedTable, sendToKitchen, refreshTables]);

  const handleRequestBill = useCallback(async () => {
    try {
      await requestBill();
      toast.success('Cuenta solicitada al cajero 🧾');
      handleClosePanel();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al solicitar cuenta');
    }
  }, [requestBill, handleClosePanel]);

  const tablesOccupied = tables.filter(t => t.status === 'OCCUPIED').length;

  return (
    <MeseroLayout
      activeView={activeView}
      onChangeView={setActiveView}
      tablesOccupied={tablesOccupied}
      readyCount={readyCount}
    >
      {activeView === 'mesas' && (
        <MeseroTableGrid
          tables={tables}
          sections={sections}
          selectedSection={selectedSection}
          onSelectSection={setSelectedSection}
          onSelectTable={handleSelectTable}
          loading={loadingTables}
        />
      )}

      {activeView === 'mis-ordenes' && (
        <MeseroActiveOrders
          tables={activeTables}
          loading={loadingActive}
          readyCount={readyCount}
          preparingCount={preparingCount}
          onSelectTable={handleSelectActiveTable}
          onRefresh={refreshActive}
        />
      )}

      {/* Vista unificada orden + menú */}
      {selectedTable && (
        <MeseroOrderView
          table={selectedTable}
          allTables={tables}
          cart={cart}
          newItems={newItems}
          cartTotal={cartTotal}
          activeOrder={activeOrder}
          loadingOrder={loadingOrder}
          submitting={submitting}
          categories={categories}
          products={productsByCategory}
          allProducts={products}
          selectedCategory={selectedCategory}
          loadingMenu={loadingMenu}
          onClose={handleClosePanel}
          onUpdateQty={updateQuantity}
          onRemove={removeFromCart}
          onUpdateNote={updateNote}
          onSendKitchen={handleSendKitchen}
          onRequestBill={handleRequestBill}
          onRefresh={refreshTables}
          onSelectCategory={setSelectedCategory}
          onAddProduct={(product, modifiers, notes) => addToCart(product, modifiers, notes)}
        />
      )}
    </MeseroLayout>
  );
}
