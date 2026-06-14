import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

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

  const { data } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () =>
      api.get('/inventory/low-stock').then(r => {
        const items: LowStockItem[] = r.data?.data?.ingredients ?? r.data?.ingredients ?? [];
        return items;
      }),
    enabled: isAuthenticated && canViewInventory,
    staleTime: 5 * 60 * 1000,   // 5 minutos
    refetchInterval: 5 * 60 * 1000,
  });

  const items = data ?? [];
  return { count: items.length, lowStockCount: items.length, items };
}
