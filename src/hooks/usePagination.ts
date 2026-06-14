import { useState, useMemo, useEffect } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type SortField = 'name' | 'price' | 'cost' | 'currentStock' | 'createdAt' | null;

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
  initialSortField?: SortField;
  initialSortDirection?: SortDirection;
}

interface UsePaginationReturn<T> {
  // Datos paginados
  currentItems: T[];
  
  // Paginación
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  
  // Navegación
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setItemsPerPage: (items: number) => void;
  
  // Ordenamiento
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  
  // Estados
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export function usePagination<T extends Record<string, any>>({
  data,
  itemsPerPage: initialItemsPerPage = 10,
  initialSortField = null,
  initialSortDirection = null,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [sortField, setSortField] = useState<SortField>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortField || !sortDirection) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Manejo especial para fechas
      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Manejo especial para strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  // Calcular totales
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Obtener items de la página actual
  const currentItems = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  // Resetear a página 1 cuando cambian los datos o filtros
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Navegación
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const previousPage = () => goToPage(currentPage - 1);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);

  const handleSetItemsPerPage = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset a primera página
  };

  // Ordenamiento
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Ciclo: asc → desc → null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset a primera página al ordenar
  };

  return {
    // Datos
    currentItems,
    
    // Paginación
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    startIndex,
    endIndex,
    
    // Navegación
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage: handleSetItemsPerPage,
    
    // Ordenamiento
    sortField,
    sortDirection,
    handleSort,
    
    // Estados
    canGoNext: currentPage < totalPages,
    canGoPrevious: currentPage > 1,
  };
}
