import { useQuery } from '@tanstack/react-query';
import customersService from '@/services/customersService';
import { formatCurrency } from '@/lib/utils';
import { Trophy } from 'lucide-react';

export default function TopCustomers() {
  const { data: topCustomers = [], isLoading, error } = useQuery({
    queryKey: ['top-customers'],
    queryFn: () => customersService.getTopCustomers({ limit: 5 })
  });

  // Asegurar que siempre sea un array
  const customers = Array.isArray(topCustomers) ? topCustomers : [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-600" />
        <h2 className="text-lg font-semibold text-gray-900">Clientes VIP</h2>
      </div>

      <div className="space-y-3">
        {customers.slice(0, 5).map((customer: any, index: number) => (
          <div key={customer.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              index === 0 ? 'bg-yellow-500 text-white' :
              index === 1 ? 'bg-gray-400 text-white' :
              index === 2 ? 'bg-orange-600 text-white' :
              'bg-gray-200 text-gray-700'
            }`}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{customer.name}</div>
              <div className="text-sm text-gray-600">{customer.totalOrders || 0} órdenes</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">
                {formatCurrency(customer.totalSpent || 0)}
              </div>
            </div>
          </div>
        ))}

        {customers.length === 0 && !isLoading && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No hay datos disponibles
          </div>
        )}
      </div>
    </div>
  );
}
