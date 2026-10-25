import { useState, useEffect, useMemo } from 'react';
import { Gift, Crown, TrendingUp, Save, Loader2, Coins, RefreshCw } from 'lucide-react';
import fidelizacionService from '@/services/fidelizacionService';
import { safeArray } from '@/utils/safeArray';
import type { AutomationSettings, LoyaltyRules } from '@/services/fidelizacionService';
import api from '@/services/api';

interface CustomerRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalSpent: number;
  totalOrders: number;
  points: number;
  segment?: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  VIP:      'bg-yellow-100 text-yellow-800',
  FREQUENT: 'bg-blue-100   text-blue-800',
  REGULAR:  'bg-gray-100   text-gray-700',
  NEW:      'bg-green-100  text-green-800',
  INACTIVE: 'bg-red-100    text-red-700',
  AT_RISK:  'bg-orange-100 text-orange-700',
};

const SEG_LABEL: Record<string, string> = {
  VIP: 'VIP', FREQUENT: 'Frecuente', REGULAR: 'Regular',
  NEW: 'Nuevo', INACTIVE: 'Inactivo', AT_RISK: 'En riesgo',
};

function fmt(n: number | undefined | null) { return Number(n ?? 0).toLocaleString('es-CL'); }

// HOTFIX #282: regla única (mismos valores por defecto que el backend) y % de devolución
const DEFAULT_RULES: LoyaltyRules = { pesosPerPoint: 100, redeemBlockPoints: 100, redeemBlockValue: 500, minRedeemPoints: 100, expiryMonths: 12 };
const returnPctOf = (r: LoyaltyRules) =>
  r.pesosPerPoint > 0 && r.redeemBlockPoints > 0 ? Math.round((r.redeemBlockValue / (r.redeemBlockPoints * r.pesosPerPoint)) * 10000) / 100 : 0;
const cashOf = (r: LoyaltyRules, pts: number) => Math.floor(pts / r.redeemBlockPoints) * r.redeemBlockValue;
const RULE_FIELDS: { key: keyof LoyaltyRules; label: string; suffix: string; min: number }[] = [
  { key: 'pesosPerPoint',     label: '1 punto por cada',        suffix: '$ gastados', min: 1 },
  { key: 'redeemBlockPoints', label: 'Bloque de canje',         suffix: 'puntos',     min: 1 },
  { key: 'redeemBlockValue',  label: 'Descuento por bloque',    suffix: '$',          min: 1 },
  { key: 'minRedeemPoints',   label: 'Canje mínimo',            suffix: 'puntos',     min: 1 },
  { key: 'expiryMonths',      label: 'Vencen tras sin compras', suffix: 'meses (0 = no vencen)', min: 0 },
];

