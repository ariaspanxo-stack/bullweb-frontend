import { useState, useCallback } from 'react';
import type { Sale } from '@/types/sales.types';
import { SalesTable } from '@/pages/Sales/SalesTable';
import { SaleDetailPanel } from './SaleDetailPanel';

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
  return (
    <div className="flex gap-6" style={{ minHeight: '600px' }}>
      {/* MASTER: Lista de ventas (65%) */}
      <div className="flex-[65] min-w-0 flex flex-col">
        <SalesTable
          sales={sales}
          selectedSale={selectedSale}
          onSelectSale={onSelectSale}
          dateRange={dateRange}
          totalCount={totalCount}
        />
      </div>

      {/* DETAIL: Panel lateral fijo (35%) */}
      <div className="flex-[35] min-w-[420px] max-w-[500px]">
        <SaleDetailPanel
          sale={selectedSale}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}
