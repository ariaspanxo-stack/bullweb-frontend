// ═══════════════════════════════════════════════════════════════
// MESERO ORDER PANEL — panel de orden (slide desde abajo)
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Plus, Minus, Trash2, ChefHat, Loader2, MoreHorizontal } from 'lucide-react';
import { MeseroActionSheet }   from './MeseroActionSheet';
import { MeseroSplitSheet }    from './MeseroSplitSheet';
import { MeseroTransferSheet } from './MeseroTransferSheet';
import { MeseroCheckout }      from './MeseroCheckout';
import { useWaiterPermission } from '../hooks/useWaiterPermission';

interface Props {
  table:         any;
  cart:          any[];
  newItems:      any[];
  newItemsTotal: number;
  cartTotal:     number;
  activeOrder:   any | null;
  loadingOrder:  boolean;
  submitting:    boolean;
  onClose:       () => void;
  onOpenMenu:    () => void;
  onUpdateQty:   (index: number, qty: number) => void;
  onRemove:      (index: number) => void;
  onSendKitchen: () => void;
  onRequestBill: () => void;
  allTables:     any[];
  onRefresh:     () => void;
}

export function MeseroOrderPanel({
  table, cart, newItems, newItemsTotal: _newItemsTotal, cartTotal,
  activeOrder, loadingOrder, submitting,
  onClose, onOpenMenu, onUpdateQty, onRemove,
  onSendKitchen, onRequestBill,
  allTables, onRefresh,
}: Props) {

  const [showActionSheet,   setShowActionSheet]   = useState(false);
  const [showSplitSheet,    setShowSplitSheet]    = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showCheckout,      setShowCheckout]      = useState(false);

  const canCharge   = useWaiterPermission('charge');
  const canSplit    = useWaiterPermission('split_bill');
  const canTransfer = useWaiterPermission('transfer_table');

  const sentItems = cart.filter(i => i.sentToKitchen);

  return (
    <>
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up">

        {/* Handle + Header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-800">Mesa {table.number}</h2>
              <p className="text-sm text-gray-400">
                {table.section?.name}{table.section?.name ? ' · ' : ''}
                {table.status === 'OCCUPIED' ? '🔴 Ocupada' : '🟢 Libre'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loadingOrder ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-500">Cargando orden...</span>
            </div>
          ) : (
            <>
              {/* Ítems ya enviados a cocina */}
              {sentItems.length > 0 && (
                <div className="px-4 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    ✅ Ya en cocina
                  </p>
                  <div className="space-y-2 mb-4">
                    {sentItems.map((item, i) => (
                      <div key={i}
                        className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {item.quantity}× {item.name}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-amber-600">📝 {item.notes}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 ml-2">
                          ${(item.price * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nuevos ítems (pendientes de enviar) */}
              {newItems.length > 0 && (
                <div className="px-4 pt-2">
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-2">
                    🆕 Nuevos — sin enviar
                  </p>
                  <div className="space-y-2">
                    {cart.map((item, i) => {
                      if (item.sentToKitchen) return null;
                      return (
                        <div key={i}
                          className="flex items-center gap-3 bg-orange-50 border border-orange-100
                                     rounded-xl px-3 py-2">
                          {/* Controles de cantidad */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => onUpdateQty(i, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-white border border-gray-200
                                         flex items-center justify-center active:scale-90"
                            >
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="w-5 text-center font-bold text-gray-800 text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQty(i, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-orange-500 flex items-center
                                         justify-center active:scale-90"
                            >
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </div>

                          {/* Nombre */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            {item.notes && (
                              <p className="text-xs text-amber-600">📝 {item.notes}</p>
                            )}
                          </div>

                          {/* Precio + eliminar */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold text-gray-700">
                              ${(item.price * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                            </span>
                            <button
                              onClick={() => onRemove(i)}
                              className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Estado vacío */}
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <span className="text-5xl mb-3">🍽️</span>
                  <p className="text-sm font-medium">Mesa sin pedido</p>
                  <p className="text-xs mt-1">Toca "Agregar" para tomar la orden</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100 space-y-3 bg-white">

          {/* Total */}
          {cartTotal > 0 && (
            <div className="flex justify-between items-center px-1 text-sm">
              <span className="text-gray-500">Total acumulado:</span>
              <span className="font-bold text-gray-800 text-lg">
                ${cartTotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          {/* Botón agregar productos */}
          <button
            onClick={onOpenMenu}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-bold
                       rounded-2xl flex items-center justify-center gap-2
                       active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" />
            Agregar productos
          </button>

          <div className="flex gap-3">
            {/* Enviar a cocina */}
            {newItems.length > 0 && (
              <button
                onClick={onSendKitchen}
                disabled={submitting}
                className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white font-semibold
                           rounded-2xl flex items-center justify-center gap-2
                           disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ChefHat className="w-4 h-4" />
                }
                {submitting ? 'Enviando...' : `Cocina (${newItems.length})`}
              </button>
            )}

            {/* Más opciones */}
            {activeOrder && (
              <button
                onClick={() => setShowActionSheet(true)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700
                           font-semibold rounded-2xl flex items-center justify-center
                           gap-2 active:scale-[0.98] transition-all text-sm"
              >
                <MoreHorizontal className="w-4 h-4" />
                Más
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    <MeseroActionSheet
      isOpen={showActionSheet}
      onClose={() => setShowActionSheet(false)}
      hasItems={(activeOrder?.order_items?.length ?? 0) >= 2}
      onRequestBill={onRequestBill}
      onSplitBill={() => setShowSplitSheet(true)}
      onTransfer={() => setShowTransferSheet(true)}
      onCharge={() => { setShowActionSheet(false); setShowCheckout(true); }}
      canCharge={canCharge}
      canSplit={canSplit}
      canTransfer={canTransfer}
    />

    <MeseroSplitSheet
      isOpen={showSplitSheet}
      orderId={activeOrder?.id ?? ''}
      items={activeOrder?.order_items ?? []}
      onClose={() => setShowSplitSheet(false)}
      onSplit={onRefresh}
    />

    <MeseroTransferSheet
      isOpen={showTransferSheet}
      fromTableId={table?.id ?? ''}
      fromTableName={`Mesa ${table?.number ?? ''}`}
      tables={allTables}
      onClose={() => setShowTransferSheet(false)}
      onTransfer={() => { onRefresh(); onClose(); }}
    />

    <MeseroCheckout
      isOpen={showCheckout}
      orderId={activeOrder?.id ?? ''}
      tableNum={table?.number ?? ''}
      tableId={table?.id}
      items={(activeOrder?.order_items ?? []).map((it: any) => ({
        id:       it.id,
        quantity: it.quantity,
        name:     it.products?.name ?? it.name ?? 'Producto',
        price:    it.products?.price ?? it.price ?? 0,
      }))}
      total={cartTotal}
      onClose={() => setShowCheckout(false)}
      onSuccess={() => { setShowCheckout(false); onRefresh(); onClose(); }}
    />
    </>
  );
}
