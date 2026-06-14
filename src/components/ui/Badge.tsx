import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

// ============================================================================
// COMPONENTE BADGE
// ============================================================================

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
  dot = false
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  };

  const dotColors = {
    default: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// ============================================================================
// BADGE CON ICONO
// ============================================================================

interface BadgeWithIconProps extends BadgeProps {
  icon: React.ReactNode;
}

export function BadgeWithIcon({
  icon,
  children,
  ...props
}: BadgeWithIconProps) {
  return (
    <Badge {...props}>
      <span className="flex items-center gap-1">
        {icon}
        {children}
      </span>
    </Badge>
  );
}

// ============================================================================
// BADGE CON CONTADOR
// ============================================================================

interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: BadgeProps['variant'];
  className?: string;
}

export function CountBadge({
  count,
  max = 99,
  variant = 'danger',
  className
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  if (count === 0) return null;

  return (
    <Badge
      variant={variant}
      size="sm"
      className={cn(
        'absolute -top-1 -right-1 h-5 min-w-5 items-center justify-center rounded-full px-1',
        className
      )}
    >
      {displayCount}
    </Badge>
  );
}
