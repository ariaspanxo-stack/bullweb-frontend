import { useState, useEffect } from 'react';
import { UserX, Cake, Smile, Crown, PlayCircle, Settings2, CheckCircle2, XCircle, Edit2, X, Loader2, TrendingUp } from 'lucide-react';
import fidelizacionService from '@/services/fidelizacionService';
import type { AutomationSettings, FidelizacionStats, CampaignLog } from '@/services/fidelizacionService';

interface AutomationCardProps {
  icon:        React.ElementType;
  iconColor:   string;
  bgColor:     string;
  title:       string;
  description: string;
  enabled:     boolean;
  onToggle:    (v: boolean) => void;
  statLabel:   string;
  statValue:   number;
  lastSent?:   string | null;
  onTest?:     () => void;
  testing?:    boolean;
  onEdit?:     () => void;
}

function AutomationCard({
  icon: Icon, iconColor, bgColor, title, description,
  enabled, onToggle, statLabel, statValue, lastSent, onTest, testing, onEdit,
}: AutomationCardProps) {
  return (
    <div className={`bg-white rounded-xl border ${enabled ? 'border-orange-200 shadow-sm' : 'border-gray-200'} p-5 transition-all`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`shrink-0 ${bgColor} p-3 rounded-xl`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar configuración"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Toggle */}
          <button
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enabled ? 'bg-orange-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats + Test button */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          {enabled ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
            {enabled ? 'Activo' : 'Desactivado'}
          </span>
          {statValue > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-400" />
                {statValue.toLocaleString('es-CL')} {statLabel}
              </span>
            </>
          )}
          {lastSent && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">Último: {lastSent}</span>
            </>
          )}
        </div>
        {onTest && enabled && (
          <button
            onClick={onTest}
            disabled={testing}
            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {testing ? 'Enviando...' : 'Probar'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Edit modal
// ─────────────────────────────────────────────
interface EditModalProps {
  automationType: 'inactive' | 'birthday' | 'welcome' | 'vip';
  settings: AutomationSettings;
  onSave: (patch: Partial<AutomationSettings>) => Promise<void>;
  onClose: () => void;
}

function AutomationEditModal({ automationType, settings, onSave, onClose }: EditModalProps) {
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [localPatch, setLocalPatch] = useState<Partial<AutomationSettings>>({
    inactiveDays:        settings.inactiveDays,
    inactiveDiscountPct: settings.inactiveDiscountPct,
    birthdayGift:        settings.birthdayGift,
    vipMinSpend:         settings.vipMinSpend,
    pointsPerPeso:       settings.pointsPerPeso,
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(localPatch);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const titles: Record<string, string> = {
    inactive: 'Recuperar clientes inactivos',
    birthday: 'Felicitar cumpleaños',
    welcome:  'Bienvenida a nuevos clientes',
    vip:      'Reconocer clientes VIP',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{titles[automationType]}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>
          )}

          {automationType === 'inactive' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Días sin visita para considerar inactivo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={7}
                    max={365}
                    value={localPatch.inactiveDays}
                    onChange={(e) => setLocalPatch((p) => ({ ...p, inactiveDays: Number(e.target.value) }))}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-500">días</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descuento a ofrecer (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={localPatch.inactiveDiscountPct}
                    onChange={(e) => setLocalPatch((p) => ({ ...p, inactiveDiscountPct: Number(e.target.value) }))}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
            </>
          )}

          {automationType === 'birthday' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Regalo de cumpleaños (descripción del beneficio)
              </label>
              <input
                type="text"
                value={localPatch.birthdayGift}
                onChange={(e) => setLocalPatch((p) => ({ ...p, birthdayGift: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                placeholder="Ej: 1 postre gratis"
              />
            </div>
          )}

          {automationType === 'welcome' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">Automatización sin configuración adicional</p>
              <p className="text-xs text-blue-600">
                El email de bienvenida se envía automáticamente a clientes nuevos. 
                Para personalizar el contenido, edita la plantilla de email.
              </p>
            </div>
          )}

          {automationType === 'vip' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Gasto mínimo para ser VIP ($)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={localPatch.vipMinSpend}
                  onChange={(e) => setLocalPatch((p) => ({ ...p, vipMinSpend: Number(e.target.value) }))}
                  className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-white">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Logs table
// ─────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  inactive: 'Inactivo',
  birthday: 'Cumpleaños',
  welcome:  'Bienvenida',
  vip:      'VIP',
};

function LogsTable({ logs }: { logs: CampaignLog[] }) {
  if (!logs.length) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        No hay envíos registrados todavía
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="pb-2 font-medium pr-4">Fecha</th>
            <th className="pb-2 font-medium pr-4">Tipo</th>
            <th className="pb-2 font-medium pr-4">Cliente</th>
            <th className="pb-2 font-medium pr-4">Email</th>
            <th className="pb-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString('es-CL', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                  {TYPE_LABELS[log.type] ?? log.type}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-800">
                {log.customers?.name ?? '—'}
              </td>
              <td className="py-2 pr-4 text-gray-500 text-xs">
                {log.customers?.email ?? '—'}
              </td>
              <td className="py-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  log.status === 'SENT' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {log.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function AutomationsTab() {
  const [settings, setSettings]       = useState<AutomationSettings | null>(null);
  const [fStats, setFStats]           = useState<FidelizacionStats | null>(null);
  const [logs, setLogs]               = useState<CampaignLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [testing, setTesting]         = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [showLogs, setShowLogs]       = useState(false);
  const [editingType, setEditingType] = useState<'inactive' | 'birthday' | 'welcome' | 'vip' | null>(null);
  const [confirmTest, setConfirmTest] = useState<string | null>(null);
  const [testEmail, setTestEmail]     = useState('');
  const [testError, setTestError]     = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [logLimit, setLogLimit]       = useState(50);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoadError(null);
    try {
      setLoading(true);
      const [s, fs, l] = await Promise.all([
        fidelizacionService.getSettings(),
        fidelizacionService.getStats(),
        fidelizacionService.getLogs(logLimit),
      ]);
      setSettings(s);
      setFStats(fs);
      setLogs(l);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Error al cargar automatizaciones');
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof AutomationSettings, value: boolean) => {
    if (!settings) return;
    const optimistic = { ...settings, [key]: value };
    setSettings(optimistic);
    setSaving(true);
    try {
      await fidelizacionService.updateSettings({ [key]: value });
    } catch {
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (patch: Partial<AutomationSettings>) => {
    const updated = await fidelizacionService.updateSettings(patch);
    setSettings(updated);
  };

  const handleTest = async (type: string) => {
    setConfirmTest(null);
    setTesting(type);
    try {
      await fidelizacionService.runTest(type as 'inactive' | 'birthday' | 'welcome');
      await load();
    } catch {
      // noop
    } finally {
      setTesting(null);
    }
  };

  const handleConfirmTestEmail = async () => {
    if (!confirmTest) return;
    if (!testEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) {
      setTestError('Ingresa un email válido');
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestSuccess(false);
    try {
      await fidelizacionService.runTestEmail(
        confirmTest as 'inactive' | 'birthday' | 'welcome' | 'vip',
        testEmail
      );
      setTestSuccess(true);
      setTimeout(() => {
        setConfirmTest(null);
        setTestEmail('');
        setTestSuccess(false);
        setTestError(null);
      }, 2200);
    } catch (err: any) {
      setTestError(err?.response?.data?.error ?? err?.message ?? 'Error al enviar la prueba');
    } finally {
      setTestLoading(false);
    }
  };

  /* Last sent date per type from logs */
  const lastSentByType = (type: string): string | null => {
    const log = logs.find((l) => l.type === type && l.status === 'SENT');
    if (!log) return null;
    return new Date(log.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
  };

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={load} className="text-xs underline font-medium ml-4">Reintentar</button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Automatizaciones de email</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Los emails se envían automáticamente según las reglas configuradas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-orange-500 animate-pulse">Guardando…</span>}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {showLogs ? 'Ocultar historial' : 'Ver historial'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={load} className="text-xs underline font-medium ml-4">Reintentar</button>
        </div>
      )}

      {/* Stats banners with color */}
      {fStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Enviados total',  value: fStats.totalSent,     color: 'bg-orange-50  border-orange-100 text-orange-700' },
            { label: 'Últimos 30 días', value: fStats.last30Days,    color: 'bg-blue-50    border-blue-100   text-blue-700'   },
            { label: 'Inactivos',       value: fStats.inactiveCount, color: 'bg-red-50     border-red-100    text-red-700'    },
            { label: 'Cumpleaños',      value: fStats.birthdayCount, color: 'bg-pink-50    border-pink-100   text-pink-700'   },
            { label: 'Bienvenida',      value: fStats.welcomeCount,  color: 'bg-green-50   border-green-100  text-green-700'  },
            { label: 'VIP',             value: fStats.vipCount,      color: 'bg-yellow-50  border-yellow-100 text-yellow-700' },
          ].map((s) => (
            <div key={s.label} className={`border rounded-xl px-4 py-3 text-center ${s.color}`}>
              <p className="text-xl font-bold">{Number(s.value ?? 0).toLocaleString('es-CL')}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Automation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AutomationCard
          icon={UserX}
          iconColor="text-red-500"
          bgColor="bg-red-50"
          title="Recuperar clientes inactivos"
          description={`Descuento del ${settings.inactiveDiscountPct}% a clientes sin visita en ${settings.inactiveDays} días. Ejecución: 21:00.`}
          enabled={settings.autoInactiveEnabled}
          onToggle={(v) => toggleSetting('autoInactiveEnabled', v)}
          statLabel="enviados"
          statValue={fStats?.inactiveCount ?? 0}
          lastSent={lastSentByType('inactive')}
          onTest={() => setConfirmTest('inactive')}
          testing={testing === 'inactive'}
          onEdit={() => setEditingType('inactive')}
        />
        <AutomationCard
          icon={Cake}
          iconColor="text-pink-500"
          bgColor="bg-pink-50"
          title="Felicitar cumpleaños"
          description={`Regalo: "${settings.birthdayGift}" a clientes que cumplen hoy. Ejecución: 08:00.`}
          enabled={settings.autoBirthdayEnabled}
          onToggle={(v) => toggleSetting('autoBirthdayEnabled', v)}
          statLabel="enviados"
          statValue={fStats?.birthdayCount ?? 0}
          lastSent={lastSentByType('birthday')}
          onTest={() => setConfirmTest('birthday')}
          testing={testing === 'birthday'}
          onEdit={() => setEditingType('birthday')}
        />
        <AutomationCard
          icon={Smile}
          iconColor="text-blue-500"
          bgColor="bg-blue-50"
          title="Bienvenida a nuevos clientes"
          description="Email de bienvenida a clientes registrados en la última hora. Ejecución: cada hora."
          enabled={settings.autoWelcomeEnabled}
          onToggle={(v) => toggleSetting('autoWelcomeEnabled', v)}
          statLabel="enviados"
          statValue={fStats?.welcomeCount ?? 0}
          lastSent={lastSentByType('welcome')}
          onTest={() => setConfirmTest('welcome')}
          testing={testing === 'welcome'}
          onEdit={() => setEditingType('welcome')}
        />
        <AutomationCard
          icon={Crown}
          iconColor="text-yellow-500"
          bgColor="bg-yellow-50"
          title="Reconocer clientes VIP"
          description={`Email especial a clientes con gasto total mayor a $${(settings.vipMinSpend ?? 0).toLocaleString('es-CL')}.`}
          enabled={settings.autoVipEnabled}
          onToggle={(v) => toggleSetting('autoVipEnabled', v)}
          statLabel="enviados"
          statValue={fStats?.vipCount ?? 0}
          onEdit={() => setEditingType('vip')}
        />
      </div>

      {/* Logs (collapsible) */}
      {showLogs && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Historial de envíos</h3>
          <LogsTable logs={logs} />
          {logs.length >= logLimit && (
            <div className="mt-4 text-center">
              <button
                onClick={() => { setLogLimit((l) => l + 50); load(); }}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium underline"
              >
                Cargar más
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm test modal — con input de email y feedback */}
      {confirmTest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-gray-900 mb-1">Ejecutar prueba de email</h3>
            <p className="text-sm text-gray-500 mb-4">
              Recibirás el template <strong className="text-orange-600">{confirmTest}</strong> como correo real. Ingresa tu email.
            </p>

            <input
              type="email"
              placeholder="tu@correo.com"
              value={testEmail}
              onChange={(e) => { setTestEmail(e.target.value); setTestError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmTestEmail()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent mb-2"
              autoFocus
            />

            {testError && (
              <p className="text-xs text-red-600 mb-2">{testError}</p>
            )}
            {testSuccess && (
              <p className="text-xs text-green-600 font-medium mb-2">Email enviado correctamente ✅</p>
            )}

            <div className="flex gap-3 justify-end mt-3">
              <button
                onClick={() => { setConfirmTest(null); setTestEmail(''); setTestError(null); setTestSuccess(false); }}
                disabled={testLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTestEmail}
                disabled={testLoading || testSuccess}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</> : 'Confirmar envío'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingType && (
        <AutomationEditModal
          automationType={editingType}
          settings={settings}
          onSave={handleSaveEdit}
          onClose={() => setEditingType(null)}
        />
      )}
    </div>
  );
}