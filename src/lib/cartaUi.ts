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
