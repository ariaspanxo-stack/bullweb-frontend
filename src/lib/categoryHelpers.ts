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
