import { DollarSign, Receipt, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OrdersStatsProps {
  revenueToday?: number;
  paidToday?: number;
  avgTicketToday?: number;
  activeOrders?: number;
  // compatibilidad con props anteriores
  totalSales?: number;
  totalOrders?: number;
  averageTicket?: number;
  pendingOrders?: number;
}

export default function OrdersStats({
  revenueToday,
  paidToday,
  avgTicketToday,
  activeOrders,
  totalSales,
  totalOrders,
  averageTicket,
  pendingOrders,
}: OrdersStatsProps) {
  const stats = [
    {
      label: 'Ventas del Día',
      value: formatCurrency(revenueToday ?? totalSales ?? 0),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Pagadas Hoy',
      value: (paidToday ?? totalOrders ?? 0).toString(),
      icon: Receipt,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Ticket Promedio',
      value: formatCurrency(avgTicketToday ?? averageTicket ?? 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      label: 'Activas Ahora',
      value: (activeOrders ?? pendingOrders ?? 0).toString(),
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
