import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import { reportsService } from '@/services/reportsService';
import { useReports, CHART_COLORS, tooltipStyleBase } from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';

export function ProductosTab() {
  const { dateFrom, dateTo, waiterId } = useReports();

  const { data: productsData, isLoading: prodLoading } = useQuery({
    queryKey: ['rpt-products', dateFrom, dateTo, waiterId],
    queryFn: () => reportsService.getTopProducts({ dateFrom, dateTo, limit: 10, waiterId: waiterId || undefined }),
    staleTime: 0,
  });

  const topProductsChart = ((productsData as any)?.products ?? []).slice(0, 8).map((item: any) => ({
    name:     item.product?.name ?? 'N/A',
    quantity: item.quantity ?? 0,
    revenue:  Number(item.revenue) || 0,
    category: item.product?.categories?.name ?? '—',
  }));
  const topProductsTotal = topProductsChart.reduce((s: number, p: any) => s + (p.revenue || 0), 0);

  if (prodLoading) return <Spinner />;
  if (topProductsChart.length === 0) return <EmptyState message="Sin ventas de productos en el período" />;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Top 8 Productos por Ingresos</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topProductsChart} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatCurrency(v)} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyleBase} formatter={(v: number) => [formatCurrency(v), 'Ingresos']} />
            <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {topProductsChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['#', 'Producto', 'Categoría', 'Unidades', 'Ingresos'].map(h => (
                <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide', ['Unidades','Ingresos'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topProductsChart.map((p: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                </td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{p.name}</td>
                <td className="px-5 py-3.5"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{p.category}</span></td>
                <td className="px-5 py-3.5 text-right font-medium text-gray-700">{p.quantity}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="font-bold text-gray-900 tabular-nums">{formatCurrency(p.revenue)}</div>
                  <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden w-20 ml-auto">
                    <div className="h-full rounded-full" style={{ width: `${topProductsTotal > 0 ? Math.min(100, (p.revenue / topProductsTotal) * 100) : 0}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
