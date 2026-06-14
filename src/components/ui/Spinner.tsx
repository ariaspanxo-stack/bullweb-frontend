import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

// ============================================================================
// COMPONENTE SPINNER
// ============================================================================

export default function Spinner({ size = 'md', className, label }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2
        className={cn(
          'animate-spin text-blue-600',
          sizes[size],
          className
        )}
        aria-label={label || 'Cargando...'}
      />
      {label && (
        <p className="text-sm text-gray-600">
          {label}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SPINNER DE PÁGINA COMPLETA
// ============================================================================

interface FullPageSpinnerProps {
  label?: string;
}

export function FullPageSpinner({ label = 'Cargando...' }: FullPageSpinnerProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <Spinner size="lg" label={label} />
    </div>
  );
}

// ============================================================================
// SPINNER INLINE
// ============================================================================

interface InlineSpinnerProps {
  text?: string;
}

export function InlineSpinner({ text = 'Cargando...' }: InlineSpinnerProps) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
