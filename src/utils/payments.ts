import type { Payment, PaymentMethod, PaymentStatus } from '../pages/Restaurant/types';

// Generar ID único para pago
export function generatePaymentId(): string {
  return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calcular total pagado
export function calculateTotalPaid(payments: Payment[]): number {
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
}

// Calcular restante
export function calculateRemaining(total: number, payments: Payment[]): number {
  const paid = calculateTotalPaid(payments);
  return Math.max(0, total - paid);
}

// Determinar estado de pago
export function getPaymentStatus(total: number, payments: Payment[]): PaymentStatus {
  const paid = calculateTotalPaid(payments);
  
  if (paid === 0) return 'pending';
  if (paid >= total) return 'paid';
  return 'partial';
}

// Validar monto de pago
export function validatePaymentAmount(amount: number, remaining: number): {
  valid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { valid: false, error: 'El monto debe ser mayor a 0' };
  }
  
  if (amount > remaining) {
    return { valid: false, error: `El monto no puede ser mayor al restante ($${remaining.toLocaleString()})` };
  }
  
  return { valid: true };
}

// Formatear método de pago
export function formatPaymentMethod(method: PaymentMethod): string {
  const methods: Record<PaymentMethod, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    other: 'Otro'
  };
  return methods[method] || method;
}

// Obtener icono de método de pago
export function getPaymentMethodIcon(method: PaymentMethod): string {
  const icons: Record<PaymentMethod, string> = {
    cash: '💵',
    card: '💳',
    transfer: '🏦',
    other: '💰'
  };
  return icons[method] || '💰';
}

// Calcular vuelto (para efectivo)
export function calculateChange(paid: number, total: number): number {
  return Math.max(0, paid - total);
}
