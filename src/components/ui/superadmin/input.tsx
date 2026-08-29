import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

const FIELD =
  'w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors';

export function Input({ label, className = '', ...props }: {
  label?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-400 mb-1.5">{label}</span>}
      <input className={`${FIELD} ${className}`} {...props} />
    </label>
  );
}

export function Select({ label, className = '', children, ...props }: {
  label?: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-gray-400 mb-1.5">{label}</span>}
      <select className={`${FIELD} ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
