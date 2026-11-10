// LOTE 324: Configuracion -> Canales. Pantalla de pedidos (/tv/<token>): switch, enlace para abrir en la TV y regenerar.
import { useEffect, useState } from 'react';
import { Tv, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { localChannelsService, tvUrl, type ChannelsSettings } from '@/services/localChannelsService';
import { askConfirm } from '@/components/ui/askConfirm';

export default function ChannelsSettingsPage() {
  const [cfg, setCfg] = useState<ChannelsSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    localChannelsService.getChannels().then(setCfg).catch(() => toast.error('No se pudo leer la configuración de canales'));
  }, []);

  const run = async (fn: () => Promise<ChannelsSettings>, ok: string) => {
    setBusy(true);
    try {
      setCfg(await fn());
      toast.success(ok);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    if (!cfg) return;
    const next = !cfg.tvEnabled;
    run(() => localChannelsService.setTv(next), next ? 'Pantalla de pedidos encendida' : 'Pantalla de pedidos apagada');
  };

  const regenerate = async () => {
    const ok = await askConfirm({
      title: 'Regenerar enlace',
      message: 'La pantalla que use el enlace actual dejará de funcionar. Tendrás que abrir el enlace nuevo en la TV.',
      confirmLabel: 'Regenerar', cancelLabel: 'Volver', variant: 'warning',
    });
    if (ok) run(() => localChannelsService.regenerateTv(), 'Enlace regenerado');
  };

  const link = cfg?.tvToken ? tvUrl(cfg.tvToken) : null;
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast.success('Enlace copiado'); }
    catch { toast.error('No se pudo copiar: selecciona el enlace y cópialo'); }
  };

  const on = cfg?.tvEnabled === true;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#F97316] rounded-lg flex items-center justify-center">
          <Tv className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Canales</h1>
          <p className="text-gray-500 text-sm mt-0.5">Pantallas y canales de atención</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pantalla de pedidos</h2>
            <p className="text-sm text-gray-500">Muestra en una TV los pedidos para retirar en “Preparando” y “Listo”, con número y primer nombre. Nunca muestra mesas, apellidos ni teléfonos.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Pantalla de pedidos"
            onClick={toggle}
            disabled={busy || !cfg || !cfg.available}
            data-testid="channels-tv-switch"
            className={`relative inline-flex h-11 w-16 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${on ? 'bg-[#F97316]' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>

        {cfg && !cfg.available && <p className="text-sm text-gray-500">La pantalla de pedidos aún no está disponible.</p>}

        {on && link && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Enlace para abrir en la TV</p>
              <p className="mt-1 text-sm font-mono break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900" data-testid="channels-tv-link">{link}</p>
              <p className="text-xs text-gray-500 mt-1">No requiere iniciar sesión. Quien tenga el enlace puede ver la pantalla: si se comparte por error, regenéralo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copy} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copiar enlace
              </button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="min-h-[44px] px-4 rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Abrir
              </a>
              <button type="button" onClick={regenerate} disabled={busy} data-testid="channels-tv-regenerate" className="min-h-[44px] px-4 rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
                <RefreshCw className="w-4 h-4" /> Regenerar enlace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
