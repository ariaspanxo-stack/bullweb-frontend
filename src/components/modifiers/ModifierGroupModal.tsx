import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type {
  ModifierGroup,
  ModifierGroupFormData,
  ModifierGroupFormErrors,
} from '../../types/modifier.types';
import type { Product } from '../../types/product.types';
import { formatCurrency } from '../../lib/utils';

interface ModifierGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ModifierGroupFormData) => void;
  group?: ModifierGroup | null;
  mode: 'create' | 'edit';
  products: Product[];
}

export const ModifierGroupModal: React.FC<ModifierGroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  group,
  mode,
  products,
}) => {
  const [formData, setFormData] = useState<ModifierGroupFormData>({
    name: '',
    description: '',
    selectionType: 'single',
    isRequired: false,
    minSelections: 0,
    maxSelections: 1,
    productIds: [],
    sortOrder: 1,
    status: 'active',
  });

  const [errors, setErrors] = useState<ModifierGroupFormErrors>({});

  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && group) {
        setFormData({
          name: group.name,
          description: group.description || '',
          selectionType: group.selectionType,
          isRequired: group.isRequired,
          minSelections: group.minSelections || 0,
          maxSelections: group.maxSelections || 1,
          productIds: group.productIds,
          sortOrder: group.sortOrder,
          status: group.status,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          selectionType: 'single',
          isRequired: false,
          minSelections: 0,
          maxSelections: 1,
          productIds: [],
          sortOrder: 1,
          status: 'active',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, group]);

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: ModifierGroupFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Mínimo 2 caracteres';
    }

    if (formData.productIds.length === 0) {
      newErrors.productIds = 'Selecciona al menos un producto';
    }

    if (formData.selectionType === 'multiple') {
      if (formData.maxSelections < 1) {
        newErrors.maxSelections = 'Máximo debe ser al menos 1';
      }
      if (formData.minSelections > formData.maxSelections) {
        newErrors.minSelections = 'Mínimo no puede ser mayor al máximo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleChange = (field: keyof ModifierGroupFormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Ajustar min/max según tipo de selección
      if (field === 'selectionType') {
        if (value === 'single') {
          updated.minSelections = 1;
          updated.maxSelections = 1;
        } else {
          updated.minSelections = 0;
          updated.maxSelections = 5;
        }
      }

      return updated;
    });

    if (errors[field as keyof ModifierGroupFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProductToggle = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
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
        <div className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 z-10 flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {mode === 'create' ? '🔧 Nuevo Grupo de Modificadores' : '✏️ Editar Grupo'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {mode === 'create'
                  ? 'Crea un nuevo grupo de opciones para personalizar productos'
                  : 'Modifica el grupo de modificadores'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Información Básica</h3>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Tamaño, Ingredientes Extra, Tipo de Masa..."
                  className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                    errors.name ? 'border-red-500' : 'border-white/10'
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Ej: ¿En qué tamaño lo quieres?"
                  rows={2}
                  className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              {/* Tipo de Selección */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Selección <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleChange('selectionType', 'single')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.selectionType === 'single'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold text-white mb-1">Una Opción</p>
                      <p className="text-xs text-gray-400">
                        El cliente elige solo una (radio button)
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('selectionType', 'multiple')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.selectionType === 'multiple'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold text-white mb-1">Múltiples</p>
                      <p className="text-xs text-gray-400">
                        El cliente puede elegir varias (checkbox)
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Requerido */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={formData.isRequired}
                  onChange={(e) => handleChange('isRequired', e.target.checked)}
                  className="w-4 h-4 text-brand-500 border-white/20 rounded focus:ring-brand-500 [color-scheme:dark]"
                />
                <label htmlFor="isRequired" className="text-sm font-medium text-gray-300">
                  Es obligatorio seleccionar una opción
                </label>
              </div>

              {/* Límites (solo para multiple) */}
              {formData.selectionType === 'multiple' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Mínimo de Selecciones
                    </label>
                    <input
                      type="number"
                      value={formData.minSelections}
                      onChange={(e) =>
                        handleChange('minSelections', parseInt(e.target.value) || 0)
                      }
                      min="0"
                      className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                        errors.minSelections ? 'border-red-500' : 'border-white/10'
                      }`}
                    />
                    {errors.minSelections && (
                      <p className="mt-1 text-sm text-red-400">{errors.minSelections}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Máximo de Selecciones
                    </label>
                    <input
                      type="number"
                      value={formData.maxSelections}
                      onChange={(e) =>
                        handleChange('maxSelections', parseInt(e.target.value) || 1)
                      }
                      min="1"
                      className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                        errors.maxSelections ? 'border-red-500' : 'border-white/10'
                      }`}
                    />
                    {errors.maxSelections && (
                      <p className="mt-1 text-sm text-red-400">{errors.maxSelections}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Productos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Aplica a Productos <span className="text-red-400">*</span>
              </h3>
              <p className="text-sm text-gray-400">
                Selecciona los productos a los que se aplicará este grupo de modificadores
              </p>

              <div className="border border-white/10 rounded-lg max-h-48 overflow-y-auto">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={formData.productIds.includes(product.id)}
                      onChange={() => handleProductToggle(product.id)}
                      className="w-4 h-4 text-brand-500 border-white/20 rounded focus:ring-brand-500 [color-scheme:dark]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {errors.productIds && (
                <p className="mt-1 text-sm text-red-400">{errors.productIds}</p>
              )}
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-brand-500/10 to-brand-500/5 rounded-lg p-4 border border-brand-500/20">
              <p className="text-sm font-semibold text-white mb-3">👁️ Vista Previa</p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="font-semibold text-white mb-1">
                  {formData.name || 'Nombre del grupo'}
                </p>
                <p className="text-sm text-gray-400 mb-2">
                  {formData.description || 'Descripción del grupo'}
                </p>
                <div className="flex gap-2 text-xs">
                  <span
                    className={`px-2 py-1 rounded ${
                      formData.selectionType === 'single'
                        ? 'bg-brand-500/15 text-brand-300'
                        : 'bg-purple-500/15 text-purple-300'
                    }`}
                  >
                    {formData.selectionType === 'single' ? 'Una opción' : 'Múltiples opciones'}
                  </span>
                  {formData.isRequired && (
                    <span className="px-2 py-1 rounded bg-red-500/15 text-red-300">
                      Requerido
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
                className="flex-1 px-4 py-2.5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
              >
                {mode === 'create' ? 'Crear Grupo' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModifierGroupModal;
