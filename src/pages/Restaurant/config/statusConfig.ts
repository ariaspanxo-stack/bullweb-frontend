import type { StatusConfig } from '../types';

// Estados para MESAS
export const MESA_STATUSES: StatusConfig[] = [
  {
    value: 'pending',
    label: 'Pendiente',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
    borderColor: 'border-zinc-500',
    icon: '⏱️'
  },
  {
    value: 'in_kitchen',
    label: 'En Cocina',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500',
    icon: '👨‍🍳'
  },
  {
    value: 'served',
    label: 'Servido',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    icon: '✅'
  }
];

// Estados para MOSTRADOR
export const MOSTRADOR_STATUSES: StatusConfig[] = [
  {
    value: 'pending',
    label: 'Pendiente',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
    borderColor: 'border-zinc-500',
    icon: '⏱️'
  },
  {
    value: 'preparing',
    label: 'En Preparación',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    icon: '👨‍🍳'
  },
  {
    value: 'ready',
    label: 'Listo',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    icon: '🔔'
  },
  {
    value: 'delivered',
    label: 'Entregado',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500',
    icon: '✅'
  }
];

// Estados para DELIVERY
export const DELIVERY_STATUSES: StatusConfig[] = [
  {
    value: 'pending',
    label: 'Pendiente',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
    borderColor: 'border-zinc-500',
    icon: '⏱️'
  },
  {
    value: 'preparing',
    label: 'En Preparación',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    icon: '👨‍🍳'
  },
  {
    value: 'ready',
    label: 'Listo',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    icon: '📦'
  },
  {
    value: 'in_transit',
    label: 'En Camino',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
    icon: '🚚'
  },
  {
    value: 'delivered',
    label: 'Entregado',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500',
    icon: '✅'
  }
];

// Obtener config según modo
export function getStatusConfig(mode: 'mesas' | 'mostrador' | 'delivery', status: string): StatusConfig {
  const configs = mode === 'mesas' ? MESA_STATUSES : 
                  mode === 'mostrador' ? MOSTRADOR_STATUSES : 
                  DELIVERY_STATUSES;
  
  return configs.find(s => s.value === status) || configs[0];
}

// Obtener siguiente estado
export function getNextStatus(mode: 'mesas' | 'mostrador' | 'delivery', currentStatus: string): string | null {
  const configs = mode === 'mesas' ? MESA_STATUSES : 
                  mode === 'mostrador' ? MOSTRADOR_STATUSES : 
                  DELIVERY_STATUSES;
  
  const currentIndex = configs.findIndex(s => s.value === currentStatus);
  const nextConfig = configs[currentIndex + 1];
  
  return nextConfig ? nextConfig.value : null;
}
