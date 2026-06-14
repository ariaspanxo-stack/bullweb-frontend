// ═══════════════════════════════════════════════════════════════
// MESERO TABLE GRID — grid responsivo de mesas con secciones
// ═══════════════════════════════════════════════════════════════

import { MeseroTableCard } from './MeseroTableCard';

interface Props {
  tables:          any[];
  sections:        any[];
  selectedSection: string | null;
  onSelectSection: (id: string) => void;
  onSelectTable:   (table: any) => void;
  loading:         boolean;
}

export function MeseroTableGrid({
  tables, sections, selectedSection,
  onSelectSection, onSelectTable, loading,
}: Props) {

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent
                          rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando mesas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* Tabs de secciones */}
      {sections.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0 scrollbar-none">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                transition-colors
                ${selectedSection === section.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
                }`}
            >
              {section.name}
            </button>
          ))}
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="flex gap-3 px-4 mb-3 pt-3">
        {[
          { label: 'Libres',   count: tables.filter(t => t.status === 'AVAILABLE').length, color: 'text-green-600 bg-green-50' },
          { label: 'Ocupadas', count: tables.filter(t => t.status === 'OCCUPIED').length,  color: 'text-red-600 bg-red-50'     },
          { label: 'Total',    count: tables.length,                                        color: 'text-gray-600 bg-gray-50'   },
        ].map(stat => (
          <div key={stat.label}
            className={`flex-1 rounded-xl px-3 py-2 text-center ${stat.color}`}>
            <div className="text-xl font-black">{stat.count}</div>
            <div className="text-xs font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Grid de mesas */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tables.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <span className="text-4xl">🪑</span>
            <p className="mt-2 text-sm">No hay mesas en esta sección</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tables.map(table => (
              <MeseroTableCard
                key={table.id}
                table={table}
                onClick={() => onSelectTable(table)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
