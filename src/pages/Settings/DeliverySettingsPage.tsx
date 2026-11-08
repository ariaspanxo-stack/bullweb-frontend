// LOTE 314: Configuracion -> Delivery. Envio fijo (como siempre) o por tramos de distancia, con envio gratis, direccion del
// local verificada en el servidor y "Probar con una dirección". El costo real lo calcula siempre el servidor.
import { useEffect, useState } from 'react';
import { Truck, MapPin, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { deliveryZonesService, fmtKm, type CotizacionEnvio, type ModoEnvio, type VistaEnvio } from '@/services/deliveryZonesService';

const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

interface FilaTramo { km: string; costo: string; minimo: string }

const filaVacia = (): FilaTramo => ({ km: '', costo: '', minimo: '' });
const soloEntero = (v: string) => v.replace(/[^0-9]/g, '');
const soloDecimal = (v: string) => v.replace(/[^0-9.,]/g, '').replace(',', '.');
const errMsg = (e: any, fb: string) => e?.response?.data?.error ?? e?.message ?? fb;

export default function DeliverySettingsPage() {
  const [vista, setVista] = useState<VistaEnvio | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [modo, setModo] = useState<ModoEnvio>('FIJO');
  const [filas, setFilas] = useState<FilaTramo[]>([filaVacia()]);
  const [gratis, setGratis] = useState('');
  const [radio, setRadio] = useState('');
  const [direccion, setDireccion] = useState('');
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [prueba, setPrueba] = useState('');
  const [pruebaSub, setPruebaSub] = useState('');
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState<CotizacionEnvio | null>(null);

  const aplicar = (v: VistaEnvio) => {
    setVista(v);
    setModo(v.config.modo_envio);
    setGratis(v.config.envio_gratis_desde != null ? String(v.config.envio_gratis_desde) : '');
    setRadio(v.config.radio_maximo != null ? String(v.config.radio_maximo) : '');
    setDireccion(v.config.direccion_origen ?? '');
    setFilas(v.tramos.length > 0
      ? v.tramos.map((t) => ({ km: String(t.km_hasta), costo: String(t.costo), minimo: t.pedido_minimo != null ? String(t.pedido_minimo) : '' }))
      : [filaVacia()]);
  };

  useEffect(() => {
    deliveryZonesService.get().then(aplicar).catch(() => setLoadError(true));
  }, []);

  const origenOk = vista?.config.origen_lat != null && vista?.config.origen_lng != null;
  const oLat = vista?.config.origen_lat ?? 0;
  const oLng = vista?.config.origen_lng ?? 0;
  const mapaUrl = origenOk
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${oLng - 0.006},${oLat - 0.004},${oLng + 0.006},${oLat + 0.004}&layer=mapnik&marker=${oLat},${oLng}`
    : '';

  const verificar = async () => {
    if (direccion.trim().length < 5) { toast.error('Escribe la dirección completa del local'); return; }
    const body: { direccion: string; lat?: number; lng?: number } = { direccion: direccion.trim() };
    if (manual) {
      const la = Number(lat.replace(',', '.')), ln = Number(lng.replace(',', '.'));
      if (!Number.isFinite(la) || !Number.isFinite(ln) || lat.trim() === '' || lng.trim() === '') { toast.error('Ingresa latitud y longitud'); return; }
      body.lat = la; body.lng = ln;
    }
    setVerifying(true);
    try {
      aplicar(await deliveryZonesService.setOrigin(body));
      toast.success('Dirección del local verificada');
    } catch (e: any) {
      toast.error(errMsg(e, 'No se pudo verificar la dirección'));
      if (e?.response?.data?.code === 'DELIVERY_ORIGIN_NOT_FOUND') setManual(true);
    } finally {
      setVerifying(false);
    }
  };

  const guardar = async () => {
    const tramos = filas
      .filter((f) => f.km.trim() !== '' || f.costo.trim() !== '')
      .map((f) => ({ km_hasta: Number(f.km), costo: Number(f.costo), pedido_minimo: f.minimo.trim() === '' ? null : Number(f.minimo), activo: true }));
    if (tramos.some((t) => !Number.isFinite(t.km_hasta) || t.km_hasta <= 0 || !Number.isInteger(t.costo) || t.costo < 0)) {
      toast.error('Cada tramo necesita km mayor que 0 y un costo'); return;
    }
    for (let i = 1; i < tramos.length; i++) {
      if (!(tramos[i].km_hasta > tramos[i - 1].km_hasta)) { toast.error('Los km de cada tramo deben ser mayores que los del anterior'); return; }
    }
    if (modo === 'TRAMOS' && tramos.length === 0) { toast.error('Agrega al menos un tramo'); return; }
    if (modo === 'TRAMOS' && !origenOk) { toast.error('Primero verifica la dirección del local'); return; }
    setSaving(true);
    try {
      aplicar(await deliveryZonesService.save({
        modo_envio: modo,
        envio_gratis_desde: gratis.trim() === '' ? null : Number(gratis),
        radio_maximo: radio.trim() === '' ? null : Number(radio),
        tramos,
      }));
      toast.success('Configuración de envío guardada');
    } catch (e: any) {
      toast.error(errMsg(e, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const probar = async () => {
    if (prueba.trim().length < 3) { toast.error('Escribe una dirección'); return; }
    setProbando(true);
    setResultado(null);
    try {
      setResultado(await deliveryZonesService.probar(prueba.trim(), pruebaSub.trim() === '' ? null : Number(pruebaSub)));
    } catch (e: any) {
      toast.error(errMsg(e, 'No se pudo calcular'));
    } finally {
      setProbando(false);
    }
  };

  const setFila = (i: number, k: keyof FilaTramo, v: string) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, [k]: v } : f)));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#F97316] rounded-lg flex items-center justify-center">
          <Truck className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery</h1>
          <p className="text-gray-500 text-sm mt-0.5">Costo de envío fijo o por distancia desde tu local</p>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">No se pudo leer la configuración de envío.</div>
      )}

      {/* Modo */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Cómo cobras el envío</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([['FIJO', 'Fijo', 'El cajero define el costo, como hasta ahora'], ['TRAMOS', 'Por tramos', 'Según los km desde tu local']] as const).map(([v, t, d]) => (
            <button
              key={v}
              type="button"
              onClick={() => setModo(v)}
              data-testid={`envio-modo-${v}`}
              className={`min-h-[44px] text-left rounded-xl border-2 px-4 py-3 transition-colors ${modo === v ? 'border-[#F97316] bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="text-sm font-semibold text-gray-900">{t}</p>
              <p className="text-xs text-gray-500 mt-0.5">{d}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Direccion del local */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Dirección del local</h2>
          {origenOk && <span className="text-sm font-semibold text-gray-900"><CheckCircle className="w-4 h-4 inline mr-1 text-[#F97316]" />Verificada</span>}
        </div>
        {vista && !vista.google && (
          <p className="text-sm text-amber-700 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />Google Maps no está disponible: ingresa latitud y longitud a mano y las distancias serán estimadas.</p>
        )}
        <input
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Calle, número y comuna"
          data-testid="envio-direccion-local"
          className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {(manual || (vista && !vista.google)) && (
          <div className="grid grid-cols-2 gap-3">
            <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitud (ej. -33.4372)" inputMode="decimal"
              className="min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitud (ej. -70.6506)" inputMode="decimal"
              className="min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => { if (vista && !vista.google) setManual(true); verificar(); }}
            disabled={verifying}
            className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verificando...' : 'Verificar dirección'}
          </button>
          {!manual && vista?.google && (
            <button type="button" onClick={() => setManual(true)} className="min-h-[44px] px-3 text-sm text-gray-600 underline">Ingresar coordenadas</button>
          )}
        </div>
        {origenOk && (
          <div className="space-y-2">
            <iframe title="Ubicación del local" src={mapaUrl} className="w-full h-56 rounded-lg border border-gray-200" loading="lazy" />
            <a href={`https://www.google.com/maps?q=${oLat},${oLng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#F97316] font-medium min-h-[44px]">
              <MapPin className="w-4 h-4" />Ver en Google Maps
            </a>
          </div>
        )}
      </div>

      {/* Tramos */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Tramos</h2>
        <p className="text-sm text-gray-500">Cada tramo cubre hasta los km indicados. Más allá del último tramo no se ofrece delivery.</p>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-2 text-xs font-medium text-gray-500">
            <span>Hasta (km)</span><span>Costo</span><span>Pedido mínimo</span><span />
          </div>
          {filas.map((f, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_44px] gap-2">
              <input value={f.km} onChange={(e) => setFila(i, 'km', soloDecimal(e.target.value))} inputMode="decimal" placeholder="2" data-testid={`envio-tramo-km-${i}`}
                className="min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <input value={f.costo} onChange={(e) => setFila(i, 'costo', soloEntero(e.target.value))} inputMode="numeric" placeholder="1500" data-testid={`envio-tramo-costo-${i}`}
                className="min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <input value={f.minimo} onChange={(e) => setFila(i, 'minimo', soloEntero(e.target.value))} inputMode="numeric" placeholder="Opcional" data-testid={`envio-tramo-minimo-${i}`}
                className="min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <button type="button" onClick={() => setFilas((fs) => (fs.length > 1 ? fs.filter((_, j) => j !== i) : [filaVacia()]))}
                aria-label="Quitar tramo" className="min-h-[44px] w-11 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setFilas((fs) => [...fs, filaVacia()])} disabled={filas.length >= 20}
          className="min-h-[44px] px-4 rounded-lg text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />Agregar tramo
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="text-sm text-gray-700 space-y-1">
            <span className="block font-medium">Envío gratis desde (opcional)</span>
            <input value={gratis} onChange={(e) => setGratis(soloEntero(e.target.value))} inputMode="numeric" placeholder="Ej. 25000" data-testid="envio-gratis-desde"
              className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </label>
          <label className="text-sm text-gray-700 space-y-1">
            <span className="block font-medium">Radio máximo en km (opcional)</span>
            <input value={radio} onChange={(e) => setRadio(soloDecimal(e.target.value))} inputMode="decimal" placeholder="Ej. 8"
              className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </label>
        </div>
        <button type="button" onClick={guardar} disabled={saving || !vista} data-testid="envio-guardar"
          className="w-full min-h-[44px] rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>

      {/* Probar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Probar con una dirección</h2>
        <p className="text-sm text-gray-500">Usa los tramos guardados. No crea pedidos.</p>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
          <input value={prueba} onChange={(e) => setPrueba(e.target.value)} placeholder="Dirección del cliente" data-testid="envio-probar-direccion"
            className="min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input value={pruebaSub} onChange={(e) => setPruebaSub(soloEntero(e.target.value))} inputMode="numeric" placeholder="Subtotal (opcional)"
            className="min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <button type="button" onClick={probar} disabled={probando} data-testid="envio-probar"
          className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-50">
          {probando ? 'Calculando...' : 'Probar'}
        </button>
        {resultado && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm space-y-1" data-testid="envio-probar-resultado">
            {resultado.sin_cotizacion ? (
              <p className="text-gray-700">No pudimos ubicar esa dirección. El local tendría que confirmar el costo.</p>
            ) : resultado.fuera_de_zona ? (
              <p className="text-gray-900 font-semibold">Fuera de zona · {fmtKm(resultado.km)}</p>
            ) : (
              <>
                <p className="text-gray-900">
                  Tramo {resultado.tramo} · {fmtKm(resultado.km)} · <span className="font-bold">{resultado.envio_gratis ? 'Envío gratis' : fmtCLP(resultado.costo ?? 0)}</span>
                </p>
                {resultado.bajo_minimo && resultado.pedido_minimo != null && (
                  <p className="text-amber-700">Bajo el pedido mínimo de <span className="font-bold">{fmtCLP(resultado.pedido_minimo)}</span></p>
                )}
              </>
            )}
            {resultado.estimado && !resultado.sin_cotizacion && <p className="text-xs text-gray-500">Distancia estimada en línea recta x 1,3 (Google no entregó la ruta).</p>}
            {resultado.direccion_formateada && <p className="text-xs text-gray-500">{resultado.direccion_formateada}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
