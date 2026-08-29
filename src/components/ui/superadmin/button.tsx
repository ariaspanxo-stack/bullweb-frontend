import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow-sm disabled:opacity-50',
  secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10 rounded-lg disabled:opacity-50',
  danger:    'bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg disabled:opacity-50',
  ghost:     'text-gray-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-50',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
