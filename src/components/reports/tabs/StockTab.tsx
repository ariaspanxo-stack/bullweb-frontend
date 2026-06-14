import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api';
import {
  useReports, unwrapList, tooltipStyleBase, STOCK_PAGE_SIZE,
} from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { AlertTriangle, Package, Archive } from 'lucide-react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export function StockTab() {
  const { dateFrom, dateTo, stockPage, setStockPage } = useReports();

  // Ingredientes + movimientos con fechas
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['rpt-stock', dateFrom, dateTo, stockPage],
    queryFn: async () => {
      const [ingRes, movRes] = await Promise.all([
        api.get<any>(`/inventory/ingredients?page=${stockPage}&perPage=${STOCK_PAGE_SIZE}`),
        api.get<any>(`/inventory/movements?perPage=50&dateFrom=${dateFrom}T00:00:00.000Z&dateTo=${dateTo}T23:59:59.999Z`),
      ]);
      const ingPayload      = ingRes?.data;
      const ingredients     = Array.isArray(ingPayload) ? ingPayload
                            : Array.isArray(ingPayload?.data) ? ingPayload.data : [];
      const ingredientsMeta = ingPayload?.meta ?? null;
      const movements       = unwrapList(movRes);
      return { ingredients, movements, ingredientsMeta };
    },
    staleTime: 0,
  });

  // Low-stock: snapshot actual, queryKey fijo sin fechas
  const { data: lowStockData } = useQuery({
    queryKey: ['rpt-low-stock'],
    queryFn: async () => {
      const lowRes = await api.get<any>('/inventory/low-stock');
      const lowRaw = lowRes.data;
      return Array.isArray(lowRaw?.ingredients) ? lowRaw.ingredients
           : Array.isArray(lowRaw?.data)        ? lowRaw.data
           : Array.isArray(lowRaw)              ? lowRaw : [];
    },
    staleTime: 60_000,
  });

  const lowStock: any[] = (lowStockData as any[]) ?? [];

  if (stockLoading) return <Spinner />;

  const stockLevels = [...((stockData as any)?.ingredients ?? [])]
    .filter((ing: any) => Number(ing.currentStock) > 0 || Number(ing.minStock) > 0)
    .sort((a: any, b: any) => Number(b.currentStock) - Number(a.currentStock))
    .slice(0, 12)
    .map((ing: any) => ({
      name:   ing.name.length > 18 ? ing.name.slice(0, 17) + '…' : ing.name,
      actual: Number(ing.currentStock) || 0,
      minimo: Number(ing.minStock)     || 0,
      ok:     Number(ing.currentStock) >= Number(ing.minStock),
    }));

  const typeColors: Record<string, string> = {
    PURCHASE: 'bg-green-100 text-green-700', ADJUSTMENT: 'bg-blue-100 text-blue-700',
    WASTE: 'bg-rose-100 text-rose-700', PRODUCTION: 'bg-purple-100 text-purple-700',
  };

  const totalIngredients = stockData?.ingredientsMeta?.total ?? (stockData?.ingredients ?? []).length;
  const alertCount       = lowStock.length;
  const movCount         = (stockData?.movements ?? []).length;
  const totalPages       = stockData?.ingredientsMeta ? Math.ceil(stockData.ingredientsMeta.total / STOCK_PAGE_SIZE) : 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Ingredientes', value: totalIngredients, Icon: Package,       color: 'bg-indigo-100 text-indigo-600'  },
          { label: 'Alertas Stock Bajo',  value: alertCount,      Icon: AlertTriangle, color: 'bg-rose-100 text-rose-600'       },
          { label: 'Movimientos',         value: movCount,        Icon: Archive,       color: 'bg-orange-100 text-orange-600'   },
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

      {stockLevels.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Niveles de Stock por Ingrediente</h3>
          <p className="text-xs text-gray-400 mb-5">Stock actual vs mínimo requerido · Top 12 · 🟢 OK · 🔴 Bajo mínimo</p>
          <ResponsiveContainer width="100%" height={Math.max(260, stockLevels.length * 32)}>
            <BarChart data={stockLevels} layout="vertical" margin={{ left: 10, right: 20 }} barGap={3} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyleBase} formatter={(v: number, n: string) => [v.toFixed(2), n === 'actual' ? 'Stock Actual' : 'Mínimo Req.']} />
              <Legend iconType="circle" iconSize={10} formatter={(v: string) => v === 'actual' ? 'Stock Actual' : 'Mínimo Req.'} />
              <Bar dataKey="actual" name="actual" radius={[0, 4, 4, 0]} maxBarSize={12}>
                {stockLevels.map((s: any, idx: number) => (
                  <Cell key={idx} fill={s.ok ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
              <Bar dataKey="minimo" name="minimo" fill="#fbbf24" radius={[0, 4, 4, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-bold text-rose-700">{lowStock.length} ingredientes con stock crítico</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Ingrediente', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Estado'].map(h => (
                  <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide', ['Stock Actual','Stock Mínimo'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lowStock.map((ing: any, i: number) => (
                <tr key={i} className="hover:bg-rose-50/40">
                  <td className="px-5 py-3 font-semibold text-gray-900">{ing.name}</td>
                  <td className="px-5 py-3 text-gray-500">{ing.unit}</td>
                  <td className="px-5 py-3 text-right font-bold text-rose-600">{Number(ing.currentStock).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{Number(ing.minStock).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" /> Crítico
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(stockData?.movements ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Movimientos en el Período</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Fecha', 'Ingrediente', 'Tipo', 'Cantidad', 'Stock Ant.', 'Stock Nuevo', 'Notas'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stockData?.movements ?? []).map((mv: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(mv.createdAt).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{mv.ingredients?.name ?? '—'}</td>
                    <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', typeColors[mv.type] ?? 'bg-gray-100 text-gray-600')}>{mv.type}</span></td>
                    <td className="px-4 py-3 font-bold text-gray-900">{mv.quantity} {mv.ingredients?.unit}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{Number(mv.previousStock).toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium text-gray-700 text-xs">{Number(mv.newStock).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{mv.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(stockData?.movements ?? []).length === 0 && lowStock.length === 0 && (
        <EmptyState message="Sin movimientos de stock en el período seleccionado" />
      )}

      {stockData?.ingredientsMeta && stockData.ingredientsMeta.total > STOCK_PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-2xl">
          <span className="text-xs text-gray-400">
            Mostrando <span className="font-semibold text-gray-600">{(stockPage - 1) * STOCK_PAGE_SIZE + 1}–{Math.min(stockPage * STOCK_PAGE_SIZE, stockData.ingredientsMeta.total)}</span> de <span className="font-semibold text-gray-600">{stockData.ingredientsMeta.total}</span> ingredientes
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setStockPage(1)} disabled={stockPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsLeft className="w-4 h-4" /></button>
            <button onClick={() => setStockPage(p => p - 1)} disabled={stockPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-gray-600 px-2"><span className="font-bold">{stockPage}</span> / <span className="font-bold">{totalPages}</span></span>
            <button onClick={() => setStockPage(p => p + 1)} disabled={stockPage >= totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setStockPage(totalPages)} disabled={stockPage >= totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {!stockData?.ingredientsMeta && (stockData?.ingredients ?? []).length >= STOCK_PAGE_SIZE && (
        <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl">
          <p className="text-xs text-amber-600">⚠️ Mostrando los primeros {STOCK_PAGE_SIZE} ingredientes. Refina el rango de fechas para ver más.</p>
        </div>
      )}
    </div>
  );
}
