import { useQuery } from '@tanstack/react-query';
import {
  HeartPulse, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  Database, Server, Cpu, Zap, Clock,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { ServiceStatus, HealthReport } from '@/services/adminService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

// ── helpers ───────────────────────────────────────────────────────────────────
function statusColor(s: 'ok' | 'degraded' | 'down' | 'healthy') {
  if (s === 'ok' || s === 'healthy') return 'text-green-600 bg-green-50 border-green-200';
  if (s === 'degraded') return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function StatusIcon({ s }: { s: string }) {
  if (s === 'ok' || s === 'healthy') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (s === 'degraded') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Service row ───────────────────────────────────────────────────────────────
function ServiceRow({ svc }: { svc: ServiceStatus }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${statusColor(svc.status)}`}>
      <StatusIcon s={svc.status} />
      <div className="flex-1">
        <p className="text-sm font-medium">{svc.name}</p>
        <p className="text-xs opacity-70">{svc.details}</p>
      </div>
      {svc.latencyMs !== null && (
        <span className="text-xs font-mono bg-white/60 px-2 py-0.5 rounded border">
          {svc.latencyMs}ms
        </span>
      )}
      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
        svc.status === 'ok' ? 'bg-green-100 text-green-700' :
        svc.status === 'degraded' ? 'bg-amber-100 text-amber-700' :
        'bg-red-100 text-red-700'}`}>
        {svc.status === 'ok' ? 'Operativo' : svc.status === 'degraded' ? 'Degradado' : 'Caído'}
      </span>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Health() {
  const qc = useQueryClient();

  const { data: report, isLoading, dataUpdatedAt } = useQuery<HealthReport>({
    queryKey:        ['admin', 'health'],
    queryFn:         () => adminService.getHealth(),
    refetchInterval: 30_000,
  });

  const overall = report?.overallStatus ?? 'healthy';

  const overallBadge =
    overall === 'healthy'  ? 'bg-green-100 text-green-700 border-green-200' :
    overall === 'degraded' ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-red-100 text-red-700 border-red-200';

  const overallLabel =
    overall === 'healthy'  ? '✓ Sistema operativo' :
    overall === 'degraded' ? '⚠ Sistema degradado' :
    '✗ Sistema caído';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HeartPulse className="w-6 h-6" /> Estado del sistema
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {dataUpdatedAt ? `Actualizado ${formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale: es })}` : 'Monitoreando en tiempo real'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && report && (
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${overallBadge}`}>
              {overallLabel}
            </span>
          )}
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'health'] })}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      )}

      {report && (
        <>
          {/* Services */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                <Server className="w-4 h-4" /> Servicios
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {report.services.map(svc => (
                <ServiceRow key={svc.name} svc={svc} />
              ))}
            </div>
          </div>

          {/* System metrics */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Métricas del proceso
              </h2>
            </div>
            <div className="p-5 space-y-5">
              {/* Memory bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Memoria del sistema</span>
                  <span className="font-medium">{report.system.memoryUsedMB} MB / {report.system.memoryTotalMB} MB ({report.system.memoryPct}%)</span>
                </div>
                <ProgressBar
                  pct={report.system.memoryPct}
                  color={report.system.memoryPct > 85 ? 'bg-red-500' : report.system.memoryPct > 65 ? 'bg-amber-500' : 'bg-green-500'}
                />
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricCard
                  label="Uptime"
                  value={formatUptime(report.system.uptimeSeconds)}
                  icon={Clock}
                  color="bg-blue-500"
                />
                <MetricCard
                  label="CPUs"
                  value={String(report.system.cpuCount)}
                  sub="núcleos disponibles"
                  icon={Cpu}
                  color="bg-indigo-500"
                />
                <MetricCard
                  label="Node.js"
                  value={report.system.nodeVersion}
                  sub={report.system.platform}
                  icon={Zap}
                  color="bg-green-600"
                />
                <MetricCard
                  label="PID"
                  value={String(report.system.pid)}
                  sub={report.system.restartCount !== null ? `${report.system.restartCount} reinicios PM2` : 'proceso activo'}
                  icon={Server}
                  color="bg-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Error rates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`bg-white border rounded-xl p-5 ${report.recentErrors.last1h > 0 ? 'border-red-200' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`w-4 h-4 ${report.recentErrors.last1h > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-500">Errores críticos (última hora)</span>
              </div>
              <p className={`text-3xl font-bold ${report.recentErrors.last1h > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {report.recentErrors.last1h}
              </p>
            </div>
            <div className={`bg-white border rounded-xl p-5 ${report.recentErrors.last24h > 10 ? 'border-amber-200' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`w-4 h-4 ${report.recentErrors.last24h > 10 ? 'text-amber-500' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-500">Errores críticos (24h)</span>
              </div>
              <p className={`text-3xl font-bold ${report.recentErrors.last24h > 10 ? 'text-amber-600' : 'text-gray-800'}`}>
                {report.recentErrors.last24h}
              </p>
            </div>
            <div className={`bg-white border rounded-xl p-5 ${report.activeAlerts > 0 ? 'border-red-200' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <Database className={`w-4 h-4 ${report.activeAlerts > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-500">Alertas críticas activas</span>
              </div>
              <p className={`text-3xl font-bold ${report.activeAlerts > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {report.activeAlerts}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
