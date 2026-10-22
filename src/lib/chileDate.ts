// HOTFIX 272 lote — día calendario en hora Chile (YYYY-MM-DD), independiente de la zona del navegador.
// toISOString() da el día UTC: entre ~21:00 y 24:00 de Chile ya es "mañana" y los pedidos del día desaparecían del filtro.
export function chileDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}
