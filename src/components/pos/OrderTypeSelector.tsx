import { Utensils, ShoppingBag, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

interface OrderTypeSelectorProps {
  value: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  onChange: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') => void;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const orderTypes = [
  { 
    value: 'DINE_IN', 
    label: 'Mesa', 
    icon: Utensils, 
    color: 'blue',
    description: 'Servicio en mesa'
  },
  { 
    value: 'TAKEAWAY', 
    label: 'Para Llevar', 
    icon: ShoppingBag, 
    color: 'green',
    description: 'Orden para llevar'
  },
  { 
    value: 'DELIVERY', 
    label: 'Delivery', 
    icon: Bike, 
    color: 'orange',
    description: 'Entrega a domicilio'
  }
] as const;

// ============================================================================
// COMPONENTE ORDER TYPE SELECTOR
// ============================================================================

export default function OrderTypeSelector({ value, onChange }: OrderTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {orderTypes.map((type) => {
        const Icon = type.icon;
        const isActive = value === type.value;
        
        return (
          <button
            key={type.value}
            onClick={() => onChange(type.value as any)}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
              'hover:shadow-md active:scale-95',
              isActive
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <Icon className={cn(
              'w-8 h-8 transition-colors',
              isActive ? 'text-blue-600' : 'text-gray-400'
            )} />
            <div className="text-center">
              <span className={cn(
                'font-semibold text-sm block',
                isActive ? 'text-blue-700' : 'text-gray-700'
              )}>
                {type.label}
              </span>
              <span className={cn(
                'text-xs mt-1',
                isActive ? 'text-blue-600' : 'text-gray-500'
              )}>
                {type.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
