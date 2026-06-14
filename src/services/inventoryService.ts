import api from './api';
import type { ApiResponse } from '@/types';

export const inventoryService = {
  // Ingredientes
  async getIngredients(params?: any) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key].toString());
        }
      });
    }
    const { data } = await api.get<ApiResponse>(`/inventory/ingredients?${queryParams.toString()}`);
    return data.data;
  },

  async createIngredient(ingredientData: any) {
    const { data } = await api.post<ApiResponse>('/inventory/ingredients', ingredientData);
    return data.data;
  },

  async updateIngredient(ingredientId: string, ingredientData: any) {
    const { data } = await api.patch<ApiResponse>(`/inventory/ingredients/${ingredientId}`, ingredientData);
    return data.data;
  },

  async deleteIngredient(ingredientId: string) {
    const { data } = await api.delete<ApiResponse>(`/inventory/ingredients/${ingredientId}`);
    return data.data;
  },

  // Recetas
  async getRecipes() {
    const { data } = await api.get<ApiResponse>('/inventory/recipes');
    return data.data;
  },

  async createRecipe(recipeData: any) {
    const { data } = await api.post<ApiResponse>('/inventory/recipes', recipeData);
    return data.data;
  },

  async updateRecipe(recipeId: string, recipeData: any) {
    const { data } = await api.patch<ApiResponse>(`/inventory/recipes/${recipeId}`, recipeData);
    return data.data;
  },

  async deleteRecipe(recipeId: string) {
    const { data } = await api.delete<ApiResponse>(`/inventory/recipes/${recipeId}`);
    return data.data;
  },

  // Compras
  async getPurchases(params?: any) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key].toString());
        }
      });
    }
    const { data } = await api.get<ApiResponse>(`/inventory/purchases?${queryParams.toString()}`);
    return data.data;
  },

  async createPurchase(purchaseData: any) {
    const { data } = await api.post<ApiResponse>('/inventory/purchases', purchaseData);
    return data.data;
  },

  // Movimientos
  async getMovements(params?: any) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key].toString());
        }
      });
    }
    const { data } = await api.get<ApiResponse>(`/inventory/movements?${queryParams.toString()}`);
    return data.data;
  },

  async createMovement(movementData: { ingredientId: string; type: 'WASTE' | 'ADJUSTMENT'; quantity: number; reason: string }) {
    const { data } = await api.post<ApiResponse>('/inventory/movements', movementData);
    if (!data.success) throw new Error((data as any).message || 'Error al registrar movimiento');
    return data.data;
  },

  // Alertas
  async getLowStock() {
    const { data } = await api.get<ApiResponse>('/inventory/low-stock');
    return data.data;
  },

  // Proveedores
  async getSuppliers(params?: { search?: string; page?: number; perPage?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.perPage) queryParams.append('perPage', String(params.perPage));
    const { data } = await api.get<ApiResponse>(`/suppliers?${queryParams.toString()}`);
    return data.data as any;
  },

  async createSupplier(supplierData: { name: string; contactName?: string; email?: string; phone?: string; address?: string; taxId?: string; notes?: string }) {
    const { data } = await api.post<ApiResponse>('/suppliers', supplierData);
    if (!data.success) throw new Error((data as any).message || 'Error al crear proveedor');
    return data.data;
  },

  async updateSupplier(supplierId: string, supplierData: any) {
    const { data } = await api.patch<ApiResponse>(`/suppliers/${supplierId}`, supplierData);
    if (!data.success) throw new Error((data as any).message || 'Error al actualizar proveedor');
    return data.data;
  },

  async deleteSupplier(supplierId: string) {
    const { data } = await api.delete<ApiResponse>(`/suppliers/${supplierId}`);
    if (!data.success) throw new Error((data as any).message || 'Error al eliminar proveedor');
    return data.data;
  },
};
