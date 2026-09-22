import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string | null; // Hotfix #139 — imagen de categoría (endpoint multer preexistente)
  productsCount?: number;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: { name: string; icon: string; image?: string }) => void;
  category?: Category | null;
  mode: 'create' | 'edit';
  existingNames: string[];
}

interface FormData {
  name: string;
  icon: string;
  image: string;
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
    image: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadingImage, setUploadingImage] = useState(false); // Hotfix #139

  // Inicializar formulario al abrir
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && category) {
        setFormData({
          name: category.name,
          icon: category.icon || '📦',
          image: category.image || '',
        });
      } else {
        setFormData({
          name: '',
          icon: '📦',
          image: '',
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

  // ── Hotfix #139 — Subir imagen de categoría (patrón CartaQRPage /menu/upload-logo) ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const token   = localStorage.getItem('bullweb_token') ?? '';
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4200/api';
      const resp    = await fetch(`${baseUrl}/menu/upload-logo`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await resp.json();
      if (data.url) {
        setFormData((prev) => ({ ...prev, image: data.url }));
        setErrors((prev) => ({ ...prev, name: prev.name }));
      }
    } catch { /* silencioso */ }
    finally { setUploadingImage(false); }
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
      image: formData.image || undefined,
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
        <div className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {mode === 'create' ? '✨ Nueva Categoría' : '✏️ Editar Categoría'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {mode === 'create'
                  ? 'Crea una nueva categoría para organizar tus productos'
                  : 'Modifica la información de la categoría'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Ej: Hamburguesas, Sushi, Bebidas Frías..."
                className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
                  errors.name ? 'border-red-500' : 'border-white/10'
                }`}
                maxLength={50}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.name.length}/50 caracteres
              </p>
            </div>

            {/* Emoji */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Emoji/Icono <span className="text-red-400">*</span>
              </label>
              <EmojiPicker
                selectedEmoji={formData.icon}
                onSelect={handleEmojiSelect}
              />
              {errors.icon && (
                <p className="mt-1 text-sm text-red-400">{errors.icon}</p>
              )}
            </div>

            {/* Hotfix #139 — Imagen de categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Imagen de la categoría <span className="text-gray-500 text-xs">(opcional, se muestra en la carta QR)</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {uploadingImage ? (
                    <span className="text-xs text-gray-400 animate-pulse">Subiendo…</span>
                  ) : formData.image ? (
                    <img src={formData.image} alt="Imagen de categoría" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{formData.icon}</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm cursor-pointer text-center">
                    {uploadingImage ? 'Subiendo…' : '📷 Subir imagen'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                      className="px-4 py-1.5 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-brand-500/10 to-brand-500/5 rounded-lg p-4 border border-brand-500/20">
              <p className="text-sm font-semibold text-white mb-3">
                👁️ Vista Previa
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  {formData.image ? (
                    <img src={formData.image} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                  ) : (
                    <span className="text-3xl">{formData.icon}</span>
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      {formData.name || 'Nombre de la categoría'}
                    </h3>
                    <p className="text-sm text-gray-400">
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
                className="flex-1 px-4 py-2.5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
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
