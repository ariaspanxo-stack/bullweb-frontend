import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface FolioConfig {
  tipo: number;
  folioInicio: number;
  folioFin: number;
  folioActual: number;
  cafXml?: string;
}

interface DteConfig {
  configured?: boolean;
  active?: boolean;
  dteEngine?: 'NATIVE' | 'LIBREDTE';
  certificadoNombre?: string;
  certificadoUploadedAt?: string | null;
  certificadoExpiraAt?: string | null;
  hasCertificado?: boolean;
  contribuyenteRut?: string | null;
  contribuyenteRazonSocial?: string | null;
  contribuyenteGiro?: string | null;
  contribuyenteDireccion?: string | null;
  contribuyenteComuna?: string | null;
  contribuyenteCiudad?: string | null;
  ambiente?: 'certificacion' | 'produccion';
  folios?: FolioConfig[];
  resolutionNumber?: number | null;
  resolutionDate?: string | null;
}

// ─── Sección CAF (Folios Autorizados) ────────────────────────────
function CafSection({ config, onSaved }: { config: DteConfig | null; onSaved: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [folioInicio, setFolioInicio] = useState('1');
  const [folioFin, setFolioFin] = useState('');
  // HOTFIX #100: errores server-side del CAF visibles junto a la sección.
  const [serverError, setServerError] = useState<string | null>(null);
  const [validatedInfo, setValidatedInfo] = useState<string | null>(null);

  const boletaFolio = config?.folios?.find((f) => f.tipo === 39);

  const remaining = boletaFolio
    ? boletaFolio.folioFin - (boletaFolio.folioActual ?? (boletaFolio.folioInicio - 1))
    : null;

  const handleCafUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xml')) {
      toast.error('Solo se aceptan archivos .xml');
      return;
    }

    setUploading(true);
    setServerError(null);
    setValidatedInfo(null);
    try {
      // Leer XML como texto
      const xmlText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      // Intentar parsear rango del XML: <RNG><D>1</D><H>1000</H></RNG>
      const rngMatch = xmlText.match(/<RNG>\s*<D>(\d+)<\/D>\s*<H>(\d+)<\/H>\s*<\/RNG>/);
      if (rngMatch) {
        setFolioInicio(rngMatch[1]);
        setFolioFin(rngMatch[2]);
      }

      const inicio = rngMatch ? Number(rngMatch[1]) : Number(folioInicio) || 1;
      const fin = rngMatch ? Number(rngMatch[2]) : Number(folioFin);

      if (!fin || fin < inicio) {
        toast.error('Indica el rango de folios (inicio y fin)');
        setUploading(false);
        return;
      }

      // Construir array de folios: reemplazar tipo 39 o agregar
      const existingFolios = config?.folios ?? [];
      const newFolio: FolioConfig = {
        tipo: 39,
        folioInicio: inicio,
        folioFin: fin,
        folioActual: 0,
        cafXml: xmlText,
      };
      const updatedFolios = existingFolios.filter((f) => f.tipo !== 39);
      updatedFolios.push(newFolio);

      const { data } = await api.post('/dte/engine/config', { folios: updatedFolios });
      // HOTFIX #100: el backend valida el CAF server-side (RNG, rango, tipo,
      // RUT RE) — mostramos la confirmación de folios validados.
      const validation = (data as any)?.data?.validation ?? (data as any)?.validation;
      if (validation?.foliosValidados) {
        setValidatedInfo(`Folios tipo 39: ${inicio}–${fin} cargados y validados`);
      } else {
        toast.success(`CAF cargado: folios ${inicio} → ${fin}`);
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al subir CAF';
      toast.error(msg);
      setServerError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <fieldset className="mt-5 border border-gray-200 rounded-xl p-4 space-y-4">
      <legend className="text-sm font-semibold text-gray-700 px-2">📄 Folios Autorizados (CAF)</legend>

      {/* HOTFIX #100: confirmación de validación server-side */}
      {validatedInfo && (
        <p className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          ✓ {validatedInfo}
        </p>
      )}

      {/* HOTFIX #100: rechazo server-side visible junto al upload */}
      {serverError && (
        <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ✕ {serverError}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Archivo CAF (Boleta Electrónica — Tipo 39)
        </label>
        <input
          type="file"
          accept=".xml"
          onChange={handleCafUpload}
          disabled={uploading}
          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
        />
        <p className="mt-1 text-xs text-gray-400">
          {'Archivo XML entregado por el SII. El rango se extrae automáticamente del tag <RNG>.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Folio inicio (fallback manual)</label>
          <input
            type="number"
            min={1}
            value={folioInicio}
            onChange={e => setFolioInicio(e.target.value)}
            placeholder="1"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Folio fin (fallback manual)</label>
          <input
            type="number"
            min={1}
            value={folioFin}
            onChange={e => setFolioFin(e.target.value)}
            placeholder="1000"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {!boletaFolio?.cafXml && (
        <p className="text-xs text-amber-600 font-medium">
          ⚠️ No hay CAF cargado. El motor nativo no puede firmar el TED sin él.
        </p>
      )}

      {boletaFolio && (
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm space-y-1">
          <p className="text-gray-700">
            <span className="font-medium">Rango autorizado:</span>{' '}
            {boletaFolio.folioInicio} → {boletaFolio.folioFin}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Último folio usado:</span>{' '}
            {boletaFolio.folioActual ?? 0}
          </p>
          <p className={`font-semibold ${remaining !== null && remaining < 50 ? 'text-red-600' : 'text-emerald-600'}`}>
            Folios restantes: {remaining ?? '—'}
          </p>
        </div>
      )}
    </fieldset>
  );
}

export default function DteConfigPage() {
  const [config, setConfig] = useState<DteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  // HOTFIX #100: feedback post-guardado (respuesta enriquecida del backend)
  // y errores 400 mostrados inline junto a la sección correspondiente.
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [cafError, setCafError] = useState<string | null>(null);
  const [form, setForm] = useState({
    certificadoPfx: '',
    certificadoPassword: '',
    certificadoNombre: '',
    contribuyenteRut: '',
    contribuyenteRazonSocial: '',
    contribuyenteGiro: '',
    contribuyenteDireccion: '',
    contribuyenteComuna: '',
    contribuyenteCiudad: '',
    ambiente: 'certificacion' as 'certificacion' | 'produccion',
    resolucionNumero: '',
    resolucionFecha: '',
  });

  const loadConfig = useCallback(() => {
    api.get('/dte/engine/config')
      .then(({ data }) => {
        const cfg = (data as any)?.data ?? data;
        setConfig(cfg);
        if (cfg) {
          setForm(f => ({
            ...f,
            certificadoNombre: cfg.certificadoNombre ?? '',
            contribuyenteRut: cfg.contribuyenteRut ?? '',
            contribuyenteRazonSocial: cfg.contribuyenteRazonSocial ?? '',
            contribuyenteGiro: cfg.contribuyenteGiro ?? '',
            contribuyenteDireccion: cfg.contribuyenteDireccion ?? '',
            contribuyenteComuna: cfg.contribuyenteComuna ?? '',
            contribuyenteCiudad: cfg.contribuyenteCiudad ?? '',
            ambiente: cfg.ambiente ?? 'certificacion',
            resolucionNumero: cfg.resolutionNumber != null ? String(cfg.resolutionNumber) : '',
            resolucionFecha: cfg.resolutionDate ? cfg.resolutionDate.slice(0, 10) : '',
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleToggleActive = async (newActive: boolean) => {
    setTogglingActive(true);
    try {
      await api.patch('/dte/engine/active', { active: newActive });
      setConfig(c => c ? { ...c, active: newActive } : c);
      toast.success(newActive ? 'Módulo DTE activado' : 'Módulo DTE desactivado');
    } catch {
      toast.error('Error al cambiar estado del módulo');
    } finally {
      setTogglingActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      toast.error('Solo se aceptan archivos .pfx o .p12');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setForm(f => ({ ...f, certificadoPfx: base64, certificadoNombre: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveFeedback(null);
    setCertError(null);
    setCafError(null);
    try {
      // Enviar siempre TODOS los campos del contribuyente (sin || undefined)
      // y forzar el motor nativo
      const payload: Record<string, any> = {
        dteEngine: 'NATIVE' as const,
        ambiente: form.ambiente,
        contribuyenteRut: form.contribuyenteRut,
        contribuyenteRazonSocial: form.contribuyenteRazonSocial,
        contribuyenteGiro: form.contribuyenteGiro,
        contribuyenteDireccion: form.contribuyenteDireccion,
        contribuyenteComuna: form.contribuyenteComuna,
        contribuyenteCiudad: form.contribuyenteCiudad,
      };
      if (form.certificadoPfx) payload.certificadoPfx = form.certificadoPfx;
      if (form.certificadoPassword) payload.certificadoPassword = form.certificadoPassword;
      if (form.certificadoNombre) payload.certificadoNombre = form.certificadoNombre;

      // HOTFIX #100: resolución SII para RCOF (en certificación el backend
      // aplica defaults 0 / 2019-10-18 automáticamente si van vacíos).
      if (form.resolucionNumero.trim()) payload.resolucionNumero = Number(form.resolucionNumero);
      if (form.resolucionFecha.trim()) payload.resolucionFecha = form.resolucionFecha;

      const { data } = await api.post('/dte/engine/config', payload);
      const validation = (data as any)?.data?.validation ?? (data as any)?.validation;

      // HOTFIX #100: feedback inmediato con la validación real del backend.
      if (validation?.certValido) {
        const vence = validation.certExpira
          ? ` — vence ${new Date(validation.certExpira).toLocaleDateString('es-CL')}`
          : '';
        setSaveFeedback(`✓ Certificado válido${vence}`);
      }
      toast.success('Configuración DTE guardada ✓');
      setForm(f => ({ ...f, certificadoPfx: '', certificadoPassword: '' }));
      loadConfig();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Error al guardar';
      toast.error(msg);
      // Errores 400 del backend mostrados junto a la sección correspondiente:
      // certificado (contraseña/expiración/RUT) vs folios (CAF/RNG/RE).
      const isCert = /contraseña del certificado|certificado/i.test(msg);
      const isCaf  = /CAF|RNG|folio/i.test(msg);
      if (isCert) setCertError(msg);
      else if (isCaf) setCafError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center text-xl">
            🧾
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración DTE</h1>
            <p className="text-sm text-gray-500">Facturación electrónica vía motor nativo SII</p>
          </div>
          {config?.active && (
            <span className="ml-auto text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              ● Activo
            </span>
          )}
        </div>
      </div>

      {/* Estado actual */}
      {config && (
        <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm space-y-1">
          {config.hasCertificado && (
            <p className="text-gray-600">
              <span className="font-medium text-gray-800">Certificado:</span>{' '}
              {config.certificadoNombre ?? 'Cargado'}
              {config.certificadoExpiraAt && (
                <span className="text-xs text-gray-400 ml-2">
                  (expira {new Date(config.certificadoExpiraAt).toLocaleDateString('es-CL')})
                </span>
              )}
            </p>
          )}
          {config.contribuyenteRut && (
            <p className="text-gray-600">
              <span className="font-medium text-gray-800">RUT:</span> {config.contribuyenteRut}
            </p>
          )}
          {config.contribuyenteRazonSocial && (
            <p className="text-gray-600">
              <span className="font-medium text-gray-800">Razón Social:</span> {config.contribuyenteRazonSocial}
            </p>
          )}
          <p className="text-gray-600">
            <span className="font-medium text-gray-800">Ambiente:</span>{' '}
            {config.ambiente === 'produccion' ? '🟢 Producción' : '🟡 Certificación'}
          </p>
          <p className="text-gray-600">
            <span className="font-medium text-gray-800">Motor:</span>{' '}
            {config.dteEngine === 'NATIVE' ? '⚙️ Nativo (SII directo)' : (config.dteEngine ?? 'NATIVE')}
          </p>

          {/* Toggle módulo DTE */}
          {config.configured && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
              <div>
                <p className="font-medium text-gray-800 text-sm">Módulo DTE activo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {config.active
                    ? 'El módulo está habilitado — se emiten documentos al cobrar'
                    : 'Activa el módulo para emitir documentos electrónicos'}
                </p>
              </div>
              <button
                onClick={() => handleToggleActive(!config.active)}
                disabled={togglingActive}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 disabled:opacity-60
                            ${config.active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                                  ${config.active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Certificado */}
        <fieldset className="border border-gray-200 rounded-xl p-4 space-y-4">
          <legend className="text-sm font-semibold text-gray-700 px-2">🔐 Certificado Digital</legend>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Archivo .pfx / .p12
            </label>
            <input
              type="file"
              accept=".pfx,.p12"
              onChange={handleFileUpload}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {config?.hasCertificado && !form.certificadoPfx && (
              <p className="mt-1 text-xs text-gray-400">Ya hay un certificado cargado. Sube uno nuevo solo para reemplazarlo.</p>
            )}
            {/* HOTFIX #100: rechazo del backend visible junto al certificado */}
            {certError && (
              <p className="mt-2 text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ✕ {certError}
              </p>
            )}
            {/* HOTFIX #100: confirmación de validación real post-guardado */}
            {saveFeedback && !certError && (
              <p className="mt-2 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {saveFeedback}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña del certificado
            </label>
            <input
              type="password"
              placeholder={config?.hasCertificado ? '•••••• (dejar vacío para no cambiar)' : 'Contraseña del .pfx'}
              value={form.certificadoPassword}
              onChange={e => setForm(f => ({ ...f, certificadoPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </fieldset>

        {/* Datos Contribuyente */}
        <fieldset className="border border-gray-200 rounded-xl p-4 space-y-4">
          <legend className="text-sm font-semibold text-gray-700 px-2">🏢 Datos del Contribuyente</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUT <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="76XXXXXXXX-X"
                value={form.contribuyenteRut}
                onChange={e => setForm(f => ({ ...f, contribuyenteRut: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Mi Empresa SpA"
                value={form.contribuyenteRazonSocial}
                onChange={e => setForm(f => ({ ...f, contribuyenteRazonSocial: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giro / Actividad</label>
            <input
              type="text"
              placeholder="Restaurante"
              value={form.contribuyenteGiro}
              onChange={e => setForm(f => ({ ...f, contribuyenteGiro: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              placeholder="Av. Ejemplo 123"
              value={form.contribuyenteDireccion}
              onChange={e => setForm(f => ({ ...f, contribuyenteDireccion: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comuna</label>
              <input
                type="text"
                placeholder="Santiago"
                value={form.contribuyenteComuna}
                onChange={e => setForm(f => ({ ...f, contribuyenteComuna: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                placeholder="Santiago"
                value={form.contribuyenteCiudad}
                onChange={e => setForm(f => ({ ...f, contribuyenteCiudad: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* HOTFIX #100: Resolución SII (requerida por RCOF) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolución SII — Nro.</label>
              <input
                type="number"
                placeholder="0"
                value={form.resolucionNumero}
                onChange={e => setForm(f => ({ ...f, resolucionNumero: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolución SII — Fecha</label>
              <input
                type="date"
                value={form.resolucionFecha}
                onChange={e => setForm(f => ({ ...f, resolucionFecha: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Los encuentra en su resolución del SII. En ambiente de Certificación se usan valores por
            defecto automáticamente — puede dejarlos vacíos.
          </p>
        </fieldset>

        {/* Ambiente */}
        <fieldset className="border border-gray-200 rounded-xl p-4">
          <legend className="text-sm font-semibold text-gray-700 px-2">🌐 Ambiente SII</legend>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, ambiente: 'certificacion' }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                form.ambiente === 'certificacion'
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              🟡 Certificación
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, ambiente: 'produccion' }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                form.ambiente === 'produccion'
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              🟢 Producción
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Usa Certificación para pruebas. Cambia a Producción cuando tu certificado sea real.
          </p>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? 'Guardando...' : '💾 Guardar configuración'}
        </button>
      </form>

      {/* Folios Autorizados (CAF) */}
      <CafSection config={config} onSaved={loadConfig} />

      {/* Info */}
      <div className="mt-8 p-4 rounded-xl border border-blue-100 bg-blue-50 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">¿Qué necesitas para facturar electrónicamente?</p>
        <p>1. Un <strong>certificado digital .pfx</strong> emitido por una entidad autorizada (e.g., E-Cert, Acepta)</p>
        <p>2. Los <strong>datos de tu empresa</strong> (RUT, razón social, giro, dirección)</p>
        <p>3. Comenzar en modo <strong>Certificación</strong> para pruebas, luego cambiar a <strong>Producción</strong></p>
      </div>
    </div>
  );
}