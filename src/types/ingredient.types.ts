export type UnitOfMeasure = 
  | 'kg'   // Kilogramo
  | 'g'    // Gramo
  | 'L'    // Litro
  | 'ml'   // Mililitro
  | 'unit' // Unidad
  | 'lb'   // Libra
  | 'oz'   // Onza
  | 'cup'  // Taza
  | 'tbsp' // Cucharada
  | 'tsp'; // Cucharadita

export type IngredientStatus = 'active' | 'inactive' | 'discontinued';

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  unit: UnitOfMeasure;
  pricePerUnit: number; // Precio por unidad (ej: $1.200 por kg)
  currentStock: number; // Stock actual
  minStock: number; // Stock mínimo (alerta si currentStock < minStock)
  supplier?: string; // Proveedor
  lastPurchaseDate?: string; // Fecha última compra (ISO string)
  expirationDate?: string; // Fecha vencimiento (ISO string)
  status: IngredientStatus;
  imageUrl?: string;
  sku: string; // Código único
  createdAt: string;
  updatedAt: string;
}

export interface IngredientCategory {
  id: string;
  name: string;
  icon: string;
  ingredientsCount: number;
}

export interface IngredientFormData {
  name: string;
  description: string;
  categoryId: string;
  unit: UnitOfMeasure;
  pricePerUnit: number;
  currentStock: number;
  minStock: number;
  supplier: string;
  lastPurchaseDate: string;
  expirationDate: string;
  status: IngredientStatus;
  imageUrl: string;
}

export interface IngredientFormErrors {
  name?: string;
  categoryId?: string;
  unit?: string;
  pricePerUnit?: string;
  currentStock?: string;
  minStock?: string;
}
