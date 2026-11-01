// HOTFIX 304 — utilidades de la carta QR pública.

/** "Efectivo", "EFECTIVO", "efectivo " o "Cash" (sin mayúsculas ni tildes). Misma regla que el backend (carta-gate.ts). */
export function isCashMethodName(name: unknown): boolean {
  const n = String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return /efectivo|cash/.test(n);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contraste del color contra blanco (texto blanco sobre el color, o el color sobre fondo blanco). */
export function contrastWithWhite(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 21;
  return 1.05 / (luminance(rgb) + 0.05);
}

/**
 * Tema del local con contraste mínimo AA (4.5:1 contra blanco): si el color no alcanza, se oscurece en pasos
 * hasta cumplir, conservando el tono. Colores inválidos caen al naranja de la carta.
 */
export function aaSafeColor(hex: string | null | undefined, fallback = '#C2410C'): string {
  let rgb = hexToRgb(hex ?? '');
  if (!rgb) return fallback;
  for (let i = 0; i < 40 && contrastWithWhite(toHex(rgb)) < 4.5; i++) {
    rgb = [Math.round(rgb[0] * 0.93), Math.round(rgb[1] * 0.93), Math.round(rgb[2] * 0.93)];
  }
  return toHex(rgb);
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

// HOTFIX 308 — presentación de la carta QR pública.

const MINOR_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'lo', 'los', 'y', 'e', 'o', 'u', 'a', 'al', 'con', 'sin', 'en', 'por', 'para']);
// Siglas que se respetan aunque el nombre completo venga en mayúsculas
const KNOWN_ACRONYMS = new Set(['BBQ', 'XL', 'XXL', 'IPA', 'APA', 'CC', 'ML', 'KG', 'GR', 'TV', 'AUD']);

/**
 * Title Case al mostrar ("PIZZA DE LA CASA" -> "Pizza de la Casa", "hamburguesa bbq" -> "Hamburguesa Bbq").
 * Respeta siglas: en un nombre con minúsculas, toda palabra de 2 a 4 letras en mayúsculas (Hamburguesa BBQ);
 * en un nombre todo en mayúsculas, solo las siglas conocidas. Palabras con dígitos o mayúsculas internas
 * (500cc, McFlurry) quedan igual. Solo cambia lo que se ve; el dato no se toca.
 */
export function titleCaseName(raw: unknown): string {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim();
  const letters = s.replace(/[^\p{L}]/gu, '');
  const allUpper = letters.length > 1 && letters === letters.toLocaleUpperCase('es');
  return s.split(' ').map((w, i) => {
    const core = w.replace(/[^\p{L}\p{N}]/gu, '');
    if (!core || /\d/.test(core)) return w;
    const upper = core.toLocaleUpperCase('es');
    const lower = core.toLocaleLowerCase('es');
    const lw = w.toLocaleLowerCase('es');
    if (i > 0 && MINOR_WORDS.has(lower)) return lw;
    if (core === upper && core.length >= 2 && (allUpper ? KNOWN_ACRONYMS.has(upper) : core.length <= 4)) return w;
    if (core !== upper && core.slice(1) !== core.slice(1).toLocaleLowerCase('es')) return w;
    const k = lw.search(/\p{L}/u);
    return lw.slice(0, k) + lw.charAt(k).toLocaleUpperCase('es') + lw.slice(k + 1);
  }).join(' ');
}

/** Categoría de extras/agregados por nombre: va al final de la carta y no se elige como categoría inicial. */
export function isExtrasCategoryName(name: unknown): boolean {
  const n = String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /\b(extras?|agregados?|adicionales?|acompanamientos?)\b/.test(n);
}
