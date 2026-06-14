import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import type { RecipeIngredient } from '../../types/recipe.types';
import type { Ingredient, IngredientCategory } from '../../types/ingredient.types';
import { calculateIngredientCost } from '../../utils/recipeCalculator';
import { formatCurrency } from '../../lib/utils';

interface IngredientSelectorProps {
  selectedIngredients: RecipeIngredient[];
  availableIngredients: Ingredient[];
  ingredientCategories: IngredientCategory[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}

export const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  selectedIngredients,
  availableIngredients,
  ingredientCategories,
  onChange,
}) => {
  const [showSelector, setShowSelector] = useState(false);

  const handleAddIngredient = (ingredientId: string) => {
    const ingredient = availableIngredients.find((i) => i.id === ingredientId);
    if (!ingredient) return;

    // Verificar si ya está agregado
    if (selectedIngredients.some((si) => si.ingredientId === ingredientId)) {
      return;
    }

    const newIngredient: RecipeIngredient = {
      ingredientId: ingredient.id,
      quantity: 1,
      unit: ingredient.unit,
      cost: ingredient.pricePerUnit,
      notes: '',
    };

    onChange([...selectedIngredients, newIngredient]);
    setShowSelector(false);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const updated = [...selectedIngredients];
    updated[index].quantity = quantity;

    // Recalcular costo
    const ingredient = availableIngredients.find(
      (i) => i.id === updated[index].ingredientId
    );
    if (ingredient) {
      updated[index].cost = calculateIngredientCost(updated[index], ingredient);
    }

    onChange(updated);
  };

  const handleUpdateNotes = (index: number, notes: string) => {
    const updated = [...selectedIngredients];
    updated[index].notes = notes;
    onChange(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = selectedIngredients.filter((_, i) => i !== index);
    onChange(updated);
  };

  const getIngredientName = (id: string) => {
    const ing = availableIngredients.find((i) => i.id === id);
    return ing ? ing.name : 'Desconocido';
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = ingredientCategories.find((c) => c.id === categoryId);
    return cat ? cat.icon : '📦';
  };

  return (
    <div className="space-y-4">
      {/* Lista de ingredientes seleccionados */}
      {selectedIngredients.length > 0 && (
        <div className="space-y-2">
          {selectedIngredients.map((recipeIng, index) => {
            const ingredient = availableIngredients.find(
              (i) => i.id === recipeIng.ingredientId
            );

            return (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  {ingredient && (
                    <span className="text-2xl">
                      {getCategoryIcon(ingredient.categoryId)}
                    </span>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {getIngredientName(recipeIng.ingredientId)}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          value={recipeIng.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(index, parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="0.001"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Unidad
                        </label>
                        <input
                          type="text"
                          value={recipeIng.unit}
                          disabled
                          className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm bg-gray-100 text-gray-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Notas (opcional)
                      </label>
                      <input
                        type="text"
                        value={recipeIng.notes || ''}
                        onChange={(e) => handleUpdateNotes(index, e.target.value)}
                        placeholder="Ej: bien picado, cocido..."
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-600">Costo:</span>
                      <span className="text-sm font-bold text-gray-900">
                        ${recipeIng.cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón agregar ingrediente */}
      {!showSelector ? (
        <button
          type="button"
          onClick={() => setShowSelector(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Agregar Ingrediente
        </button>
      ) : (
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Selecciona un ingrediente</h4>
            <button
              type="button"
              onClick={() => setShowSelector(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {availableIngredients
              .filter(
                (ing) =>
                  !selectedIngredients.some((si) => si.ingredientId === ing.id)
              )
              .map((ingredient) => (
                <button
                  key={ingredient.id}
                  type="button"
                  onClick={() => handleAddIngredient(ingredient.id)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded flex items-center gap-2"
                >
                  <span className="text-xl">
                    {getCategoryIcon(ingredient.categoryId)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {ingredient.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatCurrency(ingredient.pricePerUnit)}/
                      {ingredient.unit}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientSelector;
