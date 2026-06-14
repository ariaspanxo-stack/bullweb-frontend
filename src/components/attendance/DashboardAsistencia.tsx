import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import api from '@/services/api';
import {
  Users, Clock, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, LogIn, LogOut, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardAsistenciaProps {
  employees: { id: string; name: string; shift?: string }[];
}

const SHIFT_LABEL: Record<string, string> = {
  morning:   'Mañana',
  afternoon: 'Tarde',
  night:     'Noche',
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${color}`}>
      <div className="p-2 rounded-lg bg-white/60">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function DashboardAsistencia({ employees }: DashboardAsistenciaProps) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today-dashboard'],
    queryFn: () => api.get('/attendance/today').then((r: any) => r.data.data ?? r.data),
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });

  const { data: alertasData = [] } = useQuery({
    queryKey: ['attendance-alertas'],
    queryFn: () => attendanceService.getAlertas(),
    staleTime: 60_000,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['attendance-summary-dashboard', today],
    queryFn: () =>
      api.get('/attendance/summary', { params: { dateFrom: today, dateTo: today } })
         .then((r: any) => r.data.data ?? r.data),
    staleTime: 60_000,
  });

  // Derivar métricas de hoy
  // todayData = { fecha, resumen: { presentes, enColacion, salieron, tardanzas, ausentes, total }, empleados: [...] }
  const todayEmpleados: any[] = Array.isArray(todayData?.empleados)
    ? todayData.empleados
    : [];
  const summary: any[] = Array.isArray(summaryData?.summary)
    ? summaryData.summary
    : Array.isArray(summaryData)
      ? summaryData
      : [];

  const presentesHoy = todayData?.resumen?.presentes
    ?? new Set(todayEmpleados.filter((e: any) => e.firstEntry).map((e: any) => e.employeeId)).size;

  const conSalida = todayData?.resumen?.salieron
    ?? new Set(todayEmpleados.filter((e: any) => e.lastExit).map((e: any) => e.employeeId)).size;

  const ausentes = todayData?.resumen?.ausentes ?? Math.max(0, employees.length - presentesHoy);
  const alertas  = alertasData.length;

  // Calcular promedio de horas trabajadas hoy (usar netMinutes de empleados, fallback a summary)
  let totalMinutos = 0;
  let conHoras     = 0;
  const fuenteHoras: any[] = todayEmpleados.length > 0 ? todayEmpleados : summary;
  fuenteHoras.forEach((s: any) => {
    const mins = s.netMinutes
      ?? (s.firstEntry && s.lastExit
        ? Math.floor((new Date(s.lastExit).getTime() - new Date(s.firstEntry).getTime()) / 60_000)
        : 0);
    if (mins > 0) { totalMinutos += mins; conHoras++; }
  });
  const promedioHoras =
    conHoras > 0
      ? `${Math.floor(totalMinutos / conHoras / 60)}h ${(Math.floor(totalMinutos / conHoras) % 60).toString().padStart(2, '0')}m`
      : '—';

  // Distribución por turno
  const turnosMap: Record<string, number> = {};
  employees.forEach((e) => {
    const t = e.shift ?? 'sin turno';
    turnosMap[t] = (turnosMap[t] ?? 0) + 1;
  });

  // Últimos movimientos: expandir empleados en eventos individuales (entrada/salida)
  const rawMovimientos: any[] = [];
  todayEmpleados.forEach((e: any) => {
    if (e.firstEntry) rawMovimientos.push({ type: 'ENTRY', employeeName: e.employeeName, timestamp: e.firstEntry });
    if (e.lastExit)   rawMovimientos.push({ type: 'EXIT',  employeeName: e.employeeName, timestamp: e.lastExit  });
  });
  const ultimosMovimientos = rawMovimientos
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  if (todayLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Stats del día ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Resumen de hoy — {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total empleados"
            value={employees.length}
            color="bg-white border-gray-200"
            icon={Users}
          />
          <StatCard
            label="Presentes hoy"
            value={presentesHoy}
            sub={`${employees.length > 0 ? Math.round((presentesHoy / employees.length) * 100) : 0}% del equipo`}
            color="bg-green-50 border-green-100"
            icon={CheckCircle}
          />
          <StatCard
            label="Ausentes hoy"
            value={ausentes}
            color={ausentes > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-200'}
            icon={XCircle}
          />
          <StatCard
            label="Alertas activas"
            value={alertas}
            color={alertas > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-200'}
            icon={AlertTriangle}
          />
        </div>
      </div>

      {/* ── Segunda fila ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Con salida registrada"
          value={conSalida}
          color="bg-white border-gray-200"
          icon={LogOut}
        />
        <StatCard
          label="Aún en local"
          value={Math.max(0, presentesHoy - conSalida)}
          color="bg-indigo-50 border-indigo-100"
          icon={LogIn}
        />
        <StatCard
          label="Promedio horas hoy"
          value={promedioHoras}
          color="bg-white border-gray-200"
          icon={TrendingUp}
        />
      </div>

      {/* ── Distribución por turno + Últimos movimientos ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Turnos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" /> Distribución por turno
          </h3>
          {Object.keys(turnosMap).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin datos de turnos</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(turnosMap).map(([turno, count]) => {
                const pct = employees.length > 0 ? Math.round((count / employees.length) * 100) : 0;
                return (
                  <div key={turno}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{SHIFT_LABEL[turno] ?? turno}</span>
                      <span className="font-medium text-gray-900">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos movimientos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" /> Últimos movimientos hoy
          </h3>
          {ultimosMovimientos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin movimientos hoy</p>
          ) : (
            <div className="space-y-2">
              {ultimosMovimientos.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {r.type === 'ENTRY'
                      ? <LogIn  className="h-4 w-4 text-green-500 flex-shrink-0" />
                      : <LogOut className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                    <span className="text-gray-700 truncate max-w-[140px]">
                      {r.employeeName ?? 'Empleado'}
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {r.timestamp
                      ? new Date(r.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
