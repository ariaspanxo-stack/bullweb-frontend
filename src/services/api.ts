const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4200/api';

// ── Refresh-token guard ──────────────────────────────────────────────────────
// Evita bucles infinitos: solo un intento de refresh por vez.
let _isRefreshing = false;

async function _tryRefreshToken(): Promise<string | null> {
  const currentToken = localStorage.getItem('bullweb_token');
  if (!currentToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const newToken: string | undefined = body?.data?.token ?? body?.token;
    if (newToken) {
      localStorage.setItem('bullweb_token', newToken);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

function _forceLogout(): void {
  localStorage.removeItem('bullweb_token');
  localStorage.removeItem('bullweb_user');
  localStorage.removeItem('auth-storage');
  // Redirigir al login sin crear dependencia circular con authStore
  if (typeof window !== 'undefined') window.location.href = '/';
}

// ── Response handler ─────────────────────────────────────────────────────────
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.message || error.error || `HTTP error! status: ${response.status}`) as any;
    err.status = response.status;
    err.data   = error;
    throw err;
  }
  if (response.status === 204) return null as T;
  const data = await response.json();
  // Paginated responses include a `meta` field — preserve the full envelope
  if (data !== null && typeof data === 'object' && 'meta' in data) return data as T;
  return (data.data ?? data) as T;
}

// ============================================
// PRODUCTS API
// ============================================
export const productsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/menu/products?perPage=500`, {
      headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return Array.isArray(result) ? result : (result?.data ?? []);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/menu/products/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    // Construir payload limpio que coincide exactamente con el schema Zod del backend
    const payload: Record<string, any> = {
      name: data.name,
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
      categoryId: data.categoryId,
    };
    // stationId es opcional — solo incluir si tiene valor
    if (data.stationId) payload.stationId = data.stationId;
    if (data.description) payload.description = data.description;
    if (data.cost !== undefined && data.cost !== null && data.cost !== '') {
      payload.cost = typeof data.cost === 'string' ? parseFloat(data.cost) : data.cost;
    }
    // Renombrar imageUrl → image (campo que espera el backend)
    const imageVal = data.image || data.imageUrl;
    if (imageVal) payload.image = imageVal;
    if (data.sku) payload.sku = data.sku;
    if (data.barcode) payload.barcode = data.barcode;
    if (data.trackInventory !== undefined) payload.trackInventory = data.trackInventory;
    if (data.modifiers) payload.modifiers = data.modifiers;
    console.log('[api.products.create] payload enviado al backend:', payload);
    const response = await fetch(`${API_BASE_URL}/menu/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    // Limpiar stationId vacío para que el backend no falle con min(1)
    const payload = { ...data };
    if (payload.stationId === '' || payload.stationId === null) {
      delete payload.stationId;
    }
    const response = await fetch(`${API_BASE_URL}/menu/products/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/menu/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// ============================================
// STATIONS API
// ============================================
export const stationsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/kitchen/stations`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data: { name: string; description?: string; color?: string }) => {
    const response = await fetch(`${API_BASE_URL}/kitchen/stations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: string, data: { name?: string; description?: string; color?: string; active?: boolean; printerId?: string | null }) => {
    const response = await fetch(`${API_BASE_URL}/kitchen/stations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/kitchen/stations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getPrinters: async () => {
    // Obtiene las impresoras de tipo kitchen/bar activas para vincular a estaciones
    const response = await fetch(`${API_BASE_URL}/admin/printers?is_active=true`, {
      headers: getAuthHeaders()
    });
    return handleResponse<any[]>(response);
  },
};

// ============================================
// CATEGORIES API
// ============================================
export const categoriesApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/menu/categories`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/menu/categories/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/menu/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/menu/categories/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/menu/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// ============================================
// INGREDIENTS API
// ============================================
export const ingredientsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/inventory/ingredients`, {
      headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return Array.isArray(result) ? result : (result?.data ?? result?.ingredients ?? []);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/ingredients/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Ingredient categories not yet supported in backend — return empty array
  getCategories: async () => [] as any[],

  createCategory: async (_data: any) => null,

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/inventory/ingredients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/inventory/ingredients/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/ingredients/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// ============================================
// RECIPES API
// ============================================
export const recipesApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/inventory/recipes`, {
      headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return Array.isArray(result) ? result : (result?.data ?? result?.recipes ?? []);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/recipes/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getByProduct: async (productId: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/recipes?productId=${productId}`, {
      headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return Array.isArray(result) ? result : (result?.data ?? result?.recipes ?? []);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/inventory/recipes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/inventory/recipes/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/recipes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// ============================================
// MODIFIERS API  (flat model: each modifier is one selectable option)
// Endpoints: GET/POST /api/menu/modifiers, GET/PATCH/DELETE /api/menu/modifiers/:id
// ============================================
export const modifiersApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/menu/modifiers`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/menu/modifiers/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data: { name: string; type: 'SINGLE' | 'MULTIPLE'; price?: number; active?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/menu/modifiers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id: string, data: { name?: string; type?: 'SINGLE' | 'MULTIPLE'; price?: number; active?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/menu/modifiers/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/menu/modifiers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Alias para compatibilidad con Products.tsx (que lo usaba vacío antes)
  getAllGroups: async () => {
    const response = await fetch(`${API_BASE_URL}/menu/modifiers`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse<any[]>(response);
    // Mapear cada modificador plano como un 'grupo con una opción'
    return (Array.isArray(data) ? data : (data as any)?.data ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description ?? '',
      selectionType: m.type === 'SINGLE' ? 'single' : 'multiple',
      isRequired: false,
      minSelections: 0,
      maxSelections: m.type === 'SINGLE' ? 1 : 10,
      options: Array.isArray(m.options)
        ? m.options.map((o: any) => ({ id: o.id, name: o.name, priceAdjustment: o.price ?? o.priceAdjustment ?? 0, isDefault: o.isDefault ?? false }))
        : [{ id: m.id, name: m.name, priceAdjustment: m.price ?? 0, isDefault: false }],
      productIds: Array.isArray(m.productIds) ? m.productIds : [],
    }));
  },
};

// ============================================
// ORDERS API  (POS orders live at /api/pos/orders)
// ============================================
export const ordersApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/pos/orders`, {
      headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return Array.isArray(result) ? result : (result?.data ?? result?.orders ?? []);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/pos/orders/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/pos/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/pos/orders/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// ============================================
// CUSTOMERS API
// ============================================
export const customersApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      headers: getAuthHeaders()
    });
    const result = await handleResponse<any>(response);
    return Array.isArray(result) ? result : (result?.data ?? result?.customers ?? []);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/customers/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getOrderHistory: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}/orders`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getDetailedStats: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}/detailed-stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPointsBalance: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}/points`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  redeemPoints: async (id: string, points: number, orderId?: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}/points/redeem`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ points, orderId }),
    });
    return handleResponse(response);
  },

  getPointsHistory: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}/points/history`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================
// HTTP CLIENT METHODS (for generic services)
// ============================================

// Helper para obtener headers con autenticación
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('bullweb_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Enviar tenant slug del usuario autenticado para resolucion multitenant
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const tenantSlug = authData?.state?.user?.tenantSlug;
    if (tenantSlug) {
      headers['x-tenant-slug'] = tenantSlug;
    }
  } catch { /* silencioso */ }
  
  return headers;
}

