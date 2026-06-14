// ═══════════════════════════════════════════════════════════════
// RESTAURANT POS — Orquestador principal (~200 líneas)
// Estado y handlers → RestaurantContext
// Tabs → MesasTab / MostradorTab / DeliveryTab
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { RestaurantProvider, useRestaurant } from '../../contexts/RestaurantContext';
import { RestaurantHeader } from '../../components/restaurant/shared/RestaurantHeader';
import { BillPanel } from '../../components/restaurant/shared/BillPanel';
import { MesasTab } from '../../components/restaurant/tabs/MesasTab';
import { MostradorTab } from '../../components/restaurant/tabs/MostradorTab';
import { DeliveryTab } from '../../components/restaurant/tabs/DeliveryTab';
import { EditOrderModal } from './components/EditOrderModal';
import { OrderModal } from './components/OrderModal';
import { PaymentModal } from './components/PaymentModal';
import { NewMostradorModal } from './components/NewMostradorModal';
import { NewDeliveryModal } from './components/NewDeliveryModal';
import { CloseShiftModal } from '../../components/cash/CloseShiftModal';
import { OpenShiftModal } from '../../components/cash/OpenShiftModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmitBoletaButton } from '../../components/pos/EmitBoletaButton';

// ==============================================================
// COMPONENTE INTERNO -- consume contexto
// ==============================================================

