import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Paintbrush, Save, RotateCcw, RefreshCw, Eye,
  Image, Globe, Palette, MonitorSmartphone, Type,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { BrandingSetting } from '@/services/adminService';
import { applyBranding } from '@/utils/applyBranding';

const CATEGORIES = [
  { key: 'general',  label: 'General',     icon: Globe             },
  { key: 'colors',   label: 'Colores',     icon: Palette           },
  { key: 'images',   label: 'Imágenes',    icon: Image             },
  { key: 'login',    label: 'Login',       icon: MonitorSmartphone },
  { key: 'behavior', label: 'Comportamiento', icon: Type           },
];

// ── ColorInput ────────────────────────────────────────────────────────────────
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-9 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
      />
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
      />
      <div className="w-8 h-8 rounded-md border border-gray-600 flex-shrink-0" style={{ background: value || '#000000' }} />
    </div>
  );
}

// ── BooleanToggle ─────────────────────────────────────────────────────────────
function BooleanToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const on = value === 'true';
  return (
    <button
      onClick={() => onChange(on ? 'false' : 'true')}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-gray-600'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

// ── SettingField ──────────────────────────────────────────────────────────────
function SettingField({
  setting, value, onChange,
}: { setting: BrandingSetting; value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagen máxima: 5 MB');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const token = localStorage.getItem('bullweb_token') ?? '';
      const res = await fetch(
        `${(import.meta.env.VITE_API_URL as string) ?? ''}/api/menu/upload-logo`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.url) onChange(data.url);
      else throw new Error('Sin URL en respuesta');
    } catch {
      setUploadError('Error al subir imagen.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const imageField = (
    <div className="w-full space-y-2">
      {value && (
        <div className="relative w-32 h-16 rounded-xl overflow-hidden border border-gray-700 bg-gray-800">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-contain p-2"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... o sube archivo"
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
        <label className={`flex items-center gap-1.5 cursor-pointer border rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          uploading
            ? 'border-gray-600 text-gray-500 cursor-wait'
            : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'
        }`}>
          {uploading ? '⏳ Subiendo…' : '📎 Subir'}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>
      {uploadError && (
        <p className="text-xs text-red-400">⚠️ {uploadError}</p>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4 border-b border-gray-800 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{setting.label ?? setting.key}</p>
        {setting.description && (
          <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
        )}
        <code className="text-[10px] text-gray-600 mt-1 block">{setting.key}</code>
      </div>
      <div className="flex items-center">
        {setting.type === 'color' ? (
          <ColorInput value={value} onChange={onChange} />
        ) : setting.type === 'boolean' ? (
          <div className="flex items-center gap-3">
            <BooleanToggle value={value} onChange={onChange} />
            <span className={`text-sm ${value === 'true' ? 'text-green-400' : 'text-gray-500'}`}>
              {value === 'true' ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        ) : setting.type === 'image' ? (
          imageField
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        )}
      </div>
    </div>
  );
}

// ── ColorPreview ──────────────────────────────────────────────────────────────
function ColorPreview({ draft }: { draft: Record<string, string> }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Eye size={14} className="text-gray-400" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Vista previa</span>
      </div>
      {/* mini sidebar */}
      <div className="flex gap-2 h-28 rounded-lg overflow-hidden border border-gray-700">
        <div className="w-20 flex flex-col gap-1 p-2" style={{ background: draft.color_bg_sidebar ?? '#111827' }}>
          <div className="h-2 rounded" style={{ background: draft.color_primary ?? '#6366f1' }} />
          <div className="h-1.5 rounded bg-white/10" />
          <div className="h-1.5 rounded bg-white/10" />
          <div className="h-1.5 rounded bg-white/10" />
          <div className="h-1.5 rounded bg-white/10" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-7 flex items-center px-2 gap-1" style={{ background: draft.color_bg_topbar ?? '#1f2937' }}>
            <span className="text-[8px] text-white/70 font-medium">{draft.app_name ?? 'Bullweb'}</span>
          </div>
          <div className="flex-1 bg-gray-800 p-2 flex flex-wrap gap-1 content-start">
            {[
              { color: draft.color_primary, label: 'Primario' },
              { color: draft.color_secondary, label: 'Secundario' },
              { color: draft.color_accent, label: 'Acento' },
              { color: draft.color_danger, label: 'Error' },
              { color: draft.color_warning, label: 'Advertencia' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color ?? '#888' }} />
                <span className="text-[7px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Color swatches */}
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { key: 'color_primary', label: 'Primario' },
          { key: 'color_secondary', label: 'Secundario' },
          { key: 'color_accent', label: 'Acento' },
          { key: 'color_danger', label: 'Error' },
          { key: 'color_warning', label: 'Aviso' },
        ].map(({ key, label }) => (
          <div key={key} className="text-center">
            <div className="w-full h-6 rounded-md border border-gray-700 mb-0.5" style={{ background: draft[key] ?? '#888' }} />
            <span className="text-[8px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BrandingPage() {
  const [tab,     setTab]     = useState('general');
  const [all,     setAll]     = useState<BrandingSetting[]>([]);
  const [draft,   setDraft]   = useState<Record<string, string>>({});
  const [dirty,   setDirty]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminService.getBranding();
      setAll(rows);
      setDraft(Object.fromEntries(rows.map(r => [r.key, r.value ?? ''])));
      setDirty(false);
    } catch { toast.error('Error cargando branding'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (key: string, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const settings = Object.entries(draft).map(([key, value]) => ({ key, value }));
      const result = await adminService.bulkUpdateBranding(settings);
      toast.success(`${result.updated} ajustes guardados`);
      setDirty(false);
      applyBranding();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const resetCategory = async (cat: string) => {
    try {
      const result = await adminService.resetBrandingCategory(cat);
      toast.success(`${result.reset} valores restaurados`);
      load();
    } catch { toast.error('Error al restaurar'); }
  };

  const catSettings = all.filter(s => s.category === tab);
  const currentCat  = CATEGORIES.find(c => c.key === tab);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Paintbrush className="text-indigo-400" size={24} />
          <div>
            <h1 className="text-xl font-bold text-white">Branding & Tema</h1>
            <p className="text-sm text-gray-400">Personaliza la apariencia del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700 px-2 py-1 rounded-full">
              Cambios sin guardar
            </span>
          )}
          <button
            onClick={() => { setDraft(Object.fromEntries(all.map(r => [r.key, r.value ?? '']))); setDirty(false); }}
            disabled={!dirty}
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg text-sm disabled:opacity-40"
          >
            <RotateCcw size={13} /> Descartar
          </button>
          <button
            onClick={saveAll} disabled={!dirty || saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar todo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit border border-gray-700 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              tab === c.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <c.icon size={13} />
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <RefreshCw className="animate-spin mr-2" size={18} /> Cargando…
        </div>
      ) : (
        <div className={`grid ${tab === 'colors' ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'} gap-6`}>
          {/* Settings panel */}
          <div className={tab === 'colors' ? 'xl:col-span-2' : ''}>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  {currentCat && <currentCat.icon size={16} className="text-indigo-400" />}
                  {currentCat?.label}
                </h2>
                <button
                  onClick={() => resetCategory(tab)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-yellow-400 transition-colors"
                >
                  <RotateCcw size={12} /> Restaurar valores
                </button>
              </div>

              {catSettings.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay ajustes en esta categoría.</p>
              ) : (
                catSettings.map(s => (
                  <SettingField
                    key={s.key}
                    setting={s}
                    value={draft[s.key] ?? ''}
                    onChange={v => change(s.key, v)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Color preview (solo en tab colores) */}
          {tab === 'colors' && (
            <div className="space-y-4">
              <ColorPreview draft={draft} />
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Colores actuales</p>
                <div className="space-y-2">
                  {catSettings.map(s => (
                    <div key={s.key} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{draft[s.key] || '—'}</span>
                        <div className="w-5 h-5 rounded border border-gray-600" style={{ background: draft[s.key] || '#888' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Login preview */}
          {tab === 'login' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">Vista previa del login</p>
              <div className="bg-gray-900 rounded-lg p-6 text-center border border-gray-700">
                {draft.login_bg_url && (
                  <div className="h-20 rounded-lg mb-4 bg-cover bg-center" style={{ backgroundImage: `url(${draft.login_bg_url})` }} />
                )}
                {draft.logo_url ? (
                  <img src={draft.logo_url} alt="Logo" className="h-10 mx-auto mb-3 object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-600/50 mx-auto mb-3 flex items-center justify-center">
                    <Paintbrush size={16} className="text-indigo-400" />
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-1">{draft.login_title || 'Bienvenido'}</h3>
                <p className="text-xs text-gray-400">{draft.login_subtitle || 'Ingresa tus credenciales'}</p>
                <div className="mt-4 space-y-2">
                  <div className="h-8 rounded-lg bg-gray-700 border border-gray-600" />
                  <div className="h-8 rounded-lg bg-gray-700 border border-gray-600" />
                  <div className="h-9 rounded-lg" style={{ background: draft.color_primary ?? '#6366f1' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
