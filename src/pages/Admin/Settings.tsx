import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings2, Save, RefreshCw, Check, Plus, X, MapPin, Wifi, DollarSign } from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { GroupedSettings, ConfigEntry } from '@/services/adminService';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ── Tab config ─────────────────────────────────────────────────────────────────
const GROUP_LABELS: Record<string, string> = {
  branding:  '🏷️ Marca',
  locale:    '🌍 Regional',
  fiscal:    '💰 Fiscal',
  security:  '🔒 Seguridad',
  features:  '✨ Funciones',
  email:     '📧 Email',
  kiosco:    '🖥️ Kiosco',
  propina:   '🪙 Propina',
  empleador: '📋 Empleador DT',
};

const BOOLEAN_KEYS = new Set(['feature_loyalty', 'feature_reservations', 'feature_kds', 'feature_delivery', 'feature_multi_branch']);
const PASSWORD_KEYS = new Set(['smtp_password']);

// ── Field component ────────────────────────────────────────────────────────────
function ConfigField({
  entry,
  value,
  onChange,
}: {
  entry: ConfigEntry;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const isBoolean = BOOLEAN_KEYS.has(entry.key);
  const isPassword = PASSWORD_KEYS.has(entry.key);
  const isNumber = !isNaN(Number(entry.value)) && entry.value !== '' && !isBoolean;

  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{entry.label}</p>
        {entry.description && <p className="text-xs text-gray-400 mt-0.5">{entry.description}</p>}
        <p className="text-xs font-mono text-gray-300 mt-0.5">{entry.key}</p>
      </div>
      <div className="flex-shrink-0">
        {isBoolean ? (
          <button
            onClick={() => onChange(entry.key, value === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value === 'true' ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value === 'true' ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        ) : (
          <input
            type={isPassword ? 'password' : isNumber ? 'number' : 'text'}
            value={value}
            onChange={e => onChange(entry.key, e.target.value)}
            className="w-56 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    </div>
  );
}

// ── Kiosk Security Panel ──────────────────────────────────────────────────────
interface KioskSecurity {
  kiosk_ip_whitelist: string[];
  kiosk_geo_enabled:  boolean;
  kiosk_lat:          number | null;
  kiosk_lon:          number | null;
  kiosk_radius_m:     number;
}

function KioskSecurityPanel() {
  const qc = useQueryClient();
  const [ipInput,    setIpInput]    = useState('');
  const [ipList,     setIpList]     = useState<string[]>([]);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoLat,     setGeoLat]     = useState<string>('');
  const [geoLon,     setGeoLon]     = useState<string>('');
  const [geoRadius,  setGeoRadius]  = useState<string>('200');
  const [saving,     setSaving]     = useState(false);

  const { data, isLoading } = useQuery<KioskSecurity>({
    queryKey: ['tenant', 'kiosk-security'],
    queryFn:  async () => {
      const res = await api.get<KioskSecurity>('/tenant/kiosk-security');
      return res.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setIpList(data.kiosk_ip_whitelist ?? []);
    setGeoEnabled(data.kiosk_geo_enabled ?? false);
    setGeoLat(data.kiosk_lat != null ? String(data.kiosk_lat) : '');
    setGeoLon(data.kiosk_lon != null ? String(data.kiosk_lon) : '');
    setGeoRadius(String(data.kiosk_radius_m ?? 200));
  }, [data]);

  const addIp = () => {
    const val = ipInput.trim();
    if (!val || ipList.includes(val)) return;
    // Basic CIDR/IP validation
    const ipRe = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRe.test(val)) { toast.error('Formato inválido. Ej: 181.43.12.1 o 181.43.12.0/24'); return; }
    setIpList(prev => [...prev, val]);
    setIpInput('');
  };

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setGeoLat(String(pos.coords.latitude));
        setGeoLon(String(pos.coords.longitude));
        toast.success('Ubicación capturada');
      },
      () => toast.error('No se pudo obtener la ubicación'),
      { timeout: 10_000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/tenant/kiosk-security', {
        kiosk_ip_whitelist: ipList,
        kiosk_geo_enabled:  geoEnabled,
        kiosk_lat:  geoLat ? parseFloat(geoLat)  : null,
        kiosk_lon:  geoLon ? parseFloat(geoLon)  : null,
        kiosk_radius_m: parseInt(geoRadius, 10) || 200,
      });
      toast.success('Configuración del kiosco guardada');
      qc.invalidateQueries({ queryKey: ['tenant', 'kiosk-security'] });
    } catch (e: any) {
      toast.error(e?.data?.error ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="py-10 text-center text-gray-400">Cargando…</p>;

  return (
    <div className="px-6 py-5 space-y-8">
      {/* IP Whitelist */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Wifi className="w-4 h-4 text-blue-500" />
          <h4 className="text-sm font-semibold text-gray-800">Lista blanca de IPs</h4>
        </div>
        <p className="text-xs text-gray-400">
          Solo se permitirá el check-in desde estas IPs o rangos CIDR. Deja vacío para permitir cualquier IP.
        </p>
        <div className="flex gap-2">
          <input
            value={ipInput}
            onChange={e => setIpInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIp()}
            placeholder="181.43.12.1 o 181.43.12.0/24"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addIp}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
        {ipList.length > 0 && (
          <ul className="space-y-1.5">
            {ipList.map((ip, i) => (
              <li key={i} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <span className="font-mono text-sm text-gray-700">{ip}</span>
                <button onClick={() => setIpList(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {ipList.length === 0 && (
          <p className="text-xs text-gray-400 italic">Sin IPs configuradas — se permite cualquier IP.</p>
        )}
      </div>

      {/* Geofencing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-semibold text-gray-800">Geofencing</h4>
          </div>
          <button
            onClick={() => setGeoEnabled(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${geoEnabled ? 'bg-orange-500' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${geoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          El empleado deberá estar dentro del radio configurado para registrar asistencia.
        </p>
        {geoEnabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitud</label>
                <input type="number" step="any" value={geoLat} onChange={e => setGeoLat(e.target.value)}
                  placeholder="-33.4489"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitud</label>
                <input type="number" step="any" value={geoLon} onChange={e => setGeoLon(e.target.value)}
                  placeholder="-70.6693"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Radio (metros)</label>
              <input type="number" min="10" max="5000" value={geoRadius} onChange={e => setGeoRadius(e.target.value)}
                className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <button onClick={useMyLocation} className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors">
              <MapPin className="w-4 h-4" /> Usar mi ubicación actual
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Guardando…' : 'Guardar configuración del kiosco'}
      </button>
    </div>
  );
}

// ── Tip Settings Panel ────────────────────────────────────────────────────────
export interface TipSettings {
  enabled_dine_in:         boolean;
  enabled_counter:         boolean;
  tip_percentage:          number;
  print_on_table_control:  boolean;
  print_on_counter_ticket: boolean;
  ignore_discounts:        boolean;
}

export function TipSettingsPanel() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<TipSettings>({
    enabled_dine_in:         false,
    enabled_counter:         false,
    tip_percentage:          10,
    print_on_table_control:  false,
    print_on_counter_ticket: false,
    ignore_discounts:        false,
  });

  const { data, isLoading } = useQuery<TipSettings>({
    queryKey: ['tenant', 'tip-settings'],
    queryFn: async () => {
      const res = await api.get<TipSettings>('/tenant/tip-settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const toggle = (key: keyof TipSettings) =>
    setCfg(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/tenant/tip-settings', cfg);
      toast.success('Configuración de propinas guardada');
      qc.invalidateQueries({ queryKey: ['tenant', 'tip-settings'] });
    } catch {
      toast.error('Error al guardar configuración de propinas');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="py-10 text-center text-gray-400">Cargando…</p>;

  const ToggleRow = ({ label, desc, field }: { label: string; desc?: string; field: keyof TipSettings }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => toggle(field)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${cfg[field] ? 'bg-amber-500' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cfg[field] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="px-6 py-5 space-y-6">
      {/* Porcentaje */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Porcentaje de propina por defecto
        </label>
        <p className="text-xs text-gray-400 mb-2">Se usará como valor inicial en el modal de pago.</p>
        <div className="flex items-center gap-2 w-40">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={cfg.tip_percentage}
            onChange={e => setCfg(prev => ({ ...prev, tip_percentage: Math.max(0, Math.min(100, Number(e.target.value))) }))}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span className="text-gray-500 font-semibold">%</span>
        </div>
      </div>

      {/* Habilitación por canal */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Habilitar propina en</p>
        <div className="bg-gray-50 rounded-xl border border-gray-100 px-4">
          <ToggleRow label="Mesas (Dine-In)"    desc="Mostrar propina al cerrar una mesa"          field="enabled_dine_in"         />
          <ToggleRow label="Mostrador / Delivery" desc="Mostrar propina en ventas de mostrador y delivery" field="enabled_counter"         />
        </div>
      </div>

      {/* Imprimir en ticket */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Imprimir propina en</p>
        <div className="bg-gray-50 rounded-xl border border-gray-100 px-4">
          <ToggleRow label="Control de Mesa"    desc="Incluir línea de propina en el ticket de pre-cuenta" field="print_on_table_control"  />
          <ToggleRow label="Ticket de Mostrador" desc="Incluir línea de propina en el ticket de venta"      field="print_on_counter_ticket" />
        </div>
      </div>

      {/* Cálculo */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cálculo</p>
        <div className="bg-gray-50 rounded-xl border border-gray-100 px-4">
          <ToggleRow
            label="Ignorar descuentos en el cálculo"
            desc="Si activo, la propina se calcula sobre el subtotal SIN descuento"
            field="ignore_discounts"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Guardando…' : 'Guardar configuración de propinas'}
      </button>
    </div>
  );
}

// ── Empleador DT Panel ────────────────────────────────────────────────────────
function EmpleadorDTPanel() {
  const [razonSocial, setRazonSocial] = useState('');
  const [rutEmp, setRutEmp]           = useState('');
  const [direccion, setDireccion]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    api.get('/admin/settings/flat')
      .then(r => {
        const d = r.data?.data ?? r.data ?? {};
        setRazonSocial(d.business_name ?? '');
        setRutEmp(d.business_rut ?? '');
        setDireccion(d.business_address ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await adminService.updateSettings({
        business_name:    razonSocial,
        business_rut:     rutEmp,
        business_address: direccion,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Datos del empleador guardados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="px-6 py-10 text-center text-gray-400">Cargando…</p>;

  return (
    <div className="px-6 py-4 space-y-4">
      <p className="text-sm text-gray-500 mb-2">
        Estos datos aparecen en el encabezado del <strong>Libro de Asistencia Digital</strong> (Decreto 101 DT Chile).
      </p>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Razón Social</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={razonSocial}
          onChange={e => setRazonSocial(e.target.value)}
          placeholder="Ej: Restaurante Hamachi Ltda."
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">RUT Empleador</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={rutEmp}
          onChange={e => setRutEmp(e.target.value)}
          placeholder="Ej: 76.123.456-7"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Dirección</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={direccion}
          onChange={e => setDireccion(e.target.value)}
          placeholder="Ej: Av. Apoquindo 4800, Las Condes, Santiago"
        />
      </div>
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
          }`}
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar datos empleador'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Settings() {
  const qc = useQueryClient();
  const [activeGroup, setActiveGroup] = useState('branding');
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [savedGroup, setSavedGroup] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<GroupedSettings>({
    queryKey: ['admin', 'settings'],
    queryFn:  () => adminService.getSettings(),
  });

  // Initialize local state when data loads
  useEffect(() => {
    if (!settings) return;
    const flat: Record<string, string> = {};
    Object.values(settings).flat().forEach(e => { flat[e.key] = e.value; });
    setLocalValues(flat);
    setDirty(false);
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (updates: Record<string, string>) => adminService.updateSettings(updates),
    onSuccess: () => {
      toast.success('Configuración guardada');
      setDirty(false);
      setSavedGroup(activeGroup);
      setTimeout(() => setSavedGroup(null), 2000);
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  function handleChange(key: string, val: string) {
    setLocalValues(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  }

  function handleSave() {
    if (!settings) return;
    const groupEntries = settings[activeGroup] ?? [];
    const updates: Record<string, string> = {};
    groupEntries.forEach(e => { updates[e.key] = localValues[e.key] ?? e.value; });
    saveMut.mutate(updates);
  }

  // Siempre incluir 'kiosco' y 'propina' aunque no vengan en los settings del servidor
  const groups = settings
    ? [...new Set([...Object.keys(settings), 'kiosco', 'propina', 'empleador'])]
    : Object.keys(GROUP_LABELS);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings2 className="w-6 h-6" /> Configuración del sistema
          </h1>
          <p className="text-gray-500 text-sm mt-1">Parámetros globales del negocio</p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'settings'] })}
          className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-44 flex-shrink-0 space-y-1">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                activeGroup === group
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {GROUP_LABELS[group] ?? group}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {GROUP_LABELS[activeGroup] ?? activeGroup}
            </h2>
            {activeGroup !== 'kiosco' && activeGroup !== 'propina' && activeGroup !== 'empleador' && (
              <button
                onClick={handleSave}
                disabled={!dirty || saveMut.isPending || isLoading}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                  savedGroup === activeGroup
                    ? 'bg-green-600 text-white'
                    : dirty
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {savedGroup === activeGroup
                  ? <><Check className="w-4 h-4" /> Guardado</>
                  : <><Save className="w-4 h-4" /> Guardar</>}
              </button>
            )}
          </div>

          {activeGroup === 'kiosco' ? (
            <KioskSecurityPanel />
          ) : activeGroup === 'propina' ? (
            <TipSettingsPanel />
          ) : activeGroup === 'empleador' ? (
            <EmpleadorDTPanel />
          ) : (
            <div className="px-6">
              {isLoading && <p className="py-10 text-center text-gray-400">Cargando…</p>}
              {!isLoading && settings && (settings[activeGroup] ?? []).map((entry: ConfigEntry) => (
                <ConfigField
                  key={entry.key}
                  entry={entry}
                  value={localValues[entry.key] ?? entry.value}
                  onChange={handleChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
