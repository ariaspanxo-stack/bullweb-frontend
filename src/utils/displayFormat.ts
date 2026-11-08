// LOTE 308b: formato unico para pantallas del panel. Montos completos en pesos, fechas y horas de Chile,
// y nombres escritos en mayusculas mostrados con capitalizacion normal (el dato guardado no cambia).
const TZ = 'America/Santiago';

/** "$1.013.000": nunca abreviado. */
export function fmtMoney(value: unknown): string {
  return '$' + Math.round(Number(value) || 0).toLocaleString('es-CL');
}

/** "04-11-2026" */
export function fmtDateCL(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL', { timeZone: TZ });
}

/** "04-11-2026, 13:05" */
export function fmtDateTimeCL(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Siglas y medidas que se mantienen en mayusculas. */
const KEEP_UPPER = new Set(['BBQ', 'XL', 'XXL', 'XS', 'QR', 'POS', 'IVA', 'DTE', 'RUT', 'KFC', 'TV', 'PDF', 'USA', 'CL', 'ML', 'KG', 'GR', 'CC', 'L', 'S', 'M']);
const LOWER_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'con', 'sin', 'y', 'o', 'a', 'al', 'en', 'para', 'por']);

/**
 * "HAMBURGUESA DE POLLO BBQ" -> "Hamburguesa de pollo BBQ". Solo actua si el texto no tiene ninguna minuscula;
 * un nombre con mayusculas y minusculas se muestra tal cual lo escribio el local.
 */
export function displayName(value: string | null | undefined): string {
  const s = String(value ?? '');
  if (!s || s !== s.toUpperCase() || s === s.toLowerCase() || s.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length < 4) return s;
  let first = true;
  return s.split(/(\s+)/).map((word) => {
    if (/^\s+$/.test(word)) return word;
    const clean = word.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü]/g, '');
    if (KEEP_UPPER.has(clean) || /\d/.test(word)) { first = false; return word; }
    const lower = word.toLocaleLowerCase('es-CL');
    if (!first && LOWER_WORDS.has(lower)) return lower;
    first = false;
    return lower.charAt(0).toLocaleUpperCase('es-CL') + lower.slice(1);
  }).join('');
}
