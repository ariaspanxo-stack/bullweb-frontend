import React, { useState, useEffect } from 'react';
import { X, User, ShoppingBag, BarChart3, Gift } from 'lucide-react';
import customersService from '../../services/customersService';
import { formatCurrency } from '../../lib/utils';
import { formatSaleNumber } from '../../utils/formatSaleNumber';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customerId
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'stats' | 'points'>('orders');
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pointsBalance, setPointsBalance] = useState<any>(null);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && customerId) {
      loadDetailedStats();
    }
  }, [isOpen, customerId]);

  const loadDetailedStats = async () => {
    setIsLoading(true);
    try {
      const [statsData, balanceData, historyData] = await Promise.all([
        customersService.getDetailedStats(customerId),
        customersService.getPointsBalance(customerId).catch(() => null),
        customersService.getPointsHistory(customerId).catch(() => []),
      ]);
      setDetailedStats(statsData);
      if (balanceData) setPointsBalance(balanceData);
      setPointsHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('Error loading customer stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderTypeLabel = (type: string) => {
    const types: any = {
      'DINE_IN':  { label: 'En mesa',     icon: '🍽️', color: 'bg-purple-100 text-purple-700' },
      'TAKEAWAY': { label: 'Para llevar', icon: '🥡', color: 'bg-orange-100 text-orange-700' },
      'DELIVERY': { label: 'Delivery',    icon: '🚚', color: 'bg-blue-100 text-blue-700' },
    };
    return types[type] ?? types['TAKEAWAY'];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {detailedStats?.customer?.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {detailedStats?.customer?.name || 'Cargando...'}
              </h2>
              {detailedStats?.customer?.email && (
                <p className="text-sm text-gray-500">{detailedStats.customer.email}</p>
              )}
              {detailedStats?.customer?.phone && (
                <p className="text-sm text-gray-500">{detailedStats.customer.phone}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats rápidos */}
        {detailedStats && (
          <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {detailedStats.customer.totalOrders}
              </p>
              <p className="text-sm text-gray-600">Órdenes Totales</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(detailedStats.customer.totalSpent || 0)}
              </p>
              <p className="text-sm text-gray-600">Total Gastado</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {formatCurrency(Math.round((detailedStats.customer.totalSpent || 0) / (detailedStats.customer.totalOrders || 1)))}
              </p>
              <p className="text-sm text-gray-600">Ticket Promedio</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                {pointsBalance?.points ?? 0}
              </p>
              <p className="text-sm text-gray-600">Puntos actuales</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingBag className="w-5 h-5 inline-block mr-2" />
            Historial Órdenes
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline-block mr-2" />
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-5 h-5 inline-block mr-2" />
            Información
          </button>
          <button
            onClick={() => setActiveTab('points')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'points'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Gift className="w-5 h-5 inline-block mr-2" />
            Puntos
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Tab Órdenes */}
              {activeTab === 'orders' && detailedStats?.orders?.recent && (
                <div className="space-y-4">
                  {detailedStats.orders.recent.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay órdenes registradas</p>
                    </div>
                  ) : (
                    detailedStats.orders.recent.map((order: any) => {
                      const typeInfo = getOrderTypeLabel(order.type);
                      return (
                        <div
                          key={order.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900">
                                  {formatSaleNumber(order.orderNumber)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                  {typeInfo.icon} {typeInfo.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {formatDate(order.date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(order.total)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {order.status === 'completed' ? '✓ Completada' : order.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab Estadísticas */}
              {activeTab === 'stats' && detailedStats && (
                <div className="space-y-6">
                  {/* Distribución por tipo */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">Órdenes por Tipo</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-3xl mb-2">🍽️</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {detailedStats.orders.byType.dineIn}
                        </p>
                        <p className="text-sm text-gray-600">Mesa</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 text-center">
                        <p className="text-3xl mb-2">🥡</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {detailedStats.orders.byType.takeout}
                        </p>
                        <p className="text-sm text-gray-600">Para Llevar</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-3xl mb-2">🚚</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {detailedStats.orders.byType.delivery}
                        </p>
                        <p className="text-sm text-gray-600">Delivery</p>
                      </div>
                    </div>
                  </div>

                  {/* Top productos */}
                  {detailedStats.topProducts?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3">Productos Favoritos</h3>
                      <div className="space-y-2">
                        {detailedStats.topProducts.map((product: any, index: number) => (
                          <div
                            key={product.productId}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold text-gray-400">
                                #{index + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {product.productName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {product.quantity} {product.quantity === 1 ? 'vez' : 'veces'}
                                </p>
                              </div>
                            </div>
                            <p className="font-bold text-green-600">
                              {formatCurrency(product.totalSpent)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gasto por mes */}
                  {detailedStats.ordersByMonth?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3">Gasto Últimos 6 Meses</h3>
                      <div className="space-y-2">
                        {detailedStats.ordersByMonth.reverse().map((month: any) => {
                          const maxTotal = Math.max(...detailedStats.ordersByMonth.map((m: any) => m.total));
                          const percentage = (month.total / maxTotal) * 100;
                          
                          return (
                            <div key={month.month}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">
                                  {new Date(month.month + '-01').toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(month.total)} ({month.count} órdenes)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Puntos */}
              {activeTab === 'points' && (
                <div className="space-y-6">
                  {/* Resumen saldo */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-amber-700">{pointsBalance?.points ?? 0}</p>
                      <p className="text-sm text-gray-600">Saldo actual</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">{pointsBalance?.totalEarned ?? 0}</p>
                      <p className="text-sm text-gray-600">Total ganados</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-gray-500">{pointsBalance?.totalSpent ?? 0}</p>
                      <p className="text-sm text-gray-600">Total canjeados</p>
                    </div>
                  </div>

                  {pointsBalance?.points >= 100 && (
                    <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 text-center">
                      <p className="text-sm text-amber-700 font-medium">
                        Valor de canje disponible: <strong>{pointsBalance?.cashFormatted}</strong>
                      </p>
                      <p className="text-xs text-amber-600 mt-1">100 pts = $1.000 descuento</p>
                    </div>
                  )}

                  {/* Historial */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">Historial de movimientos</h3>
                    {pointsHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Sin movimientos de puntos</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pointsHistory.map((h: any) => (
                          <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{h.description ?? h.type}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(h.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-sm ${
                                h.points > 0 ? 'text-green-600' : 'text-red-500'
                              }`}>
                                {h.points > 0 ? '+' : ''}{h.points} pts
                              </p>
                              <p className="text-xs text-gray-400">→ {h.balanceAfter} pts</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Info */}
              {activeTab === 'info' && detailedStats?.customer && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Nombre</label>
                      <p className="text-gray-900">{detailedStats.customer.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Email</label>
                      <p className="text-gray-900">{detailedStats.customer.email || 'No registrado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Teléfono</label>
                      <p className="text-gray-900">{detailedStats.customer.phone || 'No registrado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Última Visita</label>
                      <p className="text-gray-900">
                        {detailedStats.customer.lastVisit
                          ? formatDate(detailedStats.customer.lastVisit)
                          : 'Nunca'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;
