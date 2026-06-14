import { useQuery } from '@tanstack/react-query';
import { printSettingsService, PRINT_SETTINGS_DEFAULTS, type PrintSettings } from '@/services/printSettingsService';

/**
 * Hook que provee la configuración de impresión del tenant.
 * Carga desde la API una vez, cacheado 5 min.
 * Si falla devuelve los defaults sin romper nada.
 */
export function usePrintSettings(): PrintSettings {
  const { data } = useQuery({
    queryKey: ['print-settings'],
    queryFn:  () => printSettingsService.get(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return data ?? PRINT_SETTINGS_DEFAULTS;
}
