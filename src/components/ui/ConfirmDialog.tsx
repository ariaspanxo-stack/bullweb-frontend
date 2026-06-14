import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconBg =
    variant === 'danger'
      ? 'bg-red-100'
      : variant === 'warning'
      ? 'bg-yellow-100'
      : 'bg-blue-100';
  const iconColor =
    variant === 'danger'
      ? 'text-red-500'
      : variant === 'warning'
      ? 'text-yellow-500'
      : 'text-blue-500';
  const btnClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600'
      : variant === 'warning'
      ? 'bg-yellow-500 hover:bg-yellow-600'
      : 'bg-blue-500 hover:bg-blue-600';
  const Icon = variant === 'danger' ? Trash2 : AlertTriangle;
  const defaultTitle =
    variant === 'danger'
      ? 'Eliminar'
      : variant === 'warning'
      ? 'Advertencia'
      : 'Confirmar';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">
              {title ?? defaultTitle}
            </h3>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-colors ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
