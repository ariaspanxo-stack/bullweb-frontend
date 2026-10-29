// ═══════════════════════════════════════════════════════════════════
// Hotfix #291 — Selector de modificadores (modelo nuevo: grupos y opciones,
// el mismo de la Carta QR) para Mesas, Agregar a la mesa, Mostrador,
// Delivery y la app del mesero.
// product.modifierGroups viene de GET /menu/products (o /waiter/menu/products)
// ya filtrado por el backend: grupos activos con opciones activas, y
// minSelections efectivo (obligatorio => al menos 1). Un grupo obligatorio
// sin opciones no llega: no se pregunta ni bloquea.
// El modelo viejo (product.modifiers / product_modifiers) queda deprecado.
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface SellableModifierOption { id: string; name: string; priceAdjustment: number; isDefault?: boolean }
export interface SellableModifierGroup {
  id: string;
  name: string;
  description?: string;
  selectionType: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: SellableModifierOption[];
}

/** Modificador elegido, compatible con el carrito (id, name, price, category) + optionId/groupId para el backend */
export interface ChosenModifier {
  id: string;          // = optionId
  optionId: string;
  groupId: string;
  groupName: string;
  name: string;
  price: number;
  category: string;    // = groupName (las vistas antiguas lo muestran como categoria)
}

export const sellableGroups = (product: any): SellableModifierGroup[] =>
  ((product?.modifierGroups ?? []) as SellableModifierGroup[]).filter((g) => (g.options ?? []).length > 0);

export const hasModifierGroups = (product: any): boolean => sellableGroups(product).length > 0;

/** Convierte los modificadores del carrito al formato de la API: optionId (modelo nuevo) o modifierId (viejo) */
export const toApiModifiers = (mods: any[] | undefined) =>
  (mods ?? []).map((m: any) =>
    m?.optionId
      ? { optionId: m.optionId, name: m.name, quantity: 1 }
      : { modifierId: m?.modifierId ?? m?.id, name: m?.name, price: Math.max(0, Number(m?.price ?? 0)), quantity: 1 },
  );

/** Nombres de los modificadores de un item guardado (objetos o textos), para tarjetas y vistas */
export const modifierNames = (mods: any[] | undefined): string =>
  (Array.isArray(mods) ? mods : []).map((m: any) => (typeof m === 'string' ? m : m?.name)).filter(Boolean).join(', ');

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export function ModifierGroupsModal({
  product,
  withNotes = false,
  onConfirm,
  onClose,
}: {
  product: any;
  withNotes?: boolean;
  onConfirm: (modifiers: ChosenModifier[], notes?: string) => void;
  onClose: () => void;
}) {
  const groups = sellableGroups(product);
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of groups) {
      const defaults = g.options.filter((o) => o.isDefault).map((o) => o.id);
      init[g.id] = g.selectionType === 'single' ? defaults.slice(0, 1) : defaults.slice(0, Math.max(1, g.maxSelections || defaults.length));
    }
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const toggle = (g: SellableModifierGroup, optionId: string) => {
    setSelected((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.selectionType === 'single') return { ...prev, [g.id]: [optionId] };
      if (cur.includes(optionId)) return { ...prev, [g.id]: cur.filter((x) => x !== optionId) };
      if (g.maxSelections && cur.length >= g.maxSelections) {
        setErrors((e) => ({ ...e, [g.id]: `Máximo ${g.maxSelections} ${g.maxSelections === 1 ? 'opción' : 'opciones'}` }));
        return prev;
      }
      return { ...prev, [g.id]: [...cur, optionId] };
    });
    setErrors((e) => { const n = { ...e }; delete n[g.id]; return n; });
  };

  const chosen: ChosenModifier[] = groups.flatMap((g) =>
    (selected[g.id] ?? []).map((oid) => {
      const o = g.options.find((x) => x.id === oid)!;
      return { id: o.id, optionId: o.id, groupId: g.id, groupName: g.name, name: o.name, price: Number(o.priceAdjustment ?? 0), category: g.name };
    }),
  );
  const extra = chosen.reduce((s, m) => s + m.price, 0);

  const confirm = () => {
    const errs: Record<string, string> = {};
    for (const g of groups) {
      const n = (selected[g.id] ?? []).length;
      if (n < g.minSelections) errs[g.id] = g.minSelections === 1 ? 'Elige una opción' : `Elige al menos ${g.minSelections} opciones`;
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onConfirm(chosen, withNotes && notes.trim() ? notes.trim() : undefined);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div role="dialog" aria-labelledby="modgroups-title" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[94vw] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl z-[100]">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200">
          <div className="min-w-0">
            <h3 id="modgroups-title" className="font-bold text-gray-900 text-lg truncate">{product?.name}</h3>
            <p className="text-sm text-gray-500">Elige las opciones</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex-shrink-0 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {groups.map((g) => {
            const sel = selected[g.id] ?? [];
            const required = g.minSelections > 0;
            return (
              <section key={g.id} aria-label={g.name}>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{g.name}</h4>
                  {required
                    ? <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Obligatorio</span>
                    : <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Opcional</span>}
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {g.selectionType === 'single'
                    ? 'Elige 1'
                    : g.minSelections > 0
                      ? `Elige entre ${g.minSelections} y ${g.maxSelections || g.options.length}`
                      : `Hasta ${g.maxSelections || g.options.length}`}
                </p>
                {errors[g.id] && <p className="text-sm text-red-600 mb-2" role="alert">{errors[g.id]}</p>}
                <div className="space-y-2">
                  {g.options.map((o) => {
                    const on = sel.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggle(g, o.id)}
                        aria-pressed={on}
                        className={`w-full min-h-[44px] px-3 flex items-center justify-between gap-3 rounded-xl border-2 text-left transition-colors ${
                          on ? 'border-[#F97316] bg-orange-50' : errors[g.id] ? 'border-red-300 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className={`w-5 h-5 flex-shrink-0 border-2 ${g.selectionType === 'single' ? 'rounded-full' : 'rounded'} ${on ? 'border-[#F97316] bg-[#F97316]' : 'border-gray-300'}`} />
                          <span className="text-sm font-medium text-gray-900 truncate">{o.name}</span>
                        </span>
                        {Number(o.priceAdjustment) !== 0 && (
                          <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                            {Number(o.priceAdjustment) > 0 ? '+' : '-'}{clp(Math.abs(Number(o.priceAdjustment)))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {withNotes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="modgroups-notes">Nota para cocina (opcional)</label>
              <input
                id="modgroups-notes" type="text" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Total por unidad</p>
            <p className="text-lg font-bold text-gray-900">{clp(Number(product?.price ?? 0) + extra)}</p>
          </div>
          <button onClick={onClose} className="min-h-[44px] px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50">Cancelar</button>
          <button onClick={confirm} className="min-h-[44px] px-5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold">Agregar</button>
        </div>
      </div>
    </>,
    document.body,
  );
}
