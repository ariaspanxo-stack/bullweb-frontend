import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { reportsService } from '@/services/reportsService';
import { useReports, tooltipStyleBase } from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { DollarSign, ShoppingCart, ArrowUpRight } from 'lucide-react';

export function MeserosTab() {
  const { dateFrom, dateTo } = useReports();

  const { data: waitersData, isLoading: waitersLoading } = useQuery({
    queryKey: ['rpt-waiters', dateFrom, dateTo],
    queryFn: () => reportsService.getWaitersReport({ dateFrom, dateTo }).then((r: any) => r.waiters ?? []),
    staleTime: 0,
  });

  if (waitersLoading) return <Spinner />;
  const waiters: any[] = (waitersData as any[]) ?? [];
  if (waiters.length === 0) return <EmptyState message="Sin datos de meseros en este período" />;

  const teamSales  = waiters.reduce((s, w) => s + Number(w.sales ?? 0), 0);
  const teamOrders = waiters.reduce((s, w) => s + (w.orders ?? 0), 0);
  const teamAvgTkt = waiters.length > 0
    ? waiters.reduce((s, w) => s + Number(w.averageTicket ?? 0), 0) / waiters.length
    : 0;
  const sorted   = [...waiters].sort((a, b) => Number(b.sales) - Number(a.sales));
  const maxSales = Math.max(...sorted.map(w => Number(w.sales)), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ventas del equipo',   value: formatCurrency(teamSales),                  iconBg: 'bg-orange-100 text-orange-600',  Icon: DollarSign   },
          { label: 'Órdenes totales',     value: (teamOrders ?? 0).toLocaleString('es-CL'),  iconBg: 'bg-indigo-100 text-indigo-600',  Icon: ShoppingCart },
          { label: 'Ticket prom. equipo', value: formatCurrency(teamAvgTkt),                 iconBg: 'bg-emerald-100 text-emerald-600', Icon: ArrowUpRight },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.iconBg}`}><kpi.Icon className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Ventas por mesero</h3>
        <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 44)}>
          <BarChart data={sorted.map(w => ({ name: w.waiter?.name?.split(' ')[0] ?? '—', ventas: Number(w.sales ?? 0), ordenes: w.orders ?? 0 }))} layout="vertical" margin={{ left: 10, right: 24, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatCurrency(v)} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyleBase} formatter={(v: number, name: string) => [name === 'ventas' ? formatCurrency(v) : v, name === 'ventas' ? 'Ventas' : 'Órdenes']} />
            <Bar dataKey="ventas" fill="#f97316" radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Ranking de meseros</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['#', 'Mesero', 'Órdenes', 'Ventas', 'Ticket Prom.', 'Propinas'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((w, i) => {
              const pct = (Number(w.sales ?? 0) / maxSales) * 100;
              return (
                <tr key={w.waiter?.id ?? i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-gray-400 w-10">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{w.waiter?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{w.waiter?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(w.orders ?? 0).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 min-w-[80px] tabular-nums">{formatCurrency(Number(w.sales ?? 0))}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[50px]">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{formatCurrency(Number(w.averageTicket ?? 0))}</td>
                  <td className="px-4 py-3">
                    {(w.tips ?? 0) > 0 ? (
                      <div>
                        <p className="text-sm font-bold text-yellow-600 tabular-nums">{formatCurrency(Number(w.tips ?? 0))}</p>
                        <p className="text-xs text-gray-400">
                          prom ${(w.orders ?? 0) > 0 ? Math.round((w.tips ?? 0) / (w.orders ?? 1)).toLocaleString('es-CL') : 0}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
