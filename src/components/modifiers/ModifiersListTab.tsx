import React, { useState } from 'react';
import { PlusIcon, PencilIcon, ChevronRight, ChevronDown } from 'lucide-react';
import type { ModifierGroup } from '../../types/modifier.types';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../lib/utils';
import { BTN_ICON, BTN_OUTLINE, BTN_PRIMARY, CARD, SUBTITLE, TITLE, TrashButton } from '../products/productsUi';

interface ModifiersListTabProps {
  modifierGroups: ModifierGroup[];
  products: Product[];
  onAddGroup: () => void;
  onEditGroup: (group: ModifierGroup) => void;
  onDeleteGroup: (group: ModifierGroup) => void;
  onAddOption: (groupId: string) => void;
  onEditOption: (groupId: string, optionId: string) => void;
  onDeleteOption: (groupId: string, optionId: string) => void;
}

// Hotfix #258: badges neutros (Requerido oscuro; tipo en gris claro) — el rojo se leía como error
const BADGE_NEUTRAL = 'text-xs font-semibold px-2 py-1 rounded-full bg-[#F1F5F9] text-[#475569]';
const BADGE_REQUIRED = 'text-xs font-semibold px-2 py-1 rounded-full bg-[#1E2A4A] text-white';

export const ModifiersListTab: React.FC<ModifiersListTabProps> = ({
  modifierGroups,
  products,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onAddOption,
  onEditOption,
  onDeleteOption,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getProductNames = (productIds: string[] | undefined) => {
    return (productIds ?? [])
      .map((id) => {
        const product = products.find((p) => p.id === id);
        return product ? product.name : null;
      })
      .filter(Boolean)
      .join(', ');
  };

  // Las acciones de la fila no deben desplegar/plegar el grupo
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado — A4/A5 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={TITLE}>Modificadores</h2>
          <p className={SUBTITLE}>
            {modifierGroups.length} grupo{modifierGroups.length !== 1 ? 's' : ''} de modificadores
          </p>
        </div>
        <button onClick={onAddGroup} className={BTN_PRIMARY}>
          <PlusIcon className="w-5 h-5" />
          Nuevo grupo
        </button>
      </div>

      {/* Info */}
      <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-4">
        <p className="text-sm text-[#475569]">
          💡 Los modificadores permiten que tus clientes personalicen productos.
          Ejemplos: tamaños, ingredientes extra, nivel de cocción, etc.
        </p>
      </div>

      {/* Lista */}
      {modifierGroups.length === 0 ? (
        <div className={`${CARD} text-center py-12`}>
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-2">No hay grupos de modificadores</h3>
          <p className="text-[#64748B] mb-4">Crea tu primer grupo para permitir personalización de productos</p>
          <button onClick={onAddGroup} className={BTN_PRIMARY}>
            <PlusIcon className="w-5 h-5" />
            Crear grupo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {modifierGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);

            return (
              <div key={group.id} className={`${CARD} overflow-hidden`}>
                {/* Toda la fila despliega */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup(group.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(group.id); } }}
                  className="p-4 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        {isExpanded
                          ? <ChevronDown className="w-5 h-5 text-[#64748B] flex-shrink-0" />
                          : <ChevronRight className="w-5 h-5 text-[#64748B] flex-shrink-0" />}
                        <h3 className="text-lg font-bold text-[#0F172A]">{group.name}</h3>
                        <span className={BADGE_NEUTRAL}>
                          {group.selectionType === 'single' ? 'Una opción' : 'Múltiples'}
                        </span>
                        {group.isRequired && <span className={BADGE_REQUIRED}>Requerido</span>}
                      </div>
                      {group.description && <p className="text-sm text-[#475569] ml-8">{group.description}</p>}
                      <p className="text-xs text-[#64748B] ml-8 mt-1">
                        📦 Aplica a: {getProductNames(group.productIds) || 'Ningún producto'}
                      </p>
                      <p className="text-xs text-[#64748B] ml-8">
                        {group.options.length} opción{group.options.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={stop(() => onEditGroup(group))}
                        className={BTN_ICON}
                        title="Editar grupo"
                        aria-label={`Editar grupo ${group.name}`}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <span onClick={(e) => e.stopPropagation()}>
                        <TrashButton onClick={() => onDeleteGroup(group)} label={`Eliminar grupo ${group.name}`} className="ml-4" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Opciones (expandible) */}
                {isExpanded && (
                  <div className="p-4 space-y-2 border-t border-[#E2E8F0]">
                    {(group.options ?? []).map((option) => (
                      <div key={option.id} className="flex items-center justify-between gap-3 p-3 bg-[#F8FAFC] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-[#0F172A]">{option.name}</h4>
                            {option.isDefault && <span className={BADGE_NEUTRAL}>Por defecto</span>}
                          </div>
                          <p className="text-sm text-[#475569]">
                            {option.priceAdjustment === 0
                              ? 'Sin costo adicional'
                              : option.priceAdjustment > 0
                              ? <span className="font-bold">+{formatCurrency(option.priceAdjustment)}</span>
                              : <span className="font-bold">{formatCurrency(option.priceAdjustment)}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditOption(group.id, option.id)}
                            className={BTN_OUTLINE}
                            aria-label={`Editar opción ${option.name}`}
                          >
                            <PencilIcon className="w-4 h-4" />
                            Editar
                          </button>
                          <TrashButton onClick={() => onDeleteOption(group.id, option.id)} label={`Eliminar opción ${option.name}`} className="ml-4" />
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => onAddOption(group.id)}
                      className="w-full h-11 flex items-center justify-center gap-2 px-4 border-[1.5px] border-dashed border-[#CBD5E1] rounded-lg text-sm font-semibold text-[#1E2A4A] hover:bg-slate-50 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Agregar opción
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModifiersListTab;
