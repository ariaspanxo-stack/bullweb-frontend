import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// UTILIDADES DE CLASES CSS
// ============================================================================

/**
 * Combinar clases CSS con Tailwind Merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

// ============================================================================
// UTILIDADES DE FORMATO DE MONEDA - CLP (Peso Chileno)
// ============================================================================

const CLP_MIN = 0;
const CLP_MAX = 10_000_000_000;

/**
 * Formatea un número como moneda CLP (Peso Chileno) con validación de rango
 * @param amount - Monto numérico a formatear
 * @returns String formateado como "$12.345"
 * 
 * Formato estándar: $12.345 (sin decimales, peso chileno)
 * Rango válido: $0 a $10.000.000.000
 * 
 * @example
 * formatCurrency(123.76)        // "$124"
 * formatCurrency(-50)           // "$0"
 * formatCurrency(20000000)      // "$20.000.000"
 * formatCurrency(null)          // "$0"
 * formatCurrency(NaN)           // "$0"
 */
export function formatCurrency(amount: number | null | undefined): string {
  // Validar entrada: null, undefined, NaN -> $0
  if (amount == null || isNaN(amount)) {
    return '$0';
  }

  // Aplicar rango: min 0, max 10,000,000,000
  let validAmount = Math.round(amount); // CLP no usa decimales
  if (validAmount < CLP_MIN) {
    validAmount = CLP_MIN;
  } else if (validAmount > CLP_MAX) {
    validAmount = CLP_MAX;
  }

  // Formatear usando Intl.NumberFormat con locale es-CL y currency CLP
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(validAmount);
}

/**
 * Alias de formatCurrency para compatibilidad con código legacy
 */
export const formatUSD = formatCurrency;

/**
 * Formatear fecha (dd/MM/yyyy)
 */
export function formatDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formatear fecha y hora (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
}

/**
 * Formatear hora (HH:mm)
 */
export function formatTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'HH:mm', { locale: es });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}

/**
 * Formatear fecha relativa (hace X tiempo)
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    
    return formatDate(dateObj);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
}

// ============================================================================
// UTILIDADES DE NÚMEROS
// ============================================================================

/**
 * Formatear número con separadores de miles
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Formatear porcentaje
 */
export function formatPercentage(value: number, decimals = 0): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

// ============================================================================
// UTILIDADES DE VALIDACIÓN
// ============================================================================

/**
 * Validar email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar RUC (Perú)
 */
export function isValidRUC(ruc: string): boolean {
  return /^\d{11}$/.test(ruc);
}

/**
 * Validar DNI (Perú)
 */
export function isValidDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

// ============================================================================
// UTILIDADES DE TEXTO
// ============================================================================

/**
 * Capitalizar primera letra
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncar texto
 */
export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Generar iniciales de un nombre
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ============================================================================
// UTILIDADES DE ARRAYS
// ============================================================================

/**
 * Agrupar array por propiedad
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Ordenar array por propiedad
 */
export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============================================================================
// UTILIDADES DE OBJETOS
// ============================================================================

/**
 * Verificar si un objeto está vacío
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  return Object.keys(obj).length === 0;
}

/**
 * Deep clone de un objeto
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// UTILIDADES DE STATUS
// ============================================================================

/**
 * Obtener color para status de orden
 */
export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PREPARING: 'bg-blue-100 text-blue-800',
    READY: 'bg-green-100 text-green-800',
    DELIVERED: 'bg-purple-100 text-purple-800',
    PAID: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Obtener texto legible para status de orden
 */
export function getOrderStatusText(status: string): string {
  const texts: Record<string, string> = {
    PENDING: 'Pendiente',
    PREPARING: 'Preparando',
    READY: 'Listo',
    DELIVERED: 'Entregado',
    PAID: 'Pagado',
    CANCELLED: 'Cancelado'
  };
  
  return texts[status] || status;
}

/**
 * Obtener color para status de mesa
 */
export function getTableStatusColor(status: string): string {
  const colors: Record<string, string> = {
    AVAILABLE: 'bg-green-500',
    OCCUPIED: 'bg-red-500',
    RESERVED: 'bg-yellow-500',
    CLEANING: 'bg-blue-500'
  };
  
  return colors[status] || 'bg-gray-500';
}

/**
 * Obtener texto legible para status de mesa
 */
export function getTableStatusText(status: string): string {
  const texts: Record<string, string> = {
    AVAILABLE: 'Disponible',
    OCCUPIED: 'Ocupada',
    RESERVED: 'Reservada',
    CLEANING: 'Limpieza'
  };
  
  return texts[status] || status;
}
