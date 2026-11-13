/**
 * LOTE 334-B: consulta publica de boleta electronica (sin login), exigida por el SII en la representacion impresa.
 * app.bullwebchile.com/boleta/<folio> — se pide el RUT del emisor y el monto total, ambos impresos en la boleta.
 * Acepta ?rut=&monto= para llegar con los datos ya puestos.
 */
import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';

interface BoletaPublica {
  tipo: string;
  folio: number;
  fecha: string | null;
  emisor: { rut?: string; razonSocial?: string; giro?: string; direccion?: string; comuna?: string };
  detalle: { nombre: string; cantidad: number; monto: number }[];
  neto: number; iva: number; descuento: number; total: number;
  anulada: boolean;
  estadoSii: string;
  ambiente: 'produccion' | 'certificacion';
}

const clp = (n: number) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
const ESTADOS: Record<string, string> = {
  EPR: 'Aceptada por el SII', RPR: 'Aceptada con reparos', RLV: 'Aceptada por el SII', DOK: 'Aceptada por el SII',
  RCH: 'Rechazada por el SII', RPT: 'Rechazada por el SII', RFR: 'Rechazada por el SII', RCT: 'Rechazada por el SII',
  PENDIENTE: 'En revision por el SII',
};

export default function BoletaPublicaPage() {
  const { folio = '' } = useParams<{ folio: string }>();
  const [sp] = useSearchParams();
  const [rut, setRut] = useState(sp.get('rut') ?? '');
  const [monto, setMonto] = useState(sp.get('monto') ?? '');
  const [data, setData] = useState<BoletaPublica | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const consultar = async () => {
    setError(null); setData(null);
    if (!rut.trim() || !monto.trim()) { setError('Ingresa el RUT del emisor y el monto total de la boleta.'); return; }
    setLoading(true);
    try {
      const res: any = await api.get(`/public/boleta/${encodeURIComponent(folio)}`, { params: { rut: rut.trim(), monto: monto.trim() } });
      setData((res?.data?.data ?? res?.data) as BoletaPublica);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No encontramos una boleta con esos datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (sp.get('rut') && sp.get('monto')) consultar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 text-center">Consulta de boleta electronica</h1>
        <p className="text-sm text-gray-500 text-center mt-1">Folio N° {folio}</p>

        <form onSubmit={(e) => { e.preventDefault(); consultar(); }} className="mt-6 bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div>
            <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-1">RUT del emisor</label>
            <input id="rut" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="76.111.111-6" autoComplete="off"
              className="w-full min-h-[44px] px-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">Monto total</label>
            <input id="monto" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="15480" inputMode="numeric" autoComplete="off"
              className="w-full min-h-[44px] px-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-orange-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full min-h-[44px] rounded-lg bg-[#F97316] hover:bg-orange-600 text-white font-semibold disabled:opacity-60">
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </form>

        {data && (
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-5" data-testid="boleta-publica">
            {data.ambiente !== 'produccion' && (
              <p className="mb-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Documento de prueba (ambiente de certificacion del SII), sin valor tributario.</p>
            )}
            {data.anulada && (
              <p className="mb-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Boleta anulada con nota de credito.</p>
            )}
            <p className="font-bold text-gray-900">{data.emisor.razonSocial}</p>
            <p className="text-sm text-gray-600">RUT {data.emisor.rut}</p>
            {data.emisor.giro && <p className="text-sm text-gray-600">{data.emisor.giro}</p>}
            {data.emisor.direccion && <p className="text-sm text-gray-600">{[data.emisor.direccion, data.emisor.comuna].filter(Boolean).join(', ')}</p>}
            <div className="mt-3 text-sm text-gray-700">
              <p><span className="font-semibold">{data.tipo}</span> N° {data.folio}</p>
              {data.fecha && <p>Fecha de emision: {data.fecha}</p>}
              <p>Estado: {ESTADOS[data.estadoSii] ?? data.estadoSii}</p>
            </div>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {data.detalle.map((d, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1.5 pr-2 text-gray-700">{d.cantidad} x {d.nombre}</td>
                    <td className="py-1.5 text-right font-bold text-gray-900">{clp(d.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 border-t border-gray-200 pt-3 space-y-1 text-sm">
              {data.descuento > 0 && <div className="flex justify-between"><span>Descuento</span><span className="font-bold">-{clp(data.descuento)}</span></div>}
              <div className="flex justify-between"><span>Neto</span><span className="font-bold">{clp(data.neto)}</span></div>
              <div className="flex justify-between"><span>IVA 19%</span><span className="font-bold">{clp(data.iva)}</span></div>
              <div className="flex justify-between text-base"><span className="font-semibold">Total</span><span className="font-bold">{clp(data.total)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
