/**
 * BULLWEB ENTERPRISE — Sprint 18
 * Gestor de Módulos del Sistema.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  ShoppingCart,
  ChefHat,
  Package,
  Users,
  Megaphone,
  UserCog,
  BarChart2,
  TrendingUp,
  Webhook,
  Key,
  Mail,
  Database,
  CalendarClock,
  Fingerprint,
  Wrench,
  Power,
  PowerOff,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  History,
  X,
  Layers,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { SystemModule } from '@/services/adminService';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Cpu, ShoppingCart, ChefHat, Package, Users, Megaphone, UserCog,
  BarChart2, TrendingUp, Webhook, Key, Mail, Database, CalendarClock,
  Fingerprint, Wrench, Layers,
};

function ModuleIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : Layers;
  return <Icon className={className ?? 'h-5 w-5'} />;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  core:         'Núcleo',
  commerce:     'Comercio',
  analytics:    'Analíticas',
  integrations: 'Integraciones',
  advanced:     'Avanzado',
};

const CAT_COLOR: Record<string, string> = {
  core:         'text-indigo-400  bg-indigo-900/30  border-indigo-800/50',
  commerce:     'text-green-400   bg-green-900/30   border-green-800/50',
  analytics:    'text-sky-400     bg-sky-900/30     border-sky-800/50',
  integrations: 'text-violet-400  bg-violet-900/30  border-violet-800/50',
  advanced:     'text-amber-400   bg-amber-900/30   border-amber-800/50',
};

// ─── Confirm Toggle Modal ─────────────────────────────────────────────────────

function ConfirmToggleModal({
  mod,
  onClose,
  onConfirm,
  isPending,
}: {
  mod: SystemModule;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const disabling = mod.is_enabled;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          {disabling
            ? <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
            : <CheckCircle2  className="h-6 w-6 text-green-400 shrink-0" />}
          <h2 className="text-base font-bold text-white">
            {disabling ? 'Deshabilitar módulo' : 'Habilitar módulo'}
          </h2>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <ModuleIcon name={mod.icon} className="h-5 w-5 text-zinc-400" />
          <p className="text-sm font-semibold text-white">{mod.name}</p>
        </div>
        {disabling && (
          <p className="text-xs text-amber-300 bg-amber-900/30 border border-amber-800/50 rounded-xl px-3 py-2 mb-4">
            Al deshabilitar este módulo, sus rutas dejarán de estar disponibles para los usuarios. Asegúrate de que no haya operaciones activas.
          </p>
        )}
        <p className="text-sm text-zinc-400 mb-5">
          ¿Confirmas que deseas <strong className="text-white">{disabling ? 'deshabilitar' : 'habilitar'}</strong> el módulo <em>"{mod.name}"</em>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2.5 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 rounded-xl font-semibold py-2.5 transition flex items-center justify-center gap-2 text-white disabled:opacity-50
              ${disabling ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'}`}
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando…</>
              : disabling ? 'Deshabilitar' : 'Habilitar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({
  mod,
  onToggle,
}: {
  mod: SystemModule;
  onToggle: (mod: SystemModule) => void;
}) {
  const catCls = CAT_COLOR[mod.category] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700';

  return (
    <div className={`rounded-2xl border bg-zinc-900 p-5 flex flex-col gap-3 transition
      ${mod.is_enabled ? 'border-zinc-700/70' : 'border-zinc-800 opacity-60'}`}>

      {/* header */}
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2.5 border ${catCls}`}>
          <ModuleIcon name={mod.icon} className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white leading-tight">{mod.name}</p>
            {mod.is_core && (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                <Lock className="h-2.5 w-2.5" /> CORE
              </span>
            )}
          </div>
          <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium border ${catCls}`}>
            {CAT_LABEL[mod.category] ?? mod.category}
          </span>
        </div>

        {/* toggle */}
        <button
          onClick={() => !mod.is_core && onToggle(mod)}
          disabled={mod.is_core}
          title={mod.is_core ? 'Módulo de núcleo — no se puede deshabilitar' : mod.is_enabled ? 'Deshabilitar' : 'Habilitar'}
          className={`shrink-0 rounded-full p-1.5 border transition
            ${mod.is_core
              ? 'opacity-30 cursor-not-allowed bg-zinc-800 border-zinc-700'
              : mod.is_enabled
                ? 'bg-green-900/40 border-green-700/60 text-green-400 hover:bg-red-900/30 hover:border-red-700/60 hover:text-red-400'
                : 'bg-zinc-800 border-zinc-600 text-zinc-500 hover:bg-green-900/30 hover:border-green-700/60 hover:text-green-400'
            }`}
        >
          {mod.is_enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
        </button>
      </div>

      {/* description */}
      {mod.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{mod.description}</p>
      )}

      {/* footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${mod.is_enabled ? 'bg-green-400' : 'bg-zinc-600'}`} />
          <span className={`text-xs font-medium ${mod.is_enabled ? 'text-green-400' : 'text-zinc-500'}`}>
            {mod.is_enabled ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">v{mod.version}</span>
      </div>

      {/* routes */}
      {mod.routes && mod.routes.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/60">
          {mod.routes.map((r) => (
            <span key={r} className="text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5 border border-zinc-700/50">
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Log Modal ────────────────────────────────────────────────────────────────

function LogModal({ onClose }: { onClose: () => void }) {
  const logQ = useQuery({
    queryKey: ['admin-module-log'],
    queryFn:  () => adminService.getModuleLog(undefined, 50),
  });

  const ACTION_COLOR: Record<string, string> = {
    ENABLED:  'text-green-400',
    DISABLED: 'text-red-400',
    UPDATED:  'text-amber-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" /> Historial de Módulos
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
        </div>

        {logQ.isLoading ? (
          <div className="flex items-center justify-center py-10 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
          </div>
        ) : (
          <div className="space-y-2">
            {(logQ.data ?? []).map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-zinc-800/60 border border-zinc-700/40 px-4 py-3">
                <span className={`text-xs font-bold font-mono w-20 shrink-0 ${ACTION_COLOR[entry.action] ?? 'text-zinc-400'}`}>
                  {entry.action}
                </span>
                <span className="text-xs text-zinc-300 font-mono bg-zinc-700/60 rounded px-1.5 py-0.5">
                  {entry.module_key}
                </span>
                <span className="text-xs text-zinc-500 flex-1">{entry.actor_email ?? '—'}</span>
                <span className="text-xs text-zinc-600 shrink-0">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
            ))}
            {(logQ.data ?? []).length === 0 && (
              <p className="text-center text-zinc-500 py-8">Sin eventos registrados.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────��────────────

const CATS = ['', 'core', 'commerce', 'analytics', 'integrations', 'advanced'] as const;

export default function ModulesPage() {
  const qc = useQueryClient();
  const [filterCat, setFilterCat]       = useState('');
  const [filterState, setFilterState]   = useState<'' | 'enabled' | 'disabled'>('');
  const [confirmMod, setConfirmMod]     = useState<SystemModule | null>(null);
  const [showLog, setShowLog]           = useState(false);

  const statsQ = useQuery({
    queryKey: ['admin-modules-stats'],
    queryFn:  adminService.getModuleStats,
  });

  const modulesQ = useQuery({
    queryKey: ['admin-modules'],
    queryFn:  adminService.listModules,
  });

  const toggleMut = useMutation({
    mutationFn: (key: string) => adminService.toggleModule(key),
    onSuccess: (updated) => {
      toast.success(
        updated.is_enabled
          ? `Módulo "${updated.name}" habilitado`
          : `Módulo "${updated.name}" deshabilitado`
      );
      qc.invalidateQueries({ queryKey: ['admin-modules'] });
      qc.invalidateQueries({ queryKey: ['admin-modules-stats'] });
      setConfirmMod(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al cambiar estado'),
  });

  const stats   = statsQ.data;
  const modules = modulesQ.data ?? [];

  const filtered = modules.filter(m => {
    if (filterCat   && m.category  !== filterCat)              return false;
    if (filterState === 'enabled'  && !m.is_enabled)           return false;
    if (filterState === 'disabled' && m.is_enabled)            return false;
    return true;
  });

  // group by category for display
  const grouped: Record<string, SystemModule[]> = {};
  for (const m of filtered) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Cpu className="h-6 w-6 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Módulos del Sistema</h1>
          <p className="text-sm text-zinc-400">Habilita o deshabilita módulos de la plataforma BullWeb</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['admin-modules'] });
              qc.invalidateQueries({ queryKey: ['admin-modules-stats'] });
            }}
            className="text-zinc-400 hover:text-white transition p-1.5"
            title="Refrescar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowLog(true)}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium px-3 py-2 transition"
          >
            <History className="h-3.5 w-3.5" /> Historial
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total módulos',   value: stats.total,    color: 'text-zinc-200',  icon: Cpu          },
            { label: 'Activos',         value: stats.enabled,  color: 'text-green-400', icon: Power        },
            { label: 'Deshabilitados',  value: stats.disabled, color: 'text-red-400',   icon: PowerOff     },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-zinc-800/60 border border-zinc-700/50 p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-zinc-500">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category summary pills */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byCategory).map(([cat, { total, enabled }]) => (
            <button
              key={cat}
              onClick={() => setFilterCat(prev => prev === cat ? '' : cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                filterCat === cat
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {CAT_LABEL[cat] ?? cat} ({enabled}/{total})
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las categorías</option>
          {CATS.filter(c => c).map(c => (
            <option key={c} value={c}>{CAT_LABEL[c]}</option>
          ))}
        </select>

        <select
          value={filterState}
          onChange={e => setFilterState(e.target.value as any)}
          className="rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los estados</option>
          <option value="enabled">Activos</option>
          <option value="disabled">Deshabilitados</option>
        </select>

        {(filterCat || filterState) && (
          <button
            onClick={() => { setFilterCat(''); setFilterState(''); }}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Module grid grouped by category */}
      {modulesQ.isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando módulos…
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, mods]) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 border text-[10px] ${CAT_COLOR[cat] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                  {CAT_LABEL[cat] ?? cat}
                </span>
                <span>{mods.length} módulo{mods.length !== 1 ? 's' : ''}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mods.map(m => (
                  <ModuleCard key={m.key} mod={m} onToggle={setConfirmMod} />
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <Cpu className="h-10 w-10 opacity-40" />
              <p>No hay módulos con los filtros actuales.</p>
            </div>
          )}
        </div>
      )}

      {/* Confirm Toggle Modal */}
      {confirmMod && (
        <ConfirmToggleModal
          mod={confirmMod}
          onClose={() => setConfirmMod(null)}
          onConfirm={() => toggleMut.mutate(confirmMod.key)}
          isPending={toggleMut.isPending}
        />
      )}

      {/* Log modal */}
      {showLog && <LogModal onClose={() => setShowLog(false)} />}
    </div>
  );
}
