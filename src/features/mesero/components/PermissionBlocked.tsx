// ═══════════════════════════════════════════════════════════════
// PERMISSION BLOCKED — UI cuando el mesero no tiene permiso
// ═══════════════════════════════════════════════════════════════

import { Lock } from 'lucide-react';

interface PermissionBlockedProps {
  message?:  string;
  showLock?: boolean;
}

export function PermissionBlocked({
  message  = 'Sin permiso para esta acción',
  showLock = true,
}: PermissionBlockedProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {showLock && (
        <div className="w-16 h-16 bg-gray-800 rounded-full
                        flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-500" />
        </div>
      )}
      <div className="text-gray-400 text-sm max-w-xs">{message}</div>
      <div className="text-gray-600 text-xs mt-2">
        Contacta al administrador para habilitar este permiso
      </div>
    </div>
  );
}
