import { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

/**
 * SuspendedOverlay
 * Se muestra cuando el backend responde 403 TENANT_SUSPENDED o TENANT_CANCELLED.
 * Hace polling cada 30s para detectar reactivación sin recargar página.
 * El SuperAdmin nunca ve este overlay.
 */
export default function SuspendedOverlay() {
  const { isSuperAdmin } = useAuthStore();
  const [suspended, setSuspended] = useState(false);
  const [reason, setReason] = useState<'TENANT_SUSPENDED' | 'TENANT_CANCELLED'>('TENANT_SUSPENDED');

  // ── Escuchar evento disparado desde api.ts ─────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ code: string; message: string }>).detail;
      if (detail?.code === 'TENANT_CANCELLED') setReason('TENANT_CANCELLED');
      else setReason('TENANT_SUSPENDED');
      setSuspended(true);
    };
    window.addEventListener('tenant:suspended', handler);
    return () => window.removeEventListener('tenant:suspended', handler);
  }, []);

  // ── Polling cada 30s para detectar reactivación ─────────────────────────
  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get('/auth/me/status');
      if (res.status === 200) {
        setSuspended(false);
      }
    } catch {
      // si sigue suspendido, el backend devolverá 403 y no hacemos nada
    }
  }, []);

  useEffect(() => {
    if (!suspended) return;
    const interval = setInterval(checkStatus, 30_000);
    return () => clearInterval(interval);
  }, [suspended, checkStatus]);

  if (!suspended || isSuperAdmin) return null;

  const isCancelled = reason === 'TENANT_CANCELLED';

  return (
    <>
      {/* Banner fijo superior */}
      <div
        className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center gap-3 px-4 py-2 text-white text-sm font-semibold select-none"
        style={{ background: isCancelled ? '#7c3aed' : '#dc2626' }}
      >
        <span className="text-base">{isCancelled ? '🚫' : '⚠️'}</span>
        {isCancelled
          ? 'Tu cuenta ha sido cancelada. Contáctanos para más información.'
          : 'Tu cuenta está suspendida temporalmente. El acceso al sistema está bloqueado.'}
      </div>

      {/* Overlay semitransparente de fondo */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        style={{ top: '36px' }}
        aria-hidden="true"
      />

      {/* Tarjeta central */}
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" style={{ top: '36px' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">{isCancelled ? '🚫' : '🔒'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isCancelled ? 'Cuenta cancelada' : 'Cuenta suspendida'}
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            {isCancelled
              ? 'Tu cuenta ha sido cancelada. No es posible operar el sistema.'
              : 'Tu cuenta ha sido suspendida temporalmente por el administrador.'}
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Si crees que esto es un error, comunícate con soporte.
          </p>

          {/* Indicador de polling */}
          <p className="text-gray-300 text-xs mb-6 italic">
            Verificando estado de la cuenta cada 30 segundos…
          </p>

          <div className="flex flex-col gap-3">
            <a
              href="https://www.flow.cl/uri/m8wWtWVC9"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              💳 Realiza tu pago aquí
            </a>
            <button
              onClick={checkStatus}
              className="text-gray-400 hover:text-gray-600 text-sm py-2 underline underline-offset-2 transition-colors"
            >
              Verificar ahora
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
