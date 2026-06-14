import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function PwaUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      // Escuchar si el SW ya está esperando activación
      navigator.serviceWorker.ready.then(reg => {
        if (reg.waiting) {
          setUpdateAvailable(true);
          setRegistration(reg);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] bg-white border border-blue-200 rounded-xl shadow-lg p-4 flex items-center gap-3 animate-slide-up">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
        <RefreshCw size={16} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">Actualización disponible</p>
        <p className="text-xs text-gray-500">Hay una nueva versión de BullWeb</p>
      </div>
      <button
        onClick={handleUpdate}
        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
      >
        Actualizar
      </button>
      <button
        onClick={() => setUpdateAvailable(false)}
        className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"
      >
        <X size={14} className="text-gray-400" />
      </button>
    </div>
  );
}