/**
 * #237 — FASE B: MEDICIÓN APP-SIDE ARMADA SIN ACTIVAR (no-op inofensivo).
 *
 * Réplica del patrón #228 del landing: mientras PIXEL_ID/GA4_ID valgan
 * 'PENDING', track() es no-op con console.debug (cero red, cero cookies,
 * cero terceros) y <MeasurementScripts /> no inyecta NADA.
 *
 * Diferencia con el landing: aquí además existe utmCapture(), que lee los
 * parámetros utm_* de la URL al entrar a /register y los persiste en
 * localStorage con TTL de 7 días (expirados → se descartan/limpian).
 */

// ===== PLACEHOLDERS — reemplazar por IDs reales al activar (runbook #237) =====
export const PIXEL_ID = 'PENDING' as string; // Meta Pixel ID, formato: '1234567890'
export const GA4_ID   = 'PENDING' as string; // GA4 Measurement ID, formato: 'G-XXXXXXXXXX'

export const measurementActive = PIXEL_ID !== 'PENDING' || GA4_ID !== 'PENDING';

/** Nombres de evento FIJOS (misma taxonomía #228 — no renombrar): */
export type MeasurementEvent =
  | 'begin_registration'
  | 'complete_registration'
  | 'plan_selected';

/**
 * track() — envía el evento a TODAS las plataformas activas.
 * Con IDs pendientes: no-op + console.debug (cero red, cero cookies).
 */
export function track(event: MeasurementEvent, params: Record<string, unknown> = {}): void {
  if (!measurementActive) {
    console.debug(`[measurement:inactiva] ${event}`, params);
    return;
  }
  if (typeof window === 'undefined') return;

  // Meta Pixel
  if (PIXEL_ID !== 'PENDING' && typeof (window as any).fbq === 'function') {
    (window as any).fbq('track', event, params);
  }
  // GA4 (gtag)
  if (GA4_ID !== 'PENDING' && typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', event, params);
  }
}

// ===== UTM capture (app-side) =====

const UTM_STORAGE_KEY = 'bullweb:utm';
const UTM_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  capturedAt: number;
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * utmCapture() — al entrar a /register: lee los utm_* de la URL y los
 * persiste en localStorage con TTL de 7 días. Si los ya guardados están
 * expirados, se limpian. Con URL sin UTMs, no sobreescribe lo capturado.
 */
export function utmCapture(): UtmData | null {
  if (typeof window === 'undefined') return null;

  // 1) Purgar vencidos
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UtmData;
      if (!parsed.capturedAt || Date.now() - parsed.capturedAt > UTM_TTL_MS) {
        localStorage.removeItem(UTM_STORAGE_KEY);
      }
    }
  } catch {
    try { localStorage.removeItem(UTM_STORAGE_KEY); } catch { /* sin storage */ }
  }

  // 2) Capturar UTMs presentes en la URL (si hay)
  const params = new URLSearchParams(window.location.search);
  const found: Partial<UtmData> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) (found as Record<string, string>)[k] = v;
  }
  if (Object.keys(found).length === 0) return utmRead();

  const data: UtmData = { ...found, capturedAt: Date.now() };
  try { localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data)); } catch { /* sin storage */ }
  return data;
}

/** utmRead() — devuelve las UTMs vigentes (o null si no hay/expiradas). */
export function utmRead(): UtmData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UtmData;
    if (!parsed.capturedAt || Date.now() - parsed.capturedAt > UTM_TTL_MS) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
