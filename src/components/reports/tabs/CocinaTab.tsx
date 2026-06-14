import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { reportsService } from '@/services/reportsService';
import { useReports, CHART_COLORS, tooltipStyleBase } from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { AlertTriangle, ChefHat, Package, Clock } from 'lucide-react';

export function CocinaTab() {
  const { dateFrom, dateTo } = useReports();

  const { data: kitchenData, isLoading: kitchenLoading } = useQuery({
    queryKey: ['rpt-kitchen', dateFrom, dateTo],
    queryFn: () => reportsService.getKitchenReport({ dateFrom, dateTo }).then((r: any) => r.stations ?? []),
    staleTime: 0,
  });

  const stationsRaw: any[] = (kitchenData as any[]) ?? [];
  const allNull  = stationsRaw.length > 0 && stationsRaw.every((s: any) => s.avgTime === null || s.avgTime === undefined);
  const someNull = stationsRaw.some((s: any) => s.avgTime === null || s.avgTime === undefined)
                && stationsRaw.some((s: any) => s.avgTime !== null && s.avgTime !== undefined);

  return (
    <div className="space-y-5">
      {allNull && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">Tiempos en calibración. </span>
            Los tiempos reales se calcularán automáticamente a medida que los cocineros marquen ítems como listos en el KDS.
          </p>
        </div>
      )}
      {someNull && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Algunas estaciones aún no tienen datos suficientes para calcular el tiempo promedio.
          </p>
        </div>
      )}

      {kitchenLoading ? <Spinner /> :
       stationsRaw.length === 0 ? <EmptyState message="Sin datos de cocina en este período" /> : (
        (() => {
          const stations = [...stationsRaw].sort((a, b) => (b.items ?? 0) - (a.items ?? 0));
          const totalItems = stations.reduce((s, st) => s + (st.items ?? 0), 0);
          const withTime   = stations.filter((s: any) => s.avgTime !== null && s.avgTime !== undefined);
          const globalAvg  = withTime.length > 0
            ? Math.round(withTime.reduce((sum: number, s: any) => sum + (s.avgTime ?? 0), 0) / withTime.length)
            : null;

          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estaciones activas</span>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><ChefHat className="w-4 h-4" /></div>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{stations.length}</div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ítems procesados</span>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600"><Package className="w-4 h-4" /></div>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{(totalItems ?? 0).toLocaleString('es-CL')}</div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tiempo prom. preparación</span>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Clock className="w-4 h-4" /></div>
                  </div>
                  {globalAvg !== null ? (
                    <div className="text-2xl font-extrabold text-gray-900">
                      {globalAvg} <span className="text-base font-medium text-gray-400">min</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-extrabold text-gray-300">—</div>
                      <span className="absolute top-3 right-3 text-[10px] bg-amber-100 text-amber-600 font-semibold px-2 py-0.5 rounded-full">sin datos</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-5">Ítems procesados por estación</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, stations.length * 50)}>
                  <BarChart data={stations.map(s => ({ name: s.station?.name ?? '—', items: s.items ?? 0 }))} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyleBase} formatter={(v: number) => [v.toLocaleString('es-CL'), 'Ítems']} />
                    <Bar dataKey="items" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {stations.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Rendimiento por estación</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Estación', 'Ítems procesados', 'Tiempo prom.'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stations.map((s: any, i: number) => (
                      <tr key={s.station?.id ?? i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{s.station?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{(s.items ?? 0).toLocaleString('es-CL')}</td>
                        <td className="px-4 py-3">
                          {(s.avgTime !== null && s.avgTime !== undefined) ? (
                            <span className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {s.avgTime} min
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">Sin datos</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
