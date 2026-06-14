/**
 * BULLWEB — Excel Export Utility (SheetJS)
 * Uso: exportToExcel([{ sheetName, rows }], 'Reporte Ventas')
 */
import * as XLSX from 'xlsx';

export interface ExcelSheet {
  /** Nombre de la hoja */
  sheetName: string;
  /** Filas: array de objetos cuyas keys son las columnas */
  rows: Record<string, unknown>[];
  /** Ancho de columnas en caracteres (opcional) */
  colWidths?: number[];
}

/**
 * Genera y descarga un archivo .xlsx con una o varias hojas.
 * @param sheets  Definición de hojas
 * @param fileName  Nombre sin extensión
 */
export function exportToExcel(sheets: ExcelSheet[], fileName: string): void {
  const wb = XLSX.utils.book_new();

  for (const { sheetName, rows, colWidths } of sheets) {
    if (!rows.length) {
      // Hoja vacía con mensaje si no hay datos
      const ws = XLSX.utils.aoa_to_sheet([['Sin datos en el período seleccionado']]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      continue;
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Ajustar anchos de columna automáticos
    const keys = Object.keys(rows[0]);
    ws['!cols'] = colWidths
      ? colWidths.map(w => ({ wch: w }))
      : keys.map(k => {
          const maxLen = Math.max(
            k.length,
            ...rows.map(r => String(r[k] ?? '').length)
          );
          return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
        });

    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel max 31 chars
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileName}_${date}.xlsx`);
}

/**
 * Shortcut para exportar una sola hoja.
 */
export function exportSheet(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName = 'Datos'
): void {
  exportToExcel([{ sheetName, rows }], fileName);
}

/** Formatea número como moneda CLP para las celdas Excel */
export function clp(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Formatea fecha ISO a dd/mm/yyyy hh:mm */
export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** Formatea fecha ISO a dd/mm/yyyy */
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso));
}
