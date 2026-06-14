interface BrandingData {
  [key: string]: string;
}

/**
 * Carga el branding público del tenant y aplica los ajustes como CSS custom properties.
 * Silencioso en caso de error — nunca debe bloquear el arranque de la app.
 */
export async function applyBranding(): Promise<void> {
  try {
    const tenantId =
      localStorage.getItem('bullweb_tenant') ??
      (import.meta.env.VITE_TENANT_ID as string | undefined) ??
      null;

    if (!tenantId) return;

    const headers: Record<string, string> = { 'x-tenant-id': tenantId };

    const res = await fetch(
      `${(import.meta.env.VITE_API_URL as string) ?? ''}/api/admin/branding/public`,
      { headers }
    );

    if (!res.ok) return;

    const json = await res.json();
    const settings: BrandingData = json?.data ?? json ?? {};

    const root = document.documentElement;

    if (settings.color_primary) {
      root.style.setProperty('--color-primary', settings.color_primary);
    }
    if (settings.color_secondary) {
      root.style.setProperty('--color-secondary', settings.color_secondary);
    }
    if (settings.color_accent) {
      root.style.setProperty('--color-accent', settings.color_accent);
    }

    // Favicon dinámico
    if (settings.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (favicon) favicon.href = settings.favicon_url;
    }

    // Título de la pestaña
    if (settings.app_name) {
      document.title = settings.app_name + ' | POS';
    }
  } catch {
    // Silencioso — branding es cosmético, nunca rompe la app
  }
}
