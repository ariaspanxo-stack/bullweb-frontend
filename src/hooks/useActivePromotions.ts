// HOTFIX 299: promociones vigentes para mostrar el precio con promo en los carritos del POS.
// Misma fuente que el backend al cobrar (GET /api/pos/promotions/active, hora/dia Chile).
// El backend sigue siendo el que cobra; esto es solo para mostrar.
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { PromoLike } from '@/utils/promoPricing';

export function useActivePromotions(): PromoLike[] {
  const { data } = useQuery({
    queryKey: ['pos', 'promotions', 'active'], // clave propia: POS.tsx cachea otra forma en ['promotions','active']
    queryFn: async () => {
      const res: any = await api.get('/pos/promotions/active');
      // api.get ya desenvuelve body.data; tolerar ambas formas
      const body = res?.data;
      const list = Array.isArray(body) ? body : body?.data;
      return Array.isArray(list) ? (list as PromoLike[]) : [];
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
  return data ?? [];
}
