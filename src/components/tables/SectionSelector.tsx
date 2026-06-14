import { useQuery } from '@tanstack/react-query';
import tablesService from '@/services/tablesService';
import { cn } from '@/lib/utils';
import { Plus, Layers } from 'lucide-react';
import Button from '@/components/ui/Button';

// ============================================================================
// TIPOS
// ============================================================================

interface SectionSelectorProps {
  selectedSection: string | null;
  onSectionChange: (sectionId: string | null) => void;
  onCreateSection: () => void;
}

// ============================================================================
// COMPONENTE SECTION SELECTOR
// ============================================================================

export default function SectionSelector({ 
  selectedSection, 
  onSectionChange,
  onCreateSection 
}: SectionSelectorProps) {
  // Query de secciones
  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => tablesService.getSections()
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className="h-10 w-24 bg-gray-200 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {/* Icono de secciones */}
      <div className="flex items-center gap-2 text-gray-600 mr-2">
        <Layers className="w-5 h-5" />
        <span className="text-sm font-medium whitespace-nowrap">Secciones:</span>
      </div>

      {/* Todas las secciones */}
      <button
        onClick={() => onSectionChange(null)}
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
          'border-2',
          !selectedSection
            ? 'bg-blue-600 text-white border-blue-700 shadow-md'
            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
        )}
      >
        Todas las Secciones
        {!selectedSection && sections && (
          <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {sections.length}
          </span>
        )}
      </button>

      {/* Secciones individuales */}
      {sections?.map(section => {
        const isSelected = selectedSection === section.id;
        
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              'border-2 flex items-center gap-2',
              isSelected
                ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
            )}
          >
            {section.name}
            {isSelected && section.tableCount !== undefined && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {section.tableCount}
              </span>
            )}
          </button>
        );
      })}

      {/* Botón crear sección */}
      <div className="border-l-2 border-gray-200 pl-3 ml-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateSection}
          className="whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nueva Sección
        </Button>
      </div>
    </div>
  );
}
