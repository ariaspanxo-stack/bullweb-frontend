// LOTE 314: envio por tramos de distancia (Config > Delivery, cotizacion del POS y textos compartidos).
import api from './api';

export type ModoEnvio = 'FIJO' | 'TRAMOS';

export interface ConfigEnvio {
  modo_envio:         ModoEnvio;
  envio_gratis_desde: number | null;
  direccion_origen:   string | null;
  origen_lat:         number | null;
  origen_lng:         number | null;
  radio_maximo:       number | null;
}

export interface TramoEnvio {
  id?:           string;
  orden?:        number;
  km_hasta:      number;
  costo:         number;
  pedido_minimo: number | null;
  activo:        boolean;
}

export interface VistaEnvio {
  config: ConfigEnvio;
  tramos: TramoEnvio[];
  google: boolean;
}

export interface CotizacionEnvio {
  modo:                 'TRAMOS' | 'FIJO';
  km?:                  number | null;
  km_recta?:            number | null;
  tramo?:               number | null;
  costo?:               number | null;
  costo_tramo?:         number | null;
  pedido_minimo?:       number | null;
  fuera_de_zona?:       boolean;
  estimado?:            boolean;
  sin_cotizacion?:      boolean;
  envio_gratis?:        boolean;
  envio_gratis_desde?:  number | null;
  bajo_minimo?:         boolean;
  falta_minimo?:        number | null;
  direccion_formateada?: string | null;
  km_desde?:            number | null; // LOTE 333
  km_hasta?:            number | null; // LOTE 333
  comuna_agregada?:     string | null; // LOTE 333
}

/** LOTE 333: autocompletado (Google Places New): clave de navegador si existe y punto/comuna del local para el sesgo. */
export interface PlacesConfig { key: string | null; lat: number | null; lng: number | null; comuna: string | null }

const kmCorto = (km: number) => (Math.round(km * 10) / 10).toLocaleString('es-CL', { maximumFractionDigits: 1 });
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

/**
 * LOTE 333: texto unico de la cotizacion: "2,3 km · Envío $2.000 (tramo 0–3 km)". Envio gratis y estimado se dicen.
 * null si no hay cotizacion con tramo (fuera de zona, sin cotizacion o FIJO).
 */
export function textoCotizacion(c: CotizacionEnvio | null | undefined, costo?: number | null): string | null {
  if (!c || c.modo !== 'TRAMOS' || c.sin_cotizacion || c.fuera_de_zona || c.km == null) return null;
  const monto = costo ?? c.costo ?? c.costo_tramo ?? 0;
  const envio = monto === 0 ? 'Envío gratis' : `Envío ${pesos(monto)}`;
  const tramo = c.km_hasta != null ? ` (tramo ${kmCorto(c.km_desde ?? 0)}–${kmCorto(c.km_hasta)} km)` : c.tramo != null ? ` (tramo ${c.tramo})` : '';
  return `${c.estimado ? 'aprox. ' : ''}${fmtKm(c.km)} · ${envio}${tramo}`;
}

export const MOTIVOS_CAMBIO_ENVIO: Array<{ value: string; label: string }> = [
  { value: 'cliente_frecuente', label: 'Cliente frecuente' },
  { value: 'promocion',         label: 'Promoción' },
  { value: 'error_direccion',   label: 'Error de dirección' },
  { value: 'otro',              label: 'Otro' },
];

/** "3,2 km" (un decimal, coma chilena). */
export const fmtKm = (km: number | null | undefined) =>
  km == null ? '' : `${(Math.round(km * 10) / 10).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;

export const deliveryZonesService = {
  async get(): Promise<VistaEnvio> {
    const res = await api.get('/delivery-zones');
    return res.data as VistaEnvio;
  },
  async save(body: { modo_envio: ModoEnvio; envio_gratis_desde: number | null; radio_maximo: number | null; tramos: TramoEnvio[] }): Promise<VistaEnvio> {
    const res = await api.put('/delivery-zones', body);
    return res.data as VistaEnvio;
  },
  async setOrigin(body: { direccion: string; lat?: number; lng?: number }): Promise<VistaEnvio> {
    const res = await api.post('/delivery-zones/origen', body);
    return res.data as VistaEnvio;
  },
  async probar(direccion: string, subtotal?: number | null): Promise<CotizacionEnvio> {
    const res = await api.post('/delivery-zones/probar', { direccion, subtotal: subtotal ?? null });
    return res.data as CotizacionEnvio;
  },
  async places(): Promise<PlacesConfig> { // LOTE 333
    const res = await api.get('/delivery-zones/places');
    return res.data as PlacesConfig;
  },
  async cotizar(direccion: string): Promise<CotizacionEnvio> {
    const res = await api.post('/delivery-zones/cotizar', { direccion });
    return res.data as CotizacionEnvio;
  },
};
