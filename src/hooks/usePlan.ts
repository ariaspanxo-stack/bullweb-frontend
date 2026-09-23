import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

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
  const user         = useAuthStore(s => s.user);
  const isSuperAdmin = useIsSuperAdmin();

  const billingQ = useQuery<BillingStatusPlan>({
    queryKey: ['billing-status-plan'],
    queryFn:  async () => (await api.get<BillingStatusPlan>('/billing/status')).data,
    enabled:  !!user && !isSuperAdmin,
    staleTime: 60_000,
    retry:     false,
  });

  if (isSuperAdmin) return { plan: 'TODO', isBasico: false };

  // ESPEJO DEL GATE: subscriptions.plan primero (lo que bloquea el backend),
  // fallback al plano del tenant. Divergencia posible solo si plan_config
  // relaja BASICO→TODO (frontend más estricto en display — dirección segura).
  const plan = normalizePlanFE(billingQ.data?.subscription?.plan ?? billingQ.data?.plan);
  return { plan, isBasico: plan === 'BASICO' };
}
