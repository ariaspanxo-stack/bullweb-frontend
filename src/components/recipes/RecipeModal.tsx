import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import type { Recipe, RecipeFormData, RecipeFormErrors } from '../../types/recipe.types';
import type { Product } from '../../types/product.types';
import type { Ingredient, IngredientCategory } from '../../types/ingredient.types';
import IngredientSelector from './IngredientSelector';
import {
  calculateRecipeTotalCost,
  calculateCostPerServing,
  calculateSuggestedPrice,
  calculateRealMargin,
  compareCosts,
} from '../../utils/recipeCalculator';
import { formatCurrency } from '../../lib/utils';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RecipeFormData) => Promise<void>;
  recipe?: Recipe | null;
  mode: 'create' | 'edit';
  products: Product[];
  ingredients: Ingredient[];
  ingredientCategories: IngredientCategory[];
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recipe,
  mode,
  products,
  ingredients,
  ingredientCategories,
}) => {
  const [formData, setFormData] = useState<RecipeFormData>({
    productId: '',
    name: '',
    description: '',
    ingredients: [],
    servings: 1,
    prepTime: 0,
    cookTime: 0,
    instructions: '',
    notes: '',
  });

  const [errors, setErrors] = useState<RecipeFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && recipe) {
        setFormData({
          productId: recipe.productId,
          name: recipe.name,
          description: recipe.description || '',
          ingredients: recipe.ingredients,
          servings: recipe.servings,
          prepTime: recipe.prepTime || 0,
          cookTime: recipe.cookTime || 0,
          instructions: recipe.instructions || '',
          notes: recipe.notes || '',
        });
      } else {
        setFormData({
          productId: products[0]?.id || '',
          name: '',
          description: '',
          ingredients: [],
          servings: 1,
          prepTime: 0,
          cookTime: 0,
          instructions: '',
          notes: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, recipe, products]);

  // Cálculos automáticos
  const calculations = useMemo(() => {
    const totalCost = calculateRecipeTotalCost(formData.ingredients, ingredients);
    const costPerServing = calculateCostPerServing(totalCost, formData.servings);

    // Obtener producto seleccionado
    const selectedProduct = products.find((p) => p.id === formData.productId);

    const comparison = selectedProduct
      ? compareCosts(selectedProduct.cost || 0, totalCost)
      : null;

    const realMargin = selectedProduct
      ? calculateRealMargin(selectedProduct.price, totalCost)
      : 0;

    const suggestedPrice40 = calculateSuggestedPrice(totalCost, 40);
    const suggestedPrice50 = calculateSuggestedPrice(totalCost, 50);
    const suggestedPrice67 = calculateSuggestedPrice(totalCost, 67);

    return {
      totalCost,
      costPerServing,
      comparison,
      realMargin,
      suggestedPrice40,
      suggestedPrice50,
      suggestedPrice67,
      selectedProduct,
    };
  }, [formData.ingredients, formData.servings, formData.productId, ingredients, products]);

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: RecipeFormErrors = {};

    if (!formData.productId) {
      newErrors.productId = 'Selecciona un producto';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.ingredients.length === 0) {
      newErrors.ingredients = 'Agrega al menos un ingrediente';
    }

    if (formData.servings <= 0) {
      newErrors.servings = 'Las porciones deben ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleChange = (field: keyof RecipeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof RecipeFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch {
      // Error ya manejado por el padre con toast
    } finally {
      setIsSubmitting(false);
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
        <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'create' ? '📋 Nueva Ficha Técnica' : '✏️ Editar Ficha Técnica'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Define los ingredientes y cantidades para calcular el costo real
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
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Formulario */}
              <div className="lg:col-span-2 space-y-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>

                  {/* Producto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Producto <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.productId}
                      onChange={(e) => handleChange('productId', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.productId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecciona un producto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                    {errors.productId && (
                      <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
                    )}
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Ej: Pizza Margarita - Receta estándar"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Descripción de la receta..."
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Porciones y Tiempos */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Porciones <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.servings}
                        onChange={(e) => handleChange('servings', parseInt(e.target.value) || 1)}
                        min="1"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.servings ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.servings && (
                        <p className="mt-1 text-sm text-red-600">{errors.servings}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prep (min)
                      </label>
                      <input
                        type="number"
                        value={formData.prepTime}
                        onChange={(e) => handleChange('prepTime', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cocción (min)
                      </label>
                      <input
                        type="number"
                        value={formData.cookTime}
                        onChange={(e) => handleChange('cookTime', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Ingredientes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Ingredientes <span className="text-red-500">*</span>
                    </h3>
                    {formData.ingredients.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {formData.ingredients.length} ingrediente
                        {formData.ingredients.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <IngredientSelector
                    selectedIngredients={formData.ingredients}
                    availableIngredients={ingredients}
                    ingredientCategories={ingredientCategories}
                    onChange={(ings) => handleChange('ingredients', ings)}
                  />

                  {errors.ingredients && (
                    <p className="mt-1 text-sm text-red-600">{errors.ingredients}</p>
                  )}
                </div>

                {/* Instrucciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instrucciones
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => handleChange('instructions', e.target.value)}
                    placeholder="Paso a paso de la preparación..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Notas, tips, variaciones..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Columna Derecha: Cálculos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">📊 Cálculos</h3>

                {/* Costo Total */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-1">Costo Total</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {formatCurrency(calculations.totalCost)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Por porción: ${calculations.costPerServing.toFixed(0)}
                  </p>
                </div>

                {/* Comparación con Producto */}
                {calculations.selectedProduct && calculations.comparison && (
                  <div
                    className={`border rounded-lg p-4 ${
                      calculations.comparison.status === 'match'
                        ? 'bg-green-50 border-green-200'
                        : calculations.comparison.status === 'higher'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <p className="text-sm font-semibold mb-2">Comparación</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Costo estimado:</span>
                        <span className="font-mono">
                          {formatCurrency(calculations.comparison.estimatedCost)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Costo real:</span>
                        <span className="font-mono font-bold">
                          {formatCurrency(calculations.comparison.realCost)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span>Diferencia:</span>
                        <span
                          className={`font-mono font-bold ${
                            calculations.comparison.difference > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {calculations.comparison.difference > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(calculations.comparison.difference))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Margen Real */}
                {calculations.selectedProduct && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">Margen Real</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Precio venta:</span>
                        <span className="font-mono">
                          {formatCurrency(calculations.selectedProduct.price)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Costo real:</span>
                        <span className="font-mono">
                          ${calculations.totalCost.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Margen:</span>
                        <span
                          className={`font-bold text-lg ${
                            calculations.realMargin >= 40
                              ? 'text-green-600'
                              : calculations.realMargin >= 20
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {calculations.realMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Precios Sugeridos */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-purple-900 mb-2">
                    💡 Precios Sugeridos
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Margen 40%:</span>
                      <span className="font-mono">
                        ${calculations.suggestedPrice40.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen 50%:</span>
                      <span className="font-mono">
                        ${calculations.suggestedPrice50.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen 67%:</span>
                      <span className="font-mono font-bold">
                        ${calculations.suggestedPrice67.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tiempos */}
                {(formData.prepTime > 0 || formData.cookTime > 0) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-semibold mb-2">⏱️ Tiempos</p>
                    <div className="space-y-1 text-sm">
                      {formData.prepTime > 0 && (
                        <div className="flex justify-between">
                          <span>Preparación:</span>
                          <span>{formData.prepTime} min</span>
                        </div>
                      )}
                      {formData.cookTime > 0 && (
                        <div className="flex justify-between">
                          <span>Cocción:</span>
                          <span>{formData.cookTime} min</span>
                        </div>
                      )}
                      {formData.prepTime > 0 && formData.cookTime > 0 && (
                        <div className="flex justify-between pt-2 border-t font-semibold">
                          <span>Total:</span>
                          <span>{formData.prepTime + formData.cookTime} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {mode === 'create' ? 'Crear Ficha Técnica' : 'Guardar Cambios'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;
