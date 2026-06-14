import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  format?: 'currency' | 'percent' | 'number' | 'text';
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
  fileName: string,
  sheetName = 'Reporte'
): void {
  const header = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (col.format === 'currency') return Number(val);
      if (col.format === 'percent') return Number(val) / 100;
      return val;
    })
  );

  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ajustar anchos de columna
  ws['!cols'] = columns.map((c) => ({ wch: c.width ?? 18 }));

  // Estilo de encabezado — aplicable en xlsx pro; en free da igual
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Exporta múltiples hojas en un solo archivo.
 */
export function exportToExcelMultiSheet(
  sheets: { name: string; columns: ExcelColumn[]; data: Record<string, unknown>[] }[],
  fileName: string
): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const header = sheet.columns.map((c) => c.header);
    const rows = sheet.data.map((row) =>
      sheet.columns.map((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return '';
        return val;
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = sheet.columns.map((c) => ({ wch: c.width ?? 18 }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
