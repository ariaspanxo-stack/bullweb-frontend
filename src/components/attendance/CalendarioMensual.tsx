import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import { ChevronLeft, ChevronRight, Loader2, User, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalendarioMensualProps {
  employees: { id: string; name: string }[];
}

type EstadoDia =
  | 'presente'
  | 'ausente'
  | 'tardanza'
  | 'justificado'
  | 'libre'
  | 'futuro'
  | null;

const ESTADO_STYLE: Record<string, string> = {
  presente:   'bg-green-100  text-green-700  border-green-200',
  ausente:    'bg-red-100    text-red-700    border-red-200',
  tardanza:   'bg-amber-100  text-amber-700  border-amber-200',
  justificado:'bg-blue-100   text-blue-700   border-blue-200',
  libre:      'bg-gray-50    text-gray-400   border-gray-100',
  futuro:     'bg-white      text-gray-200   border-gray-100',
};

const ESTADO_LABEL: Record<string, string> = {
  presente:   'P',
  ausente:    'A',
  tardanza:   'T',
  justificado:'J',
  libre:      '—',
  futuro:     '',
};

const ESTADO_FULL: Record<string, string> = {
  presente:   'Presente',
  ausente:    'Ausente',
  tardanza:   'Tardanza',
  justificado:'Justificado',
  libre:      'Día libre',
  futuro:     'Sin datos',
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Component ────────────────────────────────────────────────────────────────
export function CalendarioMensual({ employees }: CalendarioMensualProps) {
  const now = new Date();
  const [view, setView] = useState<'individual' | 'equipo'>('individual');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1–12

  const { data: calendario, isLoading } = useQuery({
    queryKey: ['calendario', selectedEmp, year, month],
    queryFn: () => attendanceService.getCalendario(selectedEmp, year, month),
    enabled: !!selectedEmp && view === 'individual',
    staleTime: 60_000,
  });

  const { data: equipoData = [], isLoading: isLoadingEquipo } = useQuery({
    queryKey: ['calendario-equipo', year, month],
    queryFn: () => attendanceService.getCalendarioEquipo(year, month),
    enabled: view === 'equipo',
    staleTime: 60_000,
  });

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else              setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else               setMonth(m => m + 1);
  };

  // Build calendar grid (6 weeks × 7 days with Mon=0)
  const buildGrid = () => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    // Lunes=0 … Domingo=6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells: { day: number | null; estado: EstadoDia; data: any }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ day: null, estado: null, data: null });
    for (let d = 1; d <= daysInMonth; d++) {
      // Comparar como strings para evitar problemas de timezone (new Date('YYYY-MM-DD') es UTC)
      const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = calendario?.dias?.find((x: any) => {
        const f = String(x.fecha ?? x.date ?? '').slice(0, 10);
        return f === targetDate;
      });
      cells.push({ day: d, estado: (dayData?.estado as EstadoDia) ?? null, data: dayData });
    }
    // Pad to multiple of 7
    while (cells.length % 7 !== 0) cells.push({ day: null, estado: null, data: null });
    return cells;
  };

  const grid = buildGrid();

  // Stats from calendar data — normalizar horasTrabajadas (backend devuelve totalHoras en horas)
  const resumenRaw = calendario?.resumen ?? calendario?.stats ?? {};
  const stats: Record<string, any> = {
    ...resumenRaw,
    horasTrabajadas: resumenRaw.horasTrabajadas
      ?? (resumenRaw.totalHoras != null ? Math.round(resumenRaw.totalHoras * 60) : undefined),
  };

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">Calendario Mensual</h3>
          {/* Toggle Individual / Equipo */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setView('individual')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                view === 'individual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Individual
            </button>
            <button
              onClick={() => setView('equipo')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                view === 'equipo' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Equipo
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector empleado (solo vista individual) */}
          {view === 'individual' && (
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={selectedEmp}
                onChange={e => setSelectedEmp(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
              >
                <option value="">Seleccionar empleado…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}
          {/* Navegación mes */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800 px-2 min-w-[130px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Vista EQUIPO ─────────────────────────────────────────────────────── */}
      {view === 'equipo' && (
        isLoadingEquipo ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando equipo…
          </div>
        ) : equipoData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">No hay empleados activos para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 min-w-[140px] z-10">
                    Empleado
                  </th>
                  {Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1).map(d => (
                    <th key={d} className={`px-1.5 py-2 text-center font-medium w-7 ${
                      d === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()
                        ? 'text-indigo-600 font-bold' : 'text-gray-500'
                    }`}>
                      {d}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">P</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">A</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">T</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(equipoData as any[]).map((emp: any) => {
                  const daysInMonth = new Date(year, month, 0).getDate();
                  return (
                    <tr key={emp.empleado?.id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white hover:bg-gray-50 px-3 py-1.5 font-medium text-gray-700 truncate max-w-[140px] z-10">
                        {emp.empleado?.name ?? '—'}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                        const fecha = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dia = emp.dias?.find((x: any) => x.fecha === fecha);
                        const estado = dia?.estado ?? (new Date(year, month - 1, d) > now ? 'futuro' : 'libre');
                        const dot: Record<string, string> = {
                          presente:    'bg-green-400',
                          tardanza:    'bg-amber-400',
                          ausente:     'bg-red-400',
                          justificado: 'bg-blue-400',
                          libre:       'bg-gray-200',
                          futuro:      '',
                        };
                        return (
                          <td key={d} className="px-1 py-1.5 text-center" title={`${emp.empleado?.name} — ${fecha} — ${ESTADO_FULL[estado] ?? estado}`}>
                            {dot[estado] ? (
                              <span className={`inline-block w-2 h-2 rounded-full ${dot[estado]}`} />
                            ) : null}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-center font-bold text-green-700">{emp.resumen?.presentes ?? 0}</td>
                      <td className="px-3 py-1.5 text-center font-bold text-red-600">{emp.resumen?.ausentes ?? 0}</td>
                      <td className="px-3 py-1.5 text-center font-bold text-amber-600">{emp.resumen?.tardanzas ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Vista INDIVIDUAL ─────────────────────────────────────────────────── */}
      {view === 'individual' && (
        !selectedEmp ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <User className="w-10 h-10 opacity-30" />
            <p className="text-sm">Selecciona un empleado para ver su calendario</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando calendario…
          </div>
        ) : (
          <>
            {/* Stats del mes */}
            {Object.keys(stats).length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { key: 'presentes',    label: 'Presentes',    cls: 'bg-green-50  text-green-700'  },
                { key: 'tardanzas',    label: 'Tardanzas',    cls: 'bg-amber-50  text-amber-700'  },
                { key: 'ausentes',     label: 'Ausentes',     cls: 'bg-red-50    text-red-700'    },
                { key: 'justificados', label: 'Justificados', cls: 'bg-blue-50   text-blue-700'   },
                { key: 'horasTrabajadas', label: 'Horas netas', cls: 'bg-indigo-50 text-indigo-700' },
              ].map(({ key, label, cls }) => (
                stats[key] != null && (
                  <div key={key} className={`rounded-xl p-3 text-center ${cls}`}>
                    <p className="text-lg font-bold">
                      {key === 'horasTrabajadas'
                        ? `${Math.floor(stats[key] / 60)}h ${stats[key] % 60}m`
                        : stats[key]}
                    </p>
                    <p className="text-xs mt-0.5 font-medium opacity-80">{label}</p>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Grid calendario */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Cabecera días */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>
            {/* Semanas */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
              {grid.map((cell, i) => {
                if (!cell.day) {
                  return <div key={i} className="aspect-square bg-gray-50/50" />;
                }
                const isToday =
                  cell.day === now.getDate() &&
                  month    === now.getMonth() + 1 &&
                  year     === now.getFullYear();
                const estado = cell.estado ?? (
                  new Date(year, month - 1, cell.day) > now ? 'futuro' : 'libre'
                );
                const styleCls = ESTADO_STYLE[estado] ?? 'bg-white text-gray-400 border-transparent';

                return (
                  <div
                    key={i}
                    className="aspect-square flex flex-col items-center justify-center gap-0.5 relative group cursor-default"
                    title={`${cell.day}/${month} — ${ESTADO_FULL[estado] ?? estado}`}
                  >
                    {/* Número del día */}
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-semibold ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700'
                    }`}>
                      {cell.day}
                    </span>
                    {/* Badge estado */}
                    {estado !== 'futuro' && (
                      <span className={`text-[9px] font-bold px-1 rounded border leading-tight ${styleCls}`}>
                        {ESTADO_LABEL[estado]}
                      </span>
                    )}
                    {/* Tooltip con hora entrada si existe */}
                    {cell.data?.firstEntry && (
                      <span className="text-[9px] text-gray-400 font-mono">
                        {new Date(cell.data.firstEntry).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(ESTADO_FULL)
              .filter(([k]) => k !== 'futuro')
              .map(([k, label]) => (
                <span key={k} className={`flex items-center gap-1 px-2 py-1 rounded-full border ${ESTADO_STYLE[k]}`}>
                  <span className="font-bold">{ESTADO_LABEL[k]}</span>
                  {label}
                </span>
              ))}
          </div>
          </>
        )
      )}
    </div>
  );
}
