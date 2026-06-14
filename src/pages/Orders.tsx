import { useQuery } from '@tanstack/react-query';
import { posService } from '@/services/posService';
import OrdersStats from '@/components/orders/OrdersStats';
import ActiveOrdersView from '@/components/orders/ActiveOrdersView';
import { Receipt } from 'lucide-react';

export default function Orders() {
  // Estadísticas reales del backend
  const { data: statsData } = useQuery({
    queryKey: ['orders-stats'],
    queryFn: () => posService.getOrdersStats(),
    refetchInterval: 15000,
  });

  const activeOrders = statsData?.activeOrders ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Receipt className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Órdenes</h1>
            <p className="text-gray-500 mt-1">Gestión completa de todas las órdenes</p>
          </div>
        </div>

        {/* Badge activos */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>
            {activeOrders} pedido{activeOrders !== 1 ? 's' : ''} activo{activeOrders !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* KPIs del día */}
      <OrdersStats
        revenueToday={statsData?.revenueToday}
        paidToday={statsData?.paidToday}
        avgTicketToday={statsData?.avgTicketToday}
        activeOrders={statsData?.activeOrders}
      />

      {/* Indicador auto-refresh */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Actualización automática cada 5s
      </div>

      {/* Vista de pedidos activos */}
      <ActiveOrdersView />
    </div>
  );
}


