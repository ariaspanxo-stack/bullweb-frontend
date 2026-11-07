import api from './api';
import type { ApiResponse } from '@/types';

// LOTE 309: httpClient ya quita el sobre { success, data } salvo en respuestas paginadas (las que traen meta arriba).
// Leer data.data a ciegas daba undefined y data.success tambien: crear un proveedor o una merma avisaba error aunque guardaba, y la lista de proveedores salia vacia.
const unwrap = (d: any) => (d && typeof d === 'object' && !Array.isArray(d) && 'success' in d && 'data' in d ? d.data : d);

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
    return unwrap(data);
  },

  async createIngredient(ingredientData: any) {
    const { data } = await api.post<ApiResponse>('/inventory/ingredients', ingredientData);
    return unwrap(data);
  },

  async updateIngredient(ingredientId: string, ingredientData: any) {
    const { data } = await api.patch<ApiResponse>(`/inventory/ingredients/${ingredientId}`, ingredientData);
    return unwrap(data);
  },

  async deleteIngredient(ingredientId: string) {
    const { data } = await api.delete<ApiResponse>(`/inventory/ingredients/${ingredientId}`);
    return unwrap(data);
  },

  // Recetas
  async getRecipes() {
    const { data } = await api.get<ApiResponse>('/inventory/recipes');
    return unwrap(data);
  },

  async createRecipe(recipeData: any) {
    const { data } = await api.post<ApiResponse>('/inventory/recipes', recipeData);
    return unwrap(data);
  },

  async updateRecipe(recipeId: string, recipeData: any) {
    const { data } = await api.patch<ApiResponse>(`/inventory/recipes/${recipeId}`, recipeData);
    return unwrap(data);
  },

  async deleteRecipe(recipeId: string) {
    const { data } = await api.delete<ApiResponse>(`/inventory/recipes/${recipeId}`);
    return unwrap(data);
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
    return unwrap(data);
  },

  async createPurchase(purchaseData: any) {
    const { data } = await api.post<ApiResponse>('/inventory/purchases', purchaseData);
    return unwrap(data);
  },

  // LOTE 310: cuentas por pagar, compras abiertas, detalle, cerrar con factura y marcar pagada
  async getPayables() {
    const { data } = await api.get<ApiResponse>('/inventory/purchases/payables');
    return unwrap(data) as any;
  },

  async getOpenPurchases() {
    const { data } = await api.get<ApiResponse>('/inventory/purchases/open');
    return unwrap(data) as any;
  },

  async getPurchaseDetail(purchaseId: string) {
    const { data } = await api.get<ApiResponse>(`/inventory/purchases/${purchaseId}`);
    return unwrap(data) as any;
  },

  async closeWithInvoice(body: { purchaseIds: string[]; invoiceNumber: string; paymentMethod: string; paidAt?: string }) {
    const { data } = await api.post<ApiResponse>('/inventory/purchases/close-invoice', body);
    return unwrap(data) as any;
  },

  async markPurchasePaid(purchaseId: string, body: { paymentMethod: string; paidAt?: string; invoiceNumber?: string }) {
    const { data } = await api.post<ApiResponse>(`/inventory/purchases/${purchaseId}/mark-paid`, body);
    return unwrap(data) as any;
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
    return unwrap(data);
  },

  async createMovement(movementData: { ingredientId: string; type: 'WASTE' | 'ADJUSTMENT'; quantity: number; reason: string }) {
    const { data } = await api.post<ApiResponse>('/inventory/movements', movementData);
    return unwrap(data);
  },

  // Alertas
  async getLowStock() {
    const { data } = await api.get<ApiResponse>('/inventory/low-stock');
    return unwrap(data);
  },

  // Proveedores
  async getSuppliers(params?: { search?: string; page?: number; perPage?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.perPage) queryParams.append('perPage', String(params.perPage));
    const { data } = await api.get<ApiResponse>(`/suppliers?${queryParams.toString()}`);
    return unwrap(data) as any;
  },

  async createSupplier(supplierData: { name: string; contactName?: string; email?: string; phone?: string; address?: string; taxId?: string; notes?: string }) {
    const { data } = await api.post<ApiResponse>('/suppliers', supplierData);
    return unwrap(data);
  },

  async updateSupplier(supplierId: string, supplierData: any) {
    const { data } = await api.patch<ApiResponse>(`/suppliers/${supplierId}`, supplierData);
    return unwrap(data);
  },

  async deleteSupplier(supplierId: string) {
    const { data } = await api.delete<ApiResponse>(`/suppliers/${supplierId}`);
    return unwrap(data);
  },
};
