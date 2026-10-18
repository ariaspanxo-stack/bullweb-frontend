import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

// Hotfix #258: 24 por página por defecto en Productos
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
  canGoNext,
  canGoPrevious,
}) => {
  // Generar números de página visibles (máximo 7)
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (currentPage <= 3) {
      pages.push(2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push('...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Información de items */}
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-700">
            Mostrando{' '}
            <span className="font-medium">{startIndex + 1}</span>
            {' - '}
            <span className="font-medium">{endIndex}</span>
            {' de '}
            <span className="font-medium">{totalItems}</span>
            {' resultados'}
          </p>

          {/* Selector de items por página */}
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
              Por página:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#F97316] h-11"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Controles de navegación */}
        <div className="flex items-center gap-2">
          {/* Primera página */}
          <button
            onClick={onFirstPage}
            disabled={!canGoPrevious}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Primera página"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Página anterior */}
          <button
            onClick={onPreviousPage}
            disabled={!canGoPrevious}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Números de página */}
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-3 py-2 text-gray-500"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`min-w-[44px] h-11 px-3 rounded-lg text-sm font-semibold transition-colors ${
                    currentPage === page
                      ? 'bg-[#FFF7ED] border-[1.5px] border-[#F97316] text-[#C2410C]'
                      : 'border-[1.5px] border-[#CBD5E1] text-[#1E2A4A] hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Indicador mobile */}
          <div className="sm:hidden px-3 py-2 text-sm text-gray-700 font-medium">
            {currentPage} / {totalPages}
          </div>

          {/* Página siguiente */}
          <button
            onClick={onNextPage}
            disabled={!canGoNext}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Última página */}
          <button
            onClick={onLastPage}
            disabled={!canGoNext}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Última página"
          >
            <ChevronsRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
