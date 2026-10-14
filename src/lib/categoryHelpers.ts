// ═══════════════════════════════════════════════════════════════
// Helpers de categorías — compartidos (Hotfix #244, extraídos del
// patrón #243 de DeliveryOrderModal para DRY entre los 3 modales)
// ─ emojiForCategory / categoryLabel
// ═══════════════════════════════════════════════════════════════

import type { Product, ProductCategory } from '../types/restaurant.types';

// Hotfix #243: icono por categoría — emoji por nombre → emoji del primer
// producto con emoji → default 🍽️ (jerarquía del patrón CartaDigital;
// la imagen del chip se sirve aparte como object-cover chico)
export function emojiForCategory(cat: ProductCategory, products: Product[]): string {
  const n = String(cat.name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const table: Record<string, string> = {
    pizza: '🍕', sushi: '🍣', burger: '🍔', hamburguesa: '🍔', taco: '🌮', ensalada: '🥗',
    bebida: '🥤', cafe: '☕', postre: '🍰', pastel: '🎂', helado: '🍦', vino: '🍷',
    cerveza: '🍺', pescado: '🐟', marisco: '🦐', carne: '🥩', pollo: '🍗', pasta: '🍝',
    sandwich: '🥪', sopa: '🍲', desayuno: '🥐', infantil: '🧒', comida: '🍔',
    promocion: '🔥', combo: '🔥',
  };
  const hit = Object.keys(table).find(k => n.includes(k));
  if (hit) return table[hit];
  const fp = products.find(p => p.categoryId === cat.id && (p as any).emoji);
  return (fp as any)?.emoji ?? '🍽️';
}

// Hotfix #243: label "Sin Categoria" → "Otros" (decisión del estratega)
export function categoryLabel(cat: ProductCategory): string {
  return String(cat.name ?? '').toLowerCase() === 'sin categoria' ? 'Otros' : cat.name;
}

// ═══════════════════════════════════════════════════════════════
// Hotfix 245 C2 — paleta de colores por categoría (12 tonos
// diferenciables entre sí; SIN naranja ni vecinos de #F97316,
// que queda reservado al botón principal "Confirmar orden")
// ═══════════════════════════════════════════════════════════════
export const CATEGORY_PALETTE: string[] = [
  '#3B82F6', // azul
  '#8B5CF6', // violeta
  '#10B981', // esmeralda
  '#EC4899', // rosa
  '#06B6D4', // cian
  '#84CC16', // lima
  '#6366F1', // índigo
  '#E11D48', // rosa intenso
  '#14B8A6', // teal
  '#A855F7', // púrpura
  '#0EA5E9', // cielo
  '#64748B', // pizarra
];

// Hotfix 245 C2: color estable por categoría según su posición en la
// lista ordenada que usa el render; baldosas adyacentes jamás comparten
// color (si coincide con la anterior, avanza un slot del ciclo).
export function colorForCategory(categories: ProductCategory[], categoryId: string, previousColor?: string): string {
  const idx = categories.findIndex(c => c.id === categoryId);
  if (idx < 0) return CATEGORY_PALETTE[0];
  let color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
  if (previousColor && color === previousColor) {
    color = CATEGORY_PALETTE[(idx + 1) % CATEGORY_PALETTE.length];
  }
  return color;
}
