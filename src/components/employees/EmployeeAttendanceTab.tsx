import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Clock, LogIn, LogOut } from 'lucide-react';
import api from '@/services/api';

interface Props {
  employeeId: string;
}

const fmt = (dt: string) =>
  new Date(dt).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'short',
  });

const fmtTime = (dt: string) =>
  new Date(dt).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

export function EmployeeAttendanceTab({ employeeId }: Props) {
  const dateFrom = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const dateTo = new Date().toISOString().slice(0, 10);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee-attendance', employeeId, dateFrom, dateTo],
    queryFn: () =>
      api.get('/attendance/records', {
        params: { employeeId, dateFrom, dateTo, perPage: 30 },
      }).then(r => r.data),
    staleTime: 60_000,
  });

  const records: any[] = data?.records ?? [];
  const total: number  = data?.meta?.total ?? 0;

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <AlertCircle className="w-8 h-8 text-red-300" />
      <p className="text-sm text-gray-400">Error al cargar la asistencia</p>
    </div>
  );

  if (records.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <Clock className="w-8 h-8 text-gray-200" />
      <p className="text-sm text-gray-400">Sin registros en los últimos 30 días</p>
    </div>
  );

  const entries = records.filter(r => r.type === 'ENTRY').length;
  const exits   = records.filter(r => r.type === 'EXIT').length;

  return (
    <div className="space-y-3">
      {/* Resumen rápido */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-green-600">{entries}</p>
          <p className="text-xs text-gray-400 mt-0.5">Entradas (30d)</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-blue-600">{exits}</p>
          <p className="text-xs text-gray-400 mt-0.5">Salidas (30d)</p>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="space-y-1.5">
        {records.map((record: any) => (
          <div key={record.id}
            className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${
              record.type === 'ENTRY'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {record.type === 'ENTRY'
                ? <LogIn className="w-3 h-3" />
                : <LogOut className="w-3 h-3" />}
              {record.type === 'ENTRY' ? 'Entrada' : 'Salida'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 capitalize">
                {fmt(record.timestamp)}
              </p>
              <p className="text-xs font-mono text-gray-400">
                {fmtTime(record.timestamp)}
              </p>
            </div>
            <span className="text-xs text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-lg flex-shrink-0">
              {record.method ?? 'QR'}
            </span>
          </div>
        ))}
      </div>

      {total > 30 && (
        <p className="text-xs text-center text-gray-400 pt-2">
          Mostrando los últimos 30 de {total} registros. Ver todos en la pestaña Asistencia.
        </p>
      )}
    </div>
  );
}
