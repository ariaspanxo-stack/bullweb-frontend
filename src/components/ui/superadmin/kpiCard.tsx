import type { LucideIcon } from 'lucide-react';

const ACCENTS: Record<string, string> = {
  brand:   'bg-brand-500/10 text-brand-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber:   'bg-amber-500/10 text-amber-400',
  rose:    'bg-rose-500/10 text-rose-400',
  sky:     'bg-sky-500/10 text-sky-400',
  gray:    'bg-gray-500/10 text-gray-400',
};

export function KpiCard({ icon: Icon, label, value, sub, accent = 'brand', trend, tooltip }: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  accent?: keyof typeof ACCENTS;
  trend?: string;
  tooltip?: string;
}) {
  return (
    <div
      className="bg-gray-900/60 border border-white/5 rounded-xl p-5 flex items-center gap-4"
      title={tooltip}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${ACCENTS[accent] ?? ACCENTS.brand}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
        {sub != null && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        {trend != null && <p className="text-xs text-gray-500 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}
