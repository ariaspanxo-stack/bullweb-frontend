import { formatCurrency } from '@/lib/utils';
import { useReports, PURCHASES_PAGE_SIZE } from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { Truck, DollarSign, Package } from 'lucide-react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export function ComprasTab() {
  const {
    purchasesData, purchasesMeta, purchasesLoading,
    purchasesPage, setPurchasesPage,
  } = useReports();

  if (purchasesLoading) return <Spinner />;
  if ((purchasesData ?? []).length === 0) return <EmptyState message="Sin compras registradas en el período" />;

  const list    = purchasesData ?? [];
  const total   = list.reduce((s: number, p: any) => s + (Number(p.unitCost ?? 0) * Number(p.quantity ?? 0)), 0);
  const totalQ  = list.reduce((s: number, p: any) => s + Number(p.quantity ?? 0), 0);
  const totalPages = purchasesMeta ? Math.ceil(purchasesMeta.total / PURCHASES_PAGE_SIZE) : 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Nº Compras',        value: list.length.toString(), Icon: Truck,      color: 'bg-blue-100 text-blue-600'    },
          { label: 'Total Invertido',    value: formatCurrency(total),  Icon: DollarSign, color: 'bg-orange-100 text-orange-600' },
          { label: 'Unidades Compradas', value: totalQ.toFixed(0),      Icon: Package,    color: 'bg-green-100 text-green-600'  },
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Historial de Compras</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha', 'Ingrediente', 'Cantidad', 'Costo Unit.', 'Total', 'Referencia', 'Notas'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((p: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.ingredients?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{p.quantity} {p.ingredients?.unit}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCurrency(Number(p.unitCost) || 0)}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency((Number(p.unitCost) || 0) * (Number(p.quantity) || 0))}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{p.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {purchasesMeta && purchasesMeta.total > PURCHASES_PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-2xl">
          <span className="text-xs text-gray-400">
            Mostrando <span className="font-semibold text-gray-600">{(purchasesPage - 1) * PURCHASES_PAGE_SIZE + 1}–{Math.min(purchasesPage * PURCHASES_PAGE_SIZE, purchasesMeta.total)}</span> de <span className="font-semibold text-gray-600">{purchasesMeta.total}</span> compras
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPurchasesPage(1)} disabled={purchasesPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsLeft className="w-4 h-4" /></button>
            <button onClick={() => setPurchasesPage(p => p - 1)} disabled={purchasesPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-gray-600 px-2"><span className="font-bold">{purchasesPage}</span> / <span className="font-bold">{totalPages}</span></span>
            <button onClick={() => setPurchasesPage(p => p + 1)} disabled={purchasesPage >= totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setPurchasesPage(totalPages)} disabled={purchasesPage >= totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
