import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import tablesService from '@/services/tablesService';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { Utensils, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Table } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

interface TableSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (table: Table) => void;
  selectedTable?: Table | null;
}

// ============================================================================
// COMPONENTE TABLE SELECTOR
// ============================================================================

export default function TableSelector({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedTable 
}: TableSelectorProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tablesData, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesService.getTables(),
    enabled: isOpen
  });

  const sections = tablesData?.sections || [];
  const tables = tablesData?.tables || [];

  // Filtrar mesas
  const filteredTables = tables.filter(table => {
    // Filtrar por sección
    if (selectedSection && table.section?.id !== selectedSection) {
      return false;
    }
    
    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return table.number.toLowerCase().includes(query);
    }
    
    // Solo mesas disponibles
    return table.status === 'AVAILABLE';
  });

  const handleSelect = (table: Table) => {
    onSelect(table);
    onClose();
    // Resetear filtros
    setSearchQuery('');
    setSelectedSection(null);
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setSelectedSection(null);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Seleccionar Mesa"
      size="lg"
    >
      <div className="space-y-4">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar mesa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Selector de sección */}
        {sections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedSection(null)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                !selectedSection
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Todas las Secciones
            </button>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  selectedSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {section.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid de mesas */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" label="Cargando mesas..." />
          </div>
        ) : filteredTables.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No hay mesas disponibles"
            description={searchQuery 
              ? "No se encontraron mesas con ese número"
              : "No hay mesas disponibles en este momento"
            }
          />
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
            {filteredTables.map(table => (
              <button
                key={table.id}
                onClick={() => handleSelect(table)}
                className={cn(
                  'aspect-square rounded-lg border-2 p-4 flex flex-col items-center justify-center gap-2',
                  'transition-all hover:shadow-md active:scale-95',
                  selectedTable?.id === table.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                )}
              >
                <Utensils className={cn(
                  'w-6 h-6',
                  selectedTable?.id === table.id ? 'text-blue-600' : 'text-gray-600'
                )} />
                <div className="text-center">
                  <div className={cn(
                    'text-lg font-bold',
                    selectedTable?.id === table.id ? 'text-blue-700' : 'text-gray-900'
                  )}>
                    {table.number}
                  </div>
                  {table.section && (
                    <div className="text-xs text-gray-500 mt-1">
                      {table.section.name}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-1">
                    <Users className="w-3 h-3" />
                    <span>{table.capacity}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
