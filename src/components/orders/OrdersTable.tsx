import { formatCurrency, formatDateTime } from '@/lib/utils';
import { formatSaleNumber } from '@/utils/formatSaleNumber';
import Badge from '@/components/ui/Badge';
import { Eye, Printer, Trash2 } from 'lucide-react';

function getOrderLabel(order: any): string {
  if (order.tables?.number) return `Mesa ${order.tables.number}`;
  if (order.table?.number) return `Mesa ${order.table.number}`;
  if (order.customers?.name) return order.customers.name;
  if (order.customer?.name) return order.customer.name;
  if (order.customerName) return order.customerName;
  if (order.type === 'TAKEAWAY') return 'Para llevar';
  if (order.type === 'DELIVERY') return 'Delivery';
  return '-';
}

interface OrdersTableProps {
  orders: any[];
  onViewDetails: (order: any) => void;
  onPrint: (order: any) => void;
  onCancel: (order: any) => void;
  loading?: boolean;
}

const statusVariants: Record<string, any> = {
  PENDING: 'warning',
  PREPARING: 'info',
  READY: 'default',
  PAID: 'success',
  CANCELLED: 'danger'
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PREPARING: 'Preparando',
  READY: 'Lista',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada'
};

const typeLabels: Record<string, string> = {
  DINE_IN: '🪑 Mesa',
  TAKEAWAY: '🛍️ Para Llevar',
  DELIVERY: '🚴 Delivery'
};

export default function OrdersTable({ 
  orders, 
  onViewDetails, 
  onPrint, 
  onCancel,
  loading 
}: OrdersTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-100 m-4 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Orden
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Mesa/Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Mesero
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-900">{formatSaleNumber(order.orderNumber)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    {formatDateTime(order.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">{typeLabels[order.type]}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    {getOrderLabel(order)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600">
                    {order.users_orders_waiterIdTousers?.name || order.waiter?.name || '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600">
                    {(order.order_items?.length ?? order.items?.length ?? 0)} items
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-900">
                    {formatCurrency(order.total)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariants[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewDetails(order)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onPrint(order)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Re-imprimir"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {order.status !== 'PAID' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => onCancel(order)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancelar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron órdenes
        </div>
      )}
    </div>
  );
}
