// ═══════════════════════════════════════════════════════════════
// DeliveryTab — Tab delivery del POS Restaurant
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Plus, Truck, PackageOpen } from 'lucide-react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { OrderCardCompact } from '../shared/OrderCardCompact';
import { DeliveryOrderModal } from '../shared/DeliveryOrderModal';
import type { Sale } from '../../../types/restaurant.types';
import { STATUS_STYLES } from '../shared/orderStatusStyles';

type StatusFilter = 'ALL' | 'PENDING' | 'PREPARING' | 'READY';

const STATUS_TABS: { key: StatusFilter; label: string; dot: string }[] = [
  { key: 'ALL',       label: 'Todas',                         dot: 'bg-gray-400'                 },
  { key: 'PENDING',   label: STATUS_STYLES.PENDING.label,     dot: STATUS_STYLES.PENDING.dot     },
  { key: 'PREPARING', label: STATUS_STYLES.PREPARING.label,   dot: STATUS_STYLES.PREPARING.dot   },
  { key: 'READY',     label: STATUS_STYLES.READY.label,       dot: STATUS_STYLES.READY.dot       },
];

export function DeliveryTab() {
  const {
    deliveryOrders,
    setShowDeliveryModal,
    setOrderForEdit,
    handlePayOrderFromCard,
    handleUpdateDeliveryStatus,
    handleCancelOrder,
    loadOrders,
  } = useRestaurant();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);

  const activeCount = deliveryOrders.length;

  const countByStatus = (s: string) => deliveryOrders.filter((o) => o.status === s).length;

  const filtered: Sale[] =
    statusFilter === 'ALL'
      ? deliveryOrders
      : deliveryOrders.filter((o) => o.status === statusFilter);

  return (
    <div>
      {/* Modal detalle de orden */}
      {selectedOrder && (
        <DeliveryOrderModal
          order={selectedOrder}
          variant="delivery"
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {}}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Truck size={20} className="text-slate-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Órdenes de delivery</h2>
            {activeCount > 0 && (
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {activeCount} {activeCount !== 1 ? 'órdenes' : 'orden'} activa{activeCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDeliveryModal(true)}
          className="min-h-[44px] flex items-center gap-2 h-11 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Plus size={16} />
          Nuevo Delivery
        </button>
      </div>

      {/* Tabs de estado */}
      {activeCount > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'ALL' ? activeCount : countByStatus(tab.key);
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-slate-50 border-[1.5px] border-slate-200 text-slate-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tab.dot}`} />
                {tab.label}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white text-slate-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State — sin ordenes */}
      {deliveryOrders.length === 0 ? (
        <div className="flex flex-col items-center py-20 to-white rounded-2xl border border-dashed border-slate-200">
          <PackageOpen className="w-16 h-16 text-zinc-400 mb-5" />
          <p className="text-lg font-semibold text-gray-700">Sin deliveries activos</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">Los nuevos pedidos apareceran aqui</p>
          <button
            onClick={() => setShowDeliveryModal(true)}
            className="min-h-[44px] flex items-center gap-2 px-6 py-3 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md "
          >
            <Plus size={16} />
            Crear primer delivery
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty de filtro activo */
        <div className="flex flex-col items-center py-12 text-gray-400">
          <p className="text-sm font-medium">
            Sin ordenes con estado "{STATUS_TABS.find(t => t.key === statusFilter)?.label}"
          </p>
          <button
            onClick={() => setStatusFilter('ALL')}
            className="min-h-[44px] mt-2 text-xs text-slate-500 hover:underline"
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {filtered.map((order: Sale) => (
            <OrderCardCompact
              key={order.id}
              order={order}
              variant="delivery"
              onEdit={setOrderForEdit}
              onPay={handlePayOrderFromCard}
              onCancel={handleCancelOrder}
              onUpdateStatus={(o, s) => handleUpdateDeliveryStatus(o, s as any)}
              onCardClick={setSelectedOrder}
              onRefresh={loadOrders}
            />
          ))}
        </div>
      )}
    </div>
  );
}