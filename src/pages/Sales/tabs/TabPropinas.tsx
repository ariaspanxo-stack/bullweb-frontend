import { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, LayoutList, Filter, FileDown, DollarSign, Users, TrendingUp, Gift, RefreshCw } from 'lucide-react';
import { exportSheet } from '@/utils/exportExcel';
import { salesService } from '../../../services/salesService';
import type { Sale, SalesFilters as Filters } from '../../../types/sales.types';
import { usePermission } from '@/hooks/usePermission';

interface Props {
  filters: Partial<Filters>;
}

// Detecta si una venta tuvo múltiples meseros diferentes en sus ítems
function hasMultipleWaiters(sale: Sale): boolean {
  const ids = new Set(
    (sale.items ?? [])
      .map(i => (i as any).waiterId)
      .filter(Boolean)
  );
  return ids.size > 1;
}

// Calcula el rango de fechas según período seleccionado
function calcDateRange(period: string, day: number, month: number, year: number): { startDate: Date; endDate: Date } {
  if (period === 'mensual') {
    return {
      startDate: new Date(year, month - 1, 1, 0, 0, 0),
      endDate:   new Date(year, month, 0, 23, 59, 59),
    };
  }
  if (period === 'semanal') {
    const base = new Date(year, month - 1, day);
    const dow = base.getDay(); // 0=Dom
    const mon = new Date(base); mon.setDate(base.getDate() - ((dow + 6) % 7));
    const sun = new Date(mon);  sun.setDate(mon.getDate() + 6);
    mon.setHours(0, 0, 0, 0);
    sun.setHours(23, 59, 59, 999);
    return { startDate: mon, endDate: sun };
  }
  // Diario (default)
  return {
    startDate: new Date(year, month - 1, day, 0, 0, 0),
    endDate:   new Date(year, month - 1, day, 23, 59, 59),
  };
}

