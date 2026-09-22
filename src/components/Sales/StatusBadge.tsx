import type { SaleStatus } from '@/types/sales.types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  open: {
    label: 'En curso',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: '●'
  },
  paying: {
    label: 'Cobrando',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: '●'
  },
  closed: {
    label: 'Cerrada',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
    icon: '●'
  },
  cancelled: {
    label: 'Anulada',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
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
