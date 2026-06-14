import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import type { ModifierGroup } from '../../types/modifier.types';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../lib/utils';

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Modificadores</h2>
          <p className="text-gray-600 mt-1">
            {modifierGroups.length} grupo{modifierGroups.length !== 1 ? 's' : ''} de modificadores
          </p>
        </div>
        <button
          onClick={onAddGroup}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo Grupo
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Los modificadores permiten que tus clientes personalicen productos.
          Ejemplos: tamaños, ingredientes extra, nivel de cocción, etc.
        </p>
      </div>

      {/* Lista */}
      {modifierGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay grupos de modificadores
          </h3>
          <p className="text-gray-600 mb-4">
            Crea tu primer grupo para permitir personalización de productos
          </p>
          <button
            onClick={onAddGroup}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Crear Grupo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {modifierGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);

            return (
              <div
                key={group.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Header del grupo */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <h3 className="text-lg font-bold text-gray-900">
                          {group.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            group.selectionType === 'single'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {group.selectionType === 'single' ? 'Una opción' : 'Múltiples'}
                        </span>
                        {group.isRequired && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                            Requerido
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 ml-8">{group.description}</p>
                      <p className="text-xs text-gray-500 ml-8 mt-1">
                        📦 Aplica a: {getProductNames(group.productIds) || 'Ningún producto'}
                      </p>
                      <p className="text-xs text-gray-500 ml-8">
                        {group.options.length} opción{group.options.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditGroup(group)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGroup(group)}
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Opciones (expandible) */}
                {isExpanded && (
                  <div className="p-4 space-y-2">
                    {(group.options ?? []).map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{option.name}</h4>
                            {option.isDefault && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                                Por defecto
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {option.priceAdjustment === 0
                              ? 'Sin costo adicional'
                              : option.priceAdjustment > 0
                              ? `+${formatCurrency(option.priceAdjustment)}`
                              : formatCurrency(option.priceAdjustment)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditOption(group.id, option.id)}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => onDeleteOption(group.id, option.id)}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => onAddOption(group.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Agregar Opción
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
