import { cn } from '@/lib/utils';
import { useReports, ReportsProvider } from '@/contexts/ReportsContext';
import {
  BarChart3, Download, TrendingUp, Package, CreditCard, Archive,
  Truck, Scale, Layers, LayoutGrid, Users, ChefHat, CalendarRange,
  Star, ShoppingCart, ArrowUpRight, ChevronDown, X, RefreshCw,
} from 'lucide-react';
import { MonthlyClose } from '@/pages/reports/MonthlyClosePage';

// Tabs
import { VentasTab }    from '@/components/reports/tabs/VentasTab';
import { ProductosTab } from '@/components/reports/tabs/ProductosTab';
import { PagosTab }     from '@/components/reports/tabs/PagosTab';
import { StockTab }     from '@/components/reports/tabs/StockTab';
import { ComprasTab }   from '@/components/reports/tabs/ComprasTab';
import { GastosTab }    from '@/components/reports/tabs/GastosTab';
import { BalanceTab }   from '@/components/reports/tabs/BalanceTab';
import { MesasTab }     from '@/components/reports/tabs/MesasTab';
import { MeserosTab }   from '@/components/reports/tabs/MeserosTab';
import { CocinaTab }    from '@/components/reports/tabs/CocinaTab';
import { formatCurrency } from '@/lib/utils';

type Tab = 'ventas' | 'productos' | 'pagos' | 'stock' | 'compras' | 'gastos' | 'balance' | 'mesas' | 'meseros' | 'cocina' | 'cierre';

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'ventas',    label: 'Ventas',     icon: TrendingUp    },
  { id: 'productos', label: 'Productos',  icon: Package        },
  { id: 'pagos',     label: 'Pagos',      icon: CreditCard    },
  { id: 'stock',     label: 'Stock',      icon: Archive       },
  { id: 'compras',   label: 'Compras',    icon: Truck         },
  { id: 'gastos',    label: 'Gastos',     icon: Scale         },
  { id: 'balance',   label: 'Balance',    icon: Layers        },
  { id: 'mesas',     label: 'Mesas',      icon: LayoutGrid    },
  { id: 'meseros',   label: 'Meseros',    icon: Users         },
  { id: 'cocina',    label: 'Cocina',     icon: ChefHat       },
  { id: 'cierre',    label: 'Cierre Mes', icon: CalendarRange },
];

