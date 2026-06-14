import { cn } from '@/lib/utils';
import { GrowthChip } from './GrowthChip';

export function KpiIntCard({ label, value, prev, icon: Icon, iconBg, loading }: {
  label: string; value: number; prev: number;
  icon: React.ElementType; iconBg: string; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading
        ? <div className="h-8 w-20 bg-gray-100 rounded animate-pulse mb-3" />
        : <div className="text-3xl font-extrabold text-gray-900 mb-3 tabular-nums leading-none">{(value ?? 0).toLocaleString('es-CL')}</div>
      }
      <div className="flex items-center justify-between">
        <GrowthChip curr={value ?? 0} prev={prev ?? 0} />
        <span className="text-xs text-gray-500 ml-2">ant: {(prev ?? 0).toLocaleString('es-CL')}</span>
      </div>
    </div>
  );
}
