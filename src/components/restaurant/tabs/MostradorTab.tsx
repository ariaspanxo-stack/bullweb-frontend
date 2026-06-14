// ═══════════════════════════════════════════════════════════════
// MostradorTab — Tab mostrador del POS Restaurant
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { OrderCardCompact } from '../shared/OrderCardCompact';
import { DeliveryOrderModal } from '../shared/DeliveryOrderModal';
import type { Sale } from '../../../types/restaurant.types';

type StatusFilter = 'ALL' | 'PENDING' | 'PREPARING' | 'READY';

const STATUS_TABS: { key: StatusFilter; label: string; dot: string }[] = [
  { key: 'ALL',      label: 'Todas',          dot: 'bg-gray-400' },
  { key: 'PENDING',  label: 'Pendiente',      dot: 'bg-red-400'  },
  { key: 'PREPARING',label: 'En Preparación', dot: 'bg-yellow-400' },
  { key: 'READY',    label: 'Listo',          dot: 'bg-green-400' },
];

export function MostradorTab() {
  const {
    mostradorOrders,
    setShowMostradorModal,
    setOrderForEdit,
    handlePayOrderFromCard,
    handleUpdateMostradorStatus,
    handleCancelOrder,
  } = useRestaurant();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);

  const activeCount = mostradorOrders.length;

  // Contadores por estado para los tabs
  const countByStatus = (s: string) => mostradorOrders.filter((o) => o.status === s).length;

  // Filtrado
  const filtered: Sale[] =
    statusFilter === 'ALL'
      ? mostradorOrders
      : mostradorOrders.filter((o) => o.status === statusFilter);

  return (
    <div>
      {/* Modal detalle de orden */}
      {selectedOrder && (
        <DeliveryOrderModal
          order={selectedOrder}
          variant="mostrador"
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {}}
        />
      )}
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Órdenes Para Llevar</h2>
            {activeCount > 0 && (
              <p className="text-xs text-blue-500 font-medium mt-0.5">
                {activeCount} orden{activeCount !== 1 ? 'es' : ''} activa{activeCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowMostradorModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-200"
        >
          <Plus size={16} />
          Nueva Orden
        </button>
      </div>

      {/* ── Tabs de estado ── */}
      {activeCount > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'ALL' ? activeCount : countByStatus(tab.key);
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white/70' : tab.dot}`} />
                {tab.label}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty State ── */}
      {mostradorOrders.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-gradient-to-b from-blue-50 to-white rounded-2xl border border-dashed border-blue-200">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-5">
            <circle cx="60" cy="60" r="56" fill="#EFF6FF" />
            <rect x="30" y="42" width="60" height="46" rx="8" fill="#DBEAFE" />
            <rect x="38" y="52" width="44" height="7" rx="3.5" fill="#93C5FD" />
            <rect x="38" y="65" width="30" height="5" rx="2.5" fill="#BFDBFE" />
            <rect x="38" y="76" width="20" height="5" rx="2.5" fill="#BFDBFE" />
            <path d="M46 42c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="text-lg font-semibold text-gray-700">Sin órdenes para llevar</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">Las nuevas órdenes aparecerán aquí</p>
          <button
            onClick={() => setShowMostradorModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-200"
          >
            <Plus size={16} />
            Crear primera orden
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty de filtro */
        <div className="flex flex-col items-center py-12 text-gray-400">
          <p className="text-sm font-medium">Sin órdenes con estado "{STATUS_TABS.find(t => t.key === statusFilter)?.label}"</p>
          <button
            onClick={() => setStatusFilter('ALL')}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((order: Sale) => (
            <OrderCardCompact
              key={order.id}
              order={order}
              variant="mostrador"
              onEdit={setOrderForEdit}
              onPay={handlePayOrderFromCard}
              onCancel={handleCancelOrder}
              onUpdateStatus={(o, s) => handleUpdateMostradorStatus(o, s as any)}
              onCardClick={setSelectedOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
