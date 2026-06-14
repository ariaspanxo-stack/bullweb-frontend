import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import superadminService from '@/services/superadmin/superadminService';

const ACTION_LABELS: Record<string, string> = {
  SUSPEND_TENANT:    '🔴 Suspensión',
  ACTIVATE_TENANT:   '🟢 Activación',
  CHANGE_PLAN:       '🔄 Cambio plan',
  IMPERSONATE:       '👤 Impersonación',
  EXTEND_TRIAL:      '⏳ Extender trial',
  CLEAN_DEMO:        '🧹 Limpieza demo',
  CREATE_PAYMENT:    '💳 Pago registrado',
  CREATE_TENANT:     '🏪 Nuevo cliente',
  UPDATE_PLAN_PRICE: '💲 Cambio precio plan',
};

const ACTION_STYLE: Record<string, string> = {
  SUSPEND_TENANT:    'bg-rose-900/50 text-rose-300',
  ACTIVATE_TENANT:   'bg-emerald-900/50 text-emerald-300',
  CHANGE_PLAN:       'bg-indigo-900/50 text-indigo-300',
  IMPERSONATE:       'bg-amber-900/50 text-amber-300',
  EXTEND_TRIAL:      'bg-sky-900/50 text-sky-300',
  CLEAN_DEMO:        'bg-gray-800 text-gray-400',
  CREATE_PAYMENT:    'bg-teal-900/50 text-teal-300',
  CREATE_TENANT:     'bg-cyan-900/50 text-cyan-300',
  UPDATE_PLAN_PRICE: 'bg-purple-900/50 text-purple-300',
};

export default function SuperAdminAudit() {
  const [page,       setPage]       = useState(1);
  const [actionFil,  setActionFil]  = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'audit', page, actionFil],
    queryFn:  () => superadminService.getAuditLogs({ page, limit: 50, action: actionFil || undefined }),
    refetchInterval: 30_000,
  });

  const logs:   any[] = (data as any)?.logs   ?? [];
  const total:  number = (data as any)?.total  ?? 0;
  const pages:  number = (data as any)?.pages  ?? 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
        <Shield className="w-6 h-6 text-indigo-400" />
        Auditor\u00eda SuperAdmin
      </h1>
      <p className="text-sm text-gray-500 mb-6">Registro de todas las acciones realizadas por el panel SuperAdmin</p>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={actionFil}
          onChange={e => { setActionFil(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-600 self-center">{total} registros</span>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-600">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No hay registros de auditor\u00eda a\u00fan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800 bg-gray-900/70">
                    <th className="px-4 py-3 font-medium text-xs uppercase">Fecha</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase">Acci\u00f3n</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase">SuperAdmin</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase">Tenant</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase">Detalles</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_STYLE[log.action] ?? 'bg-gray-800 text-gray-400'}`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300 font-mono">{log.superadmin_email}</td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {log.target_tenant_name ?? <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{log.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginaci\u00f3n */}
            {pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500">P\u00e1gina {page} de {pages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
