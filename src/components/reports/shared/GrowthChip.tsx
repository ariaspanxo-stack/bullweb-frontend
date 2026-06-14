import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GrowthChip({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0) return <span className="text-xs text-slate-400">—</span>;
  const pct = ((curr - prev) / prev) * 100;
  const pos = pct >= 0;
  return (
    <div className={cn(
      'flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full',
      pos ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? '+' : ''}{pct.toFixed(1)}%
    </div>
  );
}
