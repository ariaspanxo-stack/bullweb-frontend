import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Trash2, Tag, DollarSign, AlertTriangle, Search, Calendar, X,
} from 'lucide-react';
import { auditService, type AuditLogFilters } from '@/services/auditService';
import { useAuthStore } from '@/store/authStore';

// ── Traducción de acciones a español ────────────────────────────────────────
function translateAction(action: string): string {
  const a = action.toUpperCase();
  if (a.includes('DELETE'))          return 'Eliminación';
  if (a.includes('SOFT'))            return 'Archivado';
  if (a.includes('CANCEL'))          return 'Cancelación';
  if (a.includes('VOID'))            return 'Anulación';
  if (a.includes('DISCOUNT'))        return 'Descuento';
  if (a.includes('PRICE'))           return 'Cambio de precio';
  if (a.includes('CREATE'))          return 'Creación';
  if (a.includes('ADD'))             return 'Agregado';
  if (a.includes('UPDATE'))          return 'Actualización';
  if (a.includes('APPLY'))           return 'Aplicación';
  if (a.includes('LOGIN_SUCCESS'))   return 'Inicio de sesión';
  if (a.includes('LOGIN_FAILED'))    return 'Login fallido';
  if (a.includes('LOGOUT'))          return 'Cierre de sesión';
  if (a === 'BULK_ACTION')           return 'Acción masiva';
  return action;
}

// ── Helpers de color por tipo de acción ────────────────────────────────────
function getActionStyle(action: string): { row: string; badge: string; icon: React.ElementType } {
  const a = action.toUpperCase();
  // Eliminaciones / cancelaciones / anulaciones → rojo
  if (a.includes('DELETE') || a.includes('CANCEL') || a.includes('VOID')) {
    return { row: 'bg-red-50/50', badge: 'bg-red-100 text-red-700 border-red-200', icon: Trash2 };
  }
  // Descuentos → naranja
  if (a.includes('DISCOUNT')) {
    return { row: 'bg-orange-50/50', badge: 'bg-orange-100 text-orange-700 border-orange-200', icon: Tag };
  }
  // Cambios de precio → ámbar
  if (a.includes('PRICE')) {
    return { row: 'bg-amber-50/50', badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: DollarSign };
  }
  // Creación → verde
  if (a.includes('CREATE') || a.includes('ADD')) {
    return { row: '', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: ClipboardList };
  }
  // Actualización → azul
  if (a.includes('UPDATE') || a.includes('APPLY')) {
    return { row: '', badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: ClipboardList };
  }
  // Default
  return { row: '', badge: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertTriangle };
}

function formatDetail(entry: {
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  action: string;
}): string {
  const { previousValue, newValue, metadata, action } = entry;
  const a = action.toUpperCase();

  // Cambio de precio
  if (a.includes('PRICE') && previousValue && newValue) {
    return `$${previousValue.price} → $${newValue.price ?? metadata?.newPrice ?? '?'}`;
  }
  // Descuento aplicado
  if (a.includes('DISCOUNT') && metadata) {
    const pct = metadata.percentage ?? metadata.discount ?? '?';
    const reason = metadata.reason ? ` · ${metadata.reason}` : '';
    return `Descuento ${pct}%${reason}`;
  }
  // Cancelación
  if (a.includes('CANCEL') && metadata?.reason) {
    return `Motivo: ${metadata.reason}`;
  }
  // Eliminación con nombre
  if (a.includes('DELETE') && previousValue?.name) {
    return `"${previousValue.name}"`;
  }
  // Soft-delete
  if (a.includes('SOFT') && previousValue?.name) {
    return `"${previousValue.name}" (soft)`;
  }
  // Actualización genérica con campos cambiados
  if (a.includes('UPDATE') && previousValue && newValue) {
    const changed = Object.keys(newValue).filter(
      k => JSON.stringify(previousValue[k]) !== JSON.stringify(newValue[k]) && k !== 'updated_at'
    );
    return changed.length ? `Campos: ${changed.join(', ')}` : 'Sin cambios detectados';
  }
  // Metadata genérica
  if (metadata && Object.keys(metadata).length) {
    return Object.entries(metadata).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(' · ');
  }
  return '—';
}

