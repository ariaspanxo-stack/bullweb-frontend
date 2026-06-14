// ═══════════════════════════════════════════════════════════════
// MesasTab — Tab de mesas del POS Restaurant
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid } from 'lucide-react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import type { Table } from '../../../types/restaurant.types';

function formatCLP(value: number) {
  return '$' + value.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

function useElapsedTime(since: Date | string | null | undefined): string | null {
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (!since) { setElapsed(null); return; }
    const compute = () => {
      const diff = Date.now() - new Date(since).getTime();
      if (diff < 0) { setElapsed('0m'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [since]);

  return elapsed;
}

function TableCard({ table, onClick }: { table: Table; onClick: () => void }) {
  const isOccupied = table.status === 'OCCUPIED';
  const isReserved = table.status === 'RESERVED';

  // Timer real en tiempo real (cada 30s)
  const elapsed = useElapsedTime(
    isOccupied ? (table.activeOrderCreatedAt ?? table.occupiedSince) : null
  );

  // Color de la barra superior
  const barColor =
    isOccupied ? 'bg-red-400' :
    isReserved ? 'bg-yellow-400' :
                 'bg-green-400';

  // Color del tiempo según antigüedad
  const elapsedMin = useMemo(() => {
    const src = table.activeOrderCreatedAt ?? table.occupiedSince;
    if (!src) return null;
    return Math.floor((Date.now() - new Date(src).getTime()) / 60_000);
  }, [table.activeOrderCreatedAt, table.occupiedSince]);

  const timeColor =
    elapsedMin === null ? '' :
    elapsedMin < 30     ? 'text-green-600' :
    elapsedMin < 60     ? 'text-yellow-600' :
    elapsedMin < 90     ? 'text-orange-500' :
                          'text-red-600';

  const isZombie = elapsedMin !== null && elapsedMin >= 480; // > 8 horas

  const preparingCount = table.preparingItemsCount ?? 0;

  return (
    <button
      onClick={onClick}
      className={`relative rounded-2xl border-2 transition-all text-left w-full hover:shadow-md active:scale-95 ${
        isOccupied
          ? 'bg-red-50 border-red-300 shadow-sm hover:border-red-400'
          : isReserved
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-white border-gray-100 hover:border-green-200'
      }`}
    >
      {/* Barra color superior */}
      <div className={`h-1.5 rounded-t-2xl ${barColor}`} />

      <div className="p-4">
        {/* Fila 1: número + badge estado */}
        <div className="flex items-start justify-between mb-2">
          <span className="text-4xl font-black text-gray-900 leading-none">
            {table.number}
          </span>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isOccupied
                ? 'bg-red-100 text-red-700'
                : isReserved
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {isOccupied ? '● Ocupada' : isReserved ? '◌ Reservada' : '○ Disponible'}
            </span>
            {/* Badge ítems en cocina */}
            {isOccupied && preparingCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                🍳 {preparingCount} en cocina
              </span>
            )}
            {/* Badge zombie: mesa abierta > 8h */}
            {isOccupied && isZombie && (
              <span className="animate-pulse text-xs font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">
                ⚠️ +{Math.floor(elapsedMin! / 60)}h
              </span>
            )}
          </div>
        </div>

        {/* Info cuando está OCUPADA */}
        {isOccupied && (
          <div className="mt-2 pt-2 border-t border-red-100">
            {/* Garzón */}
            {table.waiterName && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">👤</span>
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {table.waiterName.split(' ')[0]}
                </span>
              </div>
            )}
            {/* Tiempo + Total en la misma fila */}
            <div className="flex items-center justify-between gap-1">
              {elapsed !== null && (
                <span className={`flex items-center gap-1 text-xs font-bold ${timeColor}`}>
                  🕐 {elapsed}
                </span>
              )}
              {(table.currentTotal ?? 0) > 0 && (
                <span className="text-xs font-bold text-gray-800">
                  💰 {formatCLP(table.currentTotal!)}
                </span>
              )}
            </div>
            {/* Personas si hay */}
            {table.numberOfPeople != null && table.numberOfPeople > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-gray-400">👥 {table.numberOfPeople} / {table.capacity}</span>
              </div>
            )}
          </div>
        )}

        {/* Info cuando está LIBRE */}
        {!isOccupied && !isReserved && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              👥 {table.capacity} personas
            </span>
            <span className="text-xs text-gray-400">
              {((table as any).sections ?? (table as any).section)?.name ?? 'SALÓN'}
            </span>
          </div>
        )}

        {/* Info cuando está RESERVADA */}
        {isReserved && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-yellow-600 font-medium">
              Reservada
            </span>
            <span className="text-xs text-gray-400">
              👥 {table.capacity}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

export function MesasTab() {
  const {
    filteredTables,
    sections,
    selectedSection,
    setSelectedSection,
    searchQuery,
    setSearchQuery,
    filterCapacity,
    setFilterCapacity,
    showFilterMenu,
    setShowFilterMenu,
    handleSelectTable,
  } = useRestaurant();

  return (
    <div>
      {/* Filtros */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex items-center gap-4">
          {/* Buscador */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar mesa por número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Secciones */}
          {sections.length > 0 && (
            <div className="flex rounded-xl overflow-hidden border-2 border-orange-300 shadow-sm">
              {sections.map((section: any, idx: number) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`px-8 py-2.5 font-bold text-sm tracking-wide transition-all ${
                    idx > 0 ? 'border-l-2 border-orange-300' : ''
                  } ${
                    selectedSection === section.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {section.name.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Filtro capacidad */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(p => !p)}
              className={`px-4 py-2 border rounded-lg text-sm transition-colors ${
                filterCapacity
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filterCapacity ? `👥 ${filterCapacity}+ personas` : 'Filtros'}
            </button>
            {showFilterMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-20 min-w-[160px]">
                <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">
                  Capacidad mínima
                </p>
                {([null, 2, 4, 6, 8] as (number | null)[]).map(cap => (
                  <button
                    key={cap ?? 'all'}
                    onClick={() => { setFilterCapacity(cap); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filterCapacity === cap
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {cap === null ? 'Todas' : `${cap}+ personas`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid de mesas */}
      {filteredTables.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <LayoutGrid size={48} className="mx-auto" />
          </div>
          <p className="text-gray-600 font-medium">No hay mesas disponibles</p>
          <p className="text-gray-400 text-sm">Ajusta los filtros o contacta al administrador</p>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {filteredTables.map((table: Table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => handleSelectTable(table)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
