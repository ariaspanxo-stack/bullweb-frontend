import type { Recipe, RecipeIngredient, CostComparison } from '../types/recipe.types';
import type { Ingredient } from '../types/ingredient.types';
import { convertUnit, areUnitsCompatible } from './unitConverter';

/**
 * Calcula el costo de un ingrediente en la receta
 */
export const calculateIngredientCost = (
  recipeIngredient: RecipeIngredient,
  ingredient: Ingredient
): number => {
  try {
    let quantityInBaseUnit = recipeIngredient.quantity;

    // Si las unidades no coinciden, intentar convertir
    if (recipeIngredient.unit !== ingredient.unit) {
      if (areUnitsCompatible(recipeIngredient.unit, ingredient.unit)) {
        quantityInBaseUnit = convertUnit(
          recipeIngredient.quantity,
          recipeIngredient.unit,
          ingredient.unit
        );
      } else {
        console.warn(
          `Unidades incompatibles: ${recipeIngredient.unit} y ${ingredient.unit}`
        );
        return 0;
      }
    }

    // Costo = cantidad (en unidad base) × precio por unidad
    return quantityInBaseUnit * ingredient.pricePerUnit;
  } catch (error) {
    console.error('Error calculando costo ingrediente:', error);
    return 0;
  }
};

/**
 * Calcula el costo total de una receta
 */
export const calculateRecipeTotalCost = (
  recipeIngredients: RecipeIngredient[],
  allIngredients: Ingredient[]
): number => {
  let totalCost = 0;

  recipeIngredients.forEach((recipeIng) => {
    const ingredient = allIngredients.find((i) => i.id === recipeIng.ingredientId);
    if (ingredient) {
      const cost = calculateIngredientCost(recipeIng, ingredient);
      totalCost += cost;
    }
  });

  return totalCost;
};

/**
 * Calcula el costo por porción
 */
export const calculateCostPerServing = (totalCost: number, servings: number): number => {
  if (servings <= 0) return totalCost;
  return totalCost / servings;
};

/**
 * Compara costo estimado vs costo real
 */
export const compareCosts = (
  estimatedCost: number,
  realCost: number
): CostComparison => {
  const difference = realCost - estimatedCost;
  const differencePercent =
    estimatedCost > 0 ? (difference / estimatedCost) * 100 : 0;

  let status: 'match' | 'higher' | 'lower' = 'match';
  const tolerance = 0.05; // 5% de tolerancia

  if (Math.abs(differencePercent) > tolerance) {
    status = realCost > estimatedCost ? 'higher' : 'lower';
  }

  return {
    estimatedCost,
    realCost,
    difference,
    differencePercent,
    status,
  };
};

/**
 * Calcula precio sugerido basado en margen objetivo
 */
export const calculateSuggestedPrice = (
  realCost: number,
  targetMarginPercent: number
): number => {
  // Precio = Costo / (1 - Margen%)
  // Ej: Costo $1000, Margen 40% → Precio = $1000 / (1 - 0.40) = $1666.67
  if (targetMarginPercent >= 100) return realCost * 2;
  if (targetMarginPercent <= 0) return realCost;

  return realCost / (1 - targetMarginPercent / 100);
};

/**
 * Calcula margen real del producto
 */
export const calculateRealMargin = (price: number, realCost: number): number => {
  if (price === 0) return 0;
  return ((price - realCost) / price) * 100;
};
