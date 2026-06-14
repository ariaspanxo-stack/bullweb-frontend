import { useState, useEffect } from 'react';
import { X, Phone, Mail, MapPin, DollarSign, ShoppingBag, TrendingUp, Clock, Award } from 'lucide-react';
import { formatSaleNumber } from '../../../utils/formatSaleNumber';
import type { Customer } from '../../Restaurant/types';
import { getTagConfig } from '../../../utils/customers';
import customersService from '../../../services/customersService';

interface CustomerDetailModalProps {
  isOpen: boolean;
  customer: Customer;
  onClose: () => void;
}

export default function CustomerDetailModal({ isOpen, customer, onClose }: CustomerDetailModalProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [detailedStats, setDetailedStats] = useState<any>(null);

  // BUG 3 + BUG 17: cargar datos reales al abrir el modal
  useEffect(() => {
    if (!isOpen || !customer?.id) return;
    setLoadingOrders(true);
    customersService.getOrders(customer.id)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
    customersService.getDetailedStats(customer.id)
      .then(setDetailedStats)
      .catch(() => setDetailedStats(null));
  }, [isOpen, customer?.id]);

  if (!isOpen) return null;

  const displayTotalOrders  = detailedStats?.totalOrders  ?? customer.totalOrders;
  const displayTotalSpent   = detailedStats?.totalSpent   ?? customer.totalSpent;
  const displayAverageTicket = detailedStats?.averageTicket ?? customer.averageTicket;
  const displayLastVisit    = detailedStats?.lastVisit    ?? customer.lastOrderAt ?? customer.lastVisit;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{customer.name}</h3>
            <div className="flex items-center gap-2">
              {(customer.tags ?? []).map(tag => {
                const config = getTagConfig(tag);
                return (
                  <span key={tag} className={`px-2 py-0.5 rounded text-xs font-bold border ${config.color}`}>
                    {config.label}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-500">Pedidos</span>
              </div>
              <div className="text-xl font-bold text-white">{displayTotalOrders}</div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-xs text-zinc-500">Total Gastado</span>
              </div>
              <div className="text-xl font-bold text-white">${((displayTotalSpent) / 1000).toFixed(0)}k</div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-zinc-500">Ticket Prom.</span>
              </div>
              <div className="text-xl font-bold text-white">${((displayAverageTicket ?? 0) / 1000).toFixed(1)}k</div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-zinc-500">Última Compra</span>
              </div>
              <div className="text-xs font-bold text-white">
                {displayLastVisit
                  ? new Date(displayLastVisit).toLocaleDateString('es-CL')
                  : 'Nunca'
                }
              </div>
            </div>
          </div>

          {/* Info de Contacto */}
          <div className="bg-zinc-800 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">Información de Contacto</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-500" />
                <span className="text-white">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span className="text-white">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <span className="text-white">
                    {customer.address} {customer.addressNumber}
                    {customer.sector && `, ${customer.sector}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Productos Favoritos */}
          {(customer.favoriteProducts ?? []).length > 0 && (
            <div className="bg-zinc-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-semibold text-zinc-300">Top 3 Productos Favoritos</h4>
              </div>
              <div className="space-y-2">
                {(customer.favoriteProducts ?? []).map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-yellow-400">#{index + 1}</span>
                      <span className="text-sm text-white">{product.productName}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{product.quantity} veces</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de Pedidos */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">
              Historial de Pedidos ({orders.length})
            </h4>
            {orders.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-sm">
                Sin pedidos registrados
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {orders.map(order => (
                  <div key={order.id} className="bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{formatSaleNumber(order.orderNumber)}</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(order.date).toLocaleDateString('es-CL')} • {order.type === 'mostrador' ? 'Mostrador' : 'Delivery'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-400">${order.total.toLocaleString()}</div>
                        <div className="text-xs text-zinc-500">{order.items} productos</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          {customer.notes && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
              <div className="text-xs font-semibold text-yellow-400 mb-1">Notas:</div>
              <div className="text-sm text-yellow-400/80">{customer.notes}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
