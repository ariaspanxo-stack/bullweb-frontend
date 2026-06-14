import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import {
  useReports, CHART_COLORS, tooltipStyleBase, renderPieLabel,
} from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { KpiMoneyCard } from '@/components/reports/shared/KpiMoneyCard';
import { KpiIntCard }   from '@/components/reports/shared/KpiIntCard';
import { Scale, Truck, TrendingUp, Layers } from 'lucide-react';

export function GastosTab() {
  const {
    purchasesData, purchasesLoading,
    gastoTotal, prevGastoTotal,
    totalSales, prevTotalSales,
    salesLoading,
  } = useReports();

  const purchasesList = purchasesData ?? [];

  const gastosGrouped = purchasesList.reduce((acc: Record<string, number>, p: any) => {
    const name = p.ingredients?.name ?? 'Otros';
    const val  = Number(p.unitCost ?? 0) * Number(p.quantity ?? 0);
    acc[name]  = (acc[name] ?? 0) + val;
    return acc;
  }, {});
  const gastosChart = Object.entries(gastosGrouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount }));

  const balanceNeto = totalSales - gastoTotal;

  if (purchasesLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiMoneyCard label="Total Gastos"    value={gastoTotal}       prev={prevGastoTotal}
          icon={Scale}      iconBg="bg-rose-100 text-rose-600"        loading={purchasesLoading} />
        <KpiIntCard   label="Nº Compras"      value={purchasesList.length} prev={0}
          icon={Truck}      iconBg="bg-blue-100 text-blue-600"        loading={purchasesLoading} />
        <KpiMoneyCard label="Ingresos Period" value={totalSales}       prev={prevTotalSales}
          icon={TrendingUp} iconBg="bg-emerald-100 text-emerald-600"  loading={salesLoading} />
        <KpiMoneyCard label="Result. Estim."  value={balanceNeto}      prev={0}
          icon={Layers}     iconBg={balanceNeto >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} loading={purchasesLoading} />
      </div>

      {purchasesList.length === 0 ? <EmptyState message="Sin compras registradas en el período" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-5">Top Gastos por Insumo</h3>
            {gastosChart.length === 0
              ? <div className="flex items-center justify-center h-52 text-gray-300 text-sm">Sin datos</div>
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={gastosChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatCurrency(v)} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyleBase} formatter={(v: number) => [formatCurrency(v), 'Gasto']} />
                    <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {gastosChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-5">Distribución de Gastos</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={gastosChart} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} strokeWidth={0} label={renderPieLabel} labelLine={false}>
                  {gastosChart.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyleBase} formatter={(v: number) => [formatCurrency(v), 'Gasto']} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {purchasesList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Detalle de Gastos / Compras</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Fecha','Insumo','Cantidad','Costo Unit.','Total','Ref.'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchasesList.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.ingredients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.quantity} {p.ingredients?.unit ?? ''}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(Number(p.unitCost) || 0)}</td>
                    <td className="px-4 py-3 font-bold text-rose-600">{formatCurrency((Number(p.unitCost)||0)*(Number(p.quantity)||0))}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
