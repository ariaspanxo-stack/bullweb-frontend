import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellRing, CheckCheck, Trash2, RefreshCw,
  AlertTriangle, Info, XCircle,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { AdminAlert, AlertSeverity } from '@/services/adminService';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── helpers ───────────────────────────────────────────────────────────────────
const severityConfig: Record<AlertSeverity, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  CRITICAL: { label: 'Crítico',   bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle },
  WARNING:  { label: 'Advertencia', bg: 'bg-amber-100', text: 'text-amber-700',  icon: AlertTriangle },
  INFO:     { label: 'Info',      bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Info },
};

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const cfg = severityConfig[severity];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Alerts() {
  const qc = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | ''>('');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['admin', 'alerts', showResolved, filterSeverity],
    queryFn:  () => adminService.listAlerts({
      resolved:  showResolved,
      severity:  filterSeverity || undefined,
    }),
    refetchInterval: 30_000,
  });

  const { data: countData } = useQuery({
    queryKey: ['admin', 'alertCount'],
    queryFn:  () => adminService.getAlertCount(),
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    qc.invalidateQueries({ queryKey: ['admin', 'alertCount'] });
  };

  const resolveOne = useMutation({
    mutationFn: (id: string) => adminService.resolveAlert(id),
    onSuccess:  () => { toast.success('Alerta resuelta'); invalidate(); },
    onError:    () => toast.error('Error al resolver'),
  });

  const resolveAllMut = useMutation({
    mutationFn: () => adminService.resolveAllAlerts(),
    onSuccess:  () => { toast.success('Todas las alertas resueltas'); invalidate(); },
    onError:    () => toast.error('Error'),
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => adminService.deleteAlert(id),
    onSuccess:  () => { toast.success('Alerta eliminada'); invalidate(); },
    onError:    () => toast.error('Error al eliminar'),
  });

  const pendingAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BellRing className="w-6 h-6" /> Alertas del sistema
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {countData ? (
              <>
                <span className="text-red-600 font-semibold">{countData.critical}</span> críticas ·{' '}
                <span className="font-semibold">{countData.total}</span> pendientes en total
              </>
            ) : 'Monitoreo de eventos críticos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => invalidate()}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {pendingAlerts.length > 0 && (
            <button
              onClick={() => resolveAllMut.mutate()}
              disabled={resolveAllMut.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCheck className="w-4 h-4" /> Resolver todas
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={e => setShowResolved(e.target.checked)}
            className="rounded border-gray-300"
          />
          Mostrar resueltas
        </label>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value as AlertSeverity | '')}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">Todas las severidades</option>
          <option value="CRITICAL">Crítico</option>
          <option value="WARNING">Advertencia</option>
          <option value="INFO">Info</option>
        </select>
        <span className="text-sm text-gray-400">{alerts.length} alertas</span>
      </div>

      {/* List */}
      {isLoading && <p className="text-center text-gray-400 py-10">Cargando…</p>}
      {!isLoading && alerts.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <BellRing className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay alertas {showResolved ? '' : 'pendientes'}</p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert: AdminAlert) => {
          const cfg = severityConfig[alert.severity];
          const Icon = cfg.icon;
          return (
            <div
              key={alert.id}
              className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${alert.resolved ? 'opacity-60' : ''}`}
            >
              <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${cfg.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{alert.type}</span>
                  {alert.resolved && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Resuelta</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-800">{alert.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDistanceToNow(parseISO(alert.createdAt), { addSuffix: true, locale: es })}
                  {alert.resolvedBy && ` · Resuelta por ${alert.resolvedBy}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!alert.resolved && (
                  <button
                    onClick={() => resolveOne.mutate(alert.id)}
                    disabled={resolveOne.isPending}
                    className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                  >
                    Resolver
                  </button>
                )}
                <button
                  onClick={() => deleteOne.mutate(alert.id)}
                  disabled={deleteOne.isPending}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
