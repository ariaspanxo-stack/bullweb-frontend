// LOTE 324: Configuracion -> Local. Enlace de resenas Google con vista previa del QR (el mismo campo que usa la carta).
// Con enlace: QR "Califícanos en Google" al pie del ticket de venta, boton en el pago aprobado de la carta y linea en el
// WhatsApp de "pedido listo". Sin enlace no cambia nada.
import { useEffect, useState } from 'react';
import { Store, Save, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { localChannelsService, isGoogleReviewUrl, GOOGLE_REVIEW_QR_MAX } from '@/services/localChannelsService';
import { askConfirm } from '@/components/ui/askConfirm';

export default function LocalSettingsPage() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    localChannelsService.getLocal()
      .then((d) => { setUrl(d.googleReviewUrl ?? ''); setSaved(d.googleReviewUrl ?? null); })
      .catch(() => toast.error('No se pudo leer la configuración del local'))
      .finally(() => setLoading(false));
  }, []);

  const trimmed = url.trim();
  const valid = isGoogleReviewUrl(trimmed);
  const showError = trimmed.length > 0 && !valid;
  const tooLongForTicket = valid && trimmed.length > GOOGLE_REVIEW_QR_MAX;
  const dirty = (saved ?? '') !== trimmed;

  const save = async () => {
    if (trimmed && !valid) return;
    setBusy(true);
    try {
      const d = await localChannelsService.saveLocal(trimmed || null);
      setSaved(d.googleReviewUrl ?? null);
      setUrl(d.googleReviewUrl ?? '');
      toast.success(trimmed ? 'Enlace de reseñas guardado' : 'Enlace de reseñas quitado');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    const ok = await askConfirm({
      title: 'Quitar enlace de reseñas',
      message: 'El ticket, la carta y el WhatsApp de pedido listo dejarán de invitar a calificar en Google.',
      confirmLabel: 'Quitar', cancelLabel: 'Volver', variant: 'warning',
    });
    if (!ok) return;
    setUrl('');
    setBusy(true);
    try {
      await localChannelsService.saveLocal(null);
      setSaved(null);
      toast.success('Enlace de reseñas quitado');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#F97316] rounded-lg flex items-center justify-center">
          <Store className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Local</h1>
          <p className="text-gray-500 text-sm mt-0.5">Datos que ven tus clientes</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label htmlFor="google-review-url" className="block text-sm font-semibold text-gray-900">Enlace de reseñas Google</label>
          <p className="text-xs text-gray-500 mt-0.5">
            Pega el enlace de tu ficha en Google Maps (google.com/maps) o el de g.page. Si lo dejas vacío, nada cambia.
          </p>
        </div>
        <input
          id="google-review-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://g.page/r/..."
          value={url}
          disabled={loading || busy}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="local-google-review-url"
          aria-invalid={showError}
          className={`w-full min-h-[44px] px-3 rounded-lg border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${showError ? 'border-red-400' : 'border-gray-300'}`}
        />
        {showError && <p className="text-sm text-red-600">El enlace debe ser de Google Maps (google.com/maps) o g.page y empezar con https://</p>}
        {tooLongForTicket && (
          <p className="text-sm text-amber-700">El enlace es largo: el ticket impreso mostrará solo el texto, sin QR. Usa el enlace corto de g.page para tener QR en el ticket.</p>
        )}

        {valid && (
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 p-4" data-testid="local-google-review-qr">
            <QRCodeSVG value={trimmed} size={120} level="M" includeMargin />
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900">Vista previa</p>
              <p>Así se verá al pie del ticket de venta, con el texto “Califícanos en Google”.</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={loading || busy || !dirty || showError}
            data-testid="local-google-review-save"
            className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
          {saved && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Quitar enlace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