// ── Fetch con reintentar si 401 ───────────────────────────────────────────────
async function fetchWithRefresh(fetchFn: () => Promise<Response>): Promise<Response> {
  const res = await fetchFn();

  // ── Tenant suspendido / cancelado ──────────────────────────────────────────
  if (res.status === 403) {
    // Necesitamos leer el body para ver el code, pero no consumirlo para que
    // handleResponse pueda leerlo también. Usamos clone().
    const bodyClone = res.clone();
    try {
      const body = await bodyClone.json();
      const code = body?.code ?? body?.error;
      if (code === 'TENANT_SUSPENDED' || code === 'TENANT_CANCELLED') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tenant:suspended', {
            detail: { code, message: body?.message ?? '' }
          }));
        }
        return res;
      }
    } catch { /* body no es JSON, dejar pasar */ }
  }

  // ── 402: suscripción vencida ───────────────────────────────────────────────
  // Si no es 401, o ya estamos en el proceso de refresh, devolver tal cual
  if (res.status !== 401 || _isRefreshing) {
    // Redirigir a página de suscripción si el servidor responde 402
    if (res.status === 402 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/subscription')) {
      window.location.href = '/subscription';
    }
    return res;
  }

  _isRefreshing = true;
  try {
    const newToken = await _tryRefreshToken();
    if (!newToken) {
      _forceLogout();
      return res; // Devuelve el 401 para que el caller lo procese
    }
    // Reintentar la petición original con el token renovado
    return fetchFn();
  } finally {
    _isRefreshing = false;
  }
}

const httpClient = {
  get: async <T = any>(
    url: string,
    options?: { params?: Record<string, any>; responseType?: 'blob' }
  ): Promise<{ data: T }> => {
    let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    if (options?.params) {
      const entries = Object.entries(options.params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '');
      if (entries.length)
        fullUrl += '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
    }
    const response = await fetchWithRefresh(() => fetch(fullUrl, { headers: getAuthHeaders() }));
    if (options?.responseType === 'blob') {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      return { data: blob as T };
    }
    const data = await handleResponse<T>(response);
    return { data };
  },

  post: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithRefresh(() =>
      fetch(fullUrl, {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    JSON.stringify(body),
      })
    );
    const data = await handleResponse<T>(response);
    return { data };
  },

  // Subida de archivos (multipart/form-data).
  // NO setea Content-Type: el navegador debe generar el boundary automáticamente.
  postForm: async <T = any>(url: string, formData: FormData): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    // Headers de auth SIN Content-Type application/json
    const headers: HeadersInit = {};
    const token = localStorage.getItem('bullweb_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const tenantSlug = authData?.state?.user?.tenantSlug;
      if (tenantSlug) headers['x-tenant-slug'] = tenantSlug;
    } catch { /* silencioso */ }
    const response = await fetchWithRefresh(() =>
      fetch(fullUrl, {
        method:  'POST',
        headers,
        body:    formData,
      })
    );
    const data = await handleResponse<T>(response);
    return { data };
  },

  put: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithRefresh(() =>
      fetch(fullUrl, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) })
    );
    const data = await handleResponse<T>(response);
    return { data };
  },

  patch: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithRefresh(() =>
      fetch(fullUrl, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(body) })
    );
    const data = await handleResponse<T>(response);
    return { data };
  },

  // DELETE con body opcional (algunos endpoints requieren un motivo en el body)
  delete: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetchWithRefresh(() =>
      fetch(fullUrl, {
        method:  'DELETE',
        headers: getAuthHeaders(),
        body:    body !== undefined ? JSON.stringify(body) : undefined,
      })
    );
    const data = await handleResponse<T>(response);
    return { data };
  }
};

export default {
  ...httpClient,
  products: productsApi,
  stations: stationsApi,
  categories: categoriesApi,
  ingredients: ingredientsApi,
  recipes: recipesApi,
  modifiers: modifiersApi,
  orders: ordersApi,
  customers: customersApi
};
