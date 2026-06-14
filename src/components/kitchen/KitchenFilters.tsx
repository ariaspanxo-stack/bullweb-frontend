import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

interface KitchenFiltersProps {
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// ============================================================================
// OPCIONES DE FILTRO
// ============================================================================

const statusOptions = [
  { 
    value: null, 
    label: 'Todos', 
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    activeColor: 'bg-gray-200 border-gray-400'
  },
  { 
    value: 'PENDING', 
    label: 'Pendientes', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    activeColor: 'bg-yellow-200 border-yellow-500'
  },
  { 
    value: 'PREPARING', 
    label: 'En Preparación', 
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    activeColor: 'bg-blue-200 border-blue-500'
  },
  { 
    value: 'READY', 
    label: 'Listos', 
    color: 'bg-green-100 text-green-700 border-green-300',
    activeColor: 'bg-green-200 border-green-500'
  }
];

// ============================================================================
// COMPONENTE KITCHEN FILTERS
// ============================================================================

export default function KitchenFilters({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange
}: KitchenFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Búsqueda */}
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por orden, mesa o producto..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all"
          />
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
        {statusOptions.map((option) => {
          const isActive = statusFilter === option.value;
          
          return (
            <button
              key={option.value || 'all'}
              onClick={() => onStatusFilterChange(option.value)}
              className={cn(
                'px-5 py-3 rounded-lg text-sm font-bold border-2 transition-all whitespace-nowrap',
                isActive
                  ? `${option.activeColor} ring-2 ring-blue-500 ring-offset-2 shadow-md scale-105`
                  : `${option.color} hover:shadow-sm hover:scale-105`
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
