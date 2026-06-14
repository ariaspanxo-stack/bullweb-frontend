import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import { Package } from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

// ============================================================================
// COMPONENTE DATA TABLE
// ============================================================================

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pagination,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  emptyDescription = 'No se encontraron registros para mostrar',
  className
}: DataTableProps<T>) {
  // Loading state
  if (loading) {
    return (
      <div className="w-full p-8 flex items-center justify-center">
        <Spinner size="lg" label="Cargando datos..." />
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((column, index) => (
                <th
                  key={`header-${index}`}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={cn('px-4 py-3 text-sm text-gray-900', column.className)}
                  >
                    {column.render
                      ? column.render(item)
                      : getNestedValue(item, column.key as string)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-700">
              Página <span className="font-medium">{pagination.page}</span> de{' '}
              <span className="font-medium">{pagination.totalPages}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={cn(
                'p-2 rounded-lg border transition-colors',
                pagination.page === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className={cn(
                'p-2 rounded-lg border transition-colors',
                pagination.page === pagination.totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// UTILIDAD PARA VALORES ANIDADOS
// ============================================================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

export function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[1, 2, 3, 4].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[1, 2, 3, 4].map((colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
