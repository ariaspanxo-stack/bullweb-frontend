import React from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';
import type { KPIData } from '../../types/dashboard.types';

interface KPICardProps {
  data: KPIData;
}

export const KPICard: React.FC<KPICardProps> = ({ data }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const TrendIcon =
    data.trend === 'up'
      ? TrendingUpIcon
      : data.trend === 'down'
      ? TrendingDownIcon
      : MinusIcon;

  return (
    <div
      className={`rounded-lg border p-4 ${
        colorClasses[data.color || 'blue']
      } transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{data.icon}</span>
        {data.change !== undefined && data.trend && (
          <div className={`flex items-center gap-1 ${trendColors[data.trend]}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">
              {Math.abs(data.change)}%
            </span>
          </div>
        )}
      </div>

      <p className="text-sm font-medium text-gray-600 mb-1">{data.label}</p>
      <p className="text-2xl font-bold mb-1">{data.value}</p>

      {data.changeLabel && (
        <p className="text-xs text-gray-600">{data.changeLabel}</p>
      )}
    </div>
  );
};

export default KPICard;
