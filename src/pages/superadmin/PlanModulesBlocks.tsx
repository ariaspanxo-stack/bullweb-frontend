// LOTE 325: ficha del local en el superadmin -> "Plan y precio" y "Modulos".
// El superadmin (o la vendedora) cambia plan, precio o apaga un modulo en un minuto. Cada cambio queda en auditoria.
// Bajar a Basico muestra antes el aviso de perdidas con cifras reales y pide confirmacion. Apagar un modulo no borra datos.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Layers, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService, { type PlanImpactSA, type TenantModulesSA } from '@/services/superadmin/superadminService';

const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const planLabel = (p?: string | null) => (String(p ?? '').toUpperCase() === 'BASICO' ? 'Básico' : 'Full');

const modulesKey = (id: string) => ['superadmin', 'tenant-modules', id];

// ── Plan y precio ───────────────────────────────────────────────────────────
export function PlanPriceBlock({ tenantId, planRaw, priceCLP }: { tenantId: string; planRaw?: string | null; priceCLP?: number | null }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [impact, setImpact] = useState<{ target: 'BASICO' | 'TODO'; data: PlanImpactSA } | null>(null);
  const effective = String(planRaw ?? '').toUpperCase() === 'BASICO' ? 'BASICO' : 'TODO';
  const target: 'BASICO' | 'TODO' = effective === 'BASICO' ? 'TODO' : 'BASICO';

  useEffect(() => { setPrice(priceCLP != null ? String(priceCLP) : ''); }, [priceCLP]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['superadmin', 'tenant-detail', tenantId] });
    qc.invalidateQueries({ queryKey: modulesKey(tenantId) });
  };

  const askChange = async () => {
    setBusy(true);
    try {
      const data = await superadminService.getPlanImpact(tenantId, target);
      setImpact({ target, data });
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo calcular el aviso');
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = async () => {
    if (!impact) return;
    setBusy(true);
    try {
      await superadminService.changePlanConfirmed(tenantId, impact.target);
      toast.success(`Plan cambiado a ${planLabel(impact.target)}`);
      setImpact(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el plan');
    } finally {
      setBusy(false);
    }
  };

  const savePrice = async () => {
    const v = Number(price.replace(/[.\s$]/g, ''));
    if (!Number.isInteger(v) || v < 1000 || v > 1000000) { toast.error('Precio: ingresa un entero entre 1.000 y 1.000.000'); return; }
    if (priceCLP != null && v === Number(priceCLP)) return;
    setBusy(true);
    try {
      await superadminService.changePrice(tenantId, v);
      toast.success(`Precio guardado: ${fmtCLP(v)}/mes`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo guardar el precio');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5" data-testid="sa-plan-price">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-[#F97316]" />
        Plan y precio
        <span className="text-xs text-gray-600 font-normal normal-case tracking-normal ml-1">Cada cambio queda en auditoría</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-xs text-gray-500">Plan actual</p>
          <p className="text-lg font-bold text-gray-100" data-testid="sa-plan-actual">{planLabel(effective)}</p>
          <button
            type="button"
            onClick={askChange}
            disabled={busy}
            data-testid="sa-cambiar-plan"
            className="mt-2 w-full min-h-[44px] rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Cambiar plan a {planLabel(target)}
          </button>
        </div>
        <label className="block p-3 bg-gray-800 rounded-xl border border-gray-700">
          <span className="text-xs text-gray-500">Precio guardado (lo que cobra Flow)</span>
          <span className="block text-lg font-bold text-gray-100 mb-2">{priceCLP != null ? `${fmtCLP(priceCLP)}/mes` : '—'}</span>
          <div className="flex gap-2">
            <input
              type="text" inputMode="numeric"
              value={price}
              disabled={busy}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') savePrice(); }}
              data-testid="sa-precio"
              className="flex-1 min-w-0 min-h-[44px] bg-gray-950 border border-white/10 rounded-lg px-3 text-sm font-bold text-gray-100 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={savePrice}
              disabled={busy}
              data-testid="sa-guardar-precio"
              className="min-h-[44px] px-4 rounded-lg border border-[#F97316] text-[#F97316] text-sm font-semibold hover:bg-orange-500/10 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </label>
      </div>

      {impact && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" data-testid="sa-aviso-plan">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-gray-100 mb-1">Cambiar a {planLabel(impact.target)}</h4>
            <p className="text-sm text-gray-400 mb-4">
              Precio nuevo: <b className="text-gray-200" data-testid="sa-aviso-precio">{impact.data.targetPriceCLP ? `${fmtCLP(impact.data.targetPriceCLP)}/mes` : 'el del plan'}</b> (después puedes ajustarlo). Revisa antes de confirmar.
            </p>
            {impact.data.warnings.length > 0 ? (
              <ul className="space-y-2 mb-4">
                {impact.data.warnings.map((w) => (
                  <li key={w} className="flex gap-2 text-sm text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-300 mb-4">No pierde nada de lo que usa hoy.</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-5">
              <span>Ingredientes: <b className="text-gray-200">{impact.data.figures.ingredientes}</b></span>
              <span>Compras 7 días: <b className="text-gray-200">{impact.data.figures.compras7d}</b></span>
              <span>Clientes: <b className="text-gray-200">{impact.data.figures.clientes}</b></span>
              <span>Puntos 7 días: <b className="text-gray-200">{impact.data.figures.movimientosPuntos7d}</b></span>
              <span>Estaciones: <b className="text-gray-200">{impact.data.figures.estaciones}</b></span>
              <span>Sobre el tope: <b className="text-gray-200">{impact.data.figures.estacionesSobreTope}</b></span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setImpact(null)} disabled={busy}
                className="flex-1 min-h-[44px] rounded-lg border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5">
                Cancelar
              </button>
              <button type="button" onClick={confirmChange} disabled={busy} data-testid="sa-confirmar-plan"
                className="flex-1 min-h-[44px] rounded-lg bg-[#F97316] hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50">
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Modulos ─────────────────────────────────────────────────────────────────
const STATE_LABEL: Record<'plan' | 'on' | 'off', string> = { plan: 'Según plan', on: 'Encendido', off: 'Apagado' };

export function TenantModulesBlock({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<TenantModulesSA>({
    queryKey: modulesKey(tenantId),
    queryFn: () => superadminService.getTenantModules(tenantId),
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const setState = async (key: string, state: 'plan' | 'on' | 'off') => {
    setBusyKey(key);
    try {
      const r = await superadminService.setTenantModule(tenantId, key, state);
      qc.setQueryData(modulesKey(tenantId), r);
      toast.success(`Módulo: ${STATE_LABEL[state].toLowerCase()}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo guardar el módulo');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5" data-testid="sa-modulos">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
        <Layers className="w-4 h-4 text-[#F97316]" />
        Módulos
      </h3>
      <p className="text-xs text-gray-500 mb-4">"Según plan" usa lo que trae el plan. Apagar un módulo lo oculta del local sin borrar datos.</p>
      {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
      {isError && <p className="text-sm text-rose-400">No se pudieron leer los módulos.</p>}
      {data && (
        <div className="space-y-2">
          {data.modules.map((m) => (
            <div key={m.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-800 rounded-xl border border-gray-700" data-testid={`sa-modulo-${m.key}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-200">{m.label}</p>
                <p className="text-xs text-gray-500">
                  {m.enabled ? 'Visible para el local' : 'Oculto para el local'}
                  {m.state === 'plan' ? ` · el plan lo ${m.planDefault ? 'incluye' : 'no incluye'}` : ' · forzado'}
                </p>
              </div>
              <div className="flex rounded-lg border border-white/10 overflow-hidden" role="radiogroup" aria-label={m.label}>
                {(['plan', 'on', 'off'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={m.state === s}
                    disabled={busyKey === m.key}
                    onClick={() => m.state !== s && setState(m.key, s)}
                    data-testid={`sa-modulo-${m.key}-${s}`}
                    className={`min-h-[44px] px-3 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      m.state === s ? 'bg-[#F97316] text-white' : 'bg-gray-900 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    {STATE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
