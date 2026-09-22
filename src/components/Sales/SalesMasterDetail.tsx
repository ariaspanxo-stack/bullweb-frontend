import { useState, useCallback, useEffect } from 'react';
import type { Sale } from '@/types/sales.types';
import { SalesTable } from '@/pages/Sales/SalesTable';
import { SaleDetailPanel } from './SaleDetailPanel';
import { X } from 'lucide-react';

interface SalesMasterDetailProps {
  sales: Sale[];
  selectedSale: Sale | null;
  onSelectSale: (sale: Sale) => void;
  dateRange?: { start: Date; end: Date };
  totalCount?: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export function SalesMasterDetail({
  sales,
  selectedSale,
  onSelectSale,
  dateRange,
  totalCount,
  loading,
  onRefresh
}: SalesMasterDetailProps) {
  // Móvil: el detalle se abre como drawer/bottom-sheet SOBRE la lista;
  // el desktop (lg+) queda INTACTO con el layout lado a lado.
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleSelectSale = useCallback((sale: Sale) => {
    onSelectSale(sale);
    setIsDetailOpen(true);
  }, [onSelectSale]);

  // Cerrar el drawer si se des-selecciona la venta (ej. refresh sin datos)
  useEffect(() => {
    if (!selectedSale) setIsDetailOpen(false);
  }, [selectedSale]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6" style={{ minHeight: '600px' }}>
      {/* MASTER: Lista de ventas (100% móvil / 65% desktop) */}
      <div className="flex-1 lg:flex-[65] min-w-0 flex flex-col">
        <SalesTable
          sales={sales}
          selectedSale={selectedSale}
          onSelectSale={handleSelectSale}
          dateRange={dateRange}
          totalCount={totalCount}
        />
      </div>

      {/* DETAIL — Desktop: panel lateral fijo (35%, INTACTO) */}
      <div className="hidden lg:block lg:flex-[35] min-w-0 max-w-[500px]">
        <SaleDetailPanel
          sale={selectedSale}
          onRefresh={onRefresh}
        />
      </div>

      {/* DETAIL — Móvil: bottom-sheet colapsable sobre la lista */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          isDetailOpen && selectedSale ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsDetailOpen(false)}
        />
        {/* Bottom-sheet */}
        <div
          className={`absolute bottom-0 left-0 right-0 max-h-[85vh] flex flex-col rounded-t-2xl border-t border-white/10 bg-gray-950 transition-transform duration-300 ${
            isDetailOpen && selectedSale ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Handle del bottom-sheet */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2" />
            <button
              onClick={() => setIsDetailOpen(false)}
              className="ml-auto p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Cerrar detalle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <SaleDetailPanel
              sale={selectedSale}
              onRefresh={onRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
