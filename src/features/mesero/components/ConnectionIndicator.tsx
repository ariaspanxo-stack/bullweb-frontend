// ═══════════════════════════════════════════════════════════════
// CONNECTION INDICATOR — indicador online/offline para el mesero
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export function ConnectionIndicator() {
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [wasOffline,  setWasOffline]  = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success('✅ Conexión restaurada', { duration: 3000 });
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.error('⚠️ Sin conexión — modo offline', { duration: 5000 });
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return (
    <div className={`
      flex items-center gap-1.5
      text-xs px-2 py-1 rounded-full
      transition-all
      ${isOnline
        ? 'bg-green-900/50 text-green-300'
        : 'bg-red-900/50 text-red-300 animate-pulse'
      }
    `}>
      {isOnline
        ? <Wifi    className="w-3 h-3" />
        : <WifiOff className="w-3 h-3" />
      }
      <span className="hidden sm:inline">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
