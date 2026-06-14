import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface OrderFiltersProps {
  filters: {
    search: string;
    status: string[];
    type: string[];
    dateFrom: string;
    dateTo: string;
    waiterId: string;
    tableId: string;
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
  waiters?: { id: string; name: string }[];
  tables?: { id: string; number: number }[];
}

const statusOptions = [
  { value: 'PENDING',   label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'PREPARING', label: 'Preparando', color: 'bg-blue-100 text-blue-700'    },
  { value: 'READY',     label: 'Lista',      color: 'bg-purple-100 text-purple-700' },
  { value: 'PAID',      label: 'Pagada',     color: 'bg-green-100 text-green-700'  },
  { value: 'CANCELLED', label: 'Cancelada',  color: 'bg-red-100 text-red-700'      },
];

const typeOptions = [
  { value: 'DINE_IN',  label: 'ðŸª‘ Mesa'       },
  { value: 'TAKEAWAY', label: 'ðŸ›ï¸ Para Llevar' },
  { value: 'DELIVERY', label: 'ðŸš´ Delivery'    },
];

export default function OrderFilters({ filters, onFiltersChange, onReset, waiters = [], tables = [] }: OrderFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleStatus = (status: string) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    updateFilter('status', updated);
  };

  const toggleType = (type: string) => {
    const current = filters.type || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateFilter('type', updated);
  };

  // Contar TODOS los filtros activos (FIX 6)
  const activeCount = [
    ...(filters.status  ?? []),
    ...(filters.type    ?? []),
    ...(filters.search  ? ['search']   : []),
    ...(filters.dateFrom ? ['dateFrom'] : []),
    ...(filters.dateTo   ? ['dateTo']   : []),
    ...(filters.waiterId ? ['waiterId'] : []),
    ...(filters.tableId  ? ['tableId']  : []),
  ].length;

  const hasActiveFilters = activeCount > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Barra superior */}
      <div className="flex items-center gap-4 mb-4">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por número de orden, mesa o cliente..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Botón filtros avanzados */}
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(hasActiveFilters && 'bg-primary-50 border-primary-300')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
              {activeCount}
            </span>
          )}
        </Button>

        {/* Botón reset */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={onReset}>
            <X className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Panel expandible */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t">
          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  onClick={() => toggleStatus(status.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    filters.status?.includes(status.value) ? 'ring-2 ring-primary-500 shadow-sm' : '',
                    status.color
                  )}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Orden</label>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map(type => (
                <button
                  key={type.value}
                  onClick={() => toggleType(type.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    filters.type?.includes(type.value)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Mesero y Mesa */}
          <div className="grid grid-cols-2 gap-4">
            {waiters.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Garzón / Mesero</label>
                <select
                  value={filters.waiterId || ''}
                  onChange={e => updateFilter('waiterId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">Todos los garzones</option>
                  {waiters.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
            {tables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mesa</label>
                <select
                  value={filters.tableId || ''}
                  onChange={e => updateFilter('tableId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">Todas las mesas</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>Mesa {t.number}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
