/**
 * paymentMethodsService.ts
 * Gestiona los medios de pago via API del backend (tabla payment_methods).
 * El `id` de cada método es el UUID real de la BD — se usa directamente
 * en restaurantService.addPayment como `paymentMethodId`.
 */
import api from './api';

export type ArqueoMode = 'auto' | 'manual';

export interface PaymentMethod {
  id:            string;   // UUID real de la BD — úsalo como paymentMethodId
  name:          string;
  description?:  string | null;
  active:        boolean;
  order:         number;
  arqueoMode:    ArqueoMode;    // persiste en BD
  manualBalance: boolean;       // persiste en BD
}

export interface DeleteResult {
  softDeleted: boolean;  // true = desactivado (tiene pagos); false = eliminado
}

// ── Caché en memoria para evitar múltiples fetch durante la misma sesión ──
let _cache: PaymentMethod[] | null = null;

function mapRow(row: any): PaymentMethod {
  return {
    id:            row.id,
    name:          row.name,
    description:   row.description ?? null,
    active:        row.active ?? true,
    order:         row.order ?? 0,
    arqueoMode:    (row.arqueoMode as ArqueoMode) ?? 'auto',
    manualBalance: row.manualBalance ?? false,
  };
}

export const paymentMethodsService = {
  /** Carga todos los métodos del backend (con caché de sesión) */
  async fetchAll(): Promise<PaymentMethod[]> {
    if (_cache !== null && _cache.length > 0) return _cache;
    try {
      const res = await api.get<any[]>('/pos/payment-methods');
      const arr = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      _cache = arr.map(mapRow).sort((a: any, b: any) => a.order - b.order);
    } catch (e) {
      console.error('[paymentMethodsService] fetchAll error:', e);
      _cache = null;  // no cachear el error — reintentar en el próximo llamado
      return [];
    }
    return _cache!;
  },

  /** Invalida la caché (llamar tras crear/editar/borrar) */
  invalidateCache() {
    _cache = null;
  },

  /** Métodos activos, ordenados */
  async getActiveAsync(): Promise<PaymentMethod[]> {
    const all = await this.fetchAll();
    return all.filter(m => m.active);
  },

  /** Versión síncrona de getActive — usa la caché si está disponible, si no devuelve [] */
  getActive(): PaymentMethod[] {
    return (_cache ?? []).filter(m => m.active);
  },

  /** Versión síncrona de getAll */
  getAll(): PaymentMethod[] {
    return (_cache ?? []).sort((a, b) => a.order - b.order);
  },

  /** Crea un nuevo método en el backend */
  async create(name: string): Promise<PaymentMethod> {
    const res = await api.post<any>('/pos/payment-methods', { name });
    const raw = res.data?.data ?? res.data;
    const created = mapRow(raw);
    _cache = null;
    return created;
  },

  /** Actualiza un método en el backend (incluye arqueoMode y manualBalance) */
  async save(method: PaymentMethod): Promise<PaymentMethod> {
    await api.patch(`/pos/payment-methods/${method.id}`, {
      name:          method.name,
      active:        method.active,
      description:   method.description ?? null,
      order:         method.order,
      arqueoMode:    method.arqueoMode,
      manualBalance: method.manualBalance,
    });
    _cache = null;
    return method;
  },

  /** Elimina (o desactiva) un método en el backend. Retorna si fue soft-delete. */
  async delete(id: string): Promise<DeleteResult> {
    const res = await api.delete<any>(`/pos/payment-methods/${id}`);
    const raw = res.data as any;
    _cache = null;
    return { softDeleted: raw?.softDeleted === true };
  },

  /** Reordena métodos en un único request atómico (POST /reorder) */
  async reorder(ids: string[]): Promise<void> {
    await api.post('/pos/payment-methods/reorder', { ids });
    _cache = null;
  },
};

