import { Users, Star, TrendingUp, UserPlus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CustomersStatsProps {
  totalCustomers: number;
  newThisMonth: number;
  totalPoints: number;
  averageSpent: number;
}

export default function CustomersStats({
  totalCustomers,
  newThisMonth,
  totalPoints,
  averageSpent
}: CustomersStatsProps) {
  const stats = [
    {
      label: 'Total Clientes',
      value: totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      label: 'Nuevos Este Mes',
      value: newThisMonth,
      icon: UserPlus,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      label: 'Puntos Totales',
      value: totalPoints,
      icon: Star,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100'
    },
    {
      label: 'Gasto Promedio',
      value: formatCurrency(averageSpent),
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
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
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
