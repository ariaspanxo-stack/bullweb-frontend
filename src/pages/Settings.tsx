import { useState, useEffect } from 'react';
import {
  Settings, Bell, Monitor, Globe, RefreshCw, ShieldCheck,
  ChevronRight, Check, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// ─── Preference types ────────────────────────────────────────────────────────
interface AppPreferences {
  autoRefreshInterval: number; // seconds (0 = off)
  soundAlerts: boolean;
  compactSidebar: boolean;
  defaultDateRange: '7d' | '30d' | '90d';
  language: 'es-CL' | 'es-PE' | 'es-MX';
}

const DEFAULT_PREFS: AppPreferences = {
  autoRefreshInterval: 10,
  soundAlerts: false,
  compactSidebar: false,
  defaultDateRange: '30d',
  language: 'es-CL',
};

const PREFS_KEY = 'bullweb_app_prefs';

function loadPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: AppPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────
function Row({ label, description, control }: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AppSettings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<AppPreferences>(loadPrefs);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPrefs(p => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    savePrefs(prefs);
    setSaved(true);
    toast.success('Preferencias guardadas');
    setTimeout(() => setSaved(false), 2000);
  };

  // Auto-save on unmount
  useEffect(() => {
    return () => { savePrefs(prefs); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = user?.role?.name?.toLowerCase().includes('admin') ||
    user?.role?.permissions?.includes('admin.view');

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
          <Settings className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-0.5">Preferencias personales de la aplicación</p>
        </div>
      </div>

      {/* Interfaz */}
      <Section title="Interfaz" icon={Monitor}>
        <Row
          label="Auto-actualización de órdenes"
          description="Intervalo de refresco automático de la lista de órdenes"
          control={
            <select
              value={prefs.autoRefreshInterval}
              onChange={e => update('autoRefreshInterval', Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Desactivado</option>
              <option value={5}>5 segundos</option>
              <option value={10}>10 segundos</option>
              <option value={30}>30 segundos</option>
              <option value={60}>1 minuto</option>
            </select>
          }
        />
        <Row
          label="Rango de fechas por defecto"
          description="Usado en reportes y filtros de fechas"
          control={
            <select
              value={prefs.defaultDateRange}
              onChange={e => update('defaultDateRange', e.target.value as AppPreferences['defaultDateRange'])}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
          }
        />
      </Section>

      {/* Notificaciones */}
      <Section title="Notificaciones" icon={Bell}>
        <Row
          label="Alertas de sonido"
          description="Sonido al llegar nuevas órdenes o alertas del sistema"
          control={
            <Toggle value={prefs.soundAlerts} onChange={v => update('soundAlerts', v)} />
          }
        />
      </Section>

      {/* Regional */}
      <Section title="Regional e idioma" icon={Globe}>
        <Row
          label="Formato de localización"
          description="Afecta el formato de fechas y moneda"
          control={
            <select
              value={prefs.language}
              onChange={e => update('language', e.target.value as AppPreferences['language'])}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="es-CL">Español (Chile)</option>
              <option value="es-PE">Español (Perú)</option>
              <option value="es-MX">Español (México)</option>
            </select>
          }
        />
      </Section>

      {/* Admin settings shortcut */}
      {isAdmin && (
        <Section title="Configuración del sistema" icon={ShieldCheck}>
          <button
            onClick={() => navigate('/admin/settings')}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">Ajustes del sistema</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Marca, fiscal, seguridad, funcionalidades y más
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">Panel de administración</p>
              <p className="text-xs text-gray-400 mt-0.5">Usuarios, roles, auditoría, webhooks y más</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        </Section>
      )}

      {/* Acerca de */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 space-y-0.5">
          <p className="font-semibold">Bullweb 3.0</p>
          <p>Sistema de gestión para restaurantes · Entorno de desarrollo</p>
          <p className="text-blue-500">API: 72.62.86.188 · v1.0.0</p>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          {saved ? 'Guardado' : 'Guardar preferencias'}
        </button>
      </div>
    </div>
  );
}
