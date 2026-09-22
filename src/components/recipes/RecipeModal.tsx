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
      ? compareCosts(selectedProduct?.cost || 0, totalCost)
      : null;

    const realMargin = selectedProduct
      ? calculateRealMargin(selectedProduct?.price || 0, totalCost)
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

    if ((formData.ingredients || []).length === 0) {
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
      // Mapear claves del formulario a las que espera el backend:
      // ingredients -> items, servings -> yield
      const payload = {
        ...formData,
        items: (formData.ingredients || []).map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
        })),
        yield: formData.servings,
      };
      // Eliminar las claves antiguas que el backend no reconoce
      const { ingredients: _ingredients, servings: _servings, ...rest } = payload;
      await onSave(rest as unknown as RecipeFormData);
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
        <div className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 z-10 flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {mode === 'create' ? '📋 Nueva Ficha Técnica' : '✏️ Editar Ficha Técnica'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Define los ingredientes y cantidades para calcular el costo real
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
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Formulario */}
              <div className="lg:col-span-2 space-y-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Información Básica</h3>

                  {/* Producto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Producto <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.productId}
                      onChange={(e) => handleChange('productId', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white [color-scheme:dark] focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                        errors.productId ? 'border-red-500' : 'border-white/10'
                      }`}
                    >
                      <option value="">Selecciona un producto</option>
                      {(products || []).map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                    {errors.productId && (
                      <p className="mt-1 text-sm text-red-400">{errors.productId}</p>
                    )}
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Ej: Pizza Margarita - Receta estándar"
                      className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                        errors.name ? 'border-red-500' : 'border-white/10'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                    )}
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Ej: Receta base para 4 porciones de pizza 30cm"
                      rows={2}
                      className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Porciones y Tiempos */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Porciones <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.servings}
                        onChange={(e) => handleChange('servings', parseInt(e.target.value) || 1)}
                        min="1"
                        className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                          errors.servings ? 'border-red-500' : 'border-white/10'
                        }`}
                      />
                      {errors.servings && (
                        <p className="mt-1 text-sm text-red-400">{errors.servings}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Prep (min)
                      </label>
                      <input
                        type="number"
                        value={formData.prepTime}
                        onChange={(e) => handleChange('prepTime', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cocción (min)
                      </label>
                      <input
                        type="number"
                        value={formData.cookTime}
                        onChange={(e) => handleChange('cookTime', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Ingredientes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Ingredientes <span className="text-red-400">*</span>
                    </h3>
                    {(formData.ingredients || []).length > 0 && (
                      <span className="text-sm text-gray-400">
                        {(formData.ingredients || []).length} ingrediente
                        {(formData.ingredients || []).length !== 1 ? 's' : ''}
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
                    <p className="mt-1 text-sm text-red-400">{errors.ingredients}</p>
                  )}
                </div>

                {/* Instrucciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Instrucciones
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => handleChange('instructions', e.target.value)}
                    placeholder="Ej: 1. Amasar, 2. Reposar 30 min, 3. Hornear 12 min a 220°C"
                    rows={4}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Ej: Usar mozzarella fresca para mejor fundido"
                    rows={2}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Columna Derecha: Cálculos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">📊 Cálculos</h3>

                {/* Costo Total */}
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4">
                  <p className="text-sm text-brand-300 mb-1">Costo Total</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(calculations.totalCost || 0)}
                  </p>
                  <p className="text-xs text-brand-300/70 mt-1">
                    Por porción: ${(calculations.costPerServing || 0).toFixed(0)}
                  </p>
                </div>

                {/* Comparación con Producto */}
                {calculations.selectedProduct && calculations.comparison && (
                  <div
                    className={`border rounded-lg p-4 ${
                      calculations.comparison.status === 'match'
                        ? 'bg-green-500/10 border-green-500/20'
                        : calculations.comparison.status === 'higher'
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-yellow-500/10 border-yellow-500/20'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white mb-2">Comparación</p>
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
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span>Diferencia:</span>
                        <span
                          className={`font-mono font-bold ${
                            calculations.comparison.difference > 0
                              ? 'text-red-400'
                              : 'text-green-400'
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
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Margen Real</p>
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
                          ${(calculations.totalCost || 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-semibold text-white">Margen:</span>
                        <span
                          className={`font-bold text-lg ${
                            calculations.realMargin >= 40
                              ? 'text-green-400'
                              : calculations.realMargin >= 20
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {(calculations.realMargin || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Precios Sugeridos */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm font-semibold text-purple-300 mb-2">
                    💡 Precios Sugeridos
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Margen 40%:</span>
                      <span className="font-mono">
                        ${(calculations.suggestedPrice40 || 0).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen 50%:</span>
                      <span className="font-mono">
                        ${(calculations.suggestedPrice50 || 0).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen 67%:</span>
                      <span className="font-mono font-bold">
                        ${(calculations.suggestedPrice67 || 0).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tiempos */}
                {(formData.prepTime > 0 || formData.cookTime > 0) && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm font-semibold text-white mb-2">⏱️ Tiempos</p>
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
                        <div className="flex justify-between pt-2 border-t border-white/10 font-semibold text-white">
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
            <div className="flex gap-3 pt-6 mt-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? 'bg-brand-500/50 cursor-not-allowed text-white'
                    : 'bg-brand-500 hover:bg-brand-600 text-white'
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