export function LoyaltyTab() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [topByPoints, setTopByPoints] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [editRules, setEditRules] = useState<LoyaltyRules>(DEFAULT_RULES);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);  const [loadError, setLoadError]         = useState<string | null>(null);
  const [confirmRecalc, setConfirmRecalc] = useState(false);
  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [s, topRes] = await Promise.all([
        fidelizacionService.getSettings(),
        api.get('/customers/top-by-points?limit=10'),
      ]);
      setSettings(s);
      setEditRules(s.loyalty ?? DEFAULT_RULES);

      const rawTop = Array.isArray(topRes.data) ? topRes.data : (topRes.data?.data ?? []);
      const cleaned: CustomerRow[] = rawTop.map((c: any) => ({
        id:          c.id,
        name:        c.name ?? '—',
        email:       c.email,
        phone:       c.phone,
        totalSpent:  Number(c.totalSpent ?? 0),
        totalOrders: Number(c.totalOrders ?? 0),
        points:      Number(c.points ?? 0),
        segment:     c.segment,
      }));
      setTopByPoints(cleaned);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Error al cargar datos de fidelización');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    try {
      await fidelizacionService.updateSettings({ loyalty: editRules });
      await load();
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setRecalcResult(null);
    try {
      const result = await fidelizacionService.recalculatePoints();
      setRecalcResult(`✅ ${result.updated} clientes actualizados (${fmt(result.totalPointsAssigned)} pts asignados)`);
      // Recargar datos para reflejar los nuevos puntos
      await load();
    } catch {
      setRecalcResult('❌ Error al recalcular. Intenta de nuevo.');
    } finally {
      setRecalculating(false);
      setTimeout(() => setRecalcResult(null), 6000);
    }
  };

  const totalPointsIssued = useMemo(
    () => safeArray<CustomerRow>(topByPoints).reduce((acc, c) => acc + c.points, 0),
    [topByPoints]
  );

  const customersWithPoints = useMemo(
    () => safeArray<CustomerRow>(topByPoints).filter((c) => c.points > 0).length,
    [topByPoints]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={load} className="text-xs underline font-medium ml-4">Reintentar</button>
          </div>
        )}
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-gray-100 rounded-xl" />
          <div className="h-80 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={load} className="text-xs underline font-medium ml-4">Reintentar</button>
        </div>
      )}
      {/* ── Métricas globales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Puntos emitidos',     value: fmt(totalPointsIssued),  icon: Coins,      color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Clientes con puntos', value: fmt(customersWithPoints), icon: Gift,       color: 'bg-green-50 text-green-700 border-green-100' },
          { label: 'En ranking top 10',    value: fmt(topByPoints.length),  icon: Crown,      color: 'bg-blue-50  text-blue-700  border-blue-100'  },
          { label: 'Devolución sobre lo gastado', value: `${returnPctOf(settings?.loyalty ?? DEFAULT_RULES)}%`, icon: TrendingUp, color: 'bg-purple-50 text-purple-700 border-purple-100' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`border rounded-xl p-4 ${m.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium opacity-80">{m.label}</span>
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Configuración del programa ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          Configuración del programa de puntos
        </h3>
        {/* HOTFIX #282: regla única editable con rangos; el servidor valida y rechaza devoluciones sobre el máximo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RULE_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  min={f.min}
                  step={1}
                  value={editRules[f.key]}
                  onChange={(e) => setEditRules((r) => ({ ...r, [f.key]: Math.trunc(Number(e.target.value)) }))}
                  className="w-28 h-11 border border-gray-300 rounded-lg px-3 text-sm font-semibold focus:ring-2 focus:ring-[#F97316]"
                />
                <span className="text-sm text-gray-500">{f.suffix}</span>
              </span>
            </label>
          ))}
        </div>

        {(() => {
          const pct = returnPctOf(editRules);
          const max = settings?.maxReturnPct ?? 20;
          const over = pct > max;
          return (
            <div className={`mt-4 rounded-xl border p-3 text-sm ${over ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <p>
                Una compra de <strong>$10.000</strong> da <strong>{fmt(Math.floor(10000 / Math.max(1, editRules.pesosPerPoint)))} pts</strong>
                {' '}= <strong>${fmt(cashOf(editRules, Math.floor(10000 / Math.max(1, editRules.pesosPerPoint))))}</strong> de descuento.
              </p>
              <p className="mt-1">
                Devolución: <strong>{pct}% de lo gastado</strong>
                {over ? ` — supera el máximo permitido (${max}%), no se puede guardar.` : pct > 10 ? ' — alta: revisa que el negocio la soporte.' : ''}
              </p>
            </div>
          );
        })()}

        {saveError && <p className="mt-2 text-sm font-medium text-red-700">{saveError}</p>}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={saving || returnPctOf(editRules) > (settings?.maxReturnPct ?? 20)}
            className="flex items-center gap-2 h-11 px-4 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : savedOk ? (
              '✓ Guardado'
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? 'Guardando…' : savedOk ? '' : 'Guardar configuración'}
          </button>
        </div>
      </div>

      {/* ── Ranking de clientes ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            Top 10 clientes por puntos
          </h3>
          <div className="flex items-center gap-2">
            {recalcResult && (
              <span className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                {recalcResult}
              </span>
            )}
            <button
              onClick={() => setConfirmRecalc(true)}
              disabled={recalculating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-amber-300 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors font-medium"
              title="Asigna puntos a clientes con compras anteriores al sistema de puntos"
            >
              {recalculating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {recalculating ? 'Calculando…' : 'Recalcular históricos'}
            </button>
            <button
              onClick={load}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              <RefreshCw className="h-3 w-3" />
              Actualizar
            </button>
          </div>
        </div>

        {topByPoints.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Ningún cliente tiene puntos acumulados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                  <th className="pb-2 text-center font-semibold w-8">#</th>
                  <th className="pb-2 text-left font-semibold">Cliente</th>
                  <th className="pb-2 text-center font-semibold">Segmento</th>
                  <th className="pb-2 text-right font-semibold">Puntos</th>
                  <th className="pb-2 text-right font-semibold">Total gastado</th>
                  <th className="pb-2 text-right font-semibold">Órdenes</th>
                  <th className="pb-2 text-right font-semibold">Valor pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topByPoints.map((c, i) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-2.5 text-center">
                      {i < 3 ? (
                        <span className="text-base">
                          {['🥇', '🥈', '🥉'][i]}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                    </td>
                    <td className="py-2.5 text-center">
                      {c.segment ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEGMENT_COLORS[c.segment] ?? 'bg-gray-100 text-gray-600'}`}>
                          {SEG_LABEL[c.segment] ?? c.segment}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold text-amber-600 text-base">
                      {fmt(c.points)}
                    </td>
                    <td className="py-2.5 text-right text-gray-600">
                      ${fmt(c.totalSpent)}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {fmt(c.totalOrders)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-gray-900">
                      ${fmt(cashOf(settings?.loyalty ?? DEFAULT_RULES, c.points))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm recalculate modal */}
      {confirmRecalc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-gray-900 mb-2">¿Recalcular puntos históricos?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Se asignarán puntos a clientes con compras anteriores al sistema. Esta acción actualiza balances de fidelización.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRecalc(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmRecalc(false); handleRecalculate(); }}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