// ── Helpers de zona horaria ─────────────────────────────────────────────────
// Convierte YYYY-MM-DD (desde <input type="date">) a inicio/fin del día en
// HORA LOCAL, expresado como ISO UTC. Esto evita el bug donde new Date('2026-06-15')
// se interpreta como medianoche UTC y excluye eventos de la tarde en Chile.
function dateToStartISO(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
function dateToEndISO(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

// ── Componente principal ────────────────────────────────────────────────────
export default function AuditLogPage() {
  // Filtro de fecha por defecto = hoy en HORA LOCAL (no UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [page, setPage]           = useState(1);
  const [limit]                   = useState(25);
  const [actionFilter, setAction] = useState('');
  const [entityFilter, setEntity] = useState('');
  const [userIdFilter, setUserId] = useState('');
  const [startDate, setStartDate] = useState(today);   // ← hoy por defecto
  const [endDate, setEndDate]     = useState(today);   // ← hoy por defecto
  const [search, setSearch]       = useState('');
  const [dateEnabled, setDateEnabled] = useState(true); // toggle del filtro fecha

  // Usuario actual para mostrar "tú" en la tabla
  const { user } = useAuthStore();

  const filters: AuditLogFilters = useMemo(() => ({
    page,
    limit,
    action: actionFilter || undefined,
    entity: entityFilter || undefined,
    userId: userIdFilter || undefined,
    // Convertir YYYY-MM-DD a rangos ISO completos (inicio/fin del día local en UTC)
    startDate: dateEnabled && startDate ? dateToStartISO(startDate) : undefined,
    endDate:   dateEnabled && endDate   ? dateToEndISO(endDate)     : undefined,
  }), [page, limit, actionFilter, entityFilter, userIdFilter, startDate, endDate, dateEnabled]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditService.getLogs(filters),
    placeholderData: (prev) => prev,
  });

  const logs   = data?.data ?? [];
  const meta   = data?.meta;
  const total  = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  // Filtro cliente por búsqueda libre (sobre acción/usuario/entidad)
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      l.action.toLowerCase().includes(q) ||
      (l.userName ?? '').toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const resetFilters = () => {
    setPage(1); setAction(''); setEntity(''); setUserId('');
    setStartDate(today); setEndDate(today); setSearch(''); setDateEnabled(true);
  };

  const hasFilters = actionFilter || entityFilter || userIdFilter ||
    (dateEnabled && (startDate || endDate)) || search;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Registro de Auditoría</h1>
            <p className="text-xs text-gray-500">
              {total.toLocaleString('es-CL')} evento{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4" /> Filtros
          {hasFilters && (
            <button onClick={resetFilters} className="ml-auto text-xs text-red-500 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todas las acciones</option>
            <option value="DELETE">Eliminaciones</option>
            <option value="DISCOUNT">Descuentos</option>
            <option value="PRICE">Cambios de precio</option>
            <option value="CANCEL">Cancelaciones</option>
            <option value="CREATE">Creaciones</option>
            <option value="UPDATE">Actualizaciones</option>
          </select>
          <select
            value={entityFilter}
            onChange={e => { setEntity(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todas las entidades</option>
            <option value="orders">Órdenes</option>
            <option value="products">Productos</option>
            <option value="categories">Categorías</option>
            <option value="customers">Clientes</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dateEnabled}
                onChange={e => { setDateEnabled(e.target.checked); setPage(1); }}
                className="rounded border-gray-300"
              />
              Fecha
            </label>
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                disabled={!dateEnabled}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                title="Desde"
              />
            </div>
            <span className="text-gray-400 text-xs">→</span>
            <div className="flex-1 relative">
              <input
                type="date"
                value={endDate}
                disabled={!dateEnabled}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                title="Hasta"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3 whitespace-nowrap">Fecha</th>
                <th className="px-4 py-3 whitespace-nowrap">Usuario</th>
                <th className="px-4 py-3 whitespace-nowrap">Acción</th>
                <th className="px-4 py-3 whitespace-nowrap">Entidad</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
                    Cargando...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Sin eventos</p>
                    <p className="text-xs">No se encontraron registros con los filtros actuales</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(entry => {
                  const style = getActionStyle(entry.action);
                  const Icon = style.icon;
                  return (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${style.row}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString('es-CL', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          // Resolver nombre y email por separado para mostrarlos
                          // en líneas distintas.
                          // - Si userName existe y NO contiene "@" → es nombre real
                          // - Si userName contiene "@" → tratarlo como email
                          // - Si no hay nada → "Sistema"
                          const rawName = entry.userName?.trim() || null;
                          const rawEmail = entry.actorEmail?.trim() || null;
                          const nameIsEmail = rawName ? rawName.includes('@') : false;

                          const displayName = (rawName && !nameIsEmail) ? rawName : null;
                          const displayEmail = rawEmail ?? (nameIsEmail ? rawName : null);

                          if (!displayName && !displayEmail) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0">?</div>
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-500 italic">
                                    Sistema
                                    {user?.id === entry.userId && (
                                      <span className="ml-1 text-[10px] text-blue-600 font-normal">(tú)</span>
                                    )}
                                  </p>
                                  {entry.ipAddress && (
                                    <p className="text-[10px] text-gray-400 font-mono">{entry.ipAddress}</p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          const initial = (displayName ?? displayEmail ?? '?')[0]?.toUpperCase() ?? '?';
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                {/* Línea 1: Nombre (font-medium, oscuro) */}
                                <p className={`text-sm truncate ${displayName ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                                  {displayName ?? displayEmail}
                                  {user?.id === entry.userId && (
                                    <span className="ml-1 text-[10px] text-blue-600 font-normal">(tú)</span>
                                  )}
                                </p>
                                {/* Línea 2: Email en gris (solo si hay nombre arriba) */}
                                {displayName && displayEmail && (
                                  <p className="text-[11px] text-gray-500 truncate">{displayEmail}</p>
                                )}
                                {entry.ipAddress && (
                                  <p className="text-[10px] text-gray-400 font-mono">{entry.ipAddress}</p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${style.badge}`}>
                          <Icon className="w-3 h-3" />
                          {translateAction(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono text-gray-600">
                          {entry.entity}
                          {entry.entityId && (
                            <span className="text-gray-400"> #{entry.entityId.slice(0, 8)}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-md">
                        {formatDetail(entry)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Página {page} de {totalPages} · {total.toLocaleString('es-CL')} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}