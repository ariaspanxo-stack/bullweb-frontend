// TAREA 332: mapa unico de nombres de plan para toda la UI (superadmin, overlay, Config > Suscripcion).
// En BD no se renombra nada: BASICO -> BÁSICO; TODO, STARTER, PRO, ENTERPRISE, BULLWEB_COMPLETO_INICIO o vacio -> FULL
// (mismo criterio que normalizePlan del backend: lo desconocido nunca es Basico).
export type PlanLabel = 'BÁSICO' | 'FULL';

export function planLabel(raw: string | null | undefined): PlanLabel {
  return String(raw ?? '').trim().toUpperCase() === 'BASICO' ? 'BÁSICO' : 'FULL';
}

/** 'YYYY-MM-DD' -> 'DD-MM-YYYY' */
export function ymdToCl(ymd: string | null | undefined): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}

/** Fecha Chile 'DD-MM-YYYY' de un ISO. */
export function isoToClDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  return ymdToCl(ymd);
}
