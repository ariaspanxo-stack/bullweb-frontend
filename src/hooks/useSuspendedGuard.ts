import { useState, useEffect } from 'react';

/**
 * Escucha el evento global 'tenant:suspended' (disparado por el interceptor
 * de api.ts) y retorna `true` cuando el tenant está suspendido/cancelado.
 *
 * Uso en pollers / React Query:
 *   const isSuspended = useSuspendedGuard()
 *   useQuery({ ..., refetchInterval: isSuspended ? false : 10_000 })
 */
export function useSuspendedGuard(): boolean {
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    const handler = () => setIsSuspended(true);
    window.addEventListener('tenant:suspended', handler);
    return () => window.removeEventListener('tenant:suspended', handler);
  }, []);

  return isSuspended;
}
