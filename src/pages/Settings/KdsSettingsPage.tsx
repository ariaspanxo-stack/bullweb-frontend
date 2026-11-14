// TAREA 335: Configuracion -> KDS. Umbrales del semaforo de la pantalla de cocina, por local:
// verde bajo "ambar desde", ambar hasta "rojo pasado", rojo despues (con pulso). El servidor valida (rojo > ambar >= 1, max 240).
import { useEffect, useState } from 'react';
import { ChefHat, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? {};

export default function KdsSettingsPage() {
  const [amber, setAmber] = useState('10');
  const [red, setRed] = useState('20');
  const [saved, setSaved] = useState<{ amberMin: number; redMin: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/kds/settings')
      .then((r) => { const d = unwrap(r); setAmber(String(d.amberMin ?? 10)); setRed(String(d.redMin ?? 20)); setSaved({ amberMin: d.amberMin, redMin: d.redMin }); })
      .catch(() => toast.error('No se pudo leer la configuración del KDS'))
      .finally(() => setLoading(false));
  }, []);

  const a = Number(amber), r = Number(red);
  const valid = Number.isInteger(a) && Number.isInteger(r) && a >= 1 && r > a && r <= 240;
  const dirty = !saved || saved.amberMin !== a || saved.redMin !== r;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const d = unwrap(await api.patch('/kds/settings', { amberMin: a, redMin: r }));
      setSaved({ amberMin: d.amberMin ?? a, redMin: d.redMin ?? r });
      toast.success('Umbrales del KDS guardados');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? e?.response?.data?.message ?? 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-28 min-h-[44px] px-3 rounded-lg border border-gray-300 text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#F97316] rounded-lg flex items-center justify-center">
          <ChefHat className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KDS</h1>
          <p className="text-gray-500 text-sm mt-0.5">Semáforo de la pantalla de cocina</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <p className="text-sm text-gray-600">
          Cada pedido cambia de color según el tiempo desde que entró: verde, luego ámbar y al final rojo con pulso.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <label className="space-y-1">
            <span className="block text-sm font-semibold text-gray-900">Ámbar desde (min)</span>
            <input type="number" min={1} max={239} inputMode="numeric" value={amber} disabled={loading || busy}
              onChange={(e) => setAmber(e.target.value)} data-testid="kds-umbral-ambar" className={field} />
          </label>
          <label className="space-y-1">
            <span className="block text-sm font-semibold text-gray-900">Rojo pasados (min)</span>
            <input type="number" min={2} max={240} inputMode="numeric" value={red} disabled={loading || busy}
              onChange={(e) => setRed(e.target.value)} data-testid="kds-umbral-rojo" className={field} />
          </label>
        </div>
        {valid ? (
          <div className="flex flex-wrap gap-2 text-sm font-bold" aria-live="polite">
            <span className="px-3 py-1 rounded-full border-2 border-green-600 text-green-800">Verde: menos de {a} min</span>
            <span className="px-3 py-1 rounded-full border-2 border-amber-500 text-amber-800">Ámbar: {a} a {r} min</span>
            <span className="px-3 py-1 rounded-full border-2 border-red-600 text-red-700">Rojo: más de {r} min</span>
          </div>
        ) : (
          <p className="text-sm text-red-600" role="alert">Ámbar debe ser al menos 1 minuto y rojo mayor que ámbar (máximo 240).</p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={loading || busy || !valid || !dirty}
          data-testid="kds-umbral-guardar"
          className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Guardar
        </button>
      </div>
    </div>
  );
}
