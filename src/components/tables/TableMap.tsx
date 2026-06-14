import { useQuery } from '@tanstack/react-query';
import tablesService from '@/services/tablesService';
import { cn } from '@/lib/utils';
import { Users, Clock, AlertCircle } from 'lucide-react';
import type { Table } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

interface TableMapProps {
  selectedSection: string | null;
  onTableClick: (table: Table) => void;
}

// ============================================================================
// CONFIGURACIÓN DE ESTILOS
// ============================================================================

const statusColors = {
  AVAILABLE: 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200',
  OCCUPIED: 'bg-red-100 border-red-500 text-red-700 hover:bg-red-200',
  RESERVED: 'bg-yellow-100 border-yellow-500 text-yellow-700 hover:bg-yellow-200',
  CLEANING: 'bg-gray-100 border-gray-500 text-gray-700 hover:bg-gray-200'
};

const statusLabels = {
  AVAILABLE: 'Disponible',
  OCCUPIED: 'Ocupada',
  RESERVED: 'Reservada',
  CLEANING: 'Limpieza'
};

// ============================================================================
// COMPONENTE TABLE MAP
// ============================================================================

export default function TableMap({ selectedSection, onTableClick }: TableMapProps) {
  // Query de mesas con refetch automático cada 5 segundos
  const { data: tablesData, isLoading, error } = useQuery({
    queryKey: ['tables', selectedSection],
    queryFn: () => tablesService.getTables(),
    refetchInterval: 5000 // Actualizar cada 5 segundos
  });

  // Filtrar mesas por sección si está seleccionada
  const allTables = tablesData?.tables || [];
  const tables = selectedSection
    ? allTables.filter(table => table.sectionId === selectedSection)
    : allTables;

  // Calcular tiempo desde creación de orden
  const getOrderDuration = (order: any) => {
    if (!order?.createdAt) return '';
    
    const now = new Date();
    const created = new Date(order.createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Estados de carga y error
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando mesas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-red-50 rounded-lg border border-red-200">
        <div className="text-center text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p className="font-medium">Error al cargar mesas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 h-[600px] overflow-auto">
      {/* Canvas de mesas */}
      <div className="relative min-w-[1200px] min-h-[800px] p-4">
        {/* Grid de referencia (opcional) */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        {/* Mesas */}
        {tables.map(table => {
          const isRound = table.shape === 'ROUND';
          const isRectangular = table.shape === 'RECTANGULAR';
          
          return (
            <button
              key={table.id}
              onClick={() => onTableClick(table)}
              style={{
                position: 'absolute',
                left: `${table.positionX || 100}px`,
                top: `${table.positionY || 100}px`,
                width: isRectangular ? '160px' : '120px',
                height: isRound ? '120px' : '100px'
              }}
              className={cn(
                'border-3 shadow-lg hover:shadow-xl transition-all duration-200',
                'p-3 flex flex-col items-center justify-center gap-1',
                'active:scale-95 transform',
                isRound && 'rounded-full',
                !isRound && 'rounded-lg',
                statusColors[table.status]
              )}
            >
              {/* Número de mesa */}
              <div className="text-2xl font-bold leading-none">
                {table.number}
              </div>

              {/* Capacidad */}
              <div className="flex items-center gap-1 text-xs font-medium">
                <Users className="w-3 h-3" />
                <span>{table.capacity}</span>
              </div>

              {/* Estado */}
              <div className="text-[10px] font-semibold uppercase tracking-wide">
                {statusLabels[table.status]}
              </div>

              {/* Información adicional si está ocupada */}
              {table.status === 'OCCUPIED' && table.currentOrder && (
                <div className="flex items-center gap-1 text-xs mt-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">
                    {getOrderDuration(table.currentOrder)}
                  </span>
                </div>
              )}

              {/* Badge de mesero asignado */}
              {table.assignedWaiter && (
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                  {table.assignedWaiter.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          );
        })}

        {/* Mensaje si no hay mesas */}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No hay mesas</p>
              <p className="text-sm">
                {selectedSection 
                  ? 'No hay mesas en esta sección'
                  : 'Crea tu primera mesa para comenzar'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
