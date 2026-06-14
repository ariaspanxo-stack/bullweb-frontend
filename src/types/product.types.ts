// ═══════════════════════════════════════════════════════════════
// PRODUCT TYPES
// Tipos para gestión de productos y categorías
// Compatible con Restaurant para integración perfecta
// ═══════════════════════════════════════════════════════════════

// ========== CATEGORÍA ==========
export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;              // Emoji o nombre de icono
  order: number;              // Orden de visualización
  active: boolean;
  productsCount?: number;     // Contador dinámico
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  icon?: string;
  order?: number;
  active?: boolean;
}

// ========== PRODUCTO ==========
export interface Product {
  id: string;
  name: string;
  description?: string;
  
  // Precios (CRÍTICO para integración)
  price: number;              // Precio de venta
  cost?: number;              // Costo (para margen)
  
  // Categorización
  categoryId: string;
  category?: ProductCategory; // Relación poblada
  stationId?: string | null;  // Estación de cocina (REQUERIDO en creación)
  station?: any;              // Relación poblada
  
  // Control de disponibilidad
  available: boolean;         // Disponible para venta
  active: boolean;            // Activo en sistema
  
  // Adicionales para Restaurant
  preparationTime?: number;   // Minutos de preparación
  popular?: boolean;          // Destacar en Restaurant
  imageUrl?: string;          // URL de imagen
  
  // Inventario (opcional)
  hasStock?: boolean;         // Si controla inventario
  currentStock?: number;      // Stock actual
  minStock?: number;          // Stock mínimo (alerta)
  
  // Metadatos
  sku?: string;               // Código único
  tags?: string[];            // Etiquetas (vegano, picante, etc)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  cost?: number;
  categoryId: string;
  stationId: string;          // REQUERIDO en backend
  available?: boolean;
  active?: boolean;
  preparationTime?: number;
  popular?: boolean;
  imageUrl?: string;          // Frontend usa imageUrl, backend espera 'image'
  hasStock?: boolean;
  currentStock?: number;
  minStock?: number;
  sku?: string;
  barcode?: string;
  trackInventory?: boolean;
  modifiers?: Array<{ modifierId: string }>;
  tags?: string[];
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string;
}

// ========== FILTROS ==========
export interface ProductFilters {
  search?: string;            // Búsqueda por nombre/SKU
  categoryId?: string;        // Filtrar por categoría
  available?: boolean;        // Solo disponibles
  active?: boolean;           // Solo activos
  popular?: boolean;          // Solo populares
  hasStock?: boolean;         // Con control de stock
  lowStock?: boolean;         // Stock bajo (currentStock < minStock)
  minPrice?: number;          // Precio mínimo
  maxPrice?: number;          // Precio máximo
}

// ========== ESTADÍSTICAS ==========
export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  availableProducts: number;
  popularProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;         // Suma de (price * currentStock)
  averagePrice: number;
  categoriesCount: number;
}

// ========== VISTA ==========
export type ProductViewMode = 'cards' | 'list';

// ========== ORDEN ==========
export type ProductSortBy = 'name' | 'price' | 'category' | 'createdAt' | 'stock';
export type SortOrder = 'asc' | 'desc';

export interface ProductSort {
  sortBy: ProductSortBy;
  order: SortOrder;
}

// ========== RESPUESTAS API ==========
export interface ProductsResponse {
  products: Product[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CategoriesResponse {
  categories: ProductCategory[];
  total: number;
}

// ============================================
// INTERFACES PARA MODAL Y FORMULARIOS
// ============================================

export interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  stationId: string;          // REQUERIDO por backend
  price: string;
  cost: string;
  stock: string;
  image?: string;
  description?: string;
  status: 'active' | 'inactive';
  isPopular: boolean;
}

export interface ProductFormErrors {
  name?: string;
  sku?: string;
  category?: string;
  stationId?: string;
  price?: string;
  cost?: string;
  stock?: string;
  image?: string;
}

export default Product;
