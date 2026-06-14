import { formatCurrency } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface WaitersPerformanceProps {
  data: Array<{
    waiterName: string;
    sales: number;
    orders: number;
    averageTicket: number;
    tips: number;
  }>;
}

export default function WaitersPerformance({ data }: WaitersPerformanceProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-yellow-600" />
        <h3 className="text-lg font-semibold text-gray-900">Rendimiento de Meseros</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Mesero</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ventas</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Órdenes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ticket Prom.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Propinas</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((waiter, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{waiter.waiterName}</td>
                <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(waiter.sales)}</td>
                <td className="px-4 py-3 text-gray-600">{waiter.orders}</td>
                <td className="px-4 py-3 text-gray-900">{formatCurrency(waiter.averageTicket)}</td>
                <td className="px-4 py-3 text-green-600 font-medium">{formatCurrency(waiter.tips)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
