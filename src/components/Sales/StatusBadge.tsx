import type { SaleStatus } from '@/types/sales.types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  open: {
    label: 'En curso',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: '●'
  },
  paying: {
    label: 'Cobrando',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '●'
  },
  closed: {
    label: 'Cerrada',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: '●'
  },
  cancelled: {
    label: 'Anulada',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: '●'
  }
} as const;

interface StatusBadgeProps {
  status: SaleStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border',
        config.className
      )}
    >
      {showIcon && <span className="text-[10px]">{config.icon}</span>}
      {config.label}
    </span>
  );
}
