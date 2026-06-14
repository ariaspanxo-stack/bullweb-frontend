import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PdfOptions {
  title?: string;
  subtitle?: string;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  primaryColor?: [number, number, number]; // RGB
}

export function exportToPdf(
  data: Record<string, unknown>[],
  columns: PdfColumn[],
  options: PdfOptions = {}
): void {
  const {
    title = 'Reporte',
    subtitle,
    fileName = 'reporte',
    orientation = 'portrait',
    primaryColor = [37, 99, 235],
  } = options;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 14);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 20);
  }
  doc.setTextColor(0, 0, 0);

  const tableColumns = columns.map((c) => ({ header: c.header, dataKey: c.dataKey }));
  const tableRows = data.map((row) =>
    columns.reduce(
      (acc, col) => {
        const val = row[col.dataKey];
        acc[col.dataKey] = val !== null && val !== undefined ? String(val) : '';
        return acc;
      },
      {} as Record<string, string>
    )
  );

  autoTable(doc, {
    startY: 28,
    head: [tableColumns.map((c) => c.header)],
    body: tableRows.map((row) => tableColumns.map((c) => row[c.dataKey])),
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
    columnStyles: columns.reduce(
      (acc, col, idx) => {
        if (col.width) acc[idx] = { cellWidth: col.width };
        return acc;
      },
      {} as Record<number, { cellWidth: number }>
    ),
  });

  // Pie de página
  const pageCount = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    const now = new Date().toLocaleString('es-CL');
    doc.text(`Generado: ${now}  —  Página ${i}/${pageCount}`, 14, doc.internal.pageSize.getHeight() - 5);
  }

  doc.save(`${fileName}.pdf`);
}
