import { useQuery } from '@tanstack/react-query';
import { kitchenService } from '@/services/kitchenService';
import { cn } from '@/lib/utils';
import { Flame, Snowflake, Wine, Cake, Coffee, Utensils } from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface StationSelectorProps {
  selectedStation: string | null;
  onStationChange: (stationId: string | null) => void;
}

// ============================================================================
// ICONOS POR TIPO DE ESTACIÓN
// ============================================================================

const stationIcons: Record<string, any> = {
  'Cocina Caliente': Flame,
  'Cocina Fría': Snowflake,
  'Bar': Wine,
  'Postres': Cake,
  'Cafetería': Coffee,
  'Parrilla': Flame,
  'Ensaladas': Snowflake,
  'Bebidas': Wine
};

// ============================================================================
// COMPONENTE STATION SELECTOR
// ============================================================================

export default function StationSelector({ 
  selectedStation, 
  onStationChange 
}: StationSelectorProps) {
  // Query de estaciones
  const { data: stations, isLoading } = useQuery({
    queryKey: ['kitchen-stations'],
    queryFn: () => kitchenService.getStations()
  });

  // Query de órdenes para contar pendientes
  const { data: ordersData } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => kitchenService.getOrders(),
    refetchInterval: 3000 // Actualizar cada 3 segundos
  });

  // Contar items pendientes por estación
  const getPendingCount = (stationId: string) => {
    if (!ordersData) return 0;
    
    let count = 0;
    ordersData.forEach((order: any) => {
      if (order.stationId === stationId) {
        // Contar items que NO están listos
        const pendingItems = order.items?.filter(
          (item: any) => item.status !== 'READY'
        ).length || 0;
        count += pendingItems;
      }
    });
    
    return count;
  };

  // Contar total pendientes
  const getTotalPending = () => {
    if (!ordersData) return 0;
    
    let count = 0;
    ordersData.forEach((order: any) => {
      const pendingItems = order.items?.filter(
        (item: any) => item.status !== 'READY'
      ).length || 0;
      count += pendingItems;
    });
    
    return count;
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className="h-16 w-40 bg-gray-200 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {/* Todas las estaciones */}
      <button
        onClick={() => onStationChange(null)}
        className={cn(
          'px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border-2 shadow-sm hover:shadow-md',
          !selectedStation
            ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-105'
            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
        )}
      >
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5" />
          <span>Todas las Estaciones</span>
          {getTotalPending() > 0 && (
            <span className={cn(
              'ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold',
              !selectedStation
                ? 'bg-white text-blue-600'
                : 'bg-red-500 text-white animate-pulse'
            )}>
              {getTotalPending()}
            </span>
          )}
        </div>
      </button>

      {/* Estaciones individuales */}
      {stations?.map((station: any) => {
        const Icon = stationIcons[station.name] || Flame;
        const pendingCount = getPendingCount(station.id);
        const isSelected = selectedStation === station.id;
        
        return (
          <button
            key={station.id}
            onClick={() => onStationChange(station.id)}
            className={cn(
              'relative px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border-2 shadow-sm hover:shadow-md',
              isSelected
                ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-105'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              <span>{station.name}</span>
              {pendingCount > 0 && (
                <span className={cn(
                  'ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold',
                  isSelected
                    ? 'bg-white text-blue-600'
                    : 'bg-red-500 text-white animate-pulse'
                )}>
                  {pendingCount}
                </span>
              )}
            </div>

            {/* Badge de urgencia si hay items muy atrasados */}
            {pendingCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            )}
          </button>
        );
      })}
    </div>
  );
}
