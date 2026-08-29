import type { ReactNode } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wide">{children}</thead>;
}

export function Tr({ children, highlight }: { children: ReactNode; highlight?: boolean }) {
  return (
    <tr className={`border-t border-white/5 hover:bg-white/5 ${highlight ? 'bg-white/5' : ''}`}>{children}</tr>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-gray-300 ${className}`}>{children}</td>;
}
