import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Ingredient, IngredientFormData, IngredientFormErrors } from '../../types/ingredient.types';
import UnitSelector from './UnitSelector';

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IngredientFormData) => void;
  ingredient?: Ingredient | null;
  mode: 'create' | 'edit';
}

const inputBaseClass =
  'w-full bg-white/5 border rounded-lg px-4 py-2.5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors';
const labelClass = 'text-sm font-medium text-gray-300 mb-1 block';

// H126: parseo robusto chileno — acepta "8000", "8.000" (miles) y "14.5" (decimal).
// El viejo parseFloat("8.000") devolvía 8 y el stock quedaba dividido por 1000.
const normalizaNumeroCL = (raw: string): number => {
  const s = raw.trim();
  if (s === '') return 0;
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
};

export const IngredientModal: React.FC<IngredientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  ingredient,
  mode,
}) => {
  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
    description: '',
    categoryId: '',
    unit: 'kg',
    pricePerUnit: 0,
    currentStock: 0,
    minStock: 0,
    supplier: '',
    lastPurchaseDate: '',
    expirationDate: '',
    status: 'active',
    imageUrl: '',
  });

  const [errors, setErrors] = useState<IngredientFormErrors>({});

  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && ingredient) {
        setFormData({
          name: ingredient.name,
          description: ingredient.description || '',
          categoryId: ingredient.categoryId,
          unit: ingredient.unit,
          // H126: el backend persiste en unitCost — leer esa columna (fallback pricePerUnit legacy)
          pricePerUnit: Number((ingredient as any).unitCost ?? ingredient.pricePerUnit ?? 0),
          currentStock: ingredient.currentStock,
          minStock: ingredient.minStock,
          supplier: ingredient.supplier || '',
          lastPurchaseDate: ingredient.lastPurchaseDate || '',
          expirationDate: ingredient.expirationDate || '',
          status: ingredient.status,
          imageUrl: ingredient.imageUrl || '',
        });
      } else {
        setFormData({
          name: '',
          description: '',
          categoryId: '',
          unit: 'kg',
          pricePerUnit: 0,
          currentStock: 0,
          minStock: 0,
          supplier: '',
          lastPurchaseDate: '',
          expirationDate: '',
          status: 'active',
          imageUrl: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, ingredient]);

  // Calcular alertas
  const stockAlert = useMemo(() => {
    if (formData.currentStock === 0) {
      return { type: 'critical', message: 'Sin stock' };
    }
    if (formData.currentStock < formData.minStock) {
      return { type: 'warning', message: 'Stock bajo' };
    }
    return { type: 'ok', message: 'Stock OK' };
  }, [formData.currentStock, formData.minStock]);

  // Validaciones — categoría ya NO es obligatoria
  const validateForm = (): boolean => {
    const newErrors: IngredientFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Mínimo 2 caracteres';
    }

    if (!formData.unit) {
      newErrors.unit = 'Selecciona una unidad';
    }

    if (formData.pricePerUnit <= 0) {
      newErrors.pricePerUnit = 'El precio debe ser mayor a 0';
    }

    if (formData.currentStock < 0) {
      newErrors.currentStock = 'El stock no puede ser negativo';
    }

    if (formData.minStock < 0) {
      newErrors.minStock = 'El stock mínimo no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleChange = (field: keyof IngredientFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof IngredientFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // H126: categoría/proveedor eran columnas fantasma — ya no se fuerzan ni se envían
      const { categoryId, supplier, ...rest } = formData;
      onSave(rest as IngredientFormData);
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
        <div className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 z-10 flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {mode === 'create' ? '🥕 Nuevo Ingrediente' : '✏️ Editar Ingrediente'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {mode === 'create'
                  ? 'Registra un nuevo ingrediente en tu inventario'
                  : 'Modifica la información del ingrediente'}
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
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Información Básica</h3>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className={labelClass}>
                    Nombre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ej: Harina de Trigo, Queso Mozzarella..."
                    className={`${inputBaseClass} ${
                      errors.name ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>

                {/* Descripción */}
                <div>
                  <label className={labelClass}>Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Descripción detallada del ingrediente..."
                    rows={2}
                    className={`${inputBaseClass} border-white/10`}
                  />
                </div>

                {/* Unidad */}
                <UnitSelector
                  value={formData.unit}
                  onChange={(unit) => handleChange('unit', unit)}
                  error={errors.unit}
                />
              </div>
            </div>

            {/* Precios y Stock */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Precios y Stock</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Precio por Unidad */}
                <div>
                  <label className={labelClass}>
                    Precio por {formData.unit || 'unidad'} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.pricePerUnit === 0 ? '' : formData.pricePerUnit}
                    onChange={(e) => handleChange('pricePerUnit', normalizaNumeroCL(e.target.value))}
                    placeholder="1200 (punto solo para decimales: 14.5)"
                    className={`${inputBaseClass} ${
                      errors.pricePerUnit ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Acepta 8000 o 8.000 — se guarda 8000
                  </p>
                  {errors.pricePerUnit && (
                    <p className="mt-1 text-sm text-red-400">{errors.pricePerUnit}</p>
                  )}
                </div>

                {/* Stock Actual */}
                <div>
                  <label className={labelClass}>
                    Stock Actual <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.currentStock === 0 ? '' : formData.currentStock}
                    onChange={(e) => handleChange('currentStock', normalizaNumeroCL(e.target.value))}
                    placeholder="8000 (punto solo para decimales)"
                    className={`${inputBaseClass} ${
                      errors.currentStock ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Cantidad en {formData.unit || 'la unidad elegida'} — acepta 8000 o 8.000
                  </p>
                  {errors.currentStock && (
                    <p className="mt-1 text-sm text-red-400">{errors.currentStock}</p>
                  )}
                </div>

                {/* Stock Mínimo */}
                <div>
                  <label className={labelClass}>
                    Stock Mínimo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.minStock === 0 ? '' : formData.minStock}
                    onChange={(e) => handleChange('minStock', normalizaNumeroCL(e.target.value))}
                    placeholder="1000"
                    className={`${inputBaseClass} ${
                      errors.minStock ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                  {errors.minStock && (
                    <p className="mt-1 text-sm text-red-400">{errors.minStock}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Alerta si el stock cae por debajo de este valor
                  </p>
                </div>
              </div>
            </div>

            {/* Panel de Alerta de Stock */}
            <div
              className={`rounded-lg p-4 border ${
                stockAlert.type === 'critical'
                  ? 'bg-red-500/10 border-red-500/30'
                  : stockAlert.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-green-500/10 border-green-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {stockAlert.type === 'critical'
                    ? '🔴'
                    : stockAlert.type === 'warning'
                    ? '⚠️'
                    : '✅'}
                </span>
                <div>
                  <p className="font-semibold text-white">Estado de Stock</p>
                  <p className="text-sm text-gray-400">
                    {stockAlert.message} - {formData.currentStock} {formData.unit} disponibles
                    {formData.minStock > 0 && ` (mínimo: ${formData.minStock} ${formData.unit})`}
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-transparent border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium shadow-sm"
              >
                {mode === 'create' ? 'Crear Ingrediente' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IngredientModal;