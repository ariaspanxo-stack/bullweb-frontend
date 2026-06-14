// ═══════════════════════════════════════════════════════════════
// TOAST CONTAINER
// Contenedor que maneja múltiples toasts
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import Toast from './Toast';
import type { ToastType } from './Toast';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleShowToast = (event: CustomEvent) => {
      const { type, message } = event.detail;
      const id = `toast-${Date.now()}-${Math.random()}`;
      
      setToasts(prev => [...prev, { id, type, message }]);
    };

    window.addEventListener('show-toast', handleShowToast as EventListener);
    
    return () => {
      window.removeEventListener('show-toast', handleShowToast as EventListener);
    };
  }, []);

  const handleClose = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
