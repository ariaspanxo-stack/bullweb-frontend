/**
 * Convierte cualquier valor desconocido en un array tipado de forma segura.
 * Evita el error "TypeError: x.filter is not a function" cuando la API
 * devuelve null, undefined, o un objeto en lugar de un array.
 */
export function safeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === null || value === undefined) return [];
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.data))      return obj.data      as T[];
    if (Array.isArray(obj.campaigns)) return obj.campaigns as T[];
    if (Array.isArray(obj.items))     return obj.items     as T[];
    if (Array.isArray(obj.results))   return obj.results   as T[];
  }
  return [];
}
