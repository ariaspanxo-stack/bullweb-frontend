import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

// ============================================================================
// COMPONENTE CARD
// ============================================================================

export default function Card({
  title,
  description,
  children,
  actions,
  className,
  headerClassName,
  bodyClassName
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {(title || description || actions) && (
        <div
          className={cn(
            'flex items-center justify-between px-6 py-4 border-b border-gray-200',
            headerClassName
          )}
        >
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 ml-4">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className={cn('px-6 py-4', bodyClassName)}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('mt-1 text-sm text-gray-500', className)}>
      {children}
    </p>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50', className)}>
      {children}
    </div>
  );
}
