import React, { useState, useEffect, useMemo } from 'react';
import { X, Info } from 'lucide-react';
import type { Ingredient, IngredientFormData, IngredientFormErrors, IngredientCategory } from '../../types/ingredient.types';
import UnitSelector from './UnitSelector';

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IngredientFormData) => void;
  ingredient?: Ingredient | null;
  mode: 'create' | 'edit';
  categories: IngredientCategory[];
}

export const IngredientModal: React.FC<IngredientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  ingredient,
  mode,
  categories,
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
          pricePerUnit: ingredient.pricePerUnit,
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
          categoryId: categories[0]?.id || '',
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
  }, [isOpen, mode, ingredient, categories]);

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

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: IngredientFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Mínimo 2 caracteres';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Selecciona una categoría';
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
    // Limpiar error del campo
    if (errors[field as keyof IngredientFormErrors]) {
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
        <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'create' ? '🥕 Nuevo Ingrediente' : '✏️ Editar Ingrediente'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {mode === 'create'
                  ? 'Registra un nuevo ingrediente en tu inventario'
                  : 'Modifica la información del ingrediente'}
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
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Harina de Trigo, Queso Mozzarella..."
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Descripción detallada del ingrediente..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleChange('categoryId', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.categoryId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
                )}
              </div>

              {/* Unidad */}
              <UnitSelector
                value={formData.unit}
                onChange={(unit) => handleChange('unit', unit)}
                error={errors.unit}
              />
            </div>

            {/* Precios y Stock */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Precios y Stock</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Precio por Unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio por {formData.unit || 'unidad'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.pricePerUnit}
                    onChange={(e) => handleChange('pricePerUnit', parseFloat(e.target.value) || 0)}
                    placeholder="1200"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.pricePerUnit ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.pricePerUnit && (
                    <p className="mt-1 text-sm text-red-600">{errors.pricePerUnit}</p>
                  )}
                </div>

                {/* Stock Actual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Actual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => handleChange('currentStock', parseFloat(e.target.value) || 0)}
                    placeholder="50"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.currentStock ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.currentStock && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentStock}</p>
                  )}
                </div>

                {/* Stock Mínimo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Mínimo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => handleChange('minStock', parseFloat(e.target.value) || 0)}
                    placeholder="10"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.minStock ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.minStock && (
                    <p className="mt-1 text-sm text-red-600">{errors.minStock}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Alerta si stock cae por debajo de este valor
                  </p>
                </div>

                {/* Proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => handleChange('supplier', e.target.value)}
                    placeholder="Nombre del proveedor"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Fechas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Última Compra
                  </label>
                  <input
                    type="date"
                    value={formData.lastPurchaseDate}
                    onChange={(e) => handleChange('lastPurchaseDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => handleChange('expirationDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Panel de Alerta de Stock */}
            <div
              className={`rounded-lg p-4 border ${
                stockAlert.type === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : stockAlert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
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
                  <p className="font-semibold text-gray-900">Estado de Stock</p>
                  <p className="text-sm text-gray-600">
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
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
