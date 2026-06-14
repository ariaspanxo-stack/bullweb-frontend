import { useQuery } from '@tanstack/react-query';
import { kitchenService } from '@/services/kitchenService';
import { Clock, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

// ============================================================================
// COMPONENTE KITCHEN STATS
// ============================================================================

export default function KitchenStats() {
  // Query de estadísticas con auto-refresh
  const { data: stats, isLoading } = useQuery({
    queryKey: ['kitchen-stats'],
    queryFn: () => kitchenService.getStats(),
    refetchInterval: 5000 // Actualizar cada 5 segundos
  });

  // Estadísticas
  const items = [
    {
      label: 'Items Pendientes',
      value: stats?.pending || 0,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      borderColor: 'border-yellow-300'
    },
    {
      label: 'En Preparación',
      value: stats?.preparing || 0,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      borderColor: 'border-blue-300'
    },
    {
      label: 'Completados Hoy',
      value: stats?.completedToday || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      borderColor: 'border-green-300'
    },
    {
      label: 'Tiempo Promedio',
      value: stats?.avgTime ? `${Math.round(stats.avgTime)} min` : '-',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      borderColor: 'border-purple-300'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        
        return (
          <div 
            key={item.label} 
            className={`bg-white rounded-lg border-2 ${item.borderColor} p-5 hover:shadow-lg transition-shadow`}
          >
            <div className={`w-12 h-12 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {item.value}
            </div>
            <div className="text-sm text-gray-600 font-medium">
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
