// Hotfix #258: sistema de diseño de la sección Productos (solo presentación).
// Fondo claro único, tarjetas blancas, títulos legibles, un solo relleno naranja (crear),
// Editar de contorno, papelera sin relleno separada de Editar, filtros tintados naranja.
import React from 'react';
import { Trash2 } from 'lucide-react';
import { calculateProductMetrics } from '../../utils/metricsCalculator';

/** A3: fondo del contenido y tarjeta */
export const PAGE_BG = 'bg-[#F8FAFC]';
export const CARD = 'bg-white border border-[#E2E8F0] rounded-xl';

/** A4: título 22px/700 #0F172A y subtítulo 14px #64748B */
export const TITLE = 'text-[22px] leading-7 font-bold text-[#0F172A]';
export const SUBTITLE = 'text-sm text-[#64748B] mt-1';

/** A5: botón de crear — único relleno, naranja, 44px */
export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-[#F97316] text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50';

/** A6: Editar (y secundarias) de contorno 1.5px #CBD5E1, texto #1E2A4A, 44px */
export const BTN_OUTLINE =
  'inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm font-semibold text-[#1E2A4A] hover:bg-slate-50 transition-colors disabled:opacity-50';

/** Botón ícono neutro de 44x44 (lápiz, menú ⋯, etc.) */
export const BTN_ICON =
  'inline-flex items-center justify-center w-11 h-11 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-[#1E2A4A] hover:bg-slate-50 transition-colors disabled:opacity-50';

/** A7: papelera sola, 44x44, sin relleno, #94A3B8 -> #B91C1C al pasar el mouse. Separar 16px de Editar (ml-4). */
export const BTN_TRASH =
  'inline-flex items-center justify-center w-11 h-11 rounded-lg text-[#94A3B8] hover:text-[#B91C1C] hover:bg-red-50/60 transition-colors disabled:opacity-50';

export const TrashButton: React.FC<{ onClick: () => void; label: string; className?: string; disabled?: boolean }> = ({
  onClick, label, className = '', disabled,
}) => (
  <button type="button" onClick={onClick} title={label} aria-label={label} disabled={disabled} className={`${BTN_TRASH} ${className}`}>
    <Trash2 className="w-5 h-5" />
  </button>
);

/** A8: filtro activo tintado naranja; inactivo neutro. 44px. */
export const filterClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 h-11 px-3 rounded-lg text-sm font-semibold transition-colors ${
    active
      ? 'bg-[#FFF7ED] border-[1.5px] border-[#F97316] text-[#C2410C]'
      : 'border-[1.5px] border-transparent text-[#475569] hover:bg-slate-100'
  }`;

/** A9: umbrales de margen (decisión del arquitecto): <55 rojo, 55–65 ámbar, >=65 neutro */
export function marginTone(percent: number): string {
  if (percent < 55) return 'text-[#B91C1C]';
  if (percent < 65) return 'text-[#B45309]';
  return 'text-[#0F172A]';
}

/** A9: badge ámbar cuando el costo es 0 — nunca se muestra "margen 100%" */
export const NoCostBadge: React.FC<{ text?: string }> = ({ text = 'Sin costo cargado' }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-bold">
    ⚠ {text}
  </span>
);

/**
 * A9: margen de un precio/costo con su color por rango (13px/700). Usa el cálculo existente
 * (calculateProductMetrics) sin modificarlo; costo 0 => badge "Sin costo cargado".
 */
export const MarginBadge: React.FC<{ price: number; cost: number | null | undefined; prefix?: string }> = ({
  price, cost, prefix = 'Margen',
}) => {
  if (!cost || cost <= 0) return <NoCostBadge />;
  const m = calculateProductMetrics(price, cost);
  return (
    <span className={`text-[13px] font-bold ${marginTone(m.marginPercent)}`}>
      {prefix} {formatPct(m.marginPercent)}
    </span>
  );
};

/** A10: porcentajes y cantidades con máximo 2 decimales y coma decimal */
export function formatQty(n: number | null | undefined, maxDecimals = 2): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}

export function formatPct(n: number): string {
  return `${formatQty(n, 1)}%`;
}

/** B Fichas/Ingredientes: unidades en un solo formato ("unidad", "kg", "L", ...) */
export function formatUnit(unit: string | null | undefined): string {
  const u = String(unit ?? '').trim();
  const k = u.toLowerCase();
  if (['unit', 'units', 'unidad', 'unidades', 'un', 'und', 'u'].includes(k)) return 'unidad';
  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(k)) return 'L';
  if (['ml', 'cc'].includes(k)) return 'ml';
  if (['kg', 'kilo', 'kilos'].includes(k)) return 'kg';
  if (['g', 'gr', 'grs', 'gramo', 'gramos'].includes(k)) return 'g';
  return u;
}

/**
 * Hotfix #258 (regla del Comandante): nivel de stock único para banner, filtros y tarjetas.
 * <= 0 -> 'out' (negativo se rotula "Stock negativo"); > 0 y <= mínimo -> 'low'; > mínimo -> 'ok'.
 */
export type StockLevel = 'out' | 'low' | 'ok';
export function stockLevel(current: number | null | undefined, min: number | null | undefined): StockLevel {
  const c = Number(current ?? 0);
  if (c <= 0) return 'out';
  if (c <= Number(min ?? 0)) return 'low';
  return 'ok';
}