export const TabPropinas = ({ filters }: Props) => {
  const canExport = usePermission('tips.export');
  const today = new Date();
  const initDay   = filters.startDate ? filters.startDate.getDate()     : today.getDate();
  const initMonth = filters.startDate ? filters.startDate.getMonth() + 1 : today.getMonth() + 1;
  const initYear  = filters.startDate ? filters.startDate.getFullYear()  : today.getFullYear();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filtros fila 1 — fecha/tiempo
  const [day,    setDay]    = useState(initDay);
  const [month,  setMonth]  = useState(initMonth);
  const [year,   setYear]   = useState(initYear);
  const [period, setPeriod] = useState('diario');
  const [shift,  setShift]  = useState('');
  const [sortBy, setSortBy] = useState('hora');

  // Filtros modo Rango
  const [rangeFrom,     setRangeFrom]     = useState(() => new Date().toISOString().split('T')[0]);
  const [rangeFromTime, setRangeFromTime] = useState('00:00');
  const [rangeTo,       setRangeTo]       = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; });
  const [rangeToTime,   setRangeToTime]   = useState('00:00');

  // Filtros fila 2 — categoría
  const [waiterFilter, setWaiterFilter]  = useState('');
  const [typeFilter,   setTypeFilter]    = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [pmFilter, setPmFilter]          = useState('');

  // Datos dinámicos desde API
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [employees,      setEmployees]      = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Fix #5 — usa salesService en lugar de api.get directo
    salesService.getPaymentMethods()
      .then((l: any[]) => setPaymentMethods(Array.isArray(l) ? l : []))
      .catch(e => console.warn('[TabPropinas] error cargando métodos de pago', e));
    salesService.getEmployees(200)
      .then((raw: any[]) => {
        setEmployees((Array.isArray(raw) ? raw : []).map((e: any) => ({ id: e.id, name: e.name })));
      })
      .catch(e => console.warn('[TabPropinas] error cargando empleados', e));
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(new Date(date));

  const loadTips = (d: number, mo: number, yr: number, per: string) => {
    setLoading(true);
    const { startDate, endDate } = calcDateRange(per, d, mo, yr);
    salesService.getSales({ startDate, endDate })
      .then(data => setSales(data))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTips(day, month, year, period); }, []);

  // Sincronizar fechas si el padre cambia (tab Ventas)
  useEffect(() => {
    if (filters.startDate) {
      setDay(filters.startDate.getDate());
      setMonth(filters.startDate.getMonth() + 1);
      setYear(filters.startDate.getFullYear());
    }
  }, [filters.startDate]);

  const handleSearch = () => {
    if (period === 'rango') {
      const [fH, fMin] = rangeFromTime.split(':').map(Number);
      const [tH, tMin] = rangeToTime.split(':').map(Number);
      const sd = new Date(`${rangeFrom}T00:00:00`);
      sd.setHours(fH, fMin, 0, 0);
      const ed = new Date(`${rangeTo}T00:00:00`);
      ed.setHours(tH, tMin, 59, 999);
      setLoading(true);
      salesService.getSales({ startDate: sd, endDate: ed })
        .then(data => setSales(data))
        .catch(() => setSales([]))
        .finally(() => setLoading(false));
    } else {
      loadTips(day, month, year, period);
    }
  };
  const handleReset  = () => {
    setDay(today.getDate()); setMonth(today.getMonth() + 1); setYear(today.getFullYear());
    setPeriod('diario'); setShift(''); setSortBy('hora');
    setWaiterFilter(''); setTypeFilter(''); setCustomerFilter(''); setPmFilter('');
    const todayIso = new Date().toISOString().split('T')[0];
    const tomorrowD = new Date(); tomorrowD.setDate(tomorrowD.getDate() + 1);
    setRangeFrom(todayIso); setRangeFromTime('00:00');
    setRangeTo(tomorrowD.toISOString().split('T')[0]); setRangeToTime('00:00');
    loadTips(today.getDate(), today.getMonth() + 1, today.getFullYear(), 'diario');
  };

  // Ventas con propina — excluir ventas anuladas/canceladas
  const salesWithTip = useMemo(() =>
    sales.filter(s =>
      s.status !== 'cancelled' &&
      s.tips?.length > 0 &&
      s.tips.reduce((a, t) => a + t.amount, 0) > 0
    ),
    [sales]
  );

  // Clientes únicos para el dropdown
  const customers = useMemo(() => {
    const set = new Set(salesWithTip.map(s => s.customerName).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [salesWithTip]);

  // Aplicar todos los filtros locales
  const filtered = useMemo(() => {
    let result = salesWithTip.filter(s => {
      const matchWaiter   = !waiterFilter   || s.waiterName === waiterFilter;
      const matchType     = !typeFilter     || s.type?.toUpperCase() === typeFilter.toUpperCase();
      const matchCustomer = !customerFilter || s.customerName === customerFilter;
      const matchPm       = !pmFilter       || s.payments?.some(p => p.method?.toLowerCase().includes(pmFilter.toLowerCase()));
      const matchShift    = !shift          || s.shift === shift;
      return matchWaiter && matchType && matchCustomer && matchPm && matchShift;
    });

    // Ordenar
    if (sortBy === 'hora') {
      result = [...result].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } else if (sortBy === 'propina') {
      result = [...result].sort((a, b) => {
        const ta = a.tips.reduce((s, t) => s + t.amount, 0);
        const tb = b.tips.reduce((s, t) => s + t.amount, 0);
        return tb - ta;
      });
    } else if (sortBy === 'total') {
      result = [...result].sort((a, b) => b.total - a.total);
    }
    return result;
  }, [salesWithTip, waiterFilter, typeFilter, customerFilter, pmFilter, shift, sortBy]);

  const totalTips = filtered.reduce((sum, s) => sum + s.tips.reduce((a, t) => a + t.amount, 0), 0);
  const avgTip    = filtered.length > 0 ? totalTips / filtered.length : 0;

  const byWaiter = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filtered.forEach(s => {
      const tip = s.tips.reduce((a, t) => a + t.amount, 0);
      if (!map[s.waiterName]) map[s.waiterName] = { total: 0, count: 0 };
      map[s.waiterName].total += tip;
      map[s.waiterName].count += 1;
    });
    return map;
  }, [filtered]);

  const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  const handleExport = () => {
    exportSheet(
      filtered.map(s => {
        const tip = s.tips.reduce((a, t) => a + t.amount, 0);
        return {
          'Venta':         s.saleNumber || '',
          'Hora':          formatTime(s.startTime),
          'Garzón':        s.waiterName,
          'Tipo':          s.type || '',
          'Cliente':       s.customerName ?? 'Público',
          'Medio de Pago': s.payments?.[0]?.method ?? '',
          'Total Venta':   s.total,
          'Propina (CLP)': tip,
        };
      }),
      `propinas_${year}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`,
      'Propinas',
    );
  };

  const activeFilters = [waiterFilter, typeFilter, customerFilter, pmFilter, shift].filter(Boolean).length;

  return (
    <div className="space-y-4">

      {/* PANEL DE FILTROS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

        {/* FILA 1 — FECHA / TIEMPO */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 flex-wrap">
          <LayoutGrid size={16} className="text-gray-400 flex-shrink-0" />

          {/* Hora Inicio / orden */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-transparent border-none outline-none text-sm cursor-pointer text-gray-700 font-medium"
          >
            <option value="hora">Hora Inicio</option>
            <option value="propina">Mayor Propina</option>
            <option value="total">Mayor Total</option>
          </select>

          {/* Turno */}
          <select
            value={shift}
            onChange={e => setShift(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
          >
            <option value="">Turno</option>
            <option value="morning">Mañana (08-14)</option>
            <option value="afternoon">Tarde (14-20)</option>
            <option value="night">Noche (20-02)</option>
          </select>

          {/* Período */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
          >
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="rango">Rango</option>
          </select>

          {period === 'rango' ? (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Desde:</span>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={e => setRangeFrom(e.target.value)}
                  className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
                />
                <input
                  type="time"
                  value={rangeFromTime}
                  onChange={e => setRangeFromTime(e.target.value)}
                  className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100 w-24"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Hasta:</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={e => setRangeTo(e.target.value)}
                  className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
                />
                <input
                  type="time"
                  value={rangeToTime}
                  onChange={e => setRangeToTime(e.target.value)}
                  className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100 w-24"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Día */}
              {period !== 'mensual' && (
                <select
                  value={day}
                  onChange={e => setDay(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}

              {/* Mes */}
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}.</option>
                ))}
              </select>

              {/* Año */}
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* FILA 2 — FILTROS CATEGORÍA */}
        <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />

          {/* Garzón / Empleado */}
          <select
            value={waiterFilter}
            onChange={e => setWaiterFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
          >
            <option value="">Garzón / Empleado</option>
            {employees.length > 0
              ? employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)
              : Array.from(new Set(salesWithTip.map(s => s.waiterName))).sort().map(w => (
                  <option key={w} value={w}>{w}</option>
                ))
            }
          </select>

          {/* Tipo de Venta */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
          >
            <option value="">Tipo de Venta</option>
            <option value="DINE_IN">Mesa</option>
            <option value="TAKEAWAY">Mostrador</option>
            <option value="DELIVERY">Delivery</option>
          </select>

          {/* Cliente */}
          <select
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
          >
            <option value="">Cliente</option>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Medio de pago */}
          <select
            value={pmFilter}
            onChange={e => setPmFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
          >
            <option value="">Medio de pago</option>
            {paymentMethods.map(pm => (
              <option key={pm.id} value={pm.name}>{pm.name}</option>
            ))}
          </select>

          {/* Acciones al final de la fila */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Toggle tabla / cards */}
            <div className="flex rounded border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                title="Vista tabla"
                className={`p-1.5 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                title="Vista cards"
                className={`p-1.5 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            {activeFilters > 0 && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                {activeFilters} filtro{activeFilters !== 1 ? 's' : ''} activo{activeFilters !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : null}
              Buscar
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
            >
              Limpiar
            </button>
            {canExport && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" /> Excel
            </button>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500 uppercase font-medium">Total Propinas</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalTips)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase font-medium">Promedio</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(avgTip)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase font-medium">Ventas con propina</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-gray-500 uppercase font-medium">Garzones</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{Object.keys(byWaiter).length}</p>
        </div>
      </div>

      {/* RESUMEN POR GARZÓN */}
      {Object.keys(byWaiter).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(byWaiter)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([waiter, data]) => (
              <div
                key={waiter}
                onClick={() => setWaiterFilter(waiterFilter === waiter ? '' : waiter)}
                className={`cursor-pointer rounded-lg border-l-4 p-4 transition-all shadow-sm ${
                  waiterFilter === waiter
                    ? 'border-green-600 bg-green-100'
                    : 'border-green-400 bg-green-50 hover:bg-green-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    {waiter.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate">{waiter}</p>
                </div>
                <p className="text-xl font-bold text-green-700">{formatCurrency(data.total)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data.count} propina{data.count !== 1 ? 's' : ''}{' '}
                  <span className="text-gray-400">· Ø {formatCurrency(Math.round(data.total / data.count))}</span>
                </p>
              </div>
            ))}
        </div>
      )}

      {/* TABLA / CARDS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <RefreshCw className="animate-spin w-6 h-6" />
            <span>Cargando propinas...</span>
          </div>
        ) : viewMode === 'cards' ? (
          /* ---- CARDS VIEW ---- */
          filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-gray-400">No hay propinas para mostrar</p>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(sale => {
                const tipTotal = sale.tips.reduce((a, t) => a + t.amount, 0);
                const pct = sale.total > 0 ? ((tipTotal / sale.total) * 100).toFixed(1) : '0.0';
                return (
                  <div key={sale.id} className="rounded-xl border border-green-200 bg-green-50 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{formatTime(sale.startTime)}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                        {(sale.waiterName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{sale.waiterName || '—'}</p>
                        {hasMultipleWaiters(sale) && (
                          <span
                            title="Esta venta tuvo múltiples garzones — propina asignada al garzón principal"
                            className="inline-block mt-0.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full cursor-help"
                          >
                            ⚠️ múltiple
                          </span>
                        )}
                        <p className="text-xs text-gray-500">{sale.customerName || 'Público'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">Total venta</span>
                      <span className="text-sm font-medium text-gray-700">{formatCurrency(sale.total)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-green-200 pt-2">
                      <span className="text-xs text-gray-500">Propina</span>
                      <span className="text-lg font-bold text-green-700">{formatCurrency(tipTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Venta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha y Hora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Garzón</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Venta</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider">💚 Propina</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No hay propinas para mostrar en este período
                  </td>
                </tr>
              ) : (
                filtered.map(sale => {
                  const tipTotal = sale.tips.reduce((a, t) => a + t.amount, 0);
                  return (
                    <tr key={sale.id} className="hover:bg-green-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {sale.saleNumber || sale.id.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="font-medium text-gray-700">{formatDate(sale.startTime)}</div>
                        <div className="text-xs text-gray-500">{formatTime(sale.startTime)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold">
                            {(sale.waiterName || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-700">{sale.waiterName || '—'}</span>
                          {hasMultipleWaiters(sale) && (
                            <span
                              title="Esta venta tuvo múltiples garzones — propina asignada al garzón principal"
                              className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full cursor-help"
                            >
                              ⚠️ múltiple
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sale.customerName || <span className="text-gray-400">Público</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-500">
                          {sale.total > 0 ? Math.round((tipTotal / sale.total) * 100) : 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                          {formatCurrency(tipTotal)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-green-50 border-t-2 border-green-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Total ({filtered.length} ventas)
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
                    {formatCurrency(filtered.reduce((sum, s) => sum + s.total, 0))}
                  </td>
                  <td />
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                      {formatCurrency(totalTips)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
};
