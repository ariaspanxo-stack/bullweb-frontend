/**
 * Config › Facturacion — boleta electronica SII por local.
 * LOTE 334-B (reemplaza la pantalla del HOTFIX #100):
 *  - Datos del emisor completos (Acteco, sucursal SII, oficina regional para el recuadro impreso).
 *  - Certificado .pfx del representante legal o persona autorizada: su RUT puede ser distinto del de la empresa.
 *  - CAF de boletas (39) y de notas de credito (61), con folios restantes; el XML del CAF nunca vuelve al navegador.
 *  - Resolucion SII: en certificacion numero 0 y la fecha que entrega el SII; en produccion la real.
 *  - Preferencia de la caja: emitir siempre, preguntar o nunca.
 *  - Activar solo cuando no falta nada (el servidor lo valida).
 */
import { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

type Modo = 'siempre' | 'preguntar' | 'nunca';
interface FolioInfo { tipo: number; folioInicio: number; folioFin: number; folioActual: number; restantes: number; fechaAutorizacion: string | null }
interface Cfg {
  configured: boolean; active?: boolean; ambiente?: 'certificacion' | 'produccion';
  hasCertificado?: boolean; certificadoNombre?: string | null; certificadoExpiraAt?: string | null; certificadoRut?: string | null;
  contribuyenteRut?: string | null; contribuyenteRazonSocial?: string | null; contribuyenteGiro?: string | null;
  contribuyenteDireccion?: string | null; contribuyenteComuna?: string | null; contribuyenteCiudad?: string | null;
  contribuyenteActeco?: number | null; contribuyenteSucursal?: number | null; oficinaSii?: string | null;
  boletaPorDefecto?: Modo; resolutionNumber?: number | null; resolutionDate?: string | null;
  folios?: FolioInfo[]; faltantes?: string[]; lastEmissionAt?: string | null;
}

const input = 'w-full min-h-[44px] px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:border-orange-500';
const label = 'block text-sm font-medium text-gray-700 mb-1';
const card = 'bg-white border border-gray-200 rounded-2xl p-5';
const btnPrimary = 'min-h-[44px] px-5 rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-60';
const btnSecondary = 'min-h-[44px] px-5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold disabled:opacity-60';

const unwrap = (r: any) => r?.data?.data ?? r?.data;
const errMsg = (e: any, d: string) => e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? d;

function leerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
    fr.readAsDataURL(file);
  });
}
function leerTexto(file: File): Promise<string> {
  // El SII entrega el CAF en ISO-8859-1
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
    fr.readAsText(file, 'ISO-8859-1');
  });
}

