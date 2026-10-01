import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Loader2 } from 'lucide-react';
import api from '@/services/api';
// HOTFIX #218 (P0-1): la MISMA queryKey compartida ['billing','status'] —
// un solo cache/una sola fuente (los refetch aquí alimentan el mismo entry
// que consumen overlay/campanita/usePlan; react-query deduplica en vuelo).
import { BILLING_STATUS_KEY } from '@/hooks/useBillingStatus';

/**
 * PagoResultado — Hotfix #92
 *
 * Página de retorno tras pagar en Flow (urlReturn = {APP_URL}/pago-resultado).
 * Antes esta ruta no existía y el cliente caía en un 404.
 *
 * - Reutiliza EXACTAMENTE el patrón de llamada de PaymentRequiredOverlay:
 *   GET /billing/status con el cliente `api` y éxito si status es ACTIVE o TRIAL.
 * - Polling escalonado #143: cada 5s durante los primeros 90s desde el montaje,
 *   luego cada 30s; máximo 22 intentos (~3.5 min).
 * - Estados: confirmando → éxito | sesión (401/403, tras 3 fallos) | paciente (timeout).
 * - Renderiza sin autenticación (ruta pública): si la sesión expiró, muestra
 *   aviso y link a /login.
 */
type Estado = 'confirmando' | 'exito' | 'sesion' | 'paciente';

const MAX_INTENTOS = 22; // #143: 18 intentos rápidos (90s) + 4 lentos (2min) ≈ 3.5 min
const MAX_FALLOS_AUTH = 3;

export default function PagoResultado() {
  const [estado, setEstado]       = useState<Estado>('confirmando');
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentosRef               = useRef(0);
  const fallosAuthRef             = useRef(0);

  // (P0-1) Query compartida. Página PÚBLICA: sin intervalo automático — el
  // bucle escalonado de abajo (#143, 5s→30s) la refetcha explícitamente.
  // Sin gate de usuario: el retorno de Flow puede llegar con sesión muerta
  // (el 401/403/404 cuenta como fallo de auth, como siempre).
  const billingQ = useQuery<{ status?: string }>({
    queryKey: BILLING_STATUS_KEY,
    queryFn:  async () => (await api.get<{ status: string }>('/billing/status')).data,
    refetchInterval:       false,
    refetchOnWindowFocus:  false,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    const inicio = Date.now(); // #143: ancla del schedule escalonado (5s → 30s a los 90s)
    let desmontado = false;   // corte legítimo (unmount): no seguir polleando
    let enVuelo    = false;   // evita cadenas paralelas de polling (visibility + timer)

    // HUECO B (#129): marca para el guard de _forceLogout (api.ts). Se setea AL MONTAR
    // porque el _forceLogout dispara DENTRO de api.get(), antes de que el catch corra.
    sessionStorage.setItem('pago_resultado_poll', '1');

    // REGLA DE CIERRE (#129): todo path que corta el polling setea estado final —
    // el clearTimeout jamás viaja sin su setEstado hermano (salvo el unmount legítimo).
    const parar = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const verificar = async () => {
      if (desmontado || enVuelo) return;
      enVuelo = true;
      try {
        intentosRef.current += 1;

        // Límite de intentos alcanzado sin éxito ni fallo de auth → estado paciente
        if (intentosRef.current > MAX_INTENTOS) {
          parar();
          setEstado('paciente');
          return;
        }

        try {
          // (P0-1) refetch de la query COMPARTIDA — mismo cache que el resto
          // de la app; devuelve el resultado fresco sin duplicar requests.
          const fresh = await billingQ.refetch();
          const s     = (fresh.data as any)?.status;

          if (s === 'ACTIVE' || s === 'TRIAL') {
            fallosAuthRef.current = 0;
            sessionStorage.removeItem('pago_resultado_poll');
            parar();
            setEstado('exito');
            return;
          }
          // HUECO A (#129) — el error llega plano en err.status (fetch-based):
          // 401/403/404 = sesión rota tras Flow (JWT muerto / tenantMiddleware).
          const es = (fresh.error as any)?.status ?? (fresh.error as any)?.data?.status;
          if (es === 401 || es === 403 || es === 404) {
            fallosAuthRef.current += 1;
            if (fallosAuthRef.current >= MAX_FALLOS_AUTH) {
              parar();
              setEstado('sesion');
              return;
            }
          }
          // Otros errores (red, aún vencido): seguir polleando hasta el límite
        } catch {
          // refetch no lanza (devuelve error en el resultado) — red de seguridad.
        }

        // HUECO C (#129): bucle setTimeout encadenado — verificar() se agenda a sí
        // misma al final de cada ciclo (sobrevive al throttle móvil mejor que setInterval).
        // #143: schedule escalonado — 5s durante los primeros 90s desde el montaje,
        // luego 30s (condición de éxito, fallos auth, timeout y cleanup intactos).
        const espera = Date.now() - inicio < 90000 ? 5000 : 30000;
        timerRef.current = setTimeout(verificar, espera);
      } finally {
        enVuelo = false;
      }
    };

    // HUECO C (#129): rescate móvil — al volver a foreground (banco/Flow app), el
    // primer vistazo dispara la verificación inmediata en vez de esperar el timer.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !desmontado) {
        parar();
        verificar();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    verificar();

    return () => {
      desmontado = true;
      parar();                                              // unmount = corte legítimo
      sessionStorage.removeItem('pago_resultado_poll');     // higiene de la marca
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">

        {estado === 'confirmando' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Confirmando tu pago…
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Estamos verificando la confirmación de Flow. Esto tomará solo unos segundos.
            </p>
            <p className="text-gray-300 text-xs italic">
              Verificando estado cada 4 segundos…
            </p>
          </>
        )}

        {estado === 'exito' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Pago confirmado!
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Tu suscripción está activa. Ya puedes seguir operando con normalidad.
            </p>
            <Link
              to="/"
              className="inline-block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Volver al panel
            </Link>
          </>
        )}

        {estado === 'sesion' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Sesión expirada
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Tu sesión expiró. Inicia sesión para verificar el estado de tu cuenta.
            </p>
            <Link
              to="/login"
              className="inline-block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Iniciar sesión
            </Link>
          </>
        )}

        {estado === 'paciente' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Estamos confirmando tu pago
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Estamos confirmando tu pago. Si tu cuenta no se activa en unos minutos, vuelve a ingresar.
            </p>
            <Link
              to="/login"
              className="inline-block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Volver a ingresar
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
