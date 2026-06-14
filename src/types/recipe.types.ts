import type { UnitOfMeasure } from './ingredient.types';

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number; // Cantidad numérica
  unit: UnitOfMeasure; // Unidad (debe coincidir o ser convertible)
  cost: number; // Costo calculado (cantidad × precio/unidad)
  notes?: string; // Notas opcionales (ej: "bien picado")
}

export interface Recipe {
  id: string;
  productId: string; // Producto al que pertenece
  name: string;
  description?: string;
  ingredients: RecipeIngredient[]; // Lista de ingredientes con cantidades
  totalCost: number; // Costo total calculado automáticamente
  servings: number; // Número de porciones que rinde
  costPerServing: number; // Costo por porción
  prepTime?: number; // Tiempo preparación en minutos
  cookTime?: number; // Tiempo cocción en minutos
  instructions?: string; // Instrucciones paso a paso
  notes?: string; // Notas adicionales
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFormData {
  productId: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  servings: number;
  prepTime: number;
  cookTime: number;
  instructions: string;
  notes: string;
}

export interface RecipeFormErrors {
  productId?: string;
  name?: string;
  ingredients?: string;
  servings?: string;
}

export interface CostComparison {
  estimatedCost: number; // Costo manual del producto
  realCost: number; // Costo calculado por ficha técnica
  difference: number; // Diferencia en pesos
  differencePercent: number; // Diferencia en porcentaje
  status: 'match' | 'higher' | 'lower'; // Estado
}
