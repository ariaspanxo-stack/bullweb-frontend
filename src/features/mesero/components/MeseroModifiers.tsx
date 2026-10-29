// ═══════════════════════════════════════════════════════════════
// MESERO MODIFIERS — selección de modificadores de un producto
// ═══════════════════════════════════════════════════════════════

import { useState }             from 'react';
import { X, Check, Lock }       from 'lucide-react';
import { useWaiterPermission }  from '../hooks/useWaiterPermission';
import { sellableGroups, type SellableModifierGroup } from '../../../components/restaurant/shared/ModifierGroupsModal'; // HOTFIX 291

interface Props {
  product:   any;
  onConfirm: (modifiers: any[], notes: string, customPrice?: number) => void;
  onClose:   () => void;
}

export function MeseroModifiers({ product, onConfirm, onClose }: Props) {
  const [selected,     setSelected]     = useState<any[]>([]);
  const [notes,        setNotes]        = useState('');
  const [customPrice,  setCustomPrice]  = useState<string>('');

  const canModify      = useWaiterPermission('modifiers');
  const canCustomPrice = useWaiterPermission('custom_price');

  // HOTFIX 291: grupos de modificadores (modelo nuevo). Los obligatorios se muestran siempre (sin ellos el backend
  // rechaza la venta); los opcionales solo con el permiso "modifiers".
  const groups = sellableGroups(product).filter((g) => g.minSelections > 0 || canModify);
  const hiddenOptional = !canModify && sellableGroups(product).some((g) => g.minSelections === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleModifier = (group: SellableModifierGroup, option: any) => {
    const inGroup = selected.filter(s => s.groupId === group.id);
    if (inGroup.some(s => s.optionId === option.id)) {
      setSelected(prev => prev.filter(s => !(s.groupId === group.id && s.optionId === option.id)));
      return;
    }
    const item = { optionId: option.id, groupId: group.id, groupName: group.name, name: option.name, price: Number(option.priceAdjustment ?? 0) };
    if (group.selectionType === 'single') {
      setSelected(prev => [...prev.filter(s => s.groupId !== group.id), item]);
    } else if (group.maxSelections && inGroup.length >= group.maxSelections) {
      setErrors(e => ({ ...e, [group.id]: 'Máximo ' + group.maxSelections }));
      return;
    } else {
      setSelected(prev => [...prev, item]);
    }
    setErrors(e => { const n = { ...e }; delete n[group.id]; return n; });
  };

  const confirm = () => {
    const errs: Record<string, string> = {};
    for (const g of groups) {
      if (selected.filter(s => s.groupId === g.id).length < g.minSelections) {
        errs[g.id] = g.minSelections === 1 ? 'Elige una opción' : 'Elige al menos ' + g.minSelections;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const cp = customPrice ? parseFloat(customPrice) : undefined;
    onConfirm(selected, notes, cp);
  };

  const extraTotal = selected.reduce((s, m) => s + m.price, 0);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
        <div className="flex-shrink-0 px-4 pt-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-800">{product.name}</h3>
              <p className="text-orange-500 font-semibold">
                ${(product.price + extraTotal).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                {extraTotal > 0 && (
                  <span className="text-xs text-gray-400 ml-1">
                    (base ${product.price.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                    {' '}+${extraTotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })})
                  </span>
                )}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Grupos de modificadores */}
          {hiddenOptional && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200
                            rounded-xl px-4 py-3 text-amber-700 text-sm">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Tu rol no permite elegir los extras opcionales</span>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-700 text-sm">{group.name}</p>
                {group.minSelections > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    Requerido
                  </span>
                )}
              </div>
              {errors[group.id] && <p className="text-sm text-red-600 mb-2" role="alert">{errors[group.id]}</p>}
              <div className="space-y-2">
                {group.options.map((option) => {
                  const isSelected = selected.some(
                    s => s.groupId === group.id && s.optionId === option.id
                  );
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleModifier(group, option)}
                      className={`w-full min-h-[44px] flex items-center justify-between px-4 py-3
                        rounded-xl border-2 transition-all
                        ${isSelected
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-100 hover:border-gray-200'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center
                          justify-center flex-shrink-0
                          ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{option.name}</span>
                      </div>
                      {Number(option.priceAdjustment) !== 0 && (
                        <span className="text-sm text-orange-600 font-bold">
                          {Number(option.priceAdjustment) > 0 ? '+' : '-'}${Math.abs(Number(option.priceAdjustment)).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Precio personalizado */}
          {canCustomPrice && (
            <div>
              <p className="font-semibold text-gray-700 text-sm mb-2">
                💲 Precio personalizado
                <span className="ml-1 text-xs font-normal text-gray-400">
                  (deja en blanco para usar precio normal)
                </span>
              </p>
              <input
                type="number"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                placeholder={`Precio base: $${product.price?.toLocaleString('es-CL', { maximumFractionDigits: 0 }) ?? 0}`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <p className="font-semibold text-gray-700 text-sm mb-2">📝 Notas especiales</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ej: sin cebolla, término medio..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Confirmar */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
          <button
            onClick={confirm}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold
                       rounded-2xl text-lg active:scale-[0.98] transition-all"
          >
            Agregar al pedido →
          </button>
        </div>
      </div>
    </div>
  );
}
