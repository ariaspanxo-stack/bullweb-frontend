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
  async cotizar(direccion: string): Promise<CotizacionEnvio> {
    const res = await api.post('/delivery-zones/cotizar', { direccion });
    return res.data as CotizacionEnvio;
  },
};
