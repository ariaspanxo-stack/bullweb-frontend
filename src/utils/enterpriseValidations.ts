// ═══════════════════════════════════════════════════════════════
// ENTERPRISE VALIDATIONS - Validaciones críticas para ventas
// ═══════════════════════════════════════════════════════════════

import type { Table, CartItem } from '../types/restaurant.types';
import { getActiveCashRegister } from './enterpriseHelpers';

// ═══════════════════════════════════════════════════════════════
// TIPOS DE ERROR
// ═══════════════════════════════════════════════════════════════

export class ValidationError extends Error {
  public field?: string;
  
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES BÁSICAS
// ═══════════════════════════════════════════════════════════════

/**
 * Validar que el carrito no esté vacío
 */
export function validateCartNotEmpty(cart: CartItem[]): void {
  if (!cart || cart.length === 0) {
    throw new ValidationError(
      'El carrito está vacío. Agrega al menos un producto antes de continuar.',
      'cart'
    );
  }
}

/**
 * Validar que todos los items tengan cantidad > 0
 */
export function validateCartQuantities(cart: CartItem[]): void {
  const invalidItems = cart.filter(item => !item.quantity || item.quantity <= 0);
  
  if (invalidItems.length > 0) {
    throw new ValidationError(
      `${invalidItems.length} producto(s) tienen cantidad inválida`,
      'cart.quantity'
    );
  }
}

/**
 * Validar que todos los items tengan precio válido
 */
export function validateCartPrices(cart: CartItem[]): void {
  const invalidItems = cart.filter(item => !item.unitPrice || item.unitPrice < 0);
  
  if (invalidItems.length > 0) {
    throw new ValidationError(
      `${invalidItems.length} producto(s) tienen precio inválido`,
      'cart.price'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES DE MESA
// ═══════════════════════════════════════════════════════════════

/**
 * Validar que la mesa esté disponible
 */
export function validateTableAvailable(table: Table | null): void {
  if (!table) {
    throw new ValidationError(
      'No se ha seleccionado ninguna mesa',
      'table'
    );
  }
  
  // Si la mesa tiene una venta activa, está ocupada
  if (table.currentSaleId) {
    throw new ValidationError(
      `La mesa ${table.number} ya tiene una venta activa (ID: ${table.currentSaleId})`,
      'table.status'
    );
  }
  
  // Validar estado de la mesa
  if (table.status === 'CLEANING') {
    throw new ValidationError(
      `La mesa ${table.number} está siendo limpiada. Espera a que esté disponible.`,
      'table.status'
    );
  }
  
  if (table.status === 'RESERVED') {
    throw new ValidationError(
      `La mesa ${table.number} está reservada.`,
      'table.status'
    );
  }
}

/**
 * Validar número de personas
 */
export function validateNumberOfPeople(numberOfPeople: number, table?: Table): void {
  if (!numberOfPeople || numberOfPeople < 1) {
    throw new ValidationError(
      'Debes especificar el número de personas (mínimo 1)',
      'numberOfPeople'
    );
  }
  
  // Validar capacidad de la mesa si se proporciona
  if (table && numberOfPeople > table.capacity) {
    throw new ValidationError(
      `La mesa ${table.number} tiene capacidad para ${table.capacity} personas, pero intentas asignar ${numberOfPeople}`,
      'numberOfPeople'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES DE CAJA REGISTRADORA
// ═══════════════════════════════════════════════════════════════

/**
 * Validar que la caja registradora esté abierta
 */
export async function validateCashRegisterOpen(): Promise<{ id: string; name: string }> {
  // El arqueo es OPCIONAL — nunca bloquear el cobro.
  // Se asocia la venta a la sesión si existe; si no, se registra sin sesión.
  const cashRegister = await getActiveCashRegister();
  return cashRegister ?? { id: '', name: '' };
}

/**
 * Validar cashRegisterId
 */
export function validateCashRegisterId(cashRegisterId?: string): void {
  if (!cashRegisterId || cashRegisterId.trim() === '') {
    throw new ValidationError(
      'cashRegisterId es requerido. Verifica que la caja esté abierta.',
      'cashRegisterId'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES DE CLIENTE (DELIVERY/COUNTER)
// ═══════════════════════════════════════════════════════════════

/**
 * Validar datos de cliente para delivery
 */
export function validateDeliveryCustomer(
  customerName: string,
  customerPhone: string,
  customerAddress: string
): void {
  if (!customerName || customerName.trim() === '') {
    throw new ValidationError(
      'El nombre del cliente es requerido',
      'customerName'
    );
  }
  
  if (!customerPhone || customerPhone.trim() === '') {
    throw new ValidationError(
      'El teléfono del cliente es requerido',
      'customerPhone'
    );
  }
  
  if (!customerAddress || customerAddress.trim() === '') {
    throw new ValidationError(
      'La dirección de entrega es requerida',
      'customerAddress'
    );
  }
  
  // Validar formato de teléfono (básico)
  const phoneDigits = customerPhone.replace(/\D/g, '');
  if (phoneDigits.length < 8) {
    throw new ValidationError(
      'El teléfono debe tener al menos 8 dígitos',
      'customerPhone'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES COMPUESTAS
// ═══════════════════════════════════════════════════════════════

/**
 * Validar venta de mesa (dine-in) completa
 */
export async function validateDineInSale(
  cart: CartItem[],
  table: Table | null,
  numberOfPeople: number
): Promise<void> {
  // Validar carrito
  validateCartNotEmpty(cart);
  validateCartQuantities(cart);
  validateCartPrices(cart);
  
  // Validar mesa
  validateTableAvailable(table);
  validateNumberOfPeople(numberOfPeople, table || undefined);
  
  // Validar caja registradora
  await validateCashRegisterOpen();
}

/**
 * Validar venta de mostrador (counter) completa
 */
export async function validateCounterSale(cart: CartItem[]): Promise<void> {
  // Validar carrito
  validateCartNotEmpty(cart);
  validateCartQuantities(cart);
  validateCartPrices(cart);
  
  // Validar caja registradora
  await validateCashRegisterOpen();
}

/**
 * Validar venta de delivery completa
 */
export async function validateDeliverySale(
  cart: CartItem[],
  customerName: string,
  customerPhone: string,
  customerAddress: string
): Promise<void> {
  // Validar carrito
  validateCartNotEmpty(cart);
  validateCartQuantities(cart);
  validateCartPrices(cart);
  
  // Validar cliente
  validateDeliveryCustomer(customerName, customerPhone, customerAddress);
  
  // Validar caja registradora
  await validateCashRegisterOpen();
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

/**
 * Validar múltiples condiciones y retornar todos los errores
 * Útil para mostrar todos los errores de validación a la vez
 */
export async function validateAll(
  validators: Array<() => void | Promise<void>>
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  for (const validator of validators) {
    try {
      await validator();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
      }
    }
  }
  
  return errors;
}

/**
 * Ejecutar validación y manejar errores
 */
export async function runValidation<T>(
  validator: () => Promise<T> | T,
  onError?: (error: ValidationError) => void
): Promise<T | null> {
  try {
    return await validator();
  } catch (error) {
    if (error instanceof ValidationError) {
      onError?.(error);
      return null;
    }
    throw error; // Re-throw si no es ValidationError
  }
}
