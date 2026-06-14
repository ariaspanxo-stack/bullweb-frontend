import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useReports, SALES_PAGE_SIZE, tooltipStyleBase, fmtTick,
  buildDayHeatmap, buildHourHeatmap,
} from '@/contexts/ReportsContext';
import { KpiMoneyCard } from '@/components/reports/shared/KpiMoneyCard';
import { KpiIntCard }   from '@/components/reports/shared/KpiIntCard';
import { ReportCard }   from '@/components/reports/shared/ReportCard';
import {
  DollarSign, ShoppingCart, ArrowUpRight,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from 'lucide-react';

export function VentasTab() {
  const {
    currSales, salesLoading, prevLoading,
    totalSales, totalOrders, avgTicket, totalDiscount, totalTips,
    prevTotalSales, prevTotalOrders, prevAvgTicket, prevTotalDiscount,
    mixedChartData,
    salesPage, setSalesPage,
    waitersForFilter,
    dashboardData,
  } = useReports();

  const rawOrders: any[] = (currSales as any)?.sales ?? [];

  const pagedOrders = useMemo(
    () => rawOrders.slice((salesPage - 1) * SALES_PAGE_SIZE, salesPage * SALES_PAGE_SIZE),
    [rawOrders, salesPage]
  );
  const salesTotalPages = Math.max(1, Math.ceil(rawOrders.length / SALES_PAGE_SIZE));
  const dayHeatmap       = useMemo(() => buildDayHeatmap(rawOrders),  [rawOrders]);
  const hourHeatmap      = useMemo(() => buildHourHeatmap(rawOrders), [rawOrders]);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiMoneyCard label="Total Ventas"    value={totalSales}    prev={prevTotalSales}
          icon={DollarSign}   iconBg="bg-orange-100 text-orange-600"   loading={salesLoading || prevLoading} />
        <KpiIntCard   label="Nº Órdenes"      value={totalOrders}   prev={prevTotalOrders}
          icon={ShoppingCart} iconBg="bg-indigo-100 text-indigo-600"   loading={salesLoading || prevLoading} />
        <KpiMoneyCard label="Ticket Promedio" value={avgTicket}     prev={prevAvgTicket}
          icon={ArrowUpRight} iconBg="bg-emerald-100 text-emerald-600" loading={salesLoading || prevLoading} />
        <ReportCard
          label="Top Producto"
          value={(dashboardData as any)?.topProducts?.[0]?.product?.name ?? '—'}
          subvalue={`${ (dashboardData as any)?.topProducts?.[0]?.quantity ?? 0 } vendidos · ${formatCurrency((dashboardData as any)?.topProducts?.[0]?.revenue ?? 0)}`}
          icon="⭐"
          color="orange"
        />
      </div>

      {/* Propinas */}
      {totalTips > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 mb-0.5">Propinas del período</p>
            <p className="text-2xl font-extrabold text-yellow-700">{formatCurrency(totalTips)}</p>
          </div>
        </div>
      )}

      {/* Gráfico mixto */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Evolución de Ventas</h3>
            <p className="text-xs text-gray-400 mt-0.5">Barras = monto · Línea = número de órdenes (eje derecho)</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Ventas ($)</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-[2px] bg-indigo-500 inline-block rounded" /> Órdenes</span>
          </div>
        </div>
        {mixedChartData.length === 0
          ? <div className="flex items-center justify-center h-52 text-gray-300 text-sm">Sin datos para este período</div>
          : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={mixedChartData} margin={{ left: 0, right: 34, top: 4 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={fmtTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="sales"  orientation="left"  tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => formatCurrency(v)} width={90} axisLine={false} tickLine={false} />
                <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={36} axisLine={false} tickLine={false} />
                <Tooltip
                  {...tooltipStyleBase}
                  formatter={(v: number, name: string) => [name === 'ventas' ? formatCurrency(v) : v, name === 'ventas' ? 'Ventas' : 'Órdenes']}
                  labelFormatter={v => { try { return new Date(v + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return v; } }}
                />
                <Area yAxisId="sales"  type="monotone" dataKey="ventas"  stroke="#f97316" strokeWidth={2.5} fill="url(#salesGrad)" name="ventas"  dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#f97316' }} />
                <Line yAxisId="orders" type="monotone" dataKey="ordenes" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="ordenes" />
              </ComposedChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Heatmaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Días de la semana */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900">Ventas por Día de la Semana</h3>
            <p className="text-xs text-gray-400 mt-0.5">Mayor intensidad = mayor volumen</p>
          </div>
          {rawOrders.length === 0
            ? <div className="flex items-center justify-center h-24 text-gray-300 text-sm">Sin datos</div>
            : (
              <div className="grid grid-cols-7 gap-2">
                {dayHeatmap.map(day => (
                  <div key={day.label} className="flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-xl"
                      style={{ height: '60px', backgroundColor: `rgba(249, 115, 22, ${Math.max(0.07, day.intensity * 0.92)})`, border: day.intensity > 0.65 ? '1.5px solid rgba(249,115,22,0.35)' : '1.5px solid transparent' }}
                      title={`${day.label}: ${formatCurrency(day.total)} · ${day.count} órdenes`}
                    />
                    <span className="text-[11px] font-semibold text-gray-500">{day.label}</span>
                    <span className="text-[10px] text-gray-400 tabular-nums">{day.count}</span>
                  </div>
                ))}
              </div>
            )
          }
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Bajo</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgba(249,115,22,0.07), rgba(249,115,22,0.9))' }} />
            <span className="text-[10px] text-gray-400">Alto</span>
          </div>
        </div>

        {/* Horas del día */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900">Ventas por Hora del Día</h3>
            <p className="text-xs text-gray-400 mt-0.5">Horas con mayor facturación</p>
          </div>
          {rawOrders.length === 0
            ? <div className="flex items-center justify-center h-24 text-gray-300 text-sm">Sin datos</div>
            : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-1">
                  {hourHeatmap.slice(0, 12).map(h => (
                    <div key={h.hour} className="flex flex-col items-center gap-1">
                      <div className="w-full rounded" style={{ height: '34px', backgroundColor: `rgba(99, 102, 241, ${Math.max(0.07, h.intensity * 0.92)})` }} title={`${String(h.hour).padStart(2,'0')}:00 → ${formatCurrency(h.total)}`} />
                      <span className="text-[9px] text-gray-400 tabular-nums">{String(h.hour).padStart(2,'0')}h</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-1">
                  {hourHeatmap.slice(12, 24).map(h => (
                    <div key={h.hour} className="flex flex-col items-center gap-1">
                      <div className="w-full rounded" style={{ height: '34px', backgroundColor: `rgba(99, 102, 241, ${Math.max(0.07, h.intensity * 0.92)})` }} title={`${String(h.hour).padStart(2,'0')}:00 → ${formatCurrency(h.total)}`} />
                      <span className="text-[9px] text-gray-400 tabular-nums">{String(h.hour).padStart(2,'0')}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Bajo</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.07), rgba(99,102,241,0.9))' }} />
            <span className="text-[10px] text-gray-400">Alto</span>
          </div>
        </div>
      </div>

      {/* Tabla de órdenes paginada */}
      {rawOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Detalle de Órdenes</h3>
            <span className="text-xs text-gray-400">{rawOrders.length} órdenes en total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Fecha', 'Tipo', 'Mesa', 'Mesero', 'Total'].map(h => (
                    <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide', h === 'Total' ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedOrders.map((o: any, i: number) => (
                  <tr key={o.id ?? i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-400 tabular-nums">{(salesPage - 1) * SALES_PAGE_SIZE + i + 1}</td>
                    <td className="px-5 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">{new Date(o.createdAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-5 py-3 text-xs">
                      <span className={cn('px-2 py-0.5 rounded-full font-medium', o.type === 'DELIVERY' ? 'bg-indigo-100 text-indigo-700' : o.type === 'TAKEAWAY' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                        {o.type === 'DELIVERY' ? 'Delivery' : o.type === 'TAKEAWAY' ? 'Para llevar' : 'Mesa'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">{o.table?.number != null ? `Mesa ${o.table.number}` : '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-600">{o.waiter?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-900 font-semibold tabular-nums text-right">{formatCurrency(Number(o.total) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {salesTotalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Mostrando <span className="font-semibold text-gray-600">{(salesPage - 1) * SALES_PAGE_SIZE + 1}–{Math.min(salesPage * SALES_PAGE_SIZE, rawOrders.length)}</span> de <span className="font-semibold text-gray-600">{rawOrders.length}</span> órdenes</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setSalesPage(1)} disabled={salesPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsLeft className="w-4 h-4" /></button>
                <button onClick={() => setSalesPage(p => p - 1)} disabled={salesPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm text-gray-600 px-2"><span className="font-bold">{salesPage}</span> / <span className="font-bold">{salesTotalPages}</span></span>
                <button onClick={() => setSalesPage(p => p + 1)} disabled={salesPage >= salesTotalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setSalesPage(salesTotalPages)} disabled={salesPage >= salesTotalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
