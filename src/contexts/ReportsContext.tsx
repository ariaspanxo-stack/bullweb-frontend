import {
  createContext, useContext, useState, useMemo, useEffect,
  useCallback, ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '@/services/reportsService';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  format, subDays, differenceInDays, parseISO,
  startOfMonth, startOfYear, isValid,
} from 'date-fns';

// ── Helpers de fecha (exportados para uso externo) ───────────────────────────
export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
export function getPresetFrom(preset: string): string {
  const now = new Date();
  switch (preset) {
    case '7d':    return format(subDays(now, 6),       'yyyy-MM-dd');
    case '30d':   return format(subDays(now, 29),      'yyyy-MM-dd');
    case 'month': return format(startOfMonth(now),     'yyyy-MM-dd');
    case 'year':  return format(startOfYear(now),      'yyyy-MM-dd');
    default:      return format(subDays(now, 29),      'yyyy-MM-dd');
  }
}
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

export const SALES_PAGE_SIZE     = 50;
export const STOCK_PAGE_SIZE     = 50;
export const PURCHASES_PAGE_SIZE = 50;

export const CHART_COLORS = ['#f97316', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export type Tab = 'ventas' | 'productos' | 'pagos' | 'stock' | 'compras' | 'gastos' | 'balance' | 'mesas' | 'meseros' | 'cocina' | 'cierre';

// ============================================================================
// HELPERS (exportados para uso en tabs)
// ============================================================================

export function unwrapList(res: any): any[] {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

export function methodColor(name: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('efectivo') || n.includes('cash'))                              return '#10b981';
  if (n.includes('débito')   || n.includes('debito'))                            return '#06b6d4';
  if (n.includes('crédito')  || n.includes('credito') || n.includes('tarjeta')) return '#3b82f6';
  if (n.includes('transfer'))                                                    return '#8b5cf6';
  if (n.includes('yape'))                                                        return '#ec4899';
  if (n.includes('plin'))                                                        return '#f59e0b';
  return '#6366f1';
}

export function fmtTick(val: string): string {
  try { return new Date(val + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }); }
  catch { return val; }
}

export function buildDayHeatmap(orders: any[]) {
  const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  orders.forEach(o => {
    const d = new Date(o.createdAt).getDay();
    totals[d] += Number(o.total) || 0;
    counts[d]++;
  });
  const max = Math.max(...totals, 1);
  return labels.map((label, i) => ({ label, total: totals[i], count: counts[i], intensity: totals[i] / max }));
}

export function buildHourHeatmap(orders: any[]) {
  const totals = new Array(24).fill(0);
  const counts = new Array(24).fill(0);
  orders.forEach(o => {
    const h = new Date(o.createdAt).getHours();
    totals[h] += Number(o.total) || 0;
    counts[h]++;
  });
  const max = Math.max(...totals, 1);
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i, total: totals[i], count: counts[i], intensity: totals[i] / max,
  }));
}

export const tooltipStyleBase = {
  contentStyle: { borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,.08)', fontSize: 12 },
  wrapperStyle: { outline: 'none' },
};

