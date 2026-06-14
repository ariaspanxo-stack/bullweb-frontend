import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { reportsService } from '@/services/reportsService';
import { useReports, methodColor, tooltipStyleBase, renderPieLabel } from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';

export function PagosTab() {
  const { dateFrom, dateTo } = useReports();

  const { data: cashFlowData, isLoading: cfLoading } = useQuery({
    queryKey: ['rpt-cashflow', dateFrom, dateTo],
    queryFn: () => reportsService.getCashFlow({ dateFrom, dateTo }),
    staleTime: 0,
  });

  const paymentChart = ((cashFlowData as any)?.byPaymentMethod ?? []).map((item: any) => ({
    name:   item.method?.name ?? 'Otro',
    amount: Number(item.total) || 0,
    count:  item.count ?? 0,
    color:  methodColor(item.method?.name ?? ''),
  }));

  if (cfLoading) return <Spinner />;
  if (paymentChart.length === 0) return <EmptyState message="Sin datos de pagos en el período" />;

  const totalPaid = paymentChart.reduce((s: number, x: any) => s + x.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Distribución de Métodos</h3>
        <div className="relative">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={paymentChart} dataKey="amount" nameKey="name" cx="50%" cy="46%" innerRadius={70} outerRadius={105} paddingAngle={4} strokeWidth={0} label={renderPieLabel} labelLine={false}>
                {paymentChart.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip {...tooltipStyleBase} formatter={(v: number) => [formatCurrency(v), 'Monto']} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '40px' }}>
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Total</div>
              <div className="text-base font-extrabold text-gray-900 tabular-nums">{formatCurrency(totalPaid)}</div>
              <div className="text-xs text-gray-400">{paymentChart.reduce((s: number, x: any) => s + (x.count || 0), 0)} pagos</div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Resumen por Método</h3>
        <div className="space-y-4">
          {paymentChart.map((pm: any, i: number) => {
            const pct = totalPaid > 0 ? (pm.amount / totalPaid) * 100 : 0;
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pm.color }} />
                    <span className="font-semibold text-gray-800 truncate">{pm.name}</span>
                    <span className="text-gray-400 text-xs">({pm.count})</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-900">{formatCurrency(pm.amount)}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: pm.color }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between">
          <span className="text-sm font-semibold text-gray-500">Total cobrado</span>
          <span className="font-bold text-gray-900">{formatCurrency(totalPaid)}</span>
        </div>
      </div>
    </div>
  );
}
