// ═══════════════════════════════════════════════════════════════
// RestaurantHeader — Barra compacta: tabs + controles
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  LayoutGrid,
  ShoppingBag,
  Truck,
  RefreshCw,
  DollarSign,
  Bell,
  BellRing,
} from 'lucide-react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { useAuthStore } from '../../../store/authStore';

export function RestaurantHeader({ showShiftBanner, onOpenShift }: { showShiftBanner?: boolean; onOpenShift?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const user = useAuthStore(s => s.user);
  const userPerms = (user?.role?.permissions ?? []) as string[];
  const isAdmin   = userPerms.includes('ALL_PERMISSIONS') || user?.role?.name === 'Administrador';
  const canTab    = (tab: string) => isAdmin || userPerms.includes(`pos.${tab}`);

  const {
    cashSession,
    billRequests,
    newBillAlert,
    setShowBillPanel,
    setShowCloseModal,
    activeTab,
    handleTabChange,
    handleRefresh,
    mostradorOrders,
    deliveryOrders,
    stats,
  } = useRestaurant();

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      {showShiftBanner && !dismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 text-xs">⚠️</span>
            <p className="text-xs text-amber-700">Sin turno activo</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onOpenShift} className="text-xs font-medium text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 rounded px-2 py-0.5 transition-colors">💰 Abrir</button>
            <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 text-sm leading-none">✕</button>
          </div>
        </div>
      )}
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {/* ── Mesas ── solo si tiene pos.mesas */}
          {canTab('mesas') && (
            <button
              onClick={() => handleTabChange('mesas')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'mesas'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={18} />
              Mesas
              {stats && stats.occupiedTables > 0 && (
                <span className={`min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full text-xs font-black ${
                  activeTab === 'mesas' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {stats.occupiedTables}
                </span>
              )}
            </button>
          )}

          {/* ── Mostrador ── solo si tiene pos.mostrador */}
          {canTab('mostrador') && (
            <button
              onClick={() => handleTabChange('mostrador')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'mostrador'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShoppingBag size={18} />
              Mostrador
              {mostradorOrders.length > 0 && (
                <span className={`min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full text-xs font-black ${
                  activeTab === 'mostrador'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-200 text-slate-600'
                } ${activeTab !== 'mostrador' ? 'animate-pulse' : ''}`}>
                  {mostradorOrders.length}
                </span>
              )}
              {mostradorOrders.filter(o => (o as any).source === 'QR_CARTA' && o.status === 'PENDING').length > 0 && (
                <span className={`min-w-[22px] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-black ${
                  activeTab === 'mostrador' ? 'bg-white/30 text-white' : 'bg-blue-500 text-white'
                }`} title="Pedidos QR">QR</span>
              )}
            </button>
          )}

          {/* ── Delivery ── solo si tiene pos.delivery */}
          {canTab('delivery') && (
            <button
              onClick={() => handleTabChange('delivery')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'delivery'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Truck size={18} />
              Delivery
              {deliveryOrders.length > 0 && (
                <span className={`min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full text-xs font-black ${
                  activeTab === 'delivery'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-200 text-slate-600'
                } ${activeTab !== 'delivery' ? 'animate-pulse' : ''}`}>
                  {deliveryOrders.length}
                </span>
              )}
              {deliveryOrders.filter(o => (o as any).source === 'QR_CARTA' && o.status === 'PENDING').length > 0 && (
                <span className={`min-w-[22px] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-black ${
                  activeTab === 'delivery' ? 'bg-white/30 text-white' : 'bg-blue-500 text-white'
                }`} title="Pedidos QR">QR</span>
              )}
            </button>
          )}
        </div>

        {/* Controles funcionales */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Actualizar datos"
          >
            <RefreshCw size={15} className="text-gray-400" />
          </button>

          {cashSession?.isOpen && cashSession.session && (
            <>
              <div className="flex items-center gap-1.5 bg-green-500/20 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full border border-green-200">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Turno abierto
              </div>
              <button
                onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Cerrar turno
              </button>
            </>
          )}

          <button
            onClick={() => setShowBillPanel(p => !p)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              billRequests.length > 0
                ? newBillAlert
                  ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/40'
                  : 'bg-orange-500/90 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {billRequests.length > 0 && newBillAlert
              ? <BellRing className="w-3.5 h-3.5 animate-bounce" />
              : <Bell    className="w-3.5 h-3.5" />
            }
            {billRequests.length > 0 ? (
              <>
                {billRequests.length === 1
                  ? `${billRequests[0].tableName} · Cuenta`
                  : `${billRequests.length} cuentas`
                }
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </>
            ) : 'Cuentas'}
          </button>
        </div>
      </div>
    </div>
  );
}
