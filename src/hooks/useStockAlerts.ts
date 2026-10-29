import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { usePlan } from '@/hooks/usePlan';

export interface LowStockItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
}

/**
 * Hook que consulta ingredientes con stock bajo cada 5 minutos.
 * Solo activo cuando hay sesión de usuario iniciada.
 */
export function useStockAlerts() {
  const { isAuthenticated, user } = useAuthStore();

  const perms = (user?.role?.permissions ?? []) as string[];
  const canViewInventory =
    perms.includes('ALL_PERMISSIONS') || perms.includes('inventory.view');
  // HOTFIX 262: inventario no está en Básico — sin llamada (antes 403 cada 5 min)
  const { isBasico, planReady } = usePlan();

  const { data } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () =>
      api.get('/inventory/low-stock').then(r => {
        const items: LowStockItem[] = r.data?.data?.ingredients ?? r.data?.ingredients ?? [];
        // HOTFIX 289: productos con stock simple en o bajo su minimo tambien cuentan para el badge
        const products: any[] = r.data?.data?.products ?? r.data?.products ?? [];
        return [
          ...items,
          ...products.map((p) => ({ id: p.id, name: p.name, unit: 'u', currentStock: Number(p.stock), minStock: Number(p.stockMin) })),
        ];
      }),
    enabled: isAuthenticated && canViewInventory && planReady && !isBasico,
    staleTime: 5 * 60 * 1000,   // 5 minutos
    refetchInterval: 5 * 60 * 1000,
  });

  const items = data ?? [];
  return { count: items.length, lowStockCount: items.length, items };
}
