/**
 * BULLWEB ENTERPRISE — Audit Log Panel
 * Panel de auditoría con filtros avanzados, difftable before/after y exportación CSV.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, AlertTriangle, AlertCircle, Info,
  ChevronRight, Calendar, FileDown
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { AuditLog, AuditSeverity } from '@/services/adminService';
import { exportSheet, fmtDateTime } from '@/utils/exportExcel';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Severity Badge
// ---------------------------------------------------------------------------
const SeverityBadge = ({ severity }: { severity: AuditSeverity }) => {
  const map = {
    INFO:     { icon: Info,          cls: 'bg-blue-50   text-blue-700   border-blue-200'  },
    WARNING:  { icon: AlertTriangle, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    CRITICAL: { icon: AlertCircle,   cls: 'bg-red-50    text-red-700    border-red-200'   },
  };
  const { icon: Icon, cls } = map[severity] ?? map.INFO;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <Icon size={10} />
      {severity}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Log Row con expansión before/after
// ---------------------------------------------------------------------------
const LogRow = ({ log }: { log: AuditLog & { before?: any; after?: any } }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = log.before || log.after;

  return (
    <>
      <tr
        className={`border-b hover:bg-gray-50 transition-colors ${hasDiff ? 'cursor-pointer' : ''}`}
        onClick={() => hasDiff && setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
          {new Date(log.createdAt).toLocaleString('es-CL')}
        </td>
        <td className="px-4 py-3">
          <SeverityBadge severity={log.severity} />
        </td>
        <td className="px-4 py-3">
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{log.action}</code>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">
          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-xs">{log.module}</span>
        </td>
        <td className="px-4 py-3 text-sm">
          <div>
            <p className="text-gray-800 font-medium">{log.actor?.name ?? 'Sistema'}</p>
            <p className="text-gray-400 text-xs">{log.actorEmail ?? ''}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {log.branch?.name ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={log.targetDesc ?? ''}>
          {log.targetDesc ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
          {log.ipAddress ?? '—'}
        </td>
        <td className="px-4 py-3 w-8">
          {hasDiff && (
            <ChevronRight
              size={14}
              className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          )}
        </td>
      </tr>

      {/* Fila expandida con diff before/after */}
      {expanded && hasDiff && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={9} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              {log.before && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">ANTES</p>
                  <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto max-h-40 text-gray-700">
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.after && (
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-1">DESPUÉS</p>
                  <pre className="text-xs bg-green-50 border border-green-100 rounded-lg p-3 overflow-auto max-h-40 text-gray-700">
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------
export const AuditLogPanel = () => {
  const [filters, setFilters] = useState({
    search:   '',
    module:   '',
    severity: '' as AuditSeverity | '',
    dateFrom: '',
    dateTo:   '',
    page:     1,
  });
  const setF = (k: string, v: string) =>
    setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn:  () => adminService.listAuditLogs({
      search:   filters.search   || undefined,
      module:   filters.module   || undefined,
      severity: (filters.severity || undefined) as AuditSeverity | undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo:   filters.dateTo   || undefined,
      page:     filters.page,
      limit:    50,
    }),
    staleTime: 15000,
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  const handleExport = () => {
    exportSheet(
      logs.map((l: AuditLog) => ({
        'Fecha/Hora':  fmtDateTime(l.createdAt),
        'Severidad':   l.severity,
        'Acción':      l.action,
        'Módulo':      l.module,
        'Actor':       l.actor?.name ?? 'Sistema',
        'Email actor': l.actorEmail ?? '',
        'Sucursal':    l.branch?.name ?? '',
        'Descripción': l.targetDesc ?? '',
        'IP':          l.ipAddress ?? '',
      })),
      `auditoria_${new Date().toISOString().slice(0,10)}`,
      'Auditoría',
    );
    toast.success(`${logs.length} registros exportados a Excel`);
  };

  const MODULES_LIST = ['users','roles','orders','devices','branches','auth','config','campanas','clientes'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Registro completo de todas las acciones con historial before/after
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <FileDown size={14} /> Exportar Excel
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por acción, email o descripción..."
              value={filters.search}
              onChange={(e) => setF('search', e.target.value)}
            />
          </div>

          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.module}
            onChange={(e) => setF('module', e.target.value)}
          >
            <option value="">Todos los módulos</option>
            {MODULES_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.severity}
            onChange={(e) => setF('severity', e.target.value)}
          >
            <option value="">Todas las severidades</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.dateFrom}
              onChange={(e) => setF('dateFrom', e.target.value)}
            />
            <span className="text-gray-400 text-sm">a</span>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.dateTo}
              onChange={(e) => setF('dateTo', e.target.value)}
            />
          </div>

          {(filters.search || filters.module || filters.severity || filters.dateFrom) && (
            <button
              className="text-sm text-blue-600 hover:text-blue-700"
              onClick={() => setFilters({ search:'', module:'', severity:'', dateFrom:'', dateTo:'', page: 1 })}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats rápidas */}
      {meta && (
        <div className="mb-4 text-sm text-gray-500">
          Mostrando <strong>{logs.length}</strong> de <strong>{meta.total}</strong> registros
          {filters.severity === 'CRITICAL' && (
            <span className="ml-2 text-red-600 font-medium">⚠️ Solo eventos críticos</span>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Fecha</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Severidad</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Acción</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Módulo</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Actor</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Sucursal</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Descripción</th>
              <th className="px-4 py-3 font-semibold text-gray-700">IP</th>
              <th className="w-8 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="animate-pulse h-4 bg-gray-100 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No hay registros de auditoría para estos filtros
                </td>
              </tr>
            ) : (
              logs.map((log) => <LogRow key={log.id} log={log as any} />)
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && meta.pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>Página {meta.page} de {meta.pages}</span>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                disabled={meta.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >← Anterior</button>
              <button
                className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                disabled={meta.page >= meta.pages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPanel;
