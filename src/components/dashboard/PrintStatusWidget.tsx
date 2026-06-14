/**
 * PrintStatusWidget — Mini-widget de estado de impresoras para el Dashboard principal.
 * Muestra métricas en tiempo real (30s) y navega a /admin/printers al hacer clic.
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Printer, AlertTriangle, Wifi, WifiOff, Clock } from 'lucide-react';

interface PrintersHealthPublic {
  status:          'ok' | 'degraded';
  active_printers: number;
  agents_online:   number;
  agents_offline:  number;
  stale_jobs:      number;
  recent_failures: number;
  ts:              string;
}

function WidgetSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-28 bg-gray-200 rounded" />
        <div className="h-5 w-12 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function PrintStatusWidget() {
  const navigate = useNavigate();

  const { data: health, isLoading } = useQuery<PrintersHealthPublic>({
    queryKey: ['printers-health-public'],
    queryFn:  async () => {
      const res = await fetch('/api/health/printers');
      if (!res.ok) throw new Error('Error al cargar estado de impresoras');
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime:       15_000,
  });

  if (isLoading) return <WidgetSkeleton />;
  if (!health) return null;

  const hasAlerts = health.status !== 'ok' || health.recent_failures > 0;
  const allOk     = !hasAlerts;

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${
        hasAlerts
          ? 'border-orange-200 bg-orange-50 hover:border-orange-300'
          : 'border-gray-200 bg-white hover:border-blue-200'
      }`}
      onClick={() => navigate('/admin/printers')}
      role="button"
      aria-label="Ver estado de impresoras"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Printer className={`w-5 h-5 ${hasAlerts ? 'text-orange-500' : 'text-gray-500'}`} />
          <span className="font-semibold text-gray-800 text-sm">Impresoras</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          allOk
            ? 'bg-green-100 text-green-700'
            : 'bg-orange-100 text-orange-700'
        }`}>
          {allOk ? '✅ OK' : '⚠️ Atención'}
        </span>
      </div>

      {/* Métricas en cuadrícula 2x2 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5 bg-white/60 rounded-lg px-3 py-2">
          <span className="text-gray-400">Agentes online</span>
          <div className="flex items-center gap-1">
            <Wifi className={`w-3.5 h-3.5 ${health.agents_online > 0 ? 'text-green-500' : 'text-gray-300'}`} />
            <span className="font-bold text-gray-800">
              {health.agents_online}/{health.agents_online + health.agents_offline}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 bg-white/60 rounded-lg px-3 py-2">
          <span className="text-gray-400">Jobs pendientes</span>
          <div className="flex items-center gap-1">
            <Clock className={`w-3.5 h-3.5 ${health.stale_jobs > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
            <span className={`font-bold ${health.stale_jobs > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
              {health.stale_jobs}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 bg-white/60 rounded-lg px-3 py-2">
          <span className="text-gray-400">Impresoras activas</span>
          <span className="font-bold text-gray-800">{health.active_printers}</span>
        </div>

        <div className="flex flex-col gap-0.5 bg-white/60 rounded-lg px-3 py-2">
          <span className="text-gray-400">Fallos (1h)</span>
          <div className="flex items-center gap-1">
            {health.recent_failures > 0 && (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={`font-bold ${health.recent_failures > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {health.recent_failures}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de agentes offline si aplica */}
      {health.agents_offline > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-orange-700">
          <WifiOff className="w-3 h-3 flex-shrink-0" />
          {health.agents_offline} agente{health.agents_offline > 1 ? 's' : ''} offline
        </div>
      )}
    </div>
  );
}
