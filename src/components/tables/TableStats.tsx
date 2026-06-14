import { useQuery } from '@tanstack/react-query';
import tablesService from '@/services/tablesService';
import { CheckCircle, XCircle, Clock, Sparkles, TrendingUp } from 'lucide-react';

// ============================================================================
// COMPONENTE TABLE STATS
// ============================================================================

export default function TableStats() {
  // Query de mesas
  const { data: tablesData, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesService.getTables(),
    refetchInterval: 10000 // Actualizar cada 10 segundos
  });

  const tables = tablesData?.tables || [];

  // Calcular estadísticas
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    occupied: tables.filter(t => t.status === 'OCCUPIED').length,
    reserved: tables.filter(t => t.status === 'RESERVED').length,
    cleaning: tables.filter(t => t.status === 'CLEANING').length
  };

  // Tasa de ocupación
  const occupancyRate = stats.total > 0 
    ? Math.round((stats.occupied / stats.total) * 100)
    : 0;

  // Capacidad total
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  const occupiedCapacity = tables
    .filter(t => t.status === 'OCCUPIED')
    .reduce((sum, table) => sum + table.capacity, 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* Total de Mesas */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Total</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-xs text-gray-500 mt-1">
          {totalCapacity} asientos
        </div>
      </div>

      {/* Disponibles */}
      <div className="bg-green-50 rounded-lg border-2 border-green-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 text-green-600 mb-2">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Disponibles</span>
        </div>
        <div className="text-3xl font-bold text-green-700">{stats.available}</div>
        <div className="text-xs text-green-600 mt-1">
          Listas para usar
        </div>
      </div>

      {/* Ocupadas */}
      <div className="bg-red-50 rounded-lg border-2 border-red-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <XCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Ocupadas</span>
        </div>
        <div className="text-3xl font-bold text-red-700">{stats.occupied}</div>
        <div className="text-xs text-red-600 mt-1">
          {occupiedCapacity} personas
        </div>
      </div>

      {/* Reservadas */}
      <div className="bg-yellow-50 rounded-lg border-2 border-yellow-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 text-yellow-600 mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Reservadas</span>
        </div>
        <div className="text-3xl font-bold text-yellow-700">{stats.reserved}</div>
        <div className="text-xs text-yellow-600 mt-1">
          {stats.cleaning > 0 && `${stats.cleaning} en limpieza`}
          {stats.cleaning === 0 && 'Pendientes'}
        </div>
      </div>

      {/* Tasa de Ocupación */}
      <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">Ocupación</span>
        </div>
        <div className="text-3xl font-bold text-blue-700">{occupancyRate}%</div>
        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
