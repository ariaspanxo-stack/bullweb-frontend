// ═══════════════════════════════════════════════════════════════
// MesasTab — Tab de mesas del POS Restaurant
// Hotfix #255: tarjeta de 3 zonas (encabezado, cuerpo, pie), estilos por
// estado desde TABLE_STYLES, tiempo con useElapsed (#253), pestañas de zona
// con conteo y barra de resumen. Solo presentación.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { Search, LayoutGrid, User, Users, ChefHat, Sparkles } from 'lucide-react';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import type { Table } from '../../../types/restaurant.types';
import { useElapsed } from '../shared/helpers';
import { TABLE_STYLES, TABLE_TIME_WARN_MIN, TABLE_TIME_ALERT_MIN } from '../shared/orderStatusStyles';

function formatCLP(value: number) {
  return '$' + value.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

// Fecha de apertura de la mesa ocupada (orden activa, con respaldo occupiedSince)
function openedAtIso(table: Table): string | undefined {
  const src = table.activeOrderCreatedAt ?? table.occupiedSince;
  if (!src) return undefined;
  const d = new Date(src);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function TableCard({ table, onClick }: { table: Table; onClick: () => void }) {
  const isOccupied  = table.status === 'OCCUPIED';
  const isReserved  = table.status === 'RESERVED';
  const isCleaning  = table.status === 'CLEANING';
  const isAvailable = !isOccupied && !isReserved && !isCleaning;
  const style = TABLE_STYLES[table.status] ?? TABLE_STYLES.AVAILABLE;

  // Tiempo ocupada: helper compartido del #253 (sin segundos, refresco 60 s)
  const elapsed = useElapsed(isOccupied ? openedAtIso(table) : undefined);

  const timeClass =
    !elapsed                               ? '' :
    elapsed.minutes < TABLE_TIME_WARN_MIN  ? 'text-slate-600' :
    elapsed.minutes <= TABLE_TIME_ALERT_MIN ? 'text-amber-700' :
                                             'text-red-700 bg-red-100 px-1.5 rounded';

  const preparingCount = table.preparingItemsCount ?? 0;

  return (
    <button
      onClick={onClick}
      className={`h-full w-full flex flex-col text-left p-4 rounded-xl border border-slate-200 hover:shadow-md transition-all active:scale-95 ${style.bg} ${
        isAvailable ? '' : `border-l-4 ${style.border}`
      }`}
    >
      {/* ENCABEZADO: número + badge de estado */}
      <div className="flex items-start justify-between gap-2">
        <span className={`text-3xl font-bold tabular-nums leading-none ${style.number}`}>
          {table.number}
        </span>
        {!isAvailable && (
          <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-current text-xs font-semibold ${style.bg} ${style.number}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {style.label}
          </span>
        )}
      </div>

      {/* CUERPO */}
      <div className="mt-3 flex flex-col gap-1.5">
        {isAvailable && (
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Users size={14} /> Capacidad {table.capacity}
          </span>
        )}

        {isOccupied && (
          <>
            {table.waiterName && (
              <span className="flex items-center gap-1.5 text-sm text-slate-700 min-w-0">
                <User size={14} className="flex-shrink-0" />
                <span className="truncate">{table.waiterName.split(' ')[0]}</span>
              </span>
            )}
            {elapsed && (
              <span className={`self-start text-sm font-semibold tabular-nums ${timeClass}`} title={`Abierta: ${elapsed.title}`}>
                {elapsed.text}
              </span>
            )}
            {(preparingCount > 0 || (table.numberOfPeople != null && table.numberOfPeople > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {preparingCount > 0 && (
                  <span className="flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    <ChefHat className="w-3 h-3 mr-1" /> {preparingCount} en cocina
                  </span>
                )}
                {table.numberOfPeople != null && table.numberOfPeople > 0 && (
                  <span className="flex items-center text-xs text-slate-500 gap-1">
                    <Users size={12} /> {table.numberOfPeople} / {table.capacity}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {isCleaning && (
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Sparkles size={16} /> En limpieza
          </span>
        )}
      </div>

      {/* PIE: total anclado abajo (solo ocupada) */}
      {isOccupied && (
        <div className="mt-auto pt-3">
          <div className="border-t border-slate-200 pt-2 flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 tracking-wide">TOTAL</span>
            <span className="text-[22px] font-bold text-slate-900 tabular-nums leading-none">
              {formatCLP(table.currentTotal ?? 0)}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

export function MesasTab() {
  const {
    tables,
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

  // Conteo ocupadas/total por zona (datos ya cargados)
  const zoneCounts = useMemo(() => {
    const map = new Map<string, { occupied: number; total: number }>();
    tables.forEach((t: Table) => {
      const c = map.get(t.sectionId) ?? { occupied: 0, total: 0 };
      c.total += 1;
      if (t.status === 'OCCUPIED') c.occupied += 1;
      map.set(t.sectionId, c);
    });
    return map;
  }, [tables]);

  // Resumen del local (todas las zonas)
  const summary = useMemo(() => {
    const occupied = tables.filter((t: Table) => t.status === 'OCCUPIED');
    const amount = occupied.reduce((s, t) => s + (t.currentTotal ?? 0), 0);
    const oldestMs = occupied.reduce<number | null>((min, t) => {
      const iso = openedAtIso(t);
      if (!iso) return min;
      const ms = new Date(iso).getTime();
      return min === null || ms < min ? ms : min;
    }, null);
    let oldest = '—';
    if (oldestMs !== null) {
      const totalMin = Math.max(0, Math.floor((Date.now() - oldestMs) / 60_000));
      oldest = `${Math.floor(totalMin / 60)}h ${totalMin % 60}min`;
    }
    return { occupied: occupied.length, total: tables.length, amount, oldest };
  }, [tables]);

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 flex items-center gap-4">
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

        {/* Secciones (pestañas con conteo ocupadas/total) */}
        {sections.length > 0 && (
          <div className="flex gap-1">
            {sections.map((section: any) => {
              const c = zoneCounts.get(section.id) ?? { occupied: 0, total: 0 };
              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`px-5 py-2.5 rounded-md font-medium text-sm tracking-wide transition-all border-[1.5px] tabular-nums ${
                    selectedSection === section.id
                      ? 'bg-blue-50 border-slate-800 text-slate-800 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {section.name} · {c.occupied}/{c.total}
                </button>
              );
            })}
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

      {/* Barra de resumen */}
      <div className="mb-4 flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">Ocupadas</span>
          <span className="text-lg font-bold tabular-nums text-slate-900">{summary.occupied}/{summary.total}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">En mesas</span>
          <span className="text-lg font-bold tabular-nums text-slate-900">{formatCLP(summary.amount)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">Más antigua</span>
          <span className="text-lg font-bold tabular-nums text-slate-900">{summary.oldest}</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 items-stretch">
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
