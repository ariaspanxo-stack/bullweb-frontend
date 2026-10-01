import { useAuthStore } from '@/store/authStore';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
// HOTfix #218 (P0-1): consume la query COMPARTIDA ['billing','status'] —
// sin queryKey propia (antes ['billing-status-plan'], parte de la tormenta).
import { useBillingStatus } from '@/hooks/useBillingStatus';

/**
 * GATING FASE C — El plan del tenant en el frontend.
 *
 * Fuente de verdad: GET /billing/status → { plan } (billing.service.ts getStatus,
 * mismo contrato que consumen Header/PaymentRequiredOverlay — #199-1).
 *
 * Normalización CLIENTE idéntica al backend (normalizePlan en checkPlan.ts):
 *   SOLO plan === 'BASICO' explícito → BASICO.
 *   STARTER / PRO / ENTERPRISE / null / undefined / carga → TODO (grandfathering
 *   por defecto: los grandfathered NO notan NADA; un fallo del endpoint jamás
 *   esconde módulos — el gate restrictivo real vive en el backend Fases A/B).
 *
 * SuperAdmin: siempre TODO (no es tenant Básico; silencio igual que la campanita).
 */
export type TenantPlanFE = 'BASICO' | 'TODO';

export function normalizePlanFE(rawPlan: string | null | undefined): TenantPlanFE {
  return rawPlan === 'BASICO' ? 'BASICO' : 'TODO';
}

interface BillingStatusPlan {
  /** plan plano del tenant (getStatus) — puede divergir de la ficha. */
  plan?: string | null;
  /** LA FUENTE DEL GATE: getTenantPlan (checkPlan.ts Fase A) lee subscriptions.plan.
   *  El response de /billing/status incluye el objeto subscription completo. */
  subscription?: { plan?: string | null } | null;
}

export function usePlan(): { plan: TenantPlanFE; isBasico: boolean } {
  const isSuperAdmin = useIsSuperAdmin();

  // (P0-1) lector pasivo del orquestador compartido — sin polling propio.
  const billingQ = useBillingStatus({ poll: false });

  if (isSuperAdmin) return { plan: 'TODO', isBasico: false };

  // ESPEJO DEL GATE: subscriptions.plan primero (lo que bloquea el backend),
  // fallback al plano del tenant. Divergencia posible solo si plan_config
  // relaja BASICO→TODO (frontend más estricto en display — dirección segura).
  const plan = normalizePlanFE(billingQ.data?.subscription?.plan ?? billingQ.data?.plan);
  return { plan, isBasico: plan === 'BASICO' };
}
