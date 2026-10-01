import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

/**
 * HOTFIX #218 (P0-1) — EL ÚNICO ORQUESTADOR DE /billing/status.
 *
 * Antes: al vencer el trial, cada respuesta 402 disparaba pollers EN PARALELO
 * (overlay + Header campanita + usePlan + Subscription + SuspendedOverlay +
 * PagoResultado) → 848 GET en 2h quemando el apiLimiter global (120 req/min)
 * → el propio camino de pago moría en 429 (incidente hamachi-nikkei, 01-oct).
 *
 * Ahora: UNA queryKey COMPARTIDA ['billing','status'] con UNA sola instancia
 * de polling (30s). Todos los consumidores usan este hook — react-query
 * deduplica: sin importar cuántos componentes la consuman, hay EXACTAMENTE
 * UN request cada 30s (más los refetch manuales explícitos).
 *
 * Contrato: el body de getStatus del backend (INTACTO — prohibido tocarlo):
 * { plan, status, trialActive, daysLeft, trialEndsAt, priceCLP, subscription }.
 *
 * SuperAdmin: query deshabilitada (silencio, igual que la campanita y overlay).
 */
export interface BillingStatusData {
  plan?:         string | null;
  status?:       string;   // ACTIVE | TRIAL | PAST_DUE | SUSPENDED | CANCELLED
  trialActive?:  boolean;
  daysLeft?:     number;
  trialEndsAt?:  string | null;
  /** Hotfix #199-1: precio EFECTIVO de la ficha (DISPLAY = COBRO). */
  priceCLP?:     number;
  subscription?: {
    flowSubscriptionId?: string | null;
    plan?:               string | null;
    priceCLP?:           number;
    status?:             string;
    currentPeriodEnd?:   string;
  } | null;
}

/** LA queryKey compartida — única fuente de verdad del estado de billing. */
export const BILLING_STATUS_KEY = ['billing', 'status'] as const;

/**
 * El orquestador. `poll` controla la instancia de polling:
 *   - poll=true  → este hook sostiene el refetchInterval 30s (UNO solo por app;
 *                  si varios lo piden, react-query une los intervals al menor —
 *                  en la práctica todos piden 30s → UN ciclo).
 *   - poll=false → consume el mismo cache sin agregar intervalo (lectores
 *                  pasivos: usePlan, campanita, ficha de Subscription).
 */
export function useBillingStatus(opts?: { poll?: boolean }) {
  const user         = useAuthStore(s => s.user);
  const isSuperAdmin = useIsSuperAdmin();

  return useQuery<BillingStatusData>({
    queryKey: BILLING_STATUS_KEY,
    queryFn:  async () => (await api.get<BillingStatusData>('/billing/status')).data,
    enabled:  !!user && !isSuperAdmin,
    refetchInterval: opts?.poll ? 30_000 : false,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    retry: false,
  });
}

/** Refetch manual explícito (botones "verificar ahora" / reintentos). */
export function useInvalidateBillingStatus() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: BILLING_STATUS_KEY });
}
