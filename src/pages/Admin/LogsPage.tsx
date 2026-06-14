import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
  Eye, X, AlertTriangle, Info, Zap, Clock
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { AuditLogRow, LogsFilter } from '@/services/adminService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SEVERITY_STYLES: Record<string, string> = {
  INFO:     'bg-blue-100 text-blue-800',
  WARNING:  'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  INFO:     <Info className="w-3 h-3" />,
  WARNING:  <AlertTriangle className="w-3 h-3" />,
  CRITICAL: <Zap className="w-3 h-3" />,
};

function SeverityBadge({ s }: { s: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLES[s] ?? 'bg-gray-100 text-gray-700'}`}>
      {SEVERITY_ICON[s]} {s}
    </span>
  );
}

function DetailModal({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Detalle del Registro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Field label="ID"       value={log.id} mono />
            <Field label="Fecha"    value={format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })} />
            <Field label="Actor"    value={log.actorEmail ?? '(sistema)'} />
            <Field label="Rol"      value={log.actorRole ?? '—'} />
            <Field label="Acción"   value={log.action} mono />
            <Field label="Módulo"   value={log.module} />
            <Field label="Severidad" value={<SeverityBadge s={log.severity} />} />
            <Field label="IP"       value={log.ipAddress ?? '—'} mono />
            {log.targetType && <Field label="Tipo Objetivo" value={log.targetType} />}
            {log.targetId   && <Field label="ID Objetivo"   value={log.targetId} mono />}
            {log.targetDesc && <Field label="Descripción"   value={log.targetDesc} span />}
          </div>
          {log.before != null && (
            <JsonBlock title="Estado anterior" data={log.before} />
          )}
          {log.after != null && (
            <JsonBlock title="Estado posterior" data={log.after} />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, span }: {
  label: string; value: React.ReactNode; mono?: boolean; span?: boolean
}) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-0.5 text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function JsonBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto text-gray-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function LogsPage() {
  const [filter, setFilter] = useState<LogsFilter>({ page: 1, limit: 50 });
  const [draft, setDraft]   = useState<Omit<LogsFilter, 'page' | 'limit'>>({});
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-logs', filter],
    queryFn:  () => adminService.getLogs(filter),
    placeholderData: (prev) => prev,
  });

  const { data: actions } = useQuery({
    queryKey: ['admin-logs-actions'],
    queryFn:  () => adminService.getLogActions(),
    staleTime: Infinity,
  });

  const applyFilter = useCallback(() => {
    setFilter({ ...draft, page: 1, limit: filter.limit });
  }, [draft, filter.limit]);

  const resetFilter = () => {
    setDraft({});
    setFilter({ page: 1, limit: 50 });
  };

  const changePage = (p: number) => setFilter(f => ({ ...f, page: p }));

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filter.actorEmail) params.set('actorEmail', filter.actorEmail);
    if (filter.action)     params.set('action',     filter.action);
    if (filter.module)     params.set('module',     filter.module);
    if (filter.severity)   params.set('severity',   filter.severity);
    if (filter.from)       params.set('from',       filter.from);
    if (filter.to)         params.set('to',         filter.to);
    if (filter.search)     params.set('search',     filter.search);
    const base = import.meta.env.VITE_API_URL ?? '';
    const token = localStorage.getItem('token') ?? '';
    // Create a download link with Authorization header via fetch
    fetch(`${base}/api/admin/logs/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.blob())
      .then(blob => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const page  = data?.page  ?? 1;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros de Auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial completo de acciones del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {/* Búsqueda libre */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar descripción..."
              value={draft.search ?? ''}
              onChange={e => setDraft(d => ({ ...d, search: e.target.value || undefined }))}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actor */}
          <input
            type="text"
            placeholder="Actor (email)"
            value={draft.actorEmail ?? ''}
            onChange={e => setDraft(d => ({ ...d, actorEmail: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Severity */}
          <select
            value={draft.severity ?? ''}
            onChange={e => setDraft(d => ({ ...d, severity: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Toda severidad</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          {/* Acción */}
          <select
            value={draft.action ?? ''}
            onChange={e => setDraft(d => ({ ...d, action: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Toda acción</option>
            {(actions ?? []).map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Desde */}
          <input
            type="date"
            value={draft.from ?? ''}
            onChange={e => setDraft(d => ({ ...d, from: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Hasta */}
          <input
            type="date"
            value={draft.to ?? ''}
            onChange={e => setDraft(d => ({ ...d, to: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Módulo */}
          <input
            type="text"
            placeholder="Módulo"
            value={draft.module ?? ''}
            onChange={e => setDraft(d => ({ ...d, module: e.target.value || undefined }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={applyFilter}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Aplicar filtros
          </button>
          <button
            onClick={resetFilter}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="font-medium text-gray-700">{total.toLocaleString('es-CL')} registros</span>
        <span>·</span>
        <span>Página {page} de {pages}</span>
        <span>·</span>
        <select
          value={filter.limit}
          onChange={e => setFilter(f => ({ ...f, limit: Number(e.target.value), page: 1 }))}
          className="text-sm border border-gray-200 rounded px-2 py-1"
        >
          {[25, 50, 100, 200].map(n => (
            <option key={n} value={n}>{n} por página</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  <Clock className="w-3 h-3 inline mr-1" />Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Módulo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Severidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No hay registros para los filtros seleccionados
                  </td>
                </tr>
              ) : (
                data.data.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                      {format(new Date(row.createdAt), "dd/MM/yy HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-xs truncate max-w-[140px]">
                        {row.actorEmail ?? <span className="text-gray-400 italic">sistema</span>}
                      </div>
                      {row.actorRole && (
                        <div className="text-xs text-gray-400">{row.actorRole}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{row.module}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge s={row.severity} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">
                      {row.targetDesc ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                      {row.ipAddress ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(row)}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                const p = pages <= 7 ? i + 1 : Math.max(1, page - 3) + i;
                if (p > pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => changePage(p)}
                    className={`w-8 h-8 text-sm rounded-lg ${p === page
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= pages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
