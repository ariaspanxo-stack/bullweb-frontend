import { Lock, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlan } from '@/hooks/usePlan';

/**
 * GATING FASE C — El candado que VENDE.
 *
 * Clon estructural de PermissionGuard (mismo contrato de guard de ruta), pero
 * el gate es el PLAN del tenant, no el permiso del usuario:
 *   - plan BASICO  → pantalla premium "Mejora a TODO" (el vendedor del upgrade).
 *   - plan TODO / grandfathered (STARTER/PRO/ENTERPRISE/null) → guard
 *     TRANSPARENTE: no notan nada.
 *   - Mesas vive en el POS y desde el hotfix mesas-básico es parte del plan
 *     BÁSICO (Básico = mostrador + mesas desde el POS) — el ancla "Mesas" salió
 *     de la lista de desbloqueos TODO.
 *
 * Fail-open client-side: si /billing/status aún carga o falla, se asume TODO
 * (el bloqueo restrictivo real vive en el backend — Fases A/B).
 *
 * ESTILO CLARO PERMANENTE — prohibido dark (regla de la fase).
 */

interface PlanGuardProps {
  children: React.ReactNode;
}

const TODO_UNLOCKS: string[] = [
  'Boletas y Facturación electrónica SII',
  'Pedidos desde la carta QR',
  'KDS — pantalla de cocina',
  'App Mesero con PIN',
  'Inventario y alertas de stock',
  'Fidelización, Campañas y Cupones',
  'Mapeo de Delivery (Uber Eats, PedidosYa)',
  'Control de Asistencia con kiosco',
];

export function PlanGuard({ children }: PlanGuardProps) {
  const { isBasico } = usePlan();

  if (!isBasico) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[calc(100vh-140px)] bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Cabecera premium — estilo claro */}
        <div className="px-8 pt-10 pb-8 text-center border-b border-gray-100 bg-gradient-to-b from-amber-50 to-white">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-5">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-2">
            Plan Básico
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Mejora a TODO
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Este módulo está incluido en el plan TODO. Desbloquéalo junto a todo
            el resto de BullWeb y lleva tu restaurante al siguiente nivel.
          </p>
        </div>

        {/* Lista de desbloqueos */}
        <div className="px-8 py-7">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Con TODO desbloqueas
          </p>
          <ul className="space-y-3">
            {TODO_UNLOCKS.map(feature => (
              <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — el vendedor */}
        <div className="px-8 pb-8">
          <Link
            to="/subscription"
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 active:bg-gray-950 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Mejorar a TODO $34.000/mes
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-3 text-center text-[11px] text-gray-400">
            Todo lo del plan Básico sigue incluido — sin perder nada.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PlanGuard;
