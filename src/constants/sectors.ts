// BUG 15: Constante compartida para sectores — evita duplicación en modales
export const SECTORES_CHILE = [
  'Centro',
  'Providencia',
  'Las Condes',
  'Vitacura',
  'Ñuñoa',
  'La Reina',
  'Lo Barnechea',
  'Peñalolén',
  'La Florida',
  'Macul',
  'Otro',
] as const;

export type Sector = typeof SECTORES_CHILE[number];
