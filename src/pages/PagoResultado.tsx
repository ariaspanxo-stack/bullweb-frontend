import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import api from '@/services/api';

/**
 * PagoResultado — Hotfix #92
 *
 * Página de retorno tras pagar en Flow (urlReturn = {APP_URL}/pago-resultado).
 * Antes esta ruta no existía y el cliente caía en un 404.
 *
 * - Reutiliza EXACTAMENTE el patrón de llamada de PaymentRequiredOverlay:
 *   GET /billing/status con el cliente `api` y éxito si status es ACTIVE o TRIAL.
 * - Polling cada 4s (inmediato al montar), máximo 15 intentos (~60s).
 * - Estados: confirmando → éxito | sesión (401/403, tras 3 fallos) | paciente (timeout).
 * - Renderiza sin autenticación (ruta pública): si la sesión expiró, muestra
 *   aviso y link a /login.
 */
type Estado = 'confirmando' | 'exito' | 'sesion' | 'paciente';

const MAX_INTENTOS = 15;
const MAX_FALLOS_AUTH = 3;

export default function PagoResultado() {
  const [estado, setEstado]       = useState<Estado>('confirmando');
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentosRef               = useRef(0);
  const fallosAuthRef             = useRef(0);

  useEffect(() => {
    const verificar = async () => {
      intentosRef.current += 1;

      // Límite de intentos alcanzado sin éxito ni fallo de auth → estado paciente
      if (intentosRef.current > MAX_INTENTOS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setEstado('paciente');
        return;
      }

      try {
        // Mismo patrón que PaymentRequiredOverlay: GET /billing/status vía `api`
        const res = await api.get<{ status: string }>('/billing/status');
        fallosAuthRef.current = 0;

        // Misma condición que el overlay: éxito si status es ACTIVE o TRIAL
        if (res.data?.status === 'ACTIVE' || res.data?.status === 'TRIAL') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setEstado('exito');
        }
      } catch (err: any) {
        // Fallo de autenticación (401/403): la sesión expiró tras volver de Flow
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          fallosAuthRef.current += 1;
          if (fallosAuthRef.current >= MAX_FALLOS_AUTH) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setEstado('sesion');
          }
        }
        // Otros errores (red, 402 aún vencido): seguir polleando hasta el límite
      }
    };

    verificar();
    intervalRef.current = setInterval(verificar, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
