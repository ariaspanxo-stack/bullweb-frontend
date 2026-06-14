// Generador de números correlativos para pedidos

const STORAGE_KEYS = {
  MOSTRADOR_COUNTER: 'bullweb_mostrador_counter',
  DELIVERY_COUNTER: 'bullweb_delivery_counter',
  MOSTRADOR_LAST_RESET: 'bullweb_mostrador_last_reset',
  DELIVERY_LAST_RESET: 'bullweb_delivery_last_reset',
};

// Obtener contador actual
function getCounter(type: 'mostrador' | 'delivery'): number {
  const key = type === 'mostrador' ? STORAGE_KEYS.MOSTRADOR_COUNTER : STORAGE_KEYS.DELIVERY_COUNTER;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

// Guardar contador
function setCounter(type: 'mostrador' | 'delivery', value: number): void {
  const key = type === 'mostrador' ? STORAGE_KEYS.MOSTRADOR_COUNTER : STORAGE_KEYS.DELIVERY_COUNTER;
  localStorage.setItem(key, value.toString());
}

// Verificar si necesita reset automático (cada día)
function shouldAutoReset(type: 'mostrador' | 'delivery'): boolean {
  const key = type === 'mostrador' ? STORAGE_KEYS.MOSTRADOR_LAST_RESET : STORAGE_KEYS.DELIVERY_LAST_RESET;
  const lastReset = localStorage.getItem(key);
  
  if (!lastReset) return true;
  
  const lastResetDate = new Date(lastReset);
  const today = new Date();
  
  return lastResetDate.toDateString() !== today.toDateString();
}

// Guardar fecha del último reset
function saveResetDate(type: 'mostrador' | 'delivery'): void {
  const key = type === 'mostrador' ? STORAGE_KEYS.MOSTRADOR_LAST_RESET : STORAGE_KEYS.DELIVERY_LAST_RESET;
  localStorage.setItem(key, new Date().toISOString());
}

// Generar siguiente número
export function generateOrderNumber(type: 'mostrador' | 'delivery'): string {
  // Verificar reset automático
  if (shouldAutoReset(type)) {
    setCounter(type, 0);
    saveResetDate(type);
  }
  
  // Obtener y aumentar contador
  let counter = getCounter(type);
  counter++;
  setCounter(type, counter);
  
  // Formatear número
  const prefix = type === 'mostrador' ? '#' : '#D-';
  const paddedNumber = counter.toString().padStart(3, '0');
  
  return `${prefix}${paddedNumber}`;
}

// Resetear contador manualmente
export function resetCounter(type: 'mostrador' | 'delivery'): void {
  setCounter(type, 0);
  saveResetDate(type);
}

// Obtener próximo número (sin incrementar)
export function getNextOrderNumber(type: 'mostrador' | 'delivery'): string {
  const counter = getCounter(type) + 1;
  const prefix = type === 'mostrador' ? '#' : '#D-';
  const paddedNumber = counter.toString().padStart(3, '0');
  
  return `${prefix}${paddedNumber}`;
}

// Obtener contador actual
export function getCurrentCounter(type: 'mostrador' | 'delivery'): number {
  return getCounter(type);
}

// Obtener información completa
export function getCounterInfo(type: 'mostrador' | 'delivery'): {
  current: number;
  next: string;
  lastReset: string | null;
  willAutoReset: boolean;
} {
  const key = type === 'mostrador' ? STORAGE_KEYS.MOSTRADOR_LAST_RESET : STORAGE_KEYS.DELIVERY_LAST_RESET;
  const lastReset = localStorage.getItem(key);
  
  return {
    current: getCounter(type),
    next: getNextOrderNumber(type),
    lastReset,
    willAutoReset: shouldAutoReset(type),
  };
}
