import { FileDown, Loader2, Tag } from 'lucide-react';
import { exportSheet } from '@/utils/exportExcel';
import type { Sale } from '@/types/sales.types';

interface Props {
  sales:       Sale[];
  isLoading?:  boolean;
  hasSearched?: boolean;
}

export const TabDescuentos = ({ sales, isLoading, hasSearched }: Props) => {
  const discounts = sales.filter(s =>
    s.discount > 0 &&
    s.status !== 'cancelled' &&
    s.status !== 'CANCELLED' &&
    s.status !== 'ANULADA'
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const totalDiscounts = discounts.reduce((sum, s) => sum + s.discount, 0);

  const formatType = (type?: string | null) => {
    if (!type) return 'Descuento';
    return type === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Monto Fijo ($)';
  };

  const handleExport = () => {
    exportSheet(
      discounts.map(s => ({
        'Fecha/Hora':     formatDateTime(s.createdAt),
        'Orden':          s.saleNumber,
        'Mesa':           s.tableNumber || '—',
        'Tipo':           formatType(s.discountType),
        'Autorizado por': s.waiterName,
        'Monto (CLP)':    s.discount,
        'Monto fmt':      formatCurrency(s.discount),
      })),
      `descuentos_${new Date().toISOString().slice(0,10)}`,
      'Descuentos',
    );
  };

  return (
    <div className="space-y-6">
      {/* Estado: aún no se ha buscado */}
      {!hasSearched && !isLoading && discounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Tag className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            Selecciona un período en la pestaña Ventas
          </p>
          <p className="text-xs text-gray-400">
            Los descuentos se filtran del resultado de ventas cargado
          </p>
        </div>
      )}

      {/* Estado: cargando */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
      )}

      {/* Contenido normal — solo si hay datos o ya se buscó */}
      {!isLoading && hasSearched && (
        <>
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <FileDown className="w-4 h-4" /> Exportar Excel
        </button>
      </div>
      {/* Resumen */}
      <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500 max-w-md">
        <p className="text-sm text-gray-600 mb-1">Total Descuentos Aplicados</p>
        <p className="text-3xl font-bold text-red-700">
          {formatCurrency(totalDiscounts)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {discounts.length} descuento{discounts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {discounts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Sin descuentos en el período seleccionado</p>
          </div>
        ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Orden</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mesa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Autorizado por</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {discounts.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(sale.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-gray-700 font-medium">{sale.saleNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{sale.tableNumber || '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700">
                    {formatType(sale.discountType)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-medium">{sale.waiterName}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                  {sale.discountType === 'PERCENTAGE' && (sale as any).discountValue
                    ? `${(sale as any).discountValue}% → -${formatCurrency(sale.discount)}`
                    : `-${formatCurrency(sale.discount)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
        </>
      )}
    </div>
  );
};
