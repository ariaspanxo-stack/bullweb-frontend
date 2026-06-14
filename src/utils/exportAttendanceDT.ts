/**
 * BULLWEB — Libro de Asistencia Digital (Decreto 101, Dirección del Trabajo Chile)
 * Genera un Excel con 2 hojas:
 *   Hoja 1 "Registros"  — 1 fila por jornada completa (entrada + colación + salida)
 *   Hoja 2 "Resumen"    — resumen mensual por empleado
 *
 * Requiere: exceljs (npm install exceljs)
 */
import ExcelJS from 'exceljs';

// ── Colores DT ────────────────────────────────────────────────────────────────
const COLOR_HEADER_BG   = '1F3864';   // azul oscuro
const COLOR_HEADER_FG   = 'FFFFFF';   // blanco
const COLOR_ROW_ALT     = 'F2F2F2';   // gris claro (filas pares)
const COLOR_ROW_WHITE   = 'FFFFFF';   // blanco (filas impares)
const COLOR_MISSING     = 'FFF2CC';   // amarillo pálido (sin registro)
const COLOR_MISSING_FG  = '7F6000';   // texto amarillo oscuro
const COLOR_TITLE_BG    = '2F5496';   // azul más oscuro para encabezado libro

// ── Tipos internos ────────────────────────────────────────────────────────────
export interface AttendanceRawRecord {
  employeeId:       string;
  employeeName:     string;
  type:             string;   // ENTRADA | ENTRY | SALIDA | EXIT | SALIDA_COLACION | ENTRADA_COLACION
  timestamp:        string;   // ISO
  colacion_inicio?: string;
  colacion_fin?:    string;
  method?:          string;
  ip_origen?:       string;
  device_info?:     string;
  notes?:           string;
}

export interface EmployeeInfo {
  id:            string;
  name:          string;
  rut?:          string;
  cargo?:        string;
  tipo_contrato?: string;
  shift?:        string;
}

export interface EstablishmentInfo {
  razonSocial?: string;
  rut?:         string;
  direccion?:   string;
}

interface Jornada {
  employeeId:      string;
  employeeName:    string;
  rut:             string;
  cargo:           string;
  tipoContrato:    string;
  turno:           string;
  fecha:           string;   // dd/mm/yyyy
  diaSemana:       string;
  horaEntrada:     string;
  salidaColacion:  string;
  entradaColacion: string;
  horaSalida:      string;
  horasTrabajadas: string;
  horasExtras:     string;
  metodo:          string;
  ipOrigen:        string;
  observaciones:   string;
  _incomplete:     boolean;  // true → celda amarilla
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function fmt24h(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('es-CL', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Santiago',
    });
  } catch { return ''; }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    // toLocaleString en America/Santiago
    const loc = d.toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric' });
    return loc;
  } catch { return ''; }
}

function localDateKey(iso: string): string {
  // "2025-03-15" en zona Chile
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
            .split('/').reverse().join('-'); // yyyy-mm-dd
  } catch { return iso.slice(0, 10); }
}

function calcMinutos(desde: string | undefined, hasta: string | undefined): number {
  if (!desde || !hasta) return 0;
  const ms = new Date(hasta).getTime() - new Date(desde).getTime();
  return ms > 0 ? Math.floor(ms / 60_000) : 0;
}

