import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ChevronUp, ChevronDown, CheckCircle } from 'lucide-react';
import superadminService, { type AlertsResponse } from '@/services/superadmin/superadminService';
import toast from 'react-hot-toast';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

interface Alert {
  id:           string;
  type:         string;
  severity:     AlertSeverity;
  title:        string;
  message:      string;
  tenantId?:    string;
  tenantName?:  string;
  actionLabel?: string;
  actionUrl?:   string;
  createdAt:    string;
  data?:        Record<string, any>;
}

// ─── Estilos por severidad ────────────────────────────────────────────────────

const STYLES: Record<AlertSeverity, { bg: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-950/40',     border: 'border-red-600',    dot: 'bg-red-500'    },
  warning:  { bg: 'bg-yellow-950/40',  border: 'border-yellow-600', dot: 'bg-yellow-400' },
  info:     { bg: 'bg-blue-950/40',    border: 'border-blue-600',   dot: 'bg-blue-400'   },
  success:  { bg: 'bg-emerald-950/40', border: 'border-emerald-600',dot: 'bg-emerald-400'},
};

// ─── AlertCard ────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onAction,
  onRefresh,
}: {
  alert: Alert;
  onAction: (url: string) => void;
  onRefresh: () => void;
}) {
  const s = STYLES[alert.severity];
  const [busy, setBusy] = useState(false);

  const isTrialAlert = ['TRIAL_EXPIRED', 'TRIAL_EXPIRING_TODAY', 'TRIAL_EXPIRING_SOON'].includes(alert.type);
  const phone        = alert.data?.phone as string | undefined;
  const tenantName   = alert.tenantName ?? '';

  async function doExtend() {
    if (!alert.tenantId) return;
    setBusy(true);
    try {
      await superadminService.extendTrial(alert.tenantId, 7);
      toast.success(`Trial de ${tenantName} extendido 7 días`);
      onRefresh();
    } catch { toast.error('Error al extender trial'); }
    finally  { setBusy(false); }
  }

  async function doActivate() {
    if (!alert.tenantId) return;
    setBusy(true);
    try {
      await superadminService.activateTenant(alert.tenantId);
      toast.success(`${tenantName} activado`);
      onRefresh();
    } catch { toast.error('Error al activar'); }
    finally  { setBusy(false); }
  }

  async function doSuspend() {
    if (!alert.tenantId) return;
    setBusy(true);
    try {
      await superadminService.suspendTenant(alert.tenantId);
      toast.success(`${tenantName} suspendido`);
      onRefresh();
    } catch { toast.error('Error al suspender'); }
    finally  { setBusy(false); }
  }

  function openWhatsApp() {
    if (!phone) return;
    const msg = encodeURIComponent(`Hola ${tenantName}, tu prueba en BullWeb Chile ha vencido. ¿Deseas activar tu plan?`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }

  return (
    <div className={`${s.bg} border-l-4 ${s.border} rounded-r-lg px-4 py-3`}>
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{alert.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{alert.message}</p>

          {/* Botones de acción para trials */}
          {isTrialAlert && alert.tenantId ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                onClick={doExtend}
                disabled={busy}
                className="text-xs px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-700/50 transition-colors disabled:opacity-50"
              >
                +7 días
              </button>
              <button
                onClick={doActivate}
                disabled={busy}
                className="text-xs px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-700/50 transition-colors disabled:opacity-50"
              >
                Activar plan
              </button>
              <button
                onClick={openWhatsApp}
                disabled={!phone}
                title={phone ? `WhatsApp ${phone}` : 'Sin teléfono registrado'}
                className="text-xs px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                WhatsApp
              </button>
              <button
                onClick={doSuspend}
                disabled={busy}
                className="text-xs px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-700/50 transition-colors disabled:opacity-50"
              >
                Suspender
              </button>
            </div>
          ) : alert.actionLabel && alert.actionUrl ? (
            <button
              onClick={() => onAction(alert.actionUrl!)}
              className="mt-2 text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
            >
              {alert.actionLabel} →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── AlertsPanel ─────────────────────────────────────────────────────────────

interface AlertsPanelProps {
  compact?: boolean;
}

export function AlertsPanel({ compact = false }: AlertsPanelProps) {
  const navigate = useNavigate();
  const [data,      setData]      = useState<AlertsResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superadminService.getAlerts();
      setData(res);
      setLastRefresh(new Date());
    } catch {
      // silencio — no romper el dashboard si falla
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  function handleAction(url: string) {
    navigate(url);
  }

  const alerts       = data?.alerts   ?? [];
  const criticalCount = data?.critical ?? 0;

  if (loading && !data) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-800/50 transition-colors select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Alertas
          </h2>
          {criticalCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
              {criticalCount} crítica{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {alerts.length > 0 && criticalCount === 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
              {alerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); loadAlerts(); }}
            className="p-1 rounded text-gray-600 hover:text-gray-400 transition-colors"
            title="Refrescar alertas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-gray-600" />
            : <ChevronUp   className="w-4 h-4 text-gray-600" />
          }
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-gray-800">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-600">
              <CheckCircle className="w-8 h-8 mb-2 text-emerald-700" />
              <p className="text-sm">Sin alertas pendientes</p>
              {lastRefresh && (
                <p className="text-xs text-gray-700 mt-1">
                  Actualizado: {lastRefresh.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {/* Agrupar por severidad */}
              {(['critical', 'warning', 'info', 'success'] as AlertSeverity[]).map(sev => {
                const group = alerts.filter(a => a.severity === sev);
                if (group.length === 0) return null;
                return (
                  <div key={sev} className="px-4 py-3 space-y-2">
                    {group.map(alert => (
                      <AlertCard key={alert.id} alert={alert} onAction={handleAction} onRefresh={loadAlerts} />
                    ))}
                  </div>
                );
              })}
              {lastRefresh && (
                <div className="px-5 py-2 text-right">
                  <span className="text-xs text-gray-700">
                    Actualizado: {lastRefresh.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
