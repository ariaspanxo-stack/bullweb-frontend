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
 *
 * HOTFIX #230: el hook además expone hasFeature(feature) — lee las features del
 * plan EFECTIVO que /billing/status ahora incluye (plan_config, misma fuente
 * canónica del gate backend). Fallback seguro obligatorio: si el payload NO
 * trae features, hasFeature se comporta exactamente como el plan-string de hoy
 * (TODO/grandfathered → true; BASICO → false) — NINGÚN plan cambia su
 * comportamiento sin features. Solo la UI de App Mesero consume hasFeature
 * en este hotfix; el resto del sidebar sigue en plan-string (deuda documentada).
 */
export type TenantPlanFE = 'BASICO' | 'TODO';

export function normalizePlanFE(rawPlan: string | null | undefined): TenantPlanFE {
  return rawPlan === 'BASICO' ? 'BASICO' : 'TODO';
}

export function usePlan(): {
  plan: TenantPlanFE;
  isBasico: boolean;
  /** HOTFIX #230 — true si el plan del tenant incluye la feature (plan_config). */
  hasFeature: (feature: string) => boolean;
} {
  const isSuperAdmin = useIsSuperAdmin();

  // (P0-1) lector pasivo del orquestador compartido — sin polling propio.
  const billingQ = useBillingStatus({ poll: false });

  // HOTFIX #230: features del payload (defensivo: solo arrays).
  const features = Array.isArray(billingQ.data?.features)
    ? (billingQ.data!.features as string[]).map(f => String(f))
    : null;

  // ESPEJO DEL GATE: subscriptions.plan primero (lo que bloquea el backend),
  // fallback al plano del tenant. Divergencia posible solo si plan_config
  // relaja BASICO→TODO (frontend más estricto en display — dirección segura).
  const plan = normalizePlanFE(billingQ.data?.subscription?.plan ?? billingQ.data?.plan);

  // HOTFIX #230 — gate por feature con FALLBACK SEGURO al plan-string:
  //  - plan TODO / grandfathered → true (idéntico a hoy, sin importar features).
  //  - plan BASICO + features disponibles → features incluye la feature (o '*').
  //  - plan BASICO sin features (payload viejo o fila inactiva) → false,
  //    exactamente como el plan-string de hoy (fail-closed, jamás abre por error).
  const hasFeature = (feature: string): boolean => {
    if (isSuperAdmin) return true;
    if (plan !== 'BASICO') return true;
    if (!features) return false;
    return features.includes('*') || features.includes(feature);
  };

  if (isSuperAdmin) return { plan: 'TODO', isBasico: false, hasFeature: () => true };

  return { plan, isBasico: plan === 'BASICO', hasFeature };
}
