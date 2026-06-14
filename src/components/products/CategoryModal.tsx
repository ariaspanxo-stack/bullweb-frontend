import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface Category {
  id: string;
  name: string;
  icon?: string;
  productsCount?: number;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: { name: string; icon: string }) => void;
  category?: Category | null;
  mode: 'create' | 'edit';
  existingNames: string[];
}

interface FormData {
  name: string;
  icon: string;
}

interface FormErrors {
  name?: string;
  icon?: string;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  category,
  mode,
  existingNames,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    icon: '📦',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Inicializar formulario al abrir
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && category) {
        setFormData({
          name: category.name,
          icon: category.icon || '📦',
        });
      } else {
        setFormData({
          name: '',
          icon: '📦',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, category]);

  // Validar nombre
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'El nombre es requerido';
    }
    if (name.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    if (name.trim().length > 50) {
      return 'El nombre no puede tener más de 50 caracteres';
    }

    // Validar nombre único (excepto si estamos editando la misma categoría)
    const normalizedName = name.trim().toLowerCase();
    const isDuplicate = existingNames.some((existingName) => {
      if (mode === 'edit' && category && existingName.toLowerCase() === category.name.toLowerCase()) {
        return false; // Permitir el nombre actual al editar
      }
      return existingName.toLowerCase() === normalizedName;
    });

    if (isDuplicate) {
      return 'Ya existe una categoría con este nombre';
    }

    return undefined;
  };

  // Validar emoji
  const validateIcon = (icon: string): string | undefined => {
    if (!icon) {
      return 'Debes seleccionar un emoji';
    }
    return undefined;
  };

  // Manejar cambio de nombre
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, name: value }));
    
    // Validar en tiempo real
    const error = validateName(value);
    setErrors((prev) => ({ ...prev, name: error }));
  };

  // Manejar selección de emoji
  const handleEmojiSelect = (emoji: string) => {
    setFormData((prev) => ({ ...prev, icon: emoji }));
    setErrors((prev) => ({ ...prev, icon: undefined }));
  };

  // Validar formulario completo
  const validateForm = (): boolean => {
    const nameError = validateName(formData.name);
    const iconError = validateIcon(formData.icon);

    setErrors({
      name: nameError,
      icon: iconError,
    });

    return !nameError && !iconError;
  };

  // Guardar
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      icon: formData.icon,
    });

    onClose();
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
        <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'create' ? '✨ Nueva Categoría' : '✏️ Editar Categoría'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {mode === 'create'
                  ? 'Crea una nueva categoría para organizar tus productos'
                  : 'Modifica la información de la categoría'}
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
                onChange={handleNameChange}
                placeholder="Ej: Bebidas Frías, Electrónica, Herramientas..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={50}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.name.length}/50 caracteres
              </p>
            </div>

            {/* Emoji */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emoji/Icono <span className="text-red-500">*</span>
              </label>
              <EmojiPicker
                selectedEmoji={formData.icon}
                onSelect={handleEmojiSelect}
              />
              {errors.icon && (
                <p className="mt-1 text-sm text-red-600">{errors.icon}</p>
              )}
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-semibold text-gray-800 mb-3">
                👁️ Vista Previa
              </p>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{formData.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {formData.name || 'Nombre de la categoría'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {mode === 'edit' && category
                        ? `${category.productsCount} productos`
                        : '0 productos'}
                    </p>
                  </div>
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
                {mode === 'create' ? 'Crear Categoría' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
