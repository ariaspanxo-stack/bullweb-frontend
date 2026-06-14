import {
  ComposedChart, BarChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useReports, tooltipStyleBase, fmtTick, PURCHASES_PAGE_SIZE,
} from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { KpiMoneyCard } from '@/components/reports/shared/KpiMoneyCard';
import { AlertTriangle, TrendingUp, Truck, Layers, Scale } from 'lucide-react';

export function BalanceTab() {
  const {
    salesLoading, purchasesLoading,
    totalSales, prevTotalSales,
    totalDiscount,
    gastoTotal, prevGastoTotal,
    purchasesMeta,
    mixedChartData,
  } = useReports();

  if (salesLoading || purchasesLoading) return <Spinner />;

  const balanceIngresos = totalSales;
  const balanceCostos   = gastoTotal;
  const balanceNeto     = balanceIngresos - balanceCostos;
  const balanceMargen   = balanceIngresos > 0 ? (balanceNeto / balanceIngresos) * 100 : 0;

  return (
    <div className="space-y-5">
      {purchasesMeta && purchasesMeta.total > PURCHASES_PAGE_SIZE && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Los costos muestran <span className="font-semibold">{PURCHASES_PAGE_SIZE} de {purchasesMeta.total} compras</span> del período. El balance es parcial.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiMoneyCard label="Ingresos (Ventas)"  value={balanceIngresos} prev={prevTotalSales}
          icon={TrendingUp} iconBg="bg-emerald-100 text-emerald-600"   loading={salesLoading} />
        <KpiMoneyCard label="Costos (Compras)"   value={balanceCostos}   prev={prevGastoTotal}
          icon={Truck}      iconBg="bg-rose-100 text-rose-600"          loading={purchasesLoading} />
        <KpiMoneyCard label="Balance Neto"       value={balanceNeto}     prev={0}
          icon={Layers}     iconBg={balanceNeto >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} loading={salesLoading} />
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Margen Bruto</span>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center',
              balanceMargen >= 50 ? 'bg-emerald-100 text-emerald-600' : balanceMargen >= 20 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600')}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className={cn('text-[1.6rem] font-extrabold mb-3 tabular-nums leading-none',
            balanceMargen >= 50 ? 'text-emerald-600' : balanceMargen >= 20 ? 'text-amber-600' : 'text-rose-600')}>
            {balanceMargen.toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-400">{balanceMargen >= 50 ? '✅ Excelente margen' : balanceMargen >= 20 ? '⚠️ Margen ajustado' : '❌ Margen crítico'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Ingresos vs Costos</h3>
          <p className="text-xs text-gray-400 mb-5">Período seleccionado</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[
              { name: 'Ingresos', value: balanceIngresos },
              { name: 'Costos',   value: balanceCostos   },
              { name: 'Balance',  value: Math.max(0, balanceNeto) },
            ]} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatCurrency(v)} width={90} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyleBase} formatter={(v: number) => [formatCurrency(v), '']} />
              <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={60}>
                {[
                  { fill: '#10b981' },
                  { fill: '#ef4444' },
                  { fill: balanceNeto >= 0 ? '#6366f1' : '#f97316' },
                ].map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-5">Resumen P&amp;L</h3>
          <div className="space-y-4">
            {[
              { label: 'Ventas totales',           value: balanceIngresos, color: 'text-emerald-600', bg: 'bg-emerald-50', sign: '+' },
              { label: 'Descuentos otorgados',     value: -totalDiscount,  color: 'text-amber-600',  bg: 'bg-amber-50',   sign: '−' },
              { label: 'Costo de insumos/compras', value: -balanceCostos,  color: 'text-rose-600',   bg: 'bg-rose-50',    sign: '−' },
            ].map((row, i) => (
              <div key={i} className={cn('flex items-center justify-between p-3 rounded-lg', row.bg)}>
                <div className="flex items-center gap-2">
                  <span className={cn('w-5 h-5 rounded flex items-center justify-center text-xs font-bold', row.color)}>{row.sign}</span>
                  <span className="text-sm font-medium text-gray-700">{row.label}</span>
                </div>
                <span className={cn('font-bold text-sm tabular-nums', row.color)}>{formatCurrency(Math.abs(row.value))}</span>
              </div>
            ))}
            <div className="border-t-2 border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Balance estimado</span>
              <span className={cn('text-xl font-extrabold tabular-nums',
                balanceNeto >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {balanceNeto >= 0 ? '+' : ''}{formatCurrency(balanceNeto)}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">* Los costos de insumos corresponden a compras registradas en inventario para el período seleccionado. El balance es una estimación del resultado operativo.</p>
            </div>
          </div>
        </div>
      </div>

      {mixedChartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Evolución de Ingresos</h3>
          <p className="text-xs text-gray-400 mb-5">Ingresos diarios del período</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={mixedChartData} margin={{ left: 0, right: 34, top: 4 }}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={fmtTick} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatCurrency(v)} width={90} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyleBase} formatter={(v: number) => [formatCurrency(v), 'Ingresos']} labelFormatter={v => { try { return new Date(v + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return v; } }} />
              <Area dataKey="ventas" stroke="#10b981" strokeWidth={2.5} fill="url(#balanceGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
