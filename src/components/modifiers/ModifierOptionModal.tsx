import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type {
  ModifierOption,
  ModifierOptionFormData,
  ModifierOptionFormErrors,
} from '../../types/modifier.types';
import { formatCurrency } from '../../lib/utils';

interface ModifierOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ModifierOptionFormData) => void;
  option?: ModifierOption | null;
  mode: 'create' | 'edit';
  groupName: string;
}

export const ModifierOptionModal: React.FC<ModifierOptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  option,
  mode,
  groupName,
}) => {
  const [formData, setFormData] = useState<ModifierOptionFormData>({
    name: '',
    priceAdjustment: 0,
    isDefault: false,
    status: 'active',
  });

  const [errors, setErrors] = useState<ModifierOptionFormErrors>({});

  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && option) {
        setFormData({
          name: option.name,
          priceAdjustment: option.priceAdjustment,
          isDefault: option.isDefault,
          status: option.status,
        });
      } else {
        setFormData({
          name: '',
          priceAdjustment: 0,
          isDefault: false,
          status: 'active',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, option]);

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: ModifierOptionFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Mínimo 2 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleChange = (field: keyof ModifierOptionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ModifierOptionFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'create' ? '✨ Nueva Opción' : '✏️ Editar Opción'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Para el grupo: <span className="font-semibold">{groupName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Mediana, Queso extra, Masa gruesa..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Ajuste de Precio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ajuste de Precio
              </label>
              <input
                type="number"
                value={formData.priceAdjustment}
                onChange={(e) =>
                  handleChange('priceAdjustment', parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                step="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ingresa un valor positivo para agregar costo, negativo para descuento, o 0 sin
                cambio
              </p>
              {formData.priceAdjustment !== 0 && (
                <p className="mt-2 text-sm font-semibold text-blue-600">
                  {formData.priceAdjustment > 0 ? '+' : ''}{formatCurrency(formData.priceAdjustment)}
                </p>
              )}
            </div>

            {/* Por Defecto */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => handleChange('isDefault', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                Marcar como opción por defecto
              </label>
            </div>

            {/* Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">👁️ Vista Previa</p>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formData.name || 'Nombre de la opción'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formData.priceAdjustment === 0
                        ? 'Sin costo adicional'
                        : formData.priceAdjustment > 0
                        ? `+${formatCurrency(formData.priceAdjustment)}`
                        : formatCurrency(formData.priceAdjustment)}
                    </p>
                  </div>
                  {formData.isDefault && (
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                      Por defecto
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {mode === 'create' ? 'Crear Opción' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModifierOptionModal;
