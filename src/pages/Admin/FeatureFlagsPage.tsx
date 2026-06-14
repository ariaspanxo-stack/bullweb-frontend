import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flag, RefreshCw, Plus, RotateCcw, Search, X,
  AlertTriangle, FlaskConical, Plug, Users, ShoppingCart, Cpu
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { FeatureFlag } from '@/services/adminService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------
const CATEGORIES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  core:          { label: 'Núcleo',         icon: Cpu,          color: 'indigo'  },
  pos:           { label: 'Punto de Venta', icon: ShoppingCart, color: 'blue'    },
  customer:      { label: 'Clientes',       icon: Users,        color: 'green'   },
  integration:   { label: 'Integraciones',  icon: Plug,         color: 'purple'  },
  experimental:  { label: 'Experimental',   icon: FlaskConical, color: 'orange'  },
  custom:        { label: 'Personalizado',  icon: Flag,         color: 'gray'    },
};

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
function Toggle({ checked, onChange, disabled, dangerous }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; dangerous?: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    if (!checked || !dangerous) { onChange(!checked); return; }
    setShowConfirm(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-checked={checked}
        role="switch"
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <ConfirmDialog
        isOpen={showConfirm}
        title="Flag crítico"
        message="⚠️ Este flag está marcado como crítico. ¿Desactivar?"
        confirmLabel="Desactivar"
        variant="warning"
        onConfirm={() => { setShowConfirm(false); onChange(false); }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Custom Flag Modal
// ---------------------------------------------------------------------------
function AddFlagModal({ onClose, onSave }: { onClose: () => void; onSave: (p: any) => void }) {
  const [form, setForm] = useState({ shortKey: '', label: '', description: '', enabled: false });
  const [err, setErr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shortKey.trim()) { setErr('La clave es requerida'); return; }
    if (!form.label.trim())    { setErr('El nombre es requerido'); return; }
    if (!/^[a-z0-9_]+$/.test(form.shortKey)) { setErr('La clave solo puede tener letras minúsculas, números y guiones bajos'); return; }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Flag className="w-5 h-5 text-indigo-500" />
            Nuevo Feature Flag
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {err}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clave <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal text-xs ml-1">(solo a-z, 0-9, _)</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-2 rounded-l-lg border border-r-0 border-gray-200">feature.</span>
              <input
                type="text"
                placeholder="mi_flag"
                value={form.shortKey}
                onChange={e => setForm(f => ({ ...f, shortKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Mi funcionalidad"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Para qué sirve este flag..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={form.enabled} onChange={v => setForm(f => ({ ...f, enabled: v }))} />
            <span className="text-sm text-gray-600">{form.enabled ? 'Activo desde el inicio' : 'Inactivo por defecto'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
              Crear Flag
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlagRow
// ---------------------------------------------------------------------------
function FlagRow({ flag, onToggle, onReset, isUpdating }: {
  flag: FeatureFlag;
  onToggle: (key: string, enabled: boolean) => void;
  onReset:  (key: string) => void;
  isUpdating: boolean;
}) {
  const canReset = flag.definition !== null && flag.enabled !== flag.definition.default;
  const cat      = CATEGORIES[flag.category] ?? CATEGORIES.custom;

  return (
    <div className={`flex items-start gap-4 py-4 px-5 rounded-xl border transition-all
      ${flag.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
      {/* Toggle */}
      <div className="pt-0.5">
        <Toggle
          checked={flag.enabled}
          onChange={v => onToggle(flag.shortKey, v)}
          disabled={isUpdating}
          dangerous={flag.definition?.dangerous}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{flag.label}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${cat.color}-50 text-${cat.color}-700`}>
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </span>
          {flag.definition?.dangerous && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
              <AlertTriangle className="w-3 h-3" /> Crítico
            </span>
          )}
          {!flag.definition && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              Personalizado
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{flag.description || <span className="italic">Sin descripción</span>}</p>
        <p className="text-xs text-gray-400 mt-1 font-mono">feature.{flag.shortKey}</p>
        {flag.updatedBy && (
          <p className="text-xs text-gray-400 mt-0.5">
            Última actualización por <span className="font-medium">{flag.updatedBy}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-0.5">
        {canReset && (
          <button
            onClick={() => onReset(flag.shortKey)}
            disabled={isUpdating}
            title={`Restaurar a default (${flag.definition!.default ? 'ON' : 'OFF'})`}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function FeatureFlagsPage() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn:  () => adminService.getFeatureFlags(),
  });

  const mutToggle = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      adminService.toggleFeatureFlag(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });

  const mutReset = useMutation({
    mutationFn: (key: string) => adminService.resetFeatureFlag(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });

  const mutCreate = useMutation({
    mutationFn: (p: any) => adminService.createFeatureFlag(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }); setShowAdd(false); },
  });

  const flags: FeatureFlag[] = data?.data ?? [];

  // Filters
  const filtered = flags.filter(f => {
    const matchCat    = catFilter === 'all' || f.category === catFilter;
    const matchSearch = !search || f.label.toLowerCase().includes(search.toLowerCase()) || f.shortKey.includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Group by category
  const grouped = Object.entries(
    filtered.reduce<Record<string, FeatureFlag[]>>((acc, f) => {
      (acc[f.category] ??= []).push(f);
      return acc;
    }, {})
  );

  const enabledCount  = flags.filter(f => f.enabled).length;
  const disabledCount = flags.length - enabledCount;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-sm text-gray-500 mt-1">
            Activa o desactiva funcionalidades del sistema en tiempo real
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            Nuevo Flag
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Flags',  value: flags.length,    color: 'gray'  },
          { label: 'Activos',      value: enabledCount,    color: 'green' },
          { label: 'Inactivos',    value: disabledCount,   color: 'gray'  },
          { label: 'Categorías',   value: Object.keys(CATEGORIES).length - 1, color: 'indigo' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar flag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setCatFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${catFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          {Object.entries(CATEGORIES).filter(([k]) => k !== 'custom').map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setCatFilter(key)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                ${catFilter === key ? `bg-${cat.color}-600 text-white` : `bg-white border border-gray-200 text-gray-600 hover:bg-gray-50`}`}
            >
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-6 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-40" />
                  <div className="h-3 bg-gray-200 rounded w-64" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 text-gray-400">
          <Flag className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>No hay flags que coincidan con el filtro</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, catFlags]) => {
            const catConfig = CATEGORIES[cat] ?? CATEGORIES.custom;
            const CatIcon   = catConfig.icon;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className={`w-4 h-4 text-${catConfig.color}-500`} />
                  <h3 className="text-sm font-semibold text-gray-700">{catConfig.label}</h3>
                  <span className="text-xs text-gray-400">({catFlags.length})</span>
                </div>
                <div className="space-y-2">
                  {catFlags.map(flag => (
                    <FlagRow
                      key={flag.key}
                      flag={flag}
                      isUpdating={mutToggle.isPending || mutReset.isPending}
                      onToggle={(key, enabled) => mutToggle.mutate({ key, enabled })}
                      onReset={key => mutReset.mutate(key)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddFlagModal
          onClose={() => setShowAdd(false)}
          onSave={p => mutCreate.mutate(p)}
        />
      )}
    </div>
  );
}
