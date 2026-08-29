import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function PageHeader({ icon: Icon, title, sub, actions }: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          {sub && <p className="text-sm text-gray-400">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
