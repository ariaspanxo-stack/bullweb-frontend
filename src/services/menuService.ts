import api from './api';
import type { ApiResponse, Product, Category } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface GetProductsParams {
  categoryId?: string | null;
  search?: string;
  available?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// SERVICIO DE MENÚ
// ============================================================================

export const menuService = {
  /**
   * Obtener todas las categorías
   */
  async getCategories(): Promise<Category[]> {
    const { data } = await api.get<ApiResponse<Category[]>>('/menu/categories');
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al obtener categorías');
    }
    
    return data.data;
  },

  /**
   * Obtener productos con filtros
   */
  async getProducts(params?: GetProductsParams): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.available !== undefined) queryParams.append('available', String(params.available));
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (!params?.page && !params?.limit) queryParams.append('perPage', '500');
    
    const { data } = await api.get<ApiResponse<Product[]>>(
      `/menu/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al obtener productos');
    }
    
    return data.data;
  },

  /**
   * Obtener producto por ID
   */
  async getProduct(productId: string): Promise<Product> {
    const { data } = await api.get<ApiResponse<Product>>(`/menu/products/${productId}`);
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al obtener el producto');
    }
    
    return data.data;
  },

  /**
   * Crear producto
   */
  async createProduct(productData: Partial<Product>): Promise<Product> {
    // Construir payload según el schema del backend
    const payload: any = {
      name: productData.name!,
      price: productData.price!,
      categoryId: productData.categoryId!,
      stationId: productData.stationId || null, // Campo requerido en backend
    };

    // Campos opcionales
    if (productData.description) payload.description = productData.description;
    if (productData.cost !== undefined) payload.cost = productData.cost;
    if (productData.imageUrl) payload.image = productData.imageUrl; // Backend espera 'image'
    if (productData.sku) payload.sku = productData.sku;
    if (productData.barcode) payload.barcode = productData.barcode;
    if (productData.trackInventory !== undefined) payload.trackInventory = productData.trackInventory;
    if (productData.modifiers) payload.modifiers = productData.modifiers;

    console.log('[menuService] Payload para crear producto:', payload);

    const { data } = await api.post<ApiResponse<Product>>('/menu/products', payload);
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al crear el producto');
    }
    
    return data.data;
  },

  /**
   * Actualizar producto
   */
  async updateProduct(productId: string, productData: Partial<Product>): Promise<Product> {
    const { data } = await api.patch<ApiResponse<Product>>(
      `/menu/products/${productId}`,
      productData
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al actualizar el producto');
    }
    
    return data.data;
  },

  /**
   * Eliminar producto
   */
  async deleteProduct(productId: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/menu/products/${productId}`);
    
    if (!data.success) {
      throw new Error(data.message || 'Error al eliminar el producto');
    }
  },

  /**
   * Crear categoría
   */
  async createCategory(categoryData: Partial<Category>): Promise<Category> {
    const { data } = await api.post<ApiResponse<Category>>('/menu/categories', categoryData);
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al crear la categoría');
    }
    
    return data.data;
  },

  /**
   * Actualizar categoría
   */
  async updateCategory(categoryId: string, categoryData: Partial<Category>): Promise<Category> {
    const { data } = await api.patch<ApiResponse<Category>>(
      `/menu/categories/${categoryId}`,
      categoryData
    );
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al actualizar la categoría');
    }
    
    return data.data;
  },

  /**
   * Eliminar categoría
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/menu/categories/${categoryId}`);
    
    if (!data.success) {
      throw new Error(data.message || 'Error al eliminar la categoría');
    }
  },

  /**
   * Obtener estaciones de cocina
   */
  async getStations(): Promise<any[]> {
    const { data } = await api.get<ApiResponse<any[]>>('/kitchen/stations');
    
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Error al obtener estaciones');
    }
    
    return data.data;
  },

  // ── MODIFICADORES ──────────────────────────────────────────────────────────

  async getModifiers(): Promise<any[]> {
    const { data } = await api.get<ApiResponse<any[]>>('/menu/modifiers');
    if (!data.success || !data.data) throw new Error(data.message || 'Error al obtener modificadores');
    return data.data;
  },

  async createModifier(payload: { name: string; type: 'SINGLE' | 'MULTIPLE'; price?: number; active?: boolean }): Promise<any> {
    const { data } = await api.post<ApiResponse<any>>('/menu/modifiers', payload);
    if (!data.success || !data.data) throw new Error(data.message || 'Error al crear modificador');
    return data.data;
  },

  async updateModifier(modifierId: string, payload: { name?: string; type?: 'SINGLE' | 'MULTIPLE'; price?: number; active?: boolean }): Promise<any> {
    const { data } = await api.patch<ApiResponse<any>>(`/menu/modifiers/${modifierId}`, payload);
    if (!data.success || !data.data) throw new Error(data.message || 'Error al actualizar modificador');
    return data.data;
  },

  async deleteModifier(modifierId: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/menu/modifiers/${modifierId}`);
    if (!data.success) throw new Error(data.message || 'Error al eliminar modificador');
  },
};