function minToHHMM(min: number): string {
  if (min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function shiftLabel(s?: string): string {
  if (!s) return '';
  if (s === 'morning')   return 'Mañana';
  if (s === 'afternoon') return 'Tarde';
  if (s === 'night')     return 'Noche';
  return s;
}

// Normaliza el type de registro a categoría canónica
function categorize(type: string): 'ENTRADA' | 'SALIDA_COL' | 'ENTRADA_COL' | 'SALIDA' | 'OTHER' {
  const t = type.toUpperCase();
  if (t === 'ENTRADA' || t === 'ENTRY' || t === 'IN')               return 'ENTRADA';
  if (t === 'SALIDA'  || t === 'EXIT'  || t === 'OUT')              return 'SALIDA';
  if (t === 'SALIDA_COLACION'  || t === 'BREAK_START')              return 'SALIDA_COL';
  if (t === 'ENTRADA_COLACION' || t === 'BREAK_END')                return 'ENTRADA_COL';
  return 'OTHER';
}

// ── Lógica de agrupación ──────────────────────────────────────────────────────
function agruparJornadas(
  records: AttendanceRawRecord[],
  empMap: Map<string, EmployeeInfo>
): Jornada[] {
  // Agrupar por (employeeId, fecha_local)
  const groups = new Map<string, AttendanceRawRecord[]>();
  for (const r of records) {
    const key = `${r.employeeId}__${localDateKey(r.timestamp)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const jornadas: Jornada[] = [];

  for (const [key, recs] of groups.entries()) {
    const [empId] = key.split('__');
    const emp = empMap.get(empId);
    const sample = recs[0];

    // Buscar cada tipo dentro del grupo (tomar el primero si hay duplicados)
    let entrada:      AttendanceRawRecord | undefined;
    let salidaCol:   AttendanceRawRecord | undefined;
    let entradaCol:  AttendanceRawRecord | undefined;
    let salida:      AttendanceRawRecord | undefined;

    for (const r of recs) {
      const cat = categorize(r.type);
      if (cat === 'ENTRADA'     && !entrada)     entrada     = r;
      if (cat === 'SALIDA_COL'  && !salidaCol)  salidaCol   = r;
      if (cat === 'ENTRADA_COL' && !entradaCol) entradaCol  = r;
      if (cat === 'SALIDA'      && !salida)     salida      = r;
    }

    // También intentar extraer colación desde campos directos del registro de ENTRADA
    const colIni = salidaCol?.timestamp ?? entrada?.colacion_inicio ?? undefined;
    const colFin = entradaCol?.timestamp ?? entrada?.colacion_fin ?? undefined;

    // Calcular horas trabajadas netas
    const colMin = calcMinutos(colIni, colFin);
    const totalMin = entrada && salida
      ? Math.max(0, calcMinutos(entrada.timestamp, salida.timestamp) - colMin)
      : 0;

    // Horas extras (más de 9h = 540 min estándar Chile)
    const JORNADA_NORMAL = 9 * 60;
    const extrasMin = totalMin > JORNADA_NORMAL ? totalMin - JORNADA_NORMAL : 0;

    const incomplete = !entrada || !salida;

    // Fecha desde timestamp de entrada o primer registro
    const refTs = entrada?.timestamp ?? sample.timestamp;
    const fecha = fmtDate(refTs);
    const diaSemana = DIAS[new Date(refTs).getDay()];

    // Método — priorizar el de entrada
    const metodo = (entrada?.method ?? salida?.method ?? sample.method ?? 'KIOSK').toUpperCase();
    const ip = entrada?.ip_origen ?? salida?.ip_origen ?? sample.ip_origen ?? '';
    const notas = [entrada?.notes, salida?.notes].filter(Boolean).join(' | ');

    jornadas.push({
      employeeId:      empId,
      employeeName:    sample.employeeName ?? emp?.name ?? '',
      rut:             emp?.rut ?? '',
      cargo:           emp?.cargo ?? '',
      tipoContrato:    emp?.tipo_contrato ?? '',
      turno:           shiftLabel(emp?.shift),
      fecha,
      diaSemana,
      horaEntrada:     fmt24h(entrada?.timestamp),
      salidaColacion:  fmt24h(colIni),
      entradaColacion: fmt24h(colFin),
      horaSalida:      fmt24h(salida?.timestamp),
      horasTrabajadas: minToHHMM(totalMin),
      horasExtras:     minToHHMM(extrasMin),
      metodo,
      ipOrigen:        ip,
      observaciones:   notas,
      _incomplete:     incomplete,
    });
  }

  // Ordenar: por employeeName → fecha
  jornadas.sort((a, b) => {
    const ne = a.employeeName.localeCompare(b.employeeName, 'es');
    if (ne !== 0) return ne;
    return a.fecha.localeCompare(b.fecha);
  });

  return jornadas;
}

// ── Helpers ExcelJS ───────────────────────────────────────────────────────────
function headerStyle(cell: ExcelJS.Cell, bgColor: string, fgColor = 'FFFFFF') {
  cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
  cell.font   = { bold: true, color: { argb: 'FF' + fgColor }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };
}

function dataStyle(cell: ExcelJS.Cell, bgColor: string, align: 'left' | 'center' | 'right' = 'center') {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: false };
  cell.border    = { bottom: { style: 'hair' }, right: { style: 'hair' } };
}

function missingStyle(cell: ExcelJS.Cell) {
  cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_MISSING } };
  cell.font   = { italic: true, color: { argb: 'FF' + COLOR_MISSING_FG }, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.value  = 'Sin registro';
}

// ── Export principal ──────────────────────────────────────────────────────────
export async function exportAttendanceDT(
  records: AttendanceRawRecord[],
  empMap: Map<string, EmployeeInfo>,
  dateFrom: string,
  dateTo:   string,
  est: EstablishmentInfo = {}
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'BullWeb';
  wb.created  = new Date();
  wb.modified = new Date();

  const periodLabel = `${dateFrom} - ${dateTo}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // HOJA 1 — Registros (1 fila por jornada)
  // ═══════════════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('Registros', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const COL_COUNT = 16;

  // ── Encabezado libro (filas 1-6) ─────────────────────────────────────────
  const titulo = ws1.getRow(1);
  ws1.mergeCells('A1:P1');
  const t1 = ws1.getCell('A1');
  t1.value = 'LIBRO DE ASISTENCIA DIGITAL';
  t1.font  = { bold: true, size: 16, color: { argb: 'FF' + COLOR_HEADER_FG } };
  t1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_TITLE_BG } };
  t1.alignment = { vertical: 'middle', horizontal: 'center' };
  titulo.height = 28;

  const metaRows: [string, string][] = [
    ['Razón Social:',   est.razonSocial ?? ''],
    ['RUT Empleador:',  est.rut ?? ''],
    ['Dirección:',      est.direccion ?? ''],
    ['Período:',        periodLabel],
  ];
  for (let i = 0; i < metaRows.length; i++) {
    const rowIdx = i + 2;
    ws1.mergeCells(`A${rowIdx}:D${rowIdx}`);
    ws1.mergeCells(`E${rowIdx}:P${rowIdx}`);
    const labelCell = ws1.getCell(`A${rowIdx}`);
    const valueCell = ws1.getCell(`E${rowIdx}`);
    labelCell.value = metaRows[i][0];
    labelCell.font  = { bold: true, size: 11 };
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' };
    valueCell.value = metaRows[i][1];
    valueCell.font  = { size: 11 };
    valueCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws1.getRow(rowIdx).height = 18;
  }

  // Fila 6 vacía
  ws1.getRow(6).height = 6;

  // ── Encabezados de columnas (fila 7) ─────────────────────────────────────
  const COLS_REGISTROS = [
    'Empleado', 'RUT', 'Cargo', 'Tipo Contrato', 'Fecha', 'Día',
    'Turno', 'Hora Entrada', 'Inicio Colación', 'Fin Colación',
    'Hora Salida', 'Total Horas', 'Horas Extra',
    'Método', 'IP Origen', 'Observaciones',
  ];
  ws1.getRow(7).height = 32;
  COLS_REGISTROS.forEach((label, i) => {
    const cell = ws1.getRow(7).getCell(i + 1);
    cell.value = label;
    headerStyle(cell, COLOR_HEADER_BG);
  });

  // Ancho de columnas
  const widths = [22, 14, 18, 14, 12, 12, 10, 12, 14, 14, 12, 12, 12, 10, 14, 22];
  widths.forEach((w, i) => { ws1.getColumn(i + 1).width = w; });

  // ── Datos de jornadas ─────────────────────────────────────────────────────
  const jornadas = agruparJornadas(records, empMap);

  if (jornadas.length === 0) {
    ws1.mergeCells('A8:P8');
    const empty = ws1.getCell('A8');
    empty.value = 'Sin datos en el período seleccionado';
    empty.font  = { italic: true, color: { argb: 'FF888888' } };
    empty.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  jornadas.forEach((j, idx) => {
    const rowIdx = idx + 8;
    const bg = idx % 2 === 0 ? COLOR_ROW_WHITE : COLOR_ROW_ALT;
    const row = ws1.getRow(rowIdx);
    row.height = 18;

    const values = [
      j.employeeName, j.rut, j.cargo, j.tipoContrato,
      j.fecha, j.diaSemana, j.turno,
      j.horaEntrada, j.salidaColacion, j.entradaColacion, j.horaSalida,
      j.horasTrabajadas, j.horasExtras,
      j.metodo, j.ipOrigen, j.observaciones,
    ];

    // Columnas que son tiempos (índices 7-12 = columnas H-M)
    const timeColIdxs = new Set([7, 8, 9, 10, 11, 12]);

    values.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      const isMissing = timeColIdxs.has(ci) && !val;
      if (isMissing && j._incomplete) {
        missingStyle(cell);
      } else {
        cell.value = val || '';
        const align = ci === 0 || ci === 15 ? 'left' : 'center';
        dataStyle(cell, bg, align);
      }
    });
  });

  // Fijar filas de encabezado al hacer scroll
  ws1.views = [{ state: 'frozen', xSplit: 0, ySplit: 7, topLeftCell: 'A8', activeCell: 'A8' }];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOJA 2 — Resumen por empleado
  // ═══════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('Resumen');

  // Título hoja 2
  ws2.mergeCells('A1:J1');
  const t2 = ws2.getCell('A1');
  t2.value = `RESUMEN DE ASISTENCIA — Período: ${periodLabel}`;
  t2.font  = { bold: true, size: 13, color: { argb: 'FF' + COLOR_HEADER_FG } };
  t2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_TITLE_BG } };
  t2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws2.getRow(1).height = 24;
  ws2.getRow(2).height = 6;

  const COLS_RESUMEN = [
    'Empleado', 'RUT', 'Cargo',
    'Días Trabajados', 'Total Horas Normales', 'Total Horas Extra',
    'Días Ausentes', 'Promedio Entrada', 'Promedio Salida', 'Observaciones',
  ];
  ws2.getRow(3).height = 28;
  COLS_RESUMEN.forEach((label, i) => {
    const cell = ws2.getRow(3).getCell(i + 1);
    cell.value = label;
    headerStyle(cell, COLOR_HEADER_BG);
  });

  const widths2 = [22, 14, 18, 14, 18, 16, 14, 16, 16, 28];
  widths2.forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  // Calcular resumen por empleado a partir de las jornadas
  const resumenMap = new Map<string, {
    name: string; rut: string; cargo: string;
    diasTrabajados: number; minNormales: number; minExtras: number; diasAusentes: number;
    entradasMs: number[]; salidasMs: number[];
  }>();

  for (const j of jornadas) {
    if (!resumenMap.has(j.employeeId)) {
      resumenMap.set(j.employeeId, {
        name: j.employeeName, rut: j.rut, cargo: j.cargo,
        diasTrabajados: 0, minNormales: 0, minExtras: 0, diasAusentes: 0,
        entradasMs: [], salidasMs: [],
      });
    }
    const r = resumenMap.get(j.employeeId)!;

    if (!j._incomplete) {
      r.diasTrabajados++;
      // Horas trabajadas
      const [hh, mm] = j.horasTrabajadas.split(':').map(Number);
      const totalMin = (hh || 0) * 60 + (mm || 0);
      const JORNADA_NORMAL = 9 * 60;
      r.minNormales += Math.min(totalMin, JORNADA_NORMAL);
      // Horas extra
      const [he, me] = j.horasExtras.split(':').map(Number);
      r.minExtras += ((he || 0) * 60 + (me || 0));
    } else {
      r.diasAusentes++;
    }

    // Promedios de entrada/salida (en ms desde medianoche)
    if (j.horaEntrada) {
      const [h, m] = j.horaEntrada.split(':').map(Number);
      if (!isNaN(h)) r.entradasMs.push(h * 60 + m);
    }
    if (j.horaSalida) {
      const [h, m] = j.horaSalida.split(':').map(Number);
      if (!isNaN(h)) r.salidasMs.push(h * 60 + m);
    }
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const minToTime = (min: number | null) => min == null ? '' : `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

  let r2i = 0;
  for (const [, r] of resumenMap.entries()) {
    const rowIdx = r2i + 4;
    const bg = r2i % 2 === 0 ? COLOR_ROW_WHITE : COLOR_ROW_ALT;
    const row = ws2.getRow(rowIdx);
    row.height = 18;

    const values = [
      r.name, r.rut, r.cargo,
      r.diasTrabajados,
      minToHHMM(r.minNormales),
      minToHHMM(r.minExtras),
      r.diasAusentes,
      minToTime(avg(r.entradasMs)),
      minToTime(avg(r.salidasMs)),
      r.diasAusentes > 0 ? `${r.diasAusentes} día(s) sin registro completo` : 'Completo',
    ];

    values.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val ?? '';
      const align = ci === 0 ? 'left' : ci === 9 ? 'left' : 'center';
      dataStyle(cell, bg, align);
    });

    r2i++;
  }

  ws2.views = [{ state: 'frozen', xSplit: 0, ySplit: 3, topLeftCell: 'A4', activeCell: 'A4' }];

  // ── Descargar ─────────────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `LibroAsistencia_${dateFrom}_${dateTo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