const RADIAN = Math.PI / 180;
export function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const r  = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface ReportsContextValue {
  // Estado
  activeTab:        Tab;
  setActiveTab:     (tab: Tab) => void;
  dateFrom:         string;
  setDateFrom:      (v: string) => void;
  dateTo:           string;
  setDateTo:        (v: string) => void;
  activePreset:     string | null;
  setActivePreset:  (v: string | null) => void;
  waiterId:         string;
  setWaiterId:      (v: string) => void;
  salesPage:        number;
  setSalesPage:     (v: number | ((p: number) => number)) => void;
  stockPage:        number;
  setStockPage:     (v: number | ((p: number) => number)) => void;
  purchasesPage:    number;
  setPurchasesPage: (v: number | ((p: number) => number)) => void;
  isExporting:      boolean;
  canExport:        boolean;
  prevDates:        { from: string; to: string };

  // Queries compartidas
  currSales:          any;
  prevSales:          any;
  dashboardData:      any;
  purchasesRaw:       any;
  prevPurchasesData:  any[];
  waitersForFilter:   any[];

  // Loading states
  salesLoading:       boolean;
  prevLoading:        boolean;
  purchasesLoading:   boolean;

  // Derivados cross-tab
  purchasesData:    any[];
  purchasesMeta:    any;
  totalSales:       number;
  totalOrders:      number;
  avgTicket:        number;
  totalDiscount:    number;
  totalTips:        number;
  prevTotalSales:   number;
  prevTotalOrders:  number;
  prevAvgTicket:    number;
  prevTotalDiscount:number;
  gastoTotal:       number;
  prevGastoTotal:   number;
  mixedChartData:   { date: string; ventas: number; ordenes: number }[];

  // Acciones
  handleExport:   (fmt: 'csv' | 'excel') => Promise<void>;
  applyPreset:    (preset: string) => void;
  handleRefresh:  () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ReportsContext = createContext<ReportsContextValue>(null!);

// ============================================================================
// PROVIDER
// ============================================================================

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();

  const [activeTab,      setActiveTab]      = useState<Tab>('ventas');
  const [dateFrom,       setDateFrom]       = useState(() => getPresetFrom('30d'));
  const [dateTo,         setDateTo]         = useState(() => getTodayStr());
  const [isExporting,    setIsExporting]    = useState(false);
  const [activePreset,   setActivePreset]   = useState<string | null>('30d');
  const [waiterId,       setWaiterId]       = useState<string>('');
  const [stockPage,      setStockPage]      = useState(1);
  const [purchasesPage,  setPurchasesPage]  = useState(1);
  const [salesPage,      setSalesPage]      = useState(1);

  const queryClient = useQueryClient();
  const canExport = user?.role?.permissions?.includes('reports.export') ?? false;

  // ── Período anterior ────────────────────────────────────────────────────
  const prevDates = useMemo(() => {
    const parsedFrom = parseISO(dateFrom);
    const parsedTo   = parseISO(dateTo);
    if (!isValid(parsedFrom) || !isValid(parsedTo)) {
      return { from: dateFrom, to: dateFrom };
    }
    const days = differenceInDays(parsedTo, parsedFrom) + 1;
    const to   = format(subDays(parsedFrom, 1),    'yyyy-MM-dd');
    const from = format(subDays(parsedFrom, days), 'yyyy-MM-dd');
    return { from, to };
  }, [dateFrom, dateTo]);

  // ── Queries compartidas ─────────────────────────────────────────────────
  const { data: currSales, isLoading: salesLoading } = useQuery({
    queryKey: ['rpt-sales-curr', dateFrom, dateTo, waiterId],
    queryFn: () => reportsService.getSalesReport({ dateFrom, dateTo, groupBy: 'day', waiterId: waiterId || undefined }),
    staleTime: 0,
  });

  const { data: prevSales, isLoading: prevLoading } = useQuery({
    queryKey: ['rpt-sales-prev', prevDates.from, prevDates.to, waiterId],
    queryFn: () => reportsService.getSalesReport({ dateFrom: prevDates.from, dateTo: prevDates.to, groupBy: 'day', waiterId: waiterId || undefined }),
    staleTime: 300_000,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['rpt-dashboard', dateFrom, dateTo],
    queryFn: () => reportsService.getDashboard({ dateFrom, dateTo }),
    staleTime: 0,
  });

  const { data: purchasesRaw, isLoading: purchasesLoading } = useQuery({
    queryKey: ['rpt-purchases', dateFrom, dateTo, purchasesPage],
    queryFn: async () => {
      const res = await api.get<any>(`/inventory/purchases?page=${purchasesPage}&perPage=${PURCHASES_PAGE_SIZE}&dateFrom=${dateFrom}T00:00:00.000Z&dateTo=${dateTo}T23:59:59.999Z`);
      return res.data;
    },
    staleTime: 0,
    enabled: true,
  });

  const { data: prevPurchasesRaw } = useQuery({
    queryKey: ['rpt-prev-purchases', prevDates.from, prevDates.to],
    queryFn: async () => {
      const res = await api.get<any>(`/inventory/purchases?perPage=500&dateFrom=${prevDates.from}T00:00:00.000Z&dateTo=${prevDates.to}T23:59:59.999Z`);
      return unwrapList(res);
    },
    staleTime: 300_000,
    enabled: activeTab === 'balance' || activeTab === 'gastos',
  });

  const { data: waitersForFilterRaw } = useQuery({
    queryKey: ['rpt-waiters-filter', dateFrom, dateTo],
    queryFn: () => reportsService.getWaitersReport({ dateFrom, dateTo }).then((r: any) => r.waiters ?? []),
    staleTime: 0,
  });

  // ── Derivados ────────────────────────────────────────────────────────────
  const purchasesData: any[] = (() => {
    const raw = purchasesRaw as any;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  })();
  const purchasesMeta   = (purchasesRaw as any)?.meta ?? null;
  const prevPurchasesData: any[] = (prevPurchasesRaw as any[]) ?? [];
  const waitersForFilter: any[]  = (waitersForFilterRaw as any[]) ?? [];

  const curr = (currSales as any)?.summary ?? {};
  const prev = (prevSales as any)?.summary ?? {};
  const totalSales        = Number(curr.totalSales)    || 0;
  const totalOrders       = Number(curr.totalOrders)   || 0;
  const avgTicket         = Number(curr.averageTicket) || 0;
  const totalDiscount     = Number(curr.totalDiscount) || 0;
  const totalTips         = Number(curr.totalTips)     || 0;
  const prevTotalSales    = Number(prev.totalSales)    || 0;
  const prevTotalOrders   = Number(prev.totalOrders)   || 0;
  const prevAvgTicket     = Number(prev.averageTicket) || 0;
  const prevTotalDiscount = Number(prev.totalDiscount) || 0;

  const gastoTotal = purchasesData.reduce(
    (s, p) => s + (Number(p.unitCost ?? 0) * Number(p.quantity ?? 0)), 0
  );
  const prevGastoTotal = prevPurchasesData.reduce(
    (s, p) => s + Number(p.unitCost ?? 0) * Number(p.quantity ?? 0), 0
  );

  const mixedChartData = useMemo(
    () => ((currSales as any)?.salesGrouped ?? []).map((item: any) => ({
      date:    String(item.period ?? ''),
      ventas:  Number(item.sales)  || 0,
      ordenes: Number(item.orders) || 0,
    })),
    [currSales]
  );

  // ── Reset page effects ───────────────────────────────────────────────────
  useEffect(() => { setWaiterId(''); },     [dateFrom, dateTo]);
  useEffect(() => { setStockPage(1); },     [dateFrom, dateTo, activeTab]);
  useEffect(() => { setPurchasesPage(1); }, [dateFrom, dateTo]);
  useEffect(() => { setSalesPage(1); },     [dateFrom, dateTo, waiterId]);

  // ── Auto-refresh cada 5 min cuando hay preset activo ─────────────────────
  useEffect(() => {
    if (!activePreset) return;
    const id = setInterval(() => {
      setDateTo(getTodayStr());
      setDateFrom(getPresetFrom(activePreset));
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [activePreset]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleExport = useCallback(async (exportFmt: 'csv' | 'excel') => {
    setIsExporting(true);
    try {
      if (activeTab === 'cocina') {
        toast.error('Export de cocina no disponible — tiempos en calibración');
        return;
      }
      const typeMap: Record<Tab, string> = {
        ventas:    'sales',
        productos: 'products',
        pagos:     'cash-flow',
        mesas:     'tables',
        stock:     'stock',
        compras:   'purchases',
        gastos:    'purchases',
        balance:   'balance',
        meseros:   'waiters',
        cocina:    'kitchen',
        cierre:    'sales',
      };
      await reportsService.exportReport(typeMap[activeTab] ?? 'sales', {
        dateFrom, dateTo, format: exportFmt,
      });
      toast.success('Reporte exportado');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  const applyPreset = useCallback((preset: string) => {
    setActivePreset(preset);
    if (!preset) return;
    setDateFrom(getPresetFrom(preset));
    setDateTo(getTodayStr());
  }, []);

  const handleRefresh = useCallback(() => {
    if (activePreset) {
      setDateFrom(getPresetFrom(activePreset));
      setDateTo(getTodayStr());
    }
    queryClient.invalidateQueries({
      predicate: q => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('rpt-'),
    });
    // Forzar refetch inmediato sin esperar staleTime
    queryClient.refetchQueries({
      predicate: q => typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('rpt-'),
    });
  }, [activePreset, queryClient]);

  return (
    <ReportsContext.Provider value={{
      activeTab, setActiveTab,
      dateFrom, setDateFrom,
      dateTo, setDateTo,
      activePreset, setActivePreset,
      waiterId, setWaiterId,
      salesPage, setSalesPage,
      stockPage, setStockPage,
      purchasesPage, setPurchasesPage,
      isExporting,
      canExport,
      prevDates,
      currSales, prevSales,
      dashboardData,
      purchasesRaw,
      prevPurchasesData,
      waitersForFilter,
      salesLoading, prevLoading,
      purchasesLoading,
      purchasesData, purchasesMeta,
      totalSales, totalOrders, avgTicket,
      totalDiscount, totalTips,
      prevTotalSales, prevTotalOrders,
      prevAvgTicket, prevTotalDiscount,
      gastoTotal, prevGastoTotal,
      mixedChartData,
      handleExport, applyPreset, handleRefresh,
    }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  return useContext(ReportsContext);
}
