import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Eye, Edit, Trash2, Star } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface CustomersTableProps {
  customers: any[];
  onViewDetails: (customer: any) => void;
  onEdit: (customer: any) => void;
  onDelete: (customer: any) => void;
  loading?: boolean;
}

export default function CustomersTable({
  customers,
  onViewDetails,
  onEdit,
  onDelete,
  loading
}: CustomersTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cliente</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Teléfono</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Email</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Puntos</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Total Gastado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Órdenes</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Última Visita</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-sm">
                      {customer.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{customer.name}</span>
                    {customer.segment && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                        customer.segment === 'VIP'      ? 'bg-yellow-100 text-yellow-700' :
                        customer.segment === 'FREQUENT' ? 'bg-green-100 text-green-700'  :
                        customer.segment === 'REGULAR'  ? 'bg-blue-100 text-blue-700'    :
                        customer.segment === 'INACTIVE' ? 'bg-red-100 text-red-600'      :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {customer.segment === 'VIP' ? '⭐ VIP' : customer.segment}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {customer.phone || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {customer.email || '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-gray-900">{(customer.loyalty_points?.points ?? customer.points) || 0}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-bold text-gray-900">
                {formatCurrency(customer.totalSpent || 0)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {customer.totalOrders || 0}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {customer.lastVisit ?? customer.lastOrderAt
                  ? formatDateTime(customer.lastVisit ?? customer.lastOrderAt)
                  : 'Nunca'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewDetails(customer)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(customer)}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(customer)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron clientes
        </div>
      )}
    </div>
  );
}
