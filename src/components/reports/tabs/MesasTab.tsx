import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import { reportsService } from '@/services/reportsService';
import {
  useReports, tooltipStyleBase,
} from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import {
  DollarSign, ShoppingCart, LayoutGrid, ArrowUpRight,
} from 'lucide-react';

export function MesasTab() {
  const { dateFrom, dateTo } = useReports();

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['rpt-tables', dateFrom, dateTo],
    queryFn: () => reportsService.getTablesReport({ dateFrom, dateTo }),
    staleTime: 0,
  });

  const tablesChart = ((tablesData as any)?.tables ?? []).slice(0, 20).map((item: any) => ({
    name:     `Mesa ${item.table?.number ?? '?'}`,
    section:  item.table?.sections?.name ?? '—',
    orders:   item.orders ?? 0,
    revenue:  Number(item.revenue)  || 0,
    rotation: Number(item.rotation) || 0,
  }));

  if (tablesLoading) return <Spinner />;
  if (tablesChart.length === 0) return <EmptyState message="Sin órdenes de mesas en el período" />;

  const totalRevenue = tablesChart.reduce((s: number, t: any) => s + t.revenue, 0);
  const totalOrders  = tablesChart.reduce((s: number, t: any) => s + t.orders,  0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos Totales',  value: formatCurrency(totalRevenue),                                                               Icon: DollarSign,   color: 'bg-orange-100 text-orange-600'  },
          { label: 'Órdenes Totales',   value: totalOrders.toString(),                                                                     Icon: ShoppingCart, color: 'bg-indigo-100 text-indigo-600'  },
          { label: 'Mesas Activas',     value: tablesChart.length.toString(),                                                              Icon: LayoutGrid,   color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Ingr. Prom./Mesa',  value: formatCurrency(tablesChart.length > 0 ? totalRevenue / tablesChart.length : 0),             Icon: ArrowUpRight, color: 'bg-purple-100 text-purple-600'  },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color}`}><kpi.Icon className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{kpi.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Ingresos y Órdenes por Mesa</h3>
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={tablesChart} margin={{ left: 0, right: 34, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="rev" orientation="left"  tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatCurrency(v)} width={90} axisLine={false} tickLine={false} />
            <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={36} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyleBase} formatter={(v: number, n: string) => [n === 'revenue' ? formatCurrency(v) : v, n === 'revenue' ? 'Ingresos' : 'Órdenes']} />
            <Legend iconType="circle" iconSize={10} />
            <Bar  yAxisId="rev" dataKey="revenue" fill="#f97316" radius={[4,4,0,0]} maxBarSize={28} name="revenue" />
            <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} dot={false} name="orders" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Mesa', 'Sección', 'Órdenes', 'Ingresos', 'Rotación/día'].map(h => (
                  <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide', ['Órdenes','Ingresos','Rotación/día'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tablesChart.map((t: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{t.name}</td>
                  <td className="px-5 py-3.5"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{t.section}</span></td>
                  <td className="px-5 py-3.5 text-right font-medium text-gray-700">{t.orders}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-gray-900">{formatCurrency(t.revenue)}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-gray-500">{t.rotation.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
