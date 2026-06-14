// ═══════════════════════════════════════════════════════════════
// BillPanel — Panel lateral "Solicitudes de cuenta"
// ═══════════════════════════════════════════════════════════════

import { Bell, BellRing, ChevronRight, X } from 'lucide-react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { formatTimeAgo } from './helpers';

export function BillPanel() {
  const {
    billRequests,
    showBillPanel,
    setShowBillPanel,
    dismissBillRequest,
    dismissAllBillRequests,
  } = useRestaurant();

  return (
    <>
      {/* Overlay */}
      {showBillPanel && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setShowBillPanel(false)}
        />
      )}

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 max-w-full z-50 bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${showBillPanel ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-orange-400" />
            <span className="text-white font-semibold text-base">Solicitudes de cuenta</span>
            {billRequests.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {billRequests.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowBillPanel(false)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {billRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
              <Bell className="w-10 h-10 opacity-30" />
              <p className="text-sm">Sin solicitudes pendientes</p>
            </div>
          ) : (
            billRequests.map(req => (
              <div
                key={req.orderId}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-orange-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{req.tableName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">Mesero: {req.waiterName}</p>
                    <p className="text-orange-400 font-bold text-sm mt-1">
                      ${req.total.toLocaleString('es-CL')}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">{formatTimeAgo(req.timestamp)}</p>
                  </div>
                  <button
                    onClick={() => dismissBillRequest(req.orderId)}
                    className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors flex-shrink-0"
                    title="Descartar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {billRequests.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <button
              onClick={dismissAllBillRequests}
              className="w-full py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Descartar todas
            </button>
          </div>
        )}
      </div>
    </>
  );
}
