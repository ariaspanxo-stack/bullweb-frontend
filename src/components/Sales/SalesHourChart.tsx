import { useMemo } from 'react';
import type { Sale } from '../../types/sales.types';

interface Props {
  sales: Sale[];
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  efectivo: 'Efectivo',
  card: 'Tarjeta',
  tarjeta: 'Tarjeta',
  credit: 'Tarjeta Crédito',
  credito: 'Tarjeta Crédito',
  debit: 'Tarjeta Débito',
  debito: 'Tarjeta Débito',
  transfer: 'Transferencia',
  transferencia: 'Transferencia',
  bank_transfer: 'Transferencia',
  mercadopago: 'MercadoPago',
  online: 'Pago Online',
  mixed: 'Mixto',
  mixto: 'Mixto',
};

const METHOD_COLORS: Record<string, string> = {
  cash: 'bg-emerald-500',
  efectivo: 'bg-emerald-500',
  card: 'bg-blue-500',
  tarjeta: 'bg-blue-500',
  credit: 'bg-indigo-500',
  credito: 'bg-indigo-500',
  debit: 'bg-sky-500',
  debito: 'bg-sky-500',
  transfer: 'bg-violet-500',
  transferencia: 'bg-violet-500',
  bank_transfer: 'bg-violet-500',
  mercadopago: 'bg-cyan-500',
  online: 'bg-teal-500',
  mixed: 'bg-gray-500',
  mixto: 'bg-gray-500',
};

export const SalesHourChart = ({ sales }: Props) => {
  const activeSales = sales.filter(s => s.status !== 'cancelled' && s.status !== 'CANCELLED');

  const { byMethod, totalMonto, totalVentas } = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    let total = 0;

    activeSales.forEach(s => {
      const payments = s.payments ?? [];
      if (payments.length === 0) {
        const m = 'otro';
        if (!map[m]) map[m] = { count: 0, total: 0 };
        map[m].count += 1;
        map[m].total += s.total;
        total += s.total;
        return;
      }
      payments.forEach(p => {
        const method = (p.method || 'otro').toLowerCase().trim();
        if (!map[method]) map[method] = { count: 0, total: 0 };
        map[method].count += 1;
        map[method].total += p.amount;
        total += p.amount;
      });
    });

    return { byMethod: map, totalMonto: total, totalVentas: activeSales.length };
  }, [activeSales]);

  const formatCLP = (v: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

  const methods = Object.entries(byMethod).sort((a, b) => b[1].total - a[1].total);

  if (methods.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Desglose por Medio de Pago</h3>

      {/* Resumen total */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Ventas</p>
          <p className="text-lg font-bold text-gray-800">{totalVentas}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Monto</p>
          <p className="text-lg font-bold text-emerald-600">{formatCLP(totalMonto)}</p>
        </div>
      </div>

      {/* Tabla de métodos de pago */}
      <div className="space-y-1.5">
        {methods.map(([method, data]) => {
          const pct = totalMonto > 0 ? (data.total / totalMonto * 100) : 0;
          const label = METHOD_LABELS[method] || method.charAt(0).toUpperCase() + method.slice(1);
          const color = METHOD_COLORS[method] || 'bg-gray-400';

          return (
            <div key={method} className="flex items-center gap-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm font-bold text-gray-800">{formatCLP(data.total)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
                <span className="text-[10px] text-gray-400">{data.count} venta{data.count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};