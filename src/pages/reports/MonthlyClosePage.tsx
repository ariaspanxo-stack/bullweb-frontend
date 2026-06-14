import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Percent, CreditCard, Users, FileSpreadsheet, FileText,
  Calendar, Award,
} from 'lucide-react';
import { exportToExcelMultiSheet } from '@/utils/excelExport';
import { exportToPdf } from '@/utils/pdfExport';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MonthlyCloseData {
  period: {
    month: number; year: number; monthName: string;
    from: string; to: string; days: number;
  };
  summary: {
    totalSales: number; totalOrders: number; totalDiscount: number;
    totalTax: number; totalNet: number; averageTicket: number;
    totalSalesFormatted: string; totalTaxFormatted: string;
    totalNetFormatted: string; averageTicketFormatted: string;
  };
  comparison: {
    prevSales: number; prevOrders: number;
    growthSales: string; growthOrders: string; isGrowth: boolean;
  };
  topProducts: { name: string; qty: number; total: number }[];
  salesByDay: Record<string, number>;
  paymentMethods: Record<string, number>;
  waiters: { name: string; orders: number; total: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = ['#ea580c', '#f97316', '#2563eb', '#16a34a', '#7c3aed', '#db2777', '#0891b2'];

const thisYear  = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const YEARS = [thisYear - 1, thisYear];

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'orange',
  isGrowth,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isGrowth?: boolean;
}) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-600',
    blue:   'bg-blue-100 text-blue-600',
    green:  'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red:    'bg-red-100 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color] ?? colorMap.orange}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${
          isGrowth === undefined ? 'text-gray-400' :
          isGrowth ? 'text-green-600' : 'text-red-500'
        }`}>
          {isGrowth !== undefined && (isGrowth ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MonthlyClose() {
  const [month, setMonth] = useState(thisMonth);
  const [year,  setYear]  = useState(thisYear);

  const { data, isLoading, error } = useQuery({
    queryKey: ['monthly-close', month, year],
    queryFn: async () => {
      const res = await api.get(`/reports/monthly-close?month=${month}&year=${year}`);
      return (res as { data: MonthlyCloseData }).data as MonthlyCloseData;
    },
  });

  // ── Exportar Excel ──
  const handleExportExcel = () => {
    if (!data) return;
    const { summary, topProducts, waiters, paymentMethods, salesByDay } = data;
    exportToExcelMultiSheet([
      {
        name: 'Resumen',
        columns: [
          { header: 'Concepto', key: 'label', width: 30 },
          { header: 'Valor',    key: 'value', width: 20 },
        ],
        data: [
          { label: 'Ventas Totales',    value: summary.totalSales },
          { label: 'N° Pedidos',        value: summary.totalOrders },
          { label: 'Ticket Promedio',   value: summary.averageTicket },
          { label: 'Total Descuentos',  value: summary.totalDiscount },
          { label: 'Total Impuestos',   value: summary.totalTax },
          { label: 'Neto',              value: summary.totalNet },
        ],
      },
      {
        name: 'Top Productos',
        columns: [
          { header: 'Producto', key: 'name',  width: 30 },
          { header: 'Cantidad', key: 'qty',   width: 15 },
          { header: 'Total',    key: 'total', width: 18 },
        ],
        data: topProducts,
      },
      {
        name: 'Meseros',
        columns: [
          { header: 'Mesero',   key: 'name',   width: 25 },
          { header: 'Pedidos',  key: 'orders', width: 15 },
          { header: 'Total',    key: 'total',  width: 18 },
        ],
        data: waiters,
      },
      {
        name: 'Ventas por Día',
        columns: [
          { header: 'Día',    key: 'day',   width: 10 },
          { header: 'Ventas', key: 'total', width: 18 },
        ],
        data: Object.entries(salesByDay).map(([day, total]) => ({ day, total })),
      },
      {
        name: 'Métodos de Pago',
        columns: [
          { header: 'Método', key: 'method', width: 25 },
          { header: 'Total',  key: 'total',  width: 18 },
        ],
        data: Object.entries(paymentMethods).map(([method, total]) => ({ method, total })),
      },
    ], `CierreMes_${MONTHS[month - 1]}_${year}`);
  };

  // ── Exportar PDF ──
  const handleExportPdf = () => {
    if (!data) return;
    exportToPdf(
      data.topProducts.map((p) => ({
        producto: p.name,
        cantidad: p.qty,
        total: formatCurrency(p.total),
      })),
      [
        { header: 'Producto', dataKey: 'producto', width: 80 },
        { header: 'Qty',      dataKey: 'cantidad', width: 20 },
        { header: 'Total',    dataKey: 'total',    width: 35 },
      ],
      {
        title: `Cierre de Mes — ${MONTHS[month - 1]} ${year}`,
        subtitle: `Ventas: ${data.summary.totalSalesFormatted}  |  Pedidos: ${data.summary.totalOrders}  |  Ticket prom.: ${data.summary.averageTicketFormatted}`,
        fileName: `CierreMes_${MONTHS[month - 1]}_${year}`,
        orientation: 'portrait',
      }
    );
  };

  // ── Loading / Error ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        No se pudo cargar el cierre de mes.
      </div>
    );
  }

  const { period, summary, comparison, topProducts, salesByDay, paymentMethods, waiters } = data;

  const salesByDayArr = Object.entries(salesByDay)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, total]) => ({ day: `Día ${day}`, total }));

  const paymentPie = Object.entries(paymentMethods).map(([name, value], i) => ({
    name, value, fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">

      {/* ── Selector período ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <Calendar className="w-4 h-4 text-orange-500" />
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Ventas Totales"
          value={summary.totalSalesFormatted}
          sub={comparison.growthSales + ' vs mes ant.'}
          color="orange"
          isGrowth={comparison.isGrowth}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Pedidos"
          value={summary.totalOrders.toLocaleString('es-CL')}
          sub={comparison.growthOrders + ' vs mes ant.'}
          color="blue"
          isGrowth={comparison.isGrowth}
        />
        <KpiCard
          icon={CreditCard}
          label="Ticket Promedio"
          value={summary.averageTicketFormatted}
          sub={`${period.days} días activos`}
          color="purple"
        />
        <KpiCard
          icon={Percent}
          label="Total Descuentos"
          value={formatCurrency(summary.totalDiscount)}
          sub={`IVA: ${summary.totalTaxFormatted}`}
          color="red"
        />
      </div>

      {/* ── Neto + comparativa ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-1">Neto del Mes</p>
          <p className="text-3xl font-black text-orange-700">{summary.totalNetFormatted}</p>
          <p className="text-xs text-orange-500 mt-1">(Ventas − IVA)</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Comparativa con mes anterior</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">Ventas mes ant.</p>
              <p className="text-lg font-bold text-gray-700">{formatCurrency(comparison.prevSales)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pedidos mes ant.</p>
              <p className="text-lg font-bold text-gray-700">{comparison.prevOrders}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Crecimiento ventas</p>
              <p className={`text-lg font-bold ${comparison.isGrowth ? 'text-green-600' : 'text-red-500'}`}>
                {comparison.growthSales}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Crecimiento pedidos</p>
              <p className={`text-lg font-bold ${comparison.isGrowth ? 'text-green-600' : 'text-red-500'}`}>
                {comparison.growthOrders}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ventas por día ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-5">
          Ventas diarias — {MONTHS[month - 1]} {year}
        </h3>
        {salesByDayArr.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin ventas registradas</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesByDayArr} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Ventas']}
              />
              <Bar dataKey="total" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top productos + Métodos de pago ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top productos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900">Top 10 Productos</h3>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Producto', 'Qty', 'Total'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.map((p, i) => (
                  <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.qty}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{formatCurrency(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Métodos de pago */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-gray-900">Métodos de Pago</h3>
          </div>
          {paymentPie.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentPie} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {paymentPie.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), '']}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Rendimiento meseros ── */}
      {waiters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-gray-900">Rendimiento Meseros</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Mesero', 'Pedidos', 'Total Ventas', 'Ticket Prom.'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {waiters.map((w) => (
                <tr key={w.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{w.name}</td>
                  <td className="px-4 py-3 text-gray-600">{w.orders}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(w.total)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {w.orders > 0 ? formatCurrency(w.total / w.orders) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