function RestaurantInner() {
  const ctx = useRestaurant();
  const [showOpenShift, setShowOpenShift] = useState(false);

  // Guard: verificando caja
  if (ctx.cashLoading) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          <p className="text-gray-400 text-sm">Verificando caja...</p>
        </div>
      </div>
    );
  }

  // Guard: carga inicial
  if (ctx.loading && ctx.tables.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando Restaurant POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header sticky + tab bar */}
      <RestaurantHeader showShiftBanner={!ctx.cashSession?.isOpen} onOpenShift={() => setShowOpenShift(true)} />

      {/* Contenido */}
      <div className="p-6 bg-gray-50 min-h-screen">
        {ctx.activeTab === 'mesas'     && ctx.hasTabPerm('mesas')     && <MesasTab />}
        {ctx.activeTab === 'mostrador' && ctx.hasTabPerm('mostrador') && <MostradorTab />}
        {ctx.activeTab === 'delivery'  && ctx.hasTabPerm('delivery')  && <DeliveryTab />}
      </div>

      {/* EditOrderModal */}
      {ctx.orderForEdit && (
        <EditOrderModal
          order={ctx.orderForEdit}
          products={ctx.products}
          categories={ctx.categories}
          onUpdated={ctx.handleOrderEdited}
          onClose={() => ctx.setOrderForEdit(null)}
        />
      )}

      {/* OrderModal -- DINE_IN */}
      {ctx.showCart && ctx.selectedTable && (
        <OrderModal
          table={ctx.selectedTable}
          products={ctx.products}
          categories={ctx.categories}
          cart={ctx.cart}
          existingItems={ctx.existingItems}
          numberOfPeople={ctx.numberOfPeople}
          existingOrderId={ctx.activeOrderId || undefined}
          setNumberOfPeople={ctx.setNumberOfPeople}
          onAddProduct={ctx.handleAddToCart}
          onUpdateQuantity={ctx.handleUpdateQuantity}
          onRemoveItem={ctx.handleRemoveItem}
          onRemoveExistingItem={ctx.handleRemoveExistingItem}
          onAddNote={ctx.handleAddNote}
          onUpdateModifiers={ctx.handleUpdateModifiers}
          onCheckout={ctx.handleCheckout}
          onSendToKitchen={ctx.handleSendToKitchen}
          onClose={ctx.handleCloseCart}
          isSubmitting={ctx.submittingKitchen}
          tables={ctx.tables}
          onEditOrder={ctx.activeOrderId ? () => {
            const order = ctx.dineInOrders.find(o => o.id === ctx.activeOrderId);
            if (order) { ctx.handleCloseCart(); ctx.setOrderForEdit(order); }
          } : undefined}
        />
      )}

      {/* PaymentModal */}
      {ctx.showPaymentModal && (ctx.selectedTable || ctx.orderForPayment) && (
        <PaymentModal
          table={ctx.selectedTable || undefined}
          total={(() => {
            if (ctx.orderForPayment) return ctx.orderForPayment.total || 0;
            // Chile: precios ya incluyen IVA — no agregar impuesto adicional
            return ctx.existingItems.reduce((s, i) => s + (i.total ?? 0), 0)
                 + ctx.cart.reduce((s, i) => s + (i.subtotal || 0), 0);
          })()}
          subtotal={ctx.orderForPayment
            ? (ctx.orderForPayment.subtotal || ctx.orderForPayment.total || 0)
            : ctx.existingItems.reduce((s, i) => s + (i.total ?? 0), 0)
              + ctx.cart.reduce((s, i) => s + (i.subtotal || 0), 0)
          }
          tax={ctx.orderForPayment
            ? ctx.orderForPayment.tax
            : Math.round(
                // IVA contenido en precio final (19/119 del total con IVA incluido)
                (ctx.existingItems.reduce((s, i) => s + (i.total ?? 0), 0)
                + ctx.cart.reduce((s, i) => s + (i.subtotal || 0), 0)) * 19 / 119
              )
          }
          deliveryFee={(ctx.orderForPayment as any)?.deliveryFee ?? 0}
          items={ctx.orderForPayment
            ? (ctx.orderForPayment.items as any)
            : [...ctx.existingItems, ...ctx.cart]
          }
          orderNumber={ctx.orderForPayment?.orderNumber || (ctx.orderForPayment as any)?.saleNumber}
          onClose={() => {
            ctx.setShowPaymentModal(false);
            ctx.setOrderForPayment(null);
            ctx.setPendingDiscount(undefined);
          }}
          initialDiscount={ctx.pendingDiscount}
          customerId={ctx.orderForPayment?.customerId || ctx.pendingOrderCustomerId}
          customerName={ctx.orderForPayment?.customerName || ctx.pendingOrderCustomerName}
          orderId={ctx.orderForPayment?.id || ctx.activeOrderId || ctx.lastPaidOrderId || undefined}
          orderType={ctx.orderForPayment ? (ctx.orderForPayment.type as string) : 'DINE_IN'}
          onConfirm={ctx.orderForPayment
            ? ctx.handleConfirmOrderPayment
            : ctx.handleConfirmPayment
          }
        />
      )}

      {/* NewMostradorModal */}
      {ctx.showMostradorModal && (
        <NewMostradorModal
          products={ctx.products}
          categories={ctx.categories}
          onConfirm={ctx.handleCreateMostradorOrder}
          onClose={() => ctx.setShowMostradorModal(false)}
        />
      )}

      {/* NewDeliveryModal */}
      {ctx.showDeliveryModal && (
        <NewDeliveryModal
          products={ctx.products}
          categories={ctx.categories}
          onConfirm={ctx.handleCreateDeliveryOrder}
          onClose={() => ctx.setShowDeliveryModal(false)}
        />
      )}

      {/* CloseShiftModal */}
      {ctx.showCloseModal && ctx.cashSession?.register && ctx.cashSession?.session && (
        <CloseShiftModal
          register={ctx.cashSession.register}
          session={ctx.cashSession.session}
          onClosed={() => {
            ctx.setShowCloseModal(false);
            ctx.reloadCashSession();
          }}
          onCancel={() => ctx.setShowCloseModal(false)}
        />
      )}

      {/* Boleta electronica -- banner post-pago */}
      {ctx.lastPaidOrderId && (
        <div className="fixed bottom-4 right-4 z-50 w-72 bg-gray-900 rounded-xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-semibold">Boleta electrónica</span>
            <button onClick={() => ctx.setLastPaidOrderId(null)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <EmitBoletaButton
            orderId={ctx.lastPaidOrderId}
isConfigured={ctx.dteIsConfigured}
            onEmitted={() => ctx.setLastPaidOrderId(null)}
          />
        </div>
      )}

      {/* ConfirmDialog */}
      <ConfirmDialog {...ctx.confirmDialogProps} />

      {/* Panel solicitudes de cuenta */}
      <BillPanel />

      {/* OpenShiftModal */}
      {showOpenShift && (
        ctx.cashSession?.register
          ? (
            <OpenShiftModal
              register={ctx.cashSession.register}
              isOpen={showOpenShift}
              onClose={() => setShowOpenShift(false)}
              onSuccess={() => {
                setShowOpenShift(false);
                ctx.reloadCashSession();
              }}
            />
          )
          : (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setShowOpenShift(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center mb-4 text-4xl">🏧</div>
                <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                  Sin caja registradora
                </h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Necesitas crear al menos una caja registradora antes de abrir un turno.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowOpenShift(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <a
                    href="/cash-registers"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-medium text-center transition-colors"
                  >
                    ⚙️ Crear caja →
                  </a>
                </div>
              </div>
            </div>
          )
      )}
    </div>
  );
}

// -- Wrapper con Provider ----------------------------------------
export default function Restaurant() {
  return (
    <RestaurantProvider>
      <RestaurantInner />
    </RestaurantProvider>
  );
}