export type ModifierSelectionType = 'single' | 'multiple';
export type ModifierStatus = 'active' | 'inactive';

// Opción individual dentro de un grupo
export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number; // Precio adicional (puede ser 0 o negativo)
  isDefault: boolean; // Si es la opción por defecto
  status: ModifierStatus;
}

// Grupo de modificadores
export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  selectionType: ModifierSelectionType; // 'single' = radio, 'multiple' = checkbox
  isRequired: boolean; // Si es obligatorio seleccionar al menos una opción
  minSelections?: number; // Mínimo de selecciones (para multiple)
  maxSelections?: number; // Máximo de selecciones (para multiple)
  options: ModifierOption[];
  productIds: string[]; // IDs de productos a los que aplica
  sortOrder: number; // Orden de visualización
  status: ModifierStatus;
  createdAt: string;
  updatedAt: string;
}

// Para el formulario de grupo
export interface ModifierGroupFormData {
  name: string;
  description: string;
  selectionType: ModifierSelectionType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  productIds: string[];
  sortOrder: number;
  status: ModifierStatus;
}

// Para el formulario de opción
export interface ModifierOptionFormData {
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  status: ModifierStatus;
}

export interface ModifierGroupFormErrors {
  name?: string;
  productIds?: string;
  minSelections?: string;
  maxSelections?: string;
}

export interface ModifierOptionFormErrors {
  name?: string;
  priceAdjustment?: string;
}
