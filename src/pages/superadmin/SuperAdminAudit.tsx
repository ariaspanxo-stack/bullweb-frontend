import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import superadminService from '@/services/superadmin/superadminService';
import { StatusBadge } from '@/components/ui/superadmin/statusBadge';
import { PageHeader } from '@/components/ui/superadmin/pageHeader';
import { Table, Thead, Tr, Th, Td } from '@/components/ui/superadmin/table';
import { EmptyState } from '@/components/ui/superadmin/emptyState';
import { Button } from '@/components/ui/superadmin/button';

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
      <PageHeader
        icon={Shield}
        title="Auditoría SuperAdmin"
        sub="Registro de todas las acciones realizadas por el panel SuperAdmin"
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={actionFil}
          onChange={e => { setActionFil(e.target.value); setPage(1); }}
          className="bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-600 self-center tabular-nums">{total} registros</span>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900/60 border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Shield} title="No hay registros de auditoría aún" />
        ) : (
          <>
            <Table>
              <Thead>
                <Tr>
                  <Th>Fecha</Th>
                  <Th>Acción</Th>
                  <Th>SuperAdmin</Th>
                  <Th>Tenant</Th>
                  <Th>Detalles</Th>
                  <Th>IP</Th>
                </Tr>
              </Thead>
              <tbody>
                {logs.map((log: any) => (
                  <Tr key={log.id}>
                    <Td className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-CL')}
                    </Td>
                    <Td>
                      <StatusBadge status={log.action} kind="audit" />
                    </Td>
                    <Td className="text-xs text-gray-300 font-mono">{log.superadmin_email}</Td>
                    <Td className="text-xs text-gray-300">
                      {log.target_tenant_name ?? <span className="text-gray-600">—</span>}
                    </Td>
                    <Td className="text-xs text-gray-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </Td>
                    <Td className="text-xs text-gray-600 font-mono">{log.ip ?? '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            {/* Paginación */}
            {pages > 1 && (
              <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-500 tabular-nums">Página {page} de {pages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
