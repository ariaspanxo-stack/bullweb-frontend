// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// Sistema de notificaciones profesional (reemplaza alerts)
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast = ({ id, type, message, duration = 3000, onClose }: ToastProps) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const colors = {
    success: 'bg-green-50 border-green-500 text-green-900',
    error: 'bg-red-50 border-red-500 text-red-900',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    info: 'bg-blue-50 border-blue-500 text-blue-900'
  };

  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  };

  const Icon = icons[type];

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg
        ${colors[type]}
        animate-in slide-in-from-right-full duration-300
      `}
    >
      <Icon className={`${iconColors[type]} flex-shrink-0 mt-0.5`} size={20} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Hook para usar toasts
export const useToast = () => {
  const showToast = (type: ToastType, message: string) => {
    const event = new CustomEvent('show-toast', {
      detail: { type, message }
    });
    window.dispatchEvent(event);
  };

  return {
    success: (message: string) => showToast('success', message),
    error: (message: string) => showToast('error', message),
    warning: (message: string) => showToast('warning', message),
    info: (message: string) => showToast('info', message)
  };
};

export default Toast;
