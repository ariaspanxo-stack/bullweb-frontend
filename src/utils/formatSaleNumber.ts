/**
 * Convierte cualquier número de orden/venta a etiqueta corta y legible.
 *
 * Ejemplos:
 *   "ORD-20260308-005" → "#5"
 *   "V-005"            → "#5"
 *   "005"              → "#5"
 *   "abc123"           → "#123"
 *   undefined/null     → "#?"
 */
export function formatSaleNumber(n?: string | null): string {
  if (!n) return '#?';
  const m = n.match(/(\d+)$/);
  return m ? `#${parseInt(m[1], 10)}` : `#${n}`;
}
