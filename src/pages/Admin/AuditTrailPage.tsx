import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, Filter, Download, ChevronDown, ChevronRight,
  User, AlertCircle, Info, CheckCircle, XCircle,
  ArrowRight, Search, RefreshCw,
} from 'lucide-react';
import { adminService } from '@/services/adminService';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AuditEntry {
  id:          string;
  action:      string;
  module:      string;
  targetType:  string | null;
  targetId:    string | null;
  actorId:     string | null;
  actorEmail:  string | null;
  ipAddress:   string | null;
  before?:     Record<string, unknown> | null;
  after?:      Record<string, unknown> | null;
  createdAt:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  LOGIN:  'bg-purple-100 text-purple-700 border-purple-200',
  LOGOUT: 'bg-gray-100 text-gray-600 border-gray-200',
  ERROR:  'bg-orange-100 text-orange-700 border-orange-200',
};
const ACTION_ICON: Record<string, React.ElementType> = {
  CREATE: CheckCircle,
  UPDATE: Info,
  DELETE: XCircle,
  LOGIN:  User,
  ERROR:  AlertCircle,
};

function getActionType(action: string) {
  if (action.includes('CREATE') || action.includes('ADD')) return 'CREATE';
  if (action.includes('UPDATE') || action.includes('TOGGLE') || action.includes('ACTIVATE') || action.includes('DEACTIVATE')) return 'UPDATE';
  if (action.includes('DELETE') || action.includes('REVOKE') || action.includes('REMOVE')) return 'DELETE';
  if (action.includes('LOGIN')) return 'LOGIN';
  if (action.includes('ERROR') || action.includes('FAIL')) return 'ERROR';
  return 'UPDATE';
}

// ─── Diff entre before / after ────────────────────────────────────────────────
function DiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return null;

  const allKeys = [...new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])].filter(k => k !== 'updated_at' && k !== 'created_at');

  const changed = allKeys.filter(k => {
    const bv = JSON.stringify((before ?? {})[k]);
    const av = JSON.stringify((after ?? {})[k]);
    return bv !== av;
  });

  if (!before) {
    return (
      <div>
        <p className="text-xs font-semibold text-green-600 mb-1">Registro creado:</p>
        <div className="space-y-1">
          {Object.entries(after ?? {}).filter(([k]) => k !== 'id' && k !== 'created_at' && k !== 'updated_at').map(([k, v]) => (
            <div key={k} className="flex items-start gap-2 text-xs">
              <span className="text-gray-500 min-w-[120px] font-mono">{k}</span>
              <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-mono break-all">
                {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!after) {
    return (
      <div>
        <p className="text-xs font-semibold text-red-600 mb-1">Registro eliminado:</p>
        <div className="space-y-1">
          {Object.entries(before ?? {}).filter(([k]) => k !== 'id' && k !== 'created_at').map(([k, v]) => (
            <div key={k} className="flex items-start gap-2 text-xs">
              <span className="text-gray-500 min-w-[120px] font-mono">{k}</span>
              <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-mono line-through break-all">
                {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!changed.length) {
    return <p className="text-xs text-gray-400 italic">Sin cambios de campos registrados</p>;
  }

  return (
    <div>
      <p className="text-xs font-semibold text-blue-600 mb-2">Campos modificados ({changed.length}):</p>
      <div className="space-y-2">
        {changed.map(k => {
          const bv = (before ?? {})[k];
          const av = (after ?? {})[k];
          return (
            <div key={k} className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-gray-500 min-w-[120px] font-mono">{k}</span>
              <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-mono line-through max-w-[160px] truncate" title={String(bv ?? '')}>
                {typeof bv === 'object' ? JSON.stringify(bv) : String(bv ?? '—')}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-mono max-w-[160px] truncate" title={String(av ?? '')}>
                {typeof av === 'object' ? JSON.stringify(av) : String(av ?? '—')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AuditTrailPage() {
  const [search, setSearch]         = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, ] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const PER_PAGE = 30;

  const { data: raw = [], refetch, isFetching } = useQuery<AuditEntry[]>({
    queryKey: ['audit', 'trail'],
    queryFn: async () => {
      const r = await adminService.getLogs({ limit: 500, page: 1 });
      return r.data as AuditEntry[];
    },
  });

  const { data: statsRaw } = useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: () => adminService.getAuditStats(),
  });

  // Filtrar
  const filtered = raw.filter(e => {
    if (search && !e.action.toLowerCase().includes(search.toLowerCase()) &&
        !(e.actorEmail ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !(e.module ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterModule && e.module !== filterModule) return false;
    if (filterAction && !e.action.includes(filterAction)) return false;
    if (dateFrom && new Date(e.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const modules = [...new Set(raw.map(e => e.module).filter(Boolean))].sort();

  // Exportar CSV
  const exportCSV = () => {
    const headers = ['fecha','acción','módulo','actor','ip','target_type','target_id'];
    const rows = filtered.map(e => [
      new Date(e.createdAt).toLocaleString('es-CL'),
      e.action, e.module ?? '',
      e.actorEmail ?? '', e.ipAddress ?? '',
      e.targetType ?? '', e.targetId ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Agrupar por fecha para timeline
  const grouped: Record<string, AuditEntry[]> = {};
  for (const e of paged) {
    const day = new Date(e.createdAt).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} de {raw.length} eventos · Vista de línea de tiempo
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      {statsRaw && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total eventos', value: (statsRaw as any).total ?? raw.length },
            { label: 'Hoy',           value: (statsRaw as any).today ?? 0 },
            { label: 'Esta semana',   value: (statsRaw as any).week ?? 0 },
            { label: 'Actores únicos',value: (statsRaw as any).unique_actors ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full" />
          </div>
          <select value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los módulos</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" title="Desde" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" title="Hasta" />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([day, events]) => (
          <div key={day}>
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{day}</span>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{events.length} evento{events.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {events.map(entry => {
                const type = getActionType(entry.action);
                const Icon = ACTION_ICON[type] ?? Info;
                const colorClass = ACTION_COLOR[type] ?? ACTION_COLOR.UPDATE;
                const isOpen = expanded === entry.id;
                const hasDiff = entry.before || entry.after;

                return (
                  <div key={entry.id}
                    className={`bg-white rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-blue-200 shadow-sm' : 'border-gray-100'}`}>
                    <div
                      onClick={() => hasDiff ? setExpanded(isOpen ? null : entry.id) : undefined}
                      className={`flex items-center gap-3 px-4 py-3 ${hasDiff ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${colorClass} flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Action */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 text-sm">{entry.action}</span>
                          {entry.module && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{entry.module}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                          {entry.actorEmail && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />{entry.actorEmail}
                            </span>
                          )}
                          {entry.ipAddress && <span>{entry.ipAddress}</span>}
                          {entry.targetType && (
                            <span className="font-mono">{entry.targetType}{entry.targetId ? ` #${entry.targetId.slice(0,8)}` : ''}</span>
                          )}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-xs text-gray-400 text-right flex-shrink-0">
                        {new Date(entry.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>

                      {hasDiff && (
                        isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                               : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Diff panel */}
                    {isOpen && hasDiff && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 bg-gray-50">
                        <DiffView before={entry.before ?? null} after={entry.after ?? null} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">← Anterior</button>
          <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40">Siguiente →</button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Sin eventos para los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
}
