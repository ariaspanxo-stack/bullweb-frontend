import { BarChart3 } from 'lucide-react';

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
      <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}
