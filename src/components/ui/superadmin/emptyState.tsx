import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, sub }: {
  icon: LucideIcon;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-10 h-10 text-gray-600 mb-3" />
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
