import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const STYLES = {
  danger:  { btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',    icon: 'text-red-500',    bg: 'bg-red-50'    },
  warning: { btn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400', icon: 'text-amber-500', bg: 'bg-amber-50' },
  info:    { btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',  icon: 'text-blue-500',   bg: 'bg-blue-50'   },
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  variant      = 'danger',
  isLoading    = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const s = STYLES[variant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`flex items-start gap-3 p-5 ${s.bg}`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s.icon}`} />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 whitespace-pre-line">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 ${s.btn}`}
          >
            {isLoading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