function ReportsInner() {
  const {
    activeTab, setActiveTab,
    dateFrom, dateTo,
    setDateFrom, setDateTo,
    activePreset,
    waiterId, setWaiterId,
    waitersForFilter,
    canExport, isExporting,
    dashboardData,
    totalSales, prevTotalSales,
    totalOrders, prevTotalOrders,
    avgTicket, prevAvgTicket,
    handleExport, applyPreset, handleRefresh,
  } = useReports();

  return (
    <div className="space-y-0">
      {/* Header oscuro */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl -mx-2 px-6 pt-6 pb-0 mb-6 shadow-xl border border-slate-700/40">

        {/* Título + controles */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Reportes &amp; Analytics</h1>
              <p className="text-slate-400 text-xs mt-0.5">Periodo: {dateFrom} → {dateTo}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Presets */}
            {[
              { id: '7d',    label: 'Últ. 7d'  },
              { id: '30d',   label: 'Últ. 30d' },
              { id: 'month', label: 'Este mes' },
              { id: 'year',  label: 'Este año' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border',
                  activePreset === p.id
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                    : 'bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white border-slate-600/50'
                )}
              >
                {p.label}
              </button>
            ))}

            {/* Rango personalizado */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => { if (e.target.value.length === 10) { applyPreset(''); setDateFrom(e.target.value); } }}
              className="date-input-dark bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400 focus:bg-white/20 transition-colors cursor-pointer [color-scheme:dark]"
            />
            <span className="text-white/60 text-sm select-none">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { if (e.target.value.length === 10) { applyPreset(''); setDateTo(e.target.value); } }}
              className="date-input-dark bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400 focus:bg-white/20 transition-colors cursor-pointer [color-scheme:dark]"
            />

            {/* Select mesero */}
            <div className="relative">
              <select
                value={waiterId}
                onChange={e => setWaiterId(e.target.value)}
                className="select-dark appearance-none pl-8 pr-8 py-1.5 rounded-lg text-xs focus:outline-none focus:border-orange-400 transition-colors cursor-pointer"
              >
                <option value="" className="text-gray-900 bg-white">Todos los meseros</option>
                {waitersForFilter.map((w: any) => (
                  <option key={w.waiter?.id} value={w.waiter?.id} className="text-gray-900 bg-white">{w.waiter?.name}</option>
                ))}
              </select>
              <Users className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {waiterId && (
              <span className="flex items-center gap-1.5 bg-orange-500/20 text-orange-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <Users className="w-3 h-3" />
                {waitersForFilter.find((w: any) => w.waiter?.id === waiterId)?.waiter?.name ?? 'Mesero'}
                <button onClick={() => setWaiterId('')} className="hover:text-orange-100 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {canExport && (
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-40 border border-slate-600/50"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
            {canExport && (
              <button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white rounded-lg transition-colors disabled:opacity-40 shadow-md shadow-orange-500/25"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            )}

            {/* Refresh manual */}
            <button
              onClick={handleRefresh}
              title="Actualizar datos ahora"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-600/50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Dashboard KPIs widgets */}
        {dashboardData && (() => {
          const trendSales   = prevTotalSales  > 0 ? ((totalSales   - prevTotalSales)  / prevTotalSales)  * 100 : null;
          const trendOrders  = prevTotalOrders > 0 ? ((totalOrders  - prevTotalOrders) / prevTotalOrders) * 100 : null;
          const trendTicket  = prevAvgTicket   > 0 ? ((avgTicket    - prevAvgTicket)   / prevAvgTicket)   * 100 : null;
          const headerKpis = [
            { label: 'Ventas del período', value: formatCurrency(totalSales),                                                               prevVal: formatCurrency(prevTotalSales),  trend: trendSales,  icon: TrendingUp,  color: 'text-orange-400', bg: 'bg-orange-500/20' },
            { label: 'Órdenes',            value: totalOrders.toLocaleString('es-CL'),                                                      prevVal: prevTotalOrders.toLocaleString('es-CL'), trend: trendOrders, icon: ShoppingCart, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
            { label: 'Ticket promedio',    value: formatCurrency(avgTicket),                                                                prevVal: formatCurrency(prevAvgTicket),   trend: trendTicket, icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
            { label: 'Top producto',       value: (dashboardData as any).topProducts?.[0]?.product?.name ?? '—', prevVal: null, trend: null, icon: Star,         color: 'text-amber-400',   bg: 'bg-amber-500/20' },
          ];
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2 px-1">
              {headerKpis.map(kpi => (
                <div key={kpi.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 border border-white/20">
                  <div className={`p-2 rounded-lg ${kpi.bg} flex-shrink-0`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/80 leading-none mb-1">{kpi.label}</p>
                    <p className="text-lg font-extrabold text-white truncate">{kpi.value}</p>
                    {kpi.trend !== null && kpi.trend !== undefined ? (
                      <p className={`text-xs font-semibold mt-0.5 ${kpi.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {kpi.trend >= 0 ? '↑' : '↓'}{Math.abs(kpi.trend).toFixed(1)}%
                        <span className="text-white/60 font-normal ml-1">ant: {kpi.prevVal}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Tab bar */}
        <div className="relative -mx-6">
          {/* Fade derecho: indica que hay más tabs */}
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10 lg:hidden" />
          <div className="flex gap-1 overflow-x-auto px-6 pb-4 pt-1 scrollbar-hide scroll-smooth">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                    isActive
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="space-y-5">
        {activeTab === 'ventas'    && <VentasTab />}
        {activeTab === 'productos' && <ProductosTab />}
        {activeTab === 'pagos'     && <PagosTab />}
        {activeTab === 'stock'     && <StockTab />}
        {activeTab === 'compras'   && <ComprasTab />}
        {activeTab === 'gastos'    && <GastosTab />}
        {activeTab === 'balance'   && <BalanceTab />}
        {activeTab === 'mesas'     && <MesasTab />}
        {activeTab === 'meseros'   && <MeserosTab />}
        {activeTab === 'cocina'    && <CocinaTab />}
        {activeTab === 'cierre'    && <MonthlyClose />}
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <ReportsProvider>
      <ReportsInner />
    </ReportsProvider>
  );
}
