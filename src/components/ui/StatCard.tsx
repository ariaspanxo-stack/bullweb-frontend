import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  loading?: boolean;
}

// ============================================================================
// COMPONENTE STAT CARD
// ============================================================================

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  loading = false
}: StatCardProps) {
  const colorStyles = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-600',
      text: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-600',
      text: 'text-green-600'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'bg-orange-600',
      text: 'text-orange-600'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-600',
      text: 'text-purple-600'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-600',
      text: 'text-red-600'
    }
  };

  const styles = colorStyles[color];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

          {/* Trend */}
          {trend && (
            <div className="flex items-center gap-1">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs. ayer</span>
            </div>
          )}
        </div>

        {/* Icon */}
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', styles.bg)}>
          <Icon className={cn('h-6 w-6 text-white', styles.icon.replace('bg-', 'text-'))} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD SKELETON
// ============================================================================

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
