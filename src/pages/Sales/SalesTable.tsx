import { useState, useEffect, useMemo } from 'react';
import type { Sale } from '../../types/sales.types';
import { StatusBadge } from '@/components/Sales/StatusBadge';
import { cn } from '@/lib/utils';
import { FileDown, Clock, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { exportSheet, clp, fmtDateTime } from '@/utils/exportExcel';

const PAGE_SIZE = 25;

interface Props {
  sales: Sale[];
  selectedSale: Sale | null;
  onSelectSale: (sale: Sale) => void;
  dateRange?: { start: Date; end: Date };
  totalCount?: number;
}

const ESTADO_LABEL: Record<string, string> = {
  closed: 'Cerrada', PAID: 'Cerrada',
  cancelled: 'Anulada', CANCELLED: 'Anulada', ANULADA: 'Anulada',
  open: 'Abierta', PENDING: 'Abierta', PREPARING: 'Abierta', READY: 'Abierta',
  paying: 'Pagando', DELIVERED: 'Pagando',
};

function handleExport(sales: Sale[]) {
  exportSheet(
    sales.map(s => ({
      'N° Venta':       s.saleNumber ?? `#${s.id.slice(0, 8)}`,
      'Fecha/Hora':     fmtDateTime(s.startTime),
      'Tipo de Venta':  s.type === 'delivery' ? 'Delivery' : s.tableNumber ? `Mesa ${s.tableNumber}` : 'Mostrador',
      'Garzón':         s.waiterName,
      'Cliente':        s.customerName ?? 'Público',
      'Estado':         ESTADO_LABEL[s.status] ?? s.status,
      'Total (CLP)':    s.total,
      'Total fmt':      clp(s.total),
    })),
    'Ventas'
  );
}

export const SalesTable = ({ 
  sales, 
  selectedSale, 
  onSelectSale,
  dateRange,
  totalCount 
}: Props) => {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [sales]);

  const totalPages    = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const paginatedSales = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sales.slice(start, start + PAGE_SIZE);
  }, [sales, page]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(date));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* HEADER CON CONTEXTO */}
      {dateRange && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              📅 <span className="font-medium text-gray-900">{sales.filter(s => s.status !== 'cancelled').length} ventas</span>
              {sales.some(s => s.status === 'cancelled') && (
                <span className="text-gray-400 ml-1">
                  ({sales.filter(s => s.status === 'cancelled').length} anulada{sales.filter(s => s.status === 'cancelled').length !== 1 ? 's' : ''})
                </span>
              )}
              {' • '}
              {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </p>
            <button
              onClick={() => handleExport(sales)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Exportar Excel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Venta
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tipo de Venta
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Garzón
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No hay ventas para mostrar
                </td>
              </tr>
            ) : (
              paginatedSales.map((sale, index) => (
                <tr
                  key={sale.id}
                  onClick={() => onSelectSale(sale)}
                  className={cn(
                    'cursor-pointer transition-all hover:bg-gray-50',
                    selectedSale?.id === sale.id && 'bg-yellow-50 border-l-4 border-l-orange-500 font-medium',
                    sale.status === 'cancelled' && 'opacity-50'
                  )}
                >
                  {/* NÚMERO DE VENTA */}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {sale.saleNumber ?? `#${(page - 1) * PAGE_SIZE + index + 1}`}
                  </td>

                  {/* TIPO DE VENTA */}
                  <td className="px-4 py-3 text-sm">
                    {sale.type === 'delivery' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                        🚴 Delivery
                      </span>
                    ) : sale.tableNumber ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        👨‍🍴 Mesa {sale.tableNumber}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        🛍️ Mostrador
                      </span>
                    )}
                  </td>

                  {/* HORA */}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatTime(sale.startTime)}
                  </td>

                  {/* GARZÓN */}
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold">
                        {(sale.waiterName || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-700">{sale.waiterName || '—'}</span>
                    </div>
                  </td>

                  {/* CLIENTE */}
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {sale.customerName || 
                      <span className="text-gray-400">Público</span>
                    }
                  </td>

                  {/* ESTADO */}
                  <td className="px-4 py-3">
                    <StatusBadge status={sale.status} />
                    {/* Mejora B — badge deuda para ventas abiertas sin pago completo */}
                    {sale.status === 'open' && (() => {
                      const paid = (sale.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);
                      const deuda = sale.total - paid;
                      return deuda > 0 ? (
                        <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Debe {formatCurrency(deuda)}
                        </span>
                      ) : null;
                    })()}
                  </td>

                  {/* TOTAL */}
                  <td className={`px-4 py-3 text-sm text-right font-semibold ${
                    sale.status === 'cancelled' ? 'text-red-400 line-through' : 'text-gray-900'
                  }`}>
                    {formatCurrency((sale as any).originalTotal ?? sale.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            Pág. {page} / {totalPages} &bull; {sales.length} registros
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)}           disabled={page === 1}          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronsLeft  className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft   className="w-4 h-4" /></button>
            <span className="px-2 py-1 text-xs font-semibold bg-orange-500 text-white rounded">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight  className="w-4 h-4" /></button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};
