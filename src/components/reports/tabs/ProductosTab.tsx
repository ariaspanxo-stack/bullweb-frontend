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
    queryFn: () => reportsService.getTopProducts({ dateFrom, dateTo, limit: 100, waiterId: waiterId || undefined }),
    staleTime: 0,
  });

  const allProducts = ((productsData as any)?.products ?? []).map((item: any) => ({
    name:      item.product?.name ?? 'N/A',
    quantity:  item.quantity ?? 0,
    revenue:   Number(item.revenue) || 0,
    category:  item.product?.categories?.name ?? '—',
    totalCost: Number(item.totalCost) || 0,
    profit:    Number(item.profit) || 0,
    margin:    Number(item.margin) || 0,
  }));

  // Gráfico de barras: limitado a 10 para que no se vea amontonado
  const topProductsChart = allProducts.slice(0, 10);
  // Tabla detallada: muestra hasta 50 productos
  const topProductsTable = allProducts.slice(0, 50);
  // Total para barras de porcentaje (sobre el total de los 50 mostrados en tabla)
  const topProductsTotal = topProductsTable.reduce((s: number, p: any) => s + (p.revenue || 0), 0);

  if (prodLoading) return <Spinner />;
  if (topProductsChart.length === 0) return <EmptyState message="Sin ventas de productos en el período" />;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Productos por Ingresos (Top 50)</h3>
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
              {['#', 'Producto', 'Categoría', 'Unidades', 'Ingresos', 'Costo Total', 'Ganancia Neta', 'Margen %'].map(h => (
                <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide', ['Unidades','Ingresos','Costo Total','Ganancia Neta','Margen %'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topProductsTable.map((p: any, i: number) => (
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
                <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                  {p.totalCost > 0 ? formatCurrency(p.totalCost) : '—'}
                </td>
                <td className={cn('px-5 py-3.5 text-right font-semibold tabular-nums', p.profit >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(p.profit)}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                    p.margin >= 60 ? 'bg-green-100 text-green-700' :
                    p.margin >= 30 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700')}>
                    {p.margin.toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
