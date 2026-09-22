import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Sale } from '../../types/sales.types';
import { StatusBadge } from '@/components/Sales/StatusBadge';
import { cn } from '@/lib/utils';
import { FileDown, Clock, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Store } from 'lucide-react';
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
  const navigate = useNavigate();
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

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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
    <div className="bg-gray-900 border border-white/10 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      {/* HEADER CON CONTEXTO */}
      {dateRange && (
        <div className="px-4 py-3 border-b border-white/10 bg-gray-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-400">
              📅 <span className="font-medium text-white">{sales.filter(s => s.status !== 'cancelled').length} ventas</span>
              {sales.some(s => s.status === 'cancelled') && (
                <span className="text-gray-500 ml-1">
                  ({sales.filter(s => s.status === 'cancelled').length} anulada{sales.filter(s => s.status === 'cancelled').length !== 1 ? 's' : ''})
                </span>
              )}
              {' • '}
              <span className="hidden sm:inline">{formatDate(dateRange.start)} - {formatDate(dateRange.end)}</span>
              <span className="sm:hidden">{formatDate(dateRange.start)}</span>
            </p>
            <button
              onClick={() => handleExport(sales)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Exportar Excel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="bg-gray-800/60 border-b border-white/10">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Venta
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Tipo de Venta
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Fecha y Hora de Inicio
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Fecha y Hora de Cierre
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Garzón
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12">
                  {/* ESTADO VACÍO PREMIUM con CTA (patrón empty state de Productos) */}
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                      <Store className="w-8 h-8 text-brand-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white">Aún no hay ventas</p>
                      <p className="text-sm text-gray-400 max-w-xs mx-auto">
                        Cuando cobres en Restaurant, tus ventas aparecerán aquí con todos sus detalles.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/restaurant')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-brand-500/25"
                    >
                      <Store className="w-4 h-4" />
                      Cobra tu primera venta en Restaurant
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSales.map((sale, index) => (
                <tr
                  key={sale.id}
                  onClick={() => onSelectSale(sale)}
                  className={cn(
                    'cursor-pointer transition-all hover:bg-white/5',
                    selectedSale?.id === sale.id && 'bg-brand-500/10 border-l-4 border-l-brand-500 font-medium',
                    sale.status === 'cancelled' && 'opacity-50'
                  )}
                >
                  {/* NÚMERO DE VENTA */}
                  <td className="px-3 sm:px-4 py-3 text-sm font-medium text-white">
                    {sale.saleNumber ?? `#${(page - 1) * PAGE_SIZE + index + 1}`}
                  </td>

                  {/* TIPO DE VENTA */}
                  <td className="hidden sm:table-cell px-4 py-3 text-sm">
                    {sale.type === 'delivery' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-xs font-medium">
                        🚴 Delivery
                      </span>
                    ) : sale.tableNumber ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs font-medium">
                        👨‍🍳 Mesa {sale.tableNumber}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded text-xs font-medium">
                        🛍️ Mostrador
                      </span>
                    )}
                  </td>

                  {/* FECHA Y HORA */}
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-400">
                    {formatDateTime(sale.createdAt)}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-400">
                    {formatDateTime(sale.updatedAt)}
                  </td>

                  {/* GARZÓN */}
                  <td className="hidden lg:table-cell px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-xs font-semibold">
                        {(sale.waiterName || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-300">{sale.waiterName || '—'}</span>
                    </div>
                  </td>

                  {/* CLIENTE */}
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-300">
                    {sale.customerName || 
                      <span className="text-gray-500">Público</span>
                    }
                  </td>

                  {/* ESTADO */}
                  <td className="px-3 sm:px-4 py-3">
                    <StatusBadge status={sale.status as import('../../types/sales.types').SaleStatus} />
                    {/* Mejora B — badge deuda para ventas abiertas sin pago completo */}
                    {sale.status === 'open' && (() => {
                      const paid = (sale.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);
                      const deuda = sale.total - paid;
                      return deuda > 0 ? (
                        <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Debe {formatCurrency(deuda)}
                        </span>
                      ) : null;
                    })()}
                  </td>

                  {/* TOTAL */}
                  <td className={`px-3 sm:px-4 py-3 text-sm text-right font-semibold tabular-nums ${
                    sale.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-gray-800/60">
          <span className="text-xs text-gray-500">
            Pág. {page} / {totalPages} &bull; {sales.length} registros
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)}           disabled={page === 1}          className="p-1.5 rounded hover:bg-white/10 text-gray-400 disabled:opacity-30"><ChevronsLeft  className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}          className="p-1.5 rounded hover:bg-white/10 text-gray-400 disabled:opacity-30"><ChevronLeft   className="w-4 h-4" /></button>
            <span className="px-2 py-1 text-xs font-semibold bg-brand-500 text-white rounded">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded hover:bg-white/10 text-gray-400 disabled:opacity-30"><ChevronRight  className="w-4 h-4" /></button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded hover:bg-white/10 text-gray-400 disabled:opacity-30"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};
