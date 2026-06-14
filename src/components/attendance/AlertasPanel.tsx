import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import { Bell, BellOff, AlertTriangle, Clock, CheckCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
const TIPO_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ausencia:    { label: 'Ausencia',    color: 'bg-red-50    border-red-100   text-red-700',    icon: AlertTriangle },
  tardanza:    { label: 'Tardanza',    color: 'bg-amber-50  border-amber-100 text-amber-700',  icon: Clock         },
  sin_salida:  { label: 'Sin salida',  color: 'bg-blue-50   border-blue-100  text-blue-700',   icon: Clock         },
};

function alertColor(tipo: string) {
  return TIPO_META[tipo]?.color ?? 'bg-gray-50 border-gray-100 text-gray-700';
}
function AlertIcon({ tipo }: { tipo: string }) {
  const Icon = TIPO_META[tipo]?.icon ?? Bell;
  return <Icon className="w-4 h-4 flex-shrink-0" />;
}

// ─── Badge para usar en nav ────────────────────────────────────────────────────
export function AlertasBadge() {
  const { data: alertas = [] } = useQuery({
    queryKey: ['attendance-alertas'],
    queryFn: () => attendanceService.getAlertas(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // refrescar cada 5 min
  });
  const count = alertas.length;
  if (!count) return null;
  return (
    <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
}

// ─── Panel completo ────────────────────────────────────────────────────────────
export function AlertasPanel() {
  const qc = useQueryClient();

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ['attendance-alertas'],
    queryFn: () => attendanceService.getAlertas(),
    staleTime: 30_000,
  });

  const marcarMut = useMutation({
    mutationFn: (id: string) => attendanceService.marcarAlertaLeida(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-alertas'] });
    },
    onError: () => toast.error('Error al marcar alerta'),
  });

  const marcarTodas = async () => {
    try {
      await attendanceService.marcarTodasLeidas();
      qc.invalidateQueries({ queryKey: ['attendance-alertas'] });
      toast.success('Todas las alertas marcadas como leídas');
    } catch {
      toast.error('Error al marcar las alertas');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando alertas…
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
          <BellOff className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">Sin alertas pendientes</p>
        <p className="text-xs text-gray-400">El equipo está al día con la asistencia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">Alertas de Asistencia</h3>
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {alertas.length} sin leer
          </span>
        </div>
        <button
          onClick={marcarTodas}
          disabled={marcarMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Marcar todas como leídas
        </button>
      </div>

      {/* Lista de alertas agrupadas por tipo */}
      <div className="space-y-2">
        {alertas.map((alerta: any) => (
          <div
            key={alerta.id}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${alertColor(alerta.tipo)}`}
          >
            <AlertIcon tipo={alerta.tipo} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold truncate">
                  {alerta.employee?.name ?? alerta.employeeName ?? 'Empleado desconocido'}
                </p>
                <span className="text-xs font-medium bg-white/60 px-1.5 py-0.5 rounded-full capitalize">
                  {TIPO_META[alerta.tipo]?.label ?? alerta.tipo}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-80">
                {alerta.message ?? buildMessage(alerta)}
              </p>
              {alerta.fecha && (
                <p className="text-xs mt-1 opacity-60 font-mono">
                  {new Date(alerta.fecha).toLocaleDateString('es-CL', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => marcarMut.mutate(alerta.id)}
              disabled={marcarMut.isPending}
              className="flex-shrink-0 p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors disabled:opacity-40"
              title="Marcar como leída"
            >
              {marcarMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Resumen por tipo */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        {Object.entries(TIPO_META).map(([tipo, meta]) => {
          const count = alertas.filter((a: any) => a.tipo === tipo).length;
          if (!count) return null;
          return (
            <div key={tipo} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${meta.color}`}>
              <meta.icon className="w-3 h-3" />
              {count} {meta.label.toLowerCase()}{count > 1 ? 's' : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function buildMessage(alerta: any): string {
  switch (alerta.tipo) {
    case 'ausencia':   return 'No registró asistencia en su turno';
    case 'tardanza':   return 'Llegó tarde a su turno';
    case 'sin_salida': return 'No registró salida al finalizar el turno';
    default:           return 'Alerta de asistencia';
  }
}
