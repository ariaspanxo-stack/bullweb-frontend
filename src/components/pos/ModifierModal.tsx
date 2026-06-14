import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Product } from '../../types/product.types';
import type { ModifierGroup } from '../../types/modifier.types';
import type { SelectedModifier } from '../../types/order.types';
import { formatCurrency } from '../../lib/utils';

interface ModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  modifierGroups: ModifierGroup[];
  onConfirm: (selectedModifiers: SelectedModifier[]) => void;
}

const ModifierModal: React.FC<ModifierModalProps> = ({
  isOpen,
  onClose,
  product,
  modifierGroups,
  onConfirm
}) => {
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Obtener grupos de modificadores del producto
  const productModifierGroups = modifierGroups.filter(group =>
    product.modifierGroups?.some(pm => pm.groupId === group.id || pm.id === group.id)
  );

  useEffect(() => {
    if (isOpen) {
      // Inicializar con opciones por defecto
      const defaultModifiers: SelectedModifier[] = [];
      
      productModifierGroups.forEach(group => {
        const defaultOption = group.options.find(opt => opt.isDefault);
        if (defaultOption && group.selectionType === 'single' && group.isRequired) {
          defaultModifiers.push({
            groupId: group.id,
            groupName: group.name,
            optionId: defaultOption.id,
            optionName: defaultOption.name,
            priceAdjustment: defaultOption.priceAdjustment
          });
        }
      });
      
      setSelectedModifiers(defaultModifiers);
      setErrors({});
    }
  }, [isOpen, product]);

  // Manejar selección de modificador
  const handleModifierSelect = (group: ModifierGroup, optionId: string) => {
    const option = group.options.find(opt => opt.id === optionId);
    if (!option) return;

    if (group.selectionType === 'single') {
      // Single selection: reemplazar selección del grupo
      setSelectedModifiers(prev => [
        ...prev.filter(mod => mod.groupId !== group.id),
        {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceAdjustment: option.priceAdjustment
        }
      ]);
    } else {
      // Multiple selection: toggle
      const isSelected = selectedModifiers.some(
        mod => mod.groupId === group.id && mod.optionId === optionId
      );

      if (isSelected) {
        setSelectedModifiers(prev =>
          prev.filter(mod => !(mod.groupId === group.id && mod.optionId === optionId))
        );
      } else {
        // Verificar maxSelections
        const groupSelections = selectedModifiers.filter(mod => mod.groupId === group.id).length;
        if (group.maxSelections && groupSelections >= group.maxSelections) {
          setErrors(prev => ({
            ...prev,
            [group.id]: `Máximo ${group.maxSelections} ${group.maxSelections === 1 ? 'opción' : 'opciones'}`
          }));
          return;
        }

        setSelectedModifiers(prev => [
          ...prev,
          {
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            priceAdjustment: option.priceAdjustment
          }
        ]);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[group.id];
          return newErrors;
        });
      }
    }
  };

  // Validar selecciones
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    productModifierGroups.forEach(group => {
      const groupSelections = selectedModifiers.filter(mod => mod.groupId === group.id);

      if (group.isRequired && groupSelections.length === 0) {
        newErrors[group.id] = 'Este campo es obligatorio';
      }

      if (group.minSelections && groupSelections.length < group.minSelections) {
        newErrors[group.id] = `Selecciona al menos ${group.minSelections} ${group.minSelections === 1 ? 'opción' : 'opciones'}`;
      }

      if (group.maxSelections && groupSelections.length > group.maxSelections) {
        newErrors[group.id] = `Máximo ${group.maxSelections} ${group.maxSelections === 1 ? 'opción' : 'opciones'}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Confirmar selección
  const handleConfirm = () => {
    if (validate()) {
      onConfirm(selectedModifiers);
    }
  };

  // Calcular precio total
  const modifiersPrice = selectedModifiers.reduce((sum, mod) => sum + mod.priceAdjustment, 0);
  const totalPrice = product.price + modifiersPrice;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Personaliza tu producto</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {productModifierGroups.map(group => {
            const groupSelections = selectedModifiers.filter(mod => mod.groupId === group.id);
            const hasError = !!errors[group.id];

            return (
              <div key={group.id} className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {group.name}
                    {group.isRequired && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </h3>
                  {group.description && (
                    <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                  )}
                  {group.selectionType === 'multiple' && (
                    <p className="text-xs text-gray-400 mt-1">
                      {group.minSelections && group.maxSelections
                        ? `Selecciona entre ${group.minSelections} y ${group.maxSelections} opciones`
                        : group.minSelections
                        ? `Selecciona al menos ${group.minSelections}`
                        : group.maxSelections
                        ? `Máximo ${group.maxSelections} opciones`
                        : 'Selecciona las que desees'}
                    </p>
                  )}
                  {hasError && (
                    <p className="text-sm text-red-600 mt-1">{errors[group.id]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  {group.options
                    .filter(opt => opt.status === 'active')
                    .map(option => {
                      const isSelected = selectedModifiers.some(
                        mod => mod.groupId === group.id && mod.optionId === option.id
                      );

                      return (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          } ${hasError ? 'border-red-300' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type={group.selectionType === 'single' ? 'radio' : 'checkbox'}
                              name={`group-${group.id}`}
                              checked={isSelected}
                              onChange={() => handleModifierSelect(group, option.id)}
                              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {option.name}
                            </span>
                          </div>
                          {option.priceAdjustment !== 0 && (
                            <span
                              className={`text-sm font-semibold ${
                                option.priceAdjustment > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {option.priceAdjustment > 0 ? '+' : ''}
                              {formatCurrency(Math.abs(option.priceAdjustment))}
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Precio base</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(product.price)}
              </p>
            </div>
            {modifiersPrice !== 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Modificadores</p>
                <p className={`text-lg font-semibold ${modifiersPrice > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {modifiersPrice > 0 ? '+' : ''}{formatCurrency(Math.abs(modifiersPrice))}
                </p>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPrice)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModifierModal;