export default function DteConfigPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    contribuyenteRut: '', contribuyenteRazonSocial: '', contribuyenteGiro: '', contribuyenteDireccion: '',
    contribuyenteComuna: '', contribuyenteCiudad: '', contribuyenteActeco: '', contribuyenteSucursal: '', oficinaSii: '',
    ambiente: 'certificacion' as 'certificacion' | 'produccion', resolucionNumero: '', resolucionFecha: '',
    boletaPorDefecto: 'preguntar' as Modo, certificadoRut: '',
  });
  const [pfx, setPfx] = useState<File | null>(null);
  const [pfxPass, setPfxPass] = useState('');
  const [caf, setCaf] = useState<Record<number, File | null>>({ 39: null, 61: null });

  const cargar = async () => {
    setLoading(true);
    try {
      const c = unwrap(await api.get('/dte/engine/config')) as Cfg;
      setCfg(c);
      setF({
        contribuyenteRut: c.contribuyenteRut ?? '', contribuyenteRazonSocial: c.contribuyenteRazonSocial ?? '',
        contribuyenteGiro: c.contribuyenteGiro ?? '', contribuyenteDireccion: c.contribuyenteDireccion ?? '',
        contribuyenteComuna: c.contribuyenteComuna ?? '', contribuyenteCiudad: c.contribuyenteCiudad ?? '',
        contribuyenteActeco: c.contribuyenteActeco != null ? String(c.contribuyenteActeco) : '',
        contribuyenteSucursal: c.contribuyenteSucursal != null ? String(c.contribuyenteSucursal) : '',
        oficinaSii: c.oficinaSii ?? '', ambiente: c.ambiente ?? 'certificacion',
        resolucionNumero: c.resolutionNumber != null && c.ambiente === 'produccion' ? String(c.resolutionNumber) : '',
        resolucionFecha: c.resolutionDate ?? '', boletaPorDefecto: c.boletaPorDefecto ?? 'preguntar',
        certificadoRut: c.certificadoRut ?? '',
      });
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo cargar la configuracion'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    setSaving(true);
    try {
      const payload: any = {
        contribuyenteRut: f.contribuyenteRut, contribuyenteRazonSocial: f.contribuyenteRazonSocial, contribuyenteGiro: f.contribuyenteGiro,
        contribuyenteDireccion: f.contribuyenteDireccion, contribuyenteComuna: f.contribuyenteComuna, contribuyenteCiudad: f.contribuyenteCiudad,
        contribuyenteActeco: f.contribuyenteActeco || null, contribuyenteSucursal: f.contribuyenteSucursal || null, oficinaSii: f.oficinaSii || null,
        ambiente: f.ambiente, resolucionFecha: f.resolucionFecha || null, boletaPorDefecto: f.boletaPorDefecto,
        certificadoRut: f.certificadoRut || null,
      };
      if (f.ambiente === 'produccion') payload.resolucionNumero = f.resolucionNumero || null;
      if (pfx) {
        if (!pfxPass) { toast.error('Ingresa la contrasena del certificado'); setSaving(false); return; }
        payload.certificadoPfx = await leerBase64(pfx);
        payload.certificadoPassword = pfxPass;
        payload.certificadoNombre = pfx.name;
      }
      const folios = [];
      for (const t of [39, 61]) if (caf[t]) folios.push({ tipo: t, cafXml: await leerTexto(caf[t] as File) });
      if (folios.length) payload.folios = folios;

      const out = unwrap(await api.post('/dte/engine/config', payload));
      toast.success(out?.faltantes?.length ? 'Guardado. Aun falta completar datos para activar.' : 'Configuracion guardada');
      setPfx(null); setPfxPass(''); setCaf({ 39: null, 61: null });
      await cargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const activar = async (active: boolean) => {
    setSaving(true);
    try {
      await api.patch('/dte/engine/active', { active });
      toast.success(active ? 'Boleta electronica activada' : 'Boleta electronica desactivada');
      await cargar();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo cambiar el estado'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando configuracion...</div>;

  const faltan = cfg?.faltantes ?? [];
  const folio = (t: number) => cfg?.folios?.find((x) => x.tipo === t);
  const venceEn = cfg?.certificadoExpiraAt ? Math.ceil((new Date(cfg.certificadoExpiraAt).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5" data-testid="facturacion-config">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <p className="text-sm text-gray-500">Boleta electrónica SII de este local</p>
      </div>

      {/* Estado */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <p className="text-lg font-bold text-gray-900" data-testid="facturacion-estado">{cfg?.active ? 'Activa' : 'Inactiva'}
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{(cfg?.ambiente ?? f.ambiente) === 'produccion' ? 'Producción' : 'Certificación (pruebas SII)'}</span>
            </p>
          </div>
          {cfg?.active
            ? <button className={btnSecondary} disabled={saving} onClick={() => activar(false)}>Desactivar</button>
            : <button className={btnPrimary} disabled={saving || faltan.length > 0} onClick={() => activar(true)}>Activar boleta electrónica</button>}
        </div>
        {faltan.length > 0 && (
          <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="facturacion-faltantes">
            <p className="font-semibold mb-1">Falta completar para activar:</p>
            <ul className="list-disc ml-5">{faltan.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Emisor */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 mb-3">Datos del emisor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={label} htmlFor="f-rut">RUT de la empresa</label><input id="f-rut" className={input} value={f.contribuyenteRut} onChange={set('contribuyenteRut')} placeholder="76.111.111-6" /></div>
          <div><label className={label} htmlFor="f-rs">Razón social</label><input id="f-rs" className={input} value={f.contribuyenteRazonSocial} onChange={set('contribuyenteRazonSocial')} /></div>
          <div><label className={label} htmlFor="f-giro">Giro</label><input id="f-giro" className={input} value={f.contribuyenteGiro} onChange={set('contribuyenteGiro')} /></div>
          <div><label className={label} htmlFor="f-acteco">Código de actividad (Acteco)</label><input id="f-acteco" className={input} value={f.contribuyenteActeco} onChange={set('contribuyenteActeco')} inputMode="numeric" placeholder="561000" /></div>
          <div><label className={label} htmlFor="f-dir">Dirección</label><input id="f-dir" className={input} value={f.contribuyenteDireccion} onChange={set('contribuyenteDireccion')} /></div>
          <div><label className={label} htmlFor="f-comuna">Comuna</label><input id="f-comuna" className={input} value={f.contribuyenteComuna} onChange={set('contribuyenteComuna')} /></div>
          <div><label className={label} htmlFor="f-ciudad">Ciudad</label><input id="f-ciudad" className={input} value={f.contribuyenteCiudad} onChange={set('contribuyenteCiudad')} /></div>
          <div><label className={label} htmlFor="f-oficina">Oficina regional del SII</label><input id="f-oficina" className={input} value={f.oficinaSii} onChange={set('oficinaSii')} placeholder="Chillán" /></div>
          <div><label className={label} htmlFor="f-suc">Código de sucursal SII (opcional)</label><input id="f-suc" className={input} value={f.contribuyenteSucursal} onChange={set('contribuyenteSucursal')} inputMode="numeric" /></div>
        </div>
      </div>

      {/* Certificado */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 mb-1">Certificado digital</h2>
        <p className="text-xs text-gray-500 mb-3">Del representante legal o de una persona autorizada ante el SII. Se guarda cifrado.</p>
        {cfg?.hasCertificado && (
          <p className="text-sm text-gray-700 mb-3" data-testid="cert-actual">
            Cargado: {cfg.certificadoNombre ?? 'certificado'} · titular {cfg.certificadoRut ?? 'sin RUT'}
            {venceEn != null && <span className={venceEn <= 30 ? ' font-bold text-red-600' : ''}> · vence en {venceEn} días</span>}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={label} htmlFor="f-pfx">Archivo .pfx / .p12</label><input id="f-pfx" type="file" accept=".pfx,.p12" className="text-sm" onChange={(e) => setPfx(e.target.files?.[0] ?? null)} /></div>
          <div><label className={label} htmlFor="f-pass">Contraseña del certificado</label><input id="f-pass" type="password" className={input} value={pfxPass} onChange={(e) => setPfxPass(e.target.value)} autoComplete="new-password" /></div>
          <div><label className={label} htmlFor="f-titular">RUT del titular</label><input id="f-titular" className={input} value={f.certificadoRut} onChange={set('certificadoRut')} placeholder="Se lee del certificado" /></div>
        </div>
      </div>

      {/* CAF */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 mb-1">Folios (CAF)</h2>
        <p className="text-xs text-gray-500 mb-3">Se descargan en sii.cl › Timbraje electrónico. Sube el archivo XML completo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[39, 61].map((t) => {
            const fi = folio(t);
            const pocos = fi && fi.restantes <= Math.max(1, Math.ceil((fi.folioFin - fi.folioInicio + 1) * 0.1));
            return (
              <div key={t} className="border border-gray-200 rounded-xl p-3" data-testid={`caf-${t}`}>
                <p className="font-medium text-gray-900">{t === 39 ? 'Boleta electrónica (39)' : 'Nota de crédito (61)'}</p>
                {fi ? (
                  <p className="text-sm text-gray-700 mt-1">Folios {fi.folioInicio} a {fi.folioFin} · quedan <span className={`font-bold ${pocos ? 'text-red-600' : ''}`}>{fi.restantes}</span></p>
                ) : <p className="text-sm text-gray-500 mt-1">Sin CAF cargado</p>}
                <input type="file" accept=".xml" className="mt-2 text-sm" aria-label={`CAF tipo ${t}`} onChange={(e) => setCaf((p) => ({ ...p, [t]: e.target.files?.[0] ?? null }))} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Resolucion y ambiente */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 mb-3">Ambiente y resolución SII</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={label} htmlFor="f-amb">Ambiente</label>
            <select id="f-amb" className={input} value={f.ambiente} onChange={set('ambiente')}>
              <option value="certificacion">Certificación (pruebas SII)</option>
              <option value="produccion">Producción</option>
            </select>
          </div>
          <div><label className={label} htmlFor="f-resn">Número de resolución</label>
            <input id="f-resn" className={input} value={f.ambiente === 'certificacion' ? '0' : f.resolucionNumero} onChange={set('resolucionNumero')} disabled={f.ambiente === 'certificacion'} inputMode="numeric" />
          </div>
          <div><label className={label} htmlFor="f-resf">Fecha de resolución</label><input id="f-resf" type="date" className={input} value={f.resolucionFecha} onChange={set('resolucionFecha')} /></div>
        </div>
        {f.ambiente === 'certificacion' && <p className="text-xs text-gray-500 mt-2">En certificación el número es 0 y la fecha es la que entrega el SII al autorizar el ambiente de pruebas.</p>}
      </div>

      {/* Caja */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 mb-3">Al cobrar</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          {([['siempre', 'Emitir boleta siempre'], ['preguntar', 'Preguntar en cada venta'], ['nunca', 'No emitir']] as [Modo, string][]).map(([v, t]) => (
            <label key={v} className={`flex items-center gap-2 min-h-[44px] px-4 rounded-lg border cursor-pointer text-sm ${f.boletaPorDefecto === v ? 'border-orange-500 bg-orange-50 text-gray-900' : 'border-gray-300 text-gray-700'}`}>
              <input type="radio" name="boletaPorDefecto" value={v} checked={f.boletaPorDefecto === v} onChange={() => setF((p) => ({ ...p, boletaPorDefecto: v }))} />{t}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className={btnPrimary} disabled={saving} onClick={guardar} data-testid="facturacion-guardar">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  );
}
