import React, { useState, useMemo } from 'react';
import { PlusIcon, TrashIcon, Search, PackageSearch } from 'lucide-react';
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
  // PASO 1: estado del buscador instantáneo
  const [searchQuery, setSearchQuery] = useState('');
  // PASO 2: estado del filtro por categoría (chips)
  const [activeCategory, setActiveCategory] = useState<string>('all');

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
    // Limpiar búsqueda al agregar
    setSearchQuery('');
    setActiveCategory('all');
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

  // PASO 1 + 2: ingredientes filtrados por búsqueda y categoría (memoizado)
  const filteredAvailable = useMemo(() => {
    return availableIngredients.filter((ing) => {
      // Excluir los ya seleccionados
      const notSelected = !selectedIngredients.some(
        (si) => si.ingredientId === ing.id
      );
      if (!notSelected) return false;

      // Filtro por categoría
      if (activeCategory !== 'all' && ing.categoryId !== activeCategory) {
        return false;
      }

      // Filtro por texto (case-insensitive, ignora acentos básicos)
      if (searchQuery.trim()) {
        const q = searchQuery
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const name = ing.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return name.includes(q);
      }

      return true;
    });
  }, [availableIngredients, selectedIngredients, searchQuery, activeCategory]);

  // PASO 2: categorías que tienen al menos un ingrediente disponible (no seleccionado)
  const categoriesWithIngredients = useMemo(() => {
    const usedCategoryIds = new Set(
      availableIngredients
        .filter(
          (ing) =>
            !selectedIngredients.some((si) => si.ingredientId === ing.id)
        )
        .map((ing) => ing.categoryId)
        .filter(Boolean)
    );
    return ingredientCategories.filter((cat) => usedCategoryIds.has(cat.id));
  }, [availableIngredients, selectedIngredients, ingredientCategories]);

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
              onClick={() => {
                setShowSelector(false);
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </button>
          </div>

          {/* PASO 1: Buscador instantáneo */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ingrediente por nombre..."
              autoFocus
              className="bg-slate-100 rounded-lg p-2 pl-9 w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* PASO 2: Chips de categorías */}
          {categoriesWithIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Todos
              </button>
              {categoriesWithIngredients.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Lista filtrada + PASO 3: Empty state */}
          {filteredAvailable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PackageSearch className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                No se encontraron ingredientes
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery.trim()
                  ? `Sin resultados para "${searchQuery}"`
                  : 'Intenta cambiar el filtro de categoría'}
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredAvailable.map((ingredient) => (
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
          )}
        </div>
      )}
    </div>
  );
};

export default IngredientSelector;