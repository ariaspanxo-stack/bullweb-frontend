import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

// ============================================================================
// TIPOS
// ============================================================================

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// ============================================================================
// COMPONENTE EMPTY STATE
// ============================================================================

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icon */}
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      )}

      {/* Action button */}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// VARIANTES PREDEFINIDAS
// ============================================================================

interface EmptyStateVariantProps {
  action?: EmptyStateProps['action'];
  className?: string;
}

export function NoDataState({ action, className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={require('lucide-react').FileX}
      title="No hay datos disponibles"
      description="No se encontraron registros para mostrar en este momento."
      action={action}
      className={className}
    />
  );
}

export function NoResultsState({ action, className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={require('lucide-react').SearchX}
      title="No se encontraron resultados"
      description="Intenta ajustar los filtros de búsqueda o criterios de selección."
      action={action}
      className={className}
    />
  );
}

export function ErrorState({ action, className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={require('lucide-react').AlertCircle}
      title="No se pudieron cargar los datos"
      description="Ocurrió un error al intentar cargar la información. Por favor, intenta nuevamente."
      action={action}
      className={className}
    />
  );
}
