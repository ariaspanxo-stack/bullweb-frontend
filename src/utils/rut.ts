/**
 * Utilidades para RUT chileno.
 */

/** Valida un RUT chileno. Acepta con/sin puntos y guión. */
export function validarRut(rut: string): boolean {
  const clean = rut.replace(/[.\-]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let suma = 0;
  let multiplo = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  const dvStr =
    dvEsperado === 11 ? '0' :
    dvEsperado === 10 ? 'K' :
    String(dvEsperado);

  return dv === dvStr;
}

/** Formatea un RUT con puntos y guión. Ej: "12345678-9" → "12.345.678-9" */
export function formatRut(rut: string): string {
  const clean = rut.replace(/[.\-]/g, '');
  if (clean.length < 2) return rut;
  return (
    clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') +
    '-' +
    clean.slice(-1).toUpperCase()
  );
}
