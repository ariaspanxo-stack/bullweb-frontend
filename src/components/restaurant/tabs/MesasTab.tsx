// ═══════════════════════════════════════════════════════════════
// MesasTab — Tab de mesas del POS Restaurant
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid, User, Clock, Users, ChefHat, AlertTriangle } from 'lucide-react';
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

  // ── TARJETA DISPONIBLE ──
  if (!isOccupied && !isReserved) {
    return (
      <button
        onClick={onClick}
        className="bg-emerald-50 border border-emerald-200 rounded-2xl hover:border-emerald-400 hover:shadow-md transition-all text-left w-full active:scale-95 p-4 relative overflow-hidden"
      >
        {/* Barra superior */}
        <span className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-400" />
        <span className="text-5xl font-black text-emerald-700 leading-none block">
          {table.number}
        </span>
        <span className="text-xs text-emerald-600 font-medium mt-2 block">
          {table.capacity} personas
        </span>
      </button>
    );
  }

  // ── TARJETA OCUPADA ──
  if (isOccupied) {
    return (
      <button
        onClick={onClick}
        className="bg-orange-50 border border-orange-400 rounded-2xl border-l-4 border-l-orange-500 shadow-lg relative text-left w-full active:scale-95 transition-all p-4 overflow-hidden"
      >
        {/* Barra superior */}
        <span className="absolute top-0 left-0 right-0 h-1.5 bg-orange-500" />

        {/* Chip total en esquina superior derecha */}
        {(table.currentTotal ?? 0) > 0 && (
          <span className="absolute top-3 right-3 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-full">
            {formatCLP(table.currentTotal!)}
          </span>
        )}

        {/* Número de mesa vibrante */}
        <span className="text-5xl font-black text-orange-700 leading-none block">
          {table.number}
        </span>

        {/* Garzón */}
        {table.waiterName && (
          <div className="flex items-center gap-1.5 mt-2">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm font-bold text-gray-800 truncate">
              {table.waiterName.split(' ')[0]}
            </span>
          </div>
        )}

        {/* Tiempo */}
        {elapsed !== null && (
          <div className={`flex items-center gap-1 text-xs text-gray-500 mt-1 ${timeColor}`}>
            <Clock className="w-3.5 h-3.5" /> {elapsed}
          </div>
        )}

        {/* Badges inferiores */}
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {/* Badge ítems en cocina */}
          {preparingCount > 0 && (
            <span className="flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              <ChefHat className="w-3 h-3 mr-1" /> {preparingCount} en cocina
            </span>
          )}
          {/* Badge zombie: mesa abierta > 8h */}
          {isZombie && (
            <span className="flex items-center animate-pulse text-xs font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">
              <AlertTriangle className="w-3 h-3 mr-1" /> +{Math.floor(elapsedMin! / 60)}h
            </span>
          )}
          {/* Personas si hay */}
          {table.numberOfPeople != null && table.numberOfPeople > 0 && (
            <span className="flex items-center text-xs text-gray-400 gap-1">
              <Users className="w-3.5 h-3.5 text-gray-400" /> {table.numberOfPeople} / {table.capacity}
            </span>
          )}
        </div>
      </button>
    );
  }

  // ── TARJETA RESERVADA ──
  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all text-left w-full active:scale-95 p-4"
    >
      <span className="text-5xl font-black text-amber-600 leading-none block">
        {table.number}
      </span>
      <span className="text-xs text-amber-600 font-medium mt-2 block">
        Reservada · {table.capacity} personas
      </span>
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
      <div className="mb-6 flex items-center gap-4">
        {/* Buscador */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar mesa por número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white focus:border-transparent transition-colors"
          />
        </div>

        {/* Secciones */}
        {sections.length > 0 && (
          <div className="flex gap-1">
            {sections.map((section: any) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`px-5 py-2.5 rounded-md font-medium text-sm tracking-wide transition-all ${
                  selectedSection === section.id
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
