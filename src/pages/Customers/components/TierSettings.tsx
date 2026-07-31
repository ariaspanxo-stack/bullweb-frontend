import { useState, useEffect } from 'react';
import { Crown, Plus, Trash2, Save, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import customersService from '../../../services/customersService';

interface Tier {
  id?: string;
  name: string;
  minSpent: number;
  benefitText?: string | null;
  color?: string | null;
  order: number;
  isActive: boolean;
}

const DEFAULT_COLORS = ['#a16207', '#71717a', '#ca8a04', '#7c3aed'];

export default function TierSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [inactivityDays, setInactivityDays] = useState(60);
  const [riskDays, setRiskDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      customersService.getTiers(),
      customersService.getTierConfig(),
    ])
      .then(([t, cfg]) => {
        const list = (t ?? []).map((x: any) => ({
          id: x.id,
          name: x.name,
          minSpent: Number(x.minSpent ?? 0),
          benefitText: x.benefitText ?? '',
          color: x.color ?? '#71717a',
          order: Number(x.order ?? 0),
          isActive: x.isActive ?? true,
        }));
        list.sort((a, b) => a.order - b.order);
        setTiers(list.length ? list : [
          { name: 'Bronce', minSpent: 0, color: '#a16207', order: 0, isActive: true },
          { name: 'Plata', minSpent: 50000, color: '#71717a', order: 1, isActive: true },
          { name: 'Oro', minSpent: 150000, color: '#ca8a04', order: 2, isActive: true },
          { name: 'VIP', minSpent: 400000, color: '#7c3aed', order: 3, isActive: true },
        ]);
        setInactivityDays(Number(cfg?.tierInactivityDays ?? 60));
        setRiskDays(Number(cfg?.tierRiskDays ?? 7));
      })
      .catch(() => setMsg({ type: 'err', text: 'Error al cargar configuración' }))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const updateTier = (idx: number, field: keyof Tier, value: any) => {
    setTiers(prev => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const addTier = () => {
    setTiers(prev => [...prev, {
      name: 'Nuevo Nivel',
      minSpent: 0,
      color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length],
      order: prev.length,
      isActive: true,
    }]);
  };

  const removeTier = async (idx: number) => {
    const tier = tiers[idx];
    if (tier.id) {
      try { await customersService.deleteTier(tier.id); }
      catch { /* ignore */ }
    }
    setTiers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await customersService.updateTierConfig({
        tierInactivityDays: Number(inactivityDays),
        tierRiskDays: Number(riskDays),
      });
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i];
        const payload = {
          name: t.name,
          minSpent: Number(t.minSpent),
          benefitText: t.benefitText ?? undefined,
          color: t.color ?? undefined,
          order: i,
          isActive: t.isActive,
        };
        if (t.id) {
          await customersService.updateTier(t.id, payload);
        } else {
          await customersService.createTier(payload);
        }
      }
      setMsg({ type: 'ok', text: 'Configuración guardada correctamente' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message ?? 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-400';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h3 className="text-xl font-bold text-white">Niveles de Fidelización</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-400"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Cargando...</div>
          ) : (
            <>
              {/* Config de inactividad */}
              <div className="bg-zinc-800/60 rounded-lg p-4 border border-zinc-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <SettingsIcon className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-semibold text-zinc-200">Reglas de Caída de Nivel</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1.5">Días de Inactividad (caída)</label>
                    <input
                      type="number"
                      value={inactivityDays}
                      onChange={(e) => setInactivityDays(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1.5">Días de Alerta Preventiva</label>
                    <input
                      type="number"
                      value={riskDays}
                      onChange={(e) => setRiskDays(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2 text-xs text-zinc-400 bg-zinc-900/50 rounded-md p-2.5 border border-zinc-700/40">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Tras {riskDays} días antes de caer, el cliente se marca "En Riesgo". Al superar {inactivityDays} días sin comprar, baja un nivel.
                  </span>
                </div>
              </div>

              {/* Lista de niveles */}
              <div className="bg-zinc-800/60 rounded-lg p-4 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-zinc-200">Niveles</h4>
                  <button
                    onClick={addTier}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/60 rounded-lg p-3 border border-zinc-700/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                    >
                      {/* Color */}
                      <div className="md:col-span-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={tier.color ?? '#71717a'}
                          onChange={(e) => updateTier(idx, 'color', e.target.value)}
                          className="w-10 h-10 rounded-md border border-gray-300 p-1 bg-white cursor-pointer flex-shrink-0"
                          title="Color del nivel"
                        />
                      </div>
                      {/* Nombre */}
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide block mb-1 md:hidden">Nombre</label>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => updateTier(idx, 'name', e.target.value)}
                          placeholder="Nombre"
                          className={inputCls}
                        />
                      </div>
                      {/* Gasto mínimo */}
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide block mb-1 md:hidden">Gasto Mínimo</label>
                        <input
                          type="number"
                          value={tier.minSpent}
                          onChange={(e) => updateTier(idx, 'minSpent', Number(e.target.value))}
                          placeholder="Gasto mín. ($)"
                          className={inputCls}
                        />
                      </div>
                      {/* Beneficio */}
                      <div className="md:col-span-4">
                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide block mb-1 md:hidden">Beneficio</label>
                        <input
                          type="text"
                          value={tier.benefitText ?? ''}
                          onChange={(e) => updateTier(idx, 'benefitText', e.target.value)}
                          placeholder="Beneficio (ej: 10% descuento)"
                          className={inputCls}
                        />
                      </div>
                      {/* Eliminar */}
                      <div className="md:col-span-1 flex items-center justify-center">
                        <button
                          onClick={() => removeTier(idx)}
                          className="w-9 h-9 rounded-md flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          title="Eliminar nivel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {msg && (
                <div className={`rounded-lg p-3 text-sm ${msg.type === 'ok' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                  {msg.text}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex-shrink-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}