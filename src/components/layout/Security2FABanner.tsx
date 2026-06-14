import { useAuthStore } from '@/store/authStore';
import { ShieldAlert }  from 'lucide-react';
import { Link }         from 'react-router-dom';

export function Security2FABanner() {
  const { user } = useAuthStore();

  // Solo para admin sin 2FA activo
  const roleName = (user?.role as any)?.name ?? user?.role;
  if (!user || roleName !== 'admin' || user?.totp_enabled) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-40">
      <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1 min-w-0 truncate">
        <strong>Cuenta sin protección.</strong> Activa la verificación en 2 pasos.
      </p>
      <Link
        to="/profile"
        className="text-xs font-bold text-amber-700 hover:text-amber-900 underline flex-shrink-0 whitespace-nowrap"
      >
        Activar ahora →
      </Link>
    </div>
  );
}
