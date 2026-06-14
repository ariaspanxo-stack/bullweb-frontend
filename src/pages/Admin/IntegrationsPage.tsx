import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plug, Plus, Trash2, Check, X, RefreshCw, Send,
  CheckCircle, XCircle, Clock, Activity, Zap, AlertTriangle,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type {
  IntegrationChannel, IntegrationLog, IntegrationStats,
  IntegrationType, IntegrationEvent,
} from '@/services/adminService';

const TYPE_ICONS: Record<string, string> = {
  slack:           '🔔',
  telegram:        '✈️',
  discord:         '🎮',
  teams:           '💼',
  whatsapp:        '💬',
  generic_webhook: '🔗',
};
const TYPE_COLORS: Record<string, string> = {
  slack:           'bg-yellow-900/30 border-yellow-700 text-yellow-300',
  telegram:        'bg-blue-900/30 border-blue-700 text-blue-300',
  discord:         'bg-indigo-900/30 border-indigo-700 text-indigo-300',
  teams:           'bg-purple-900/30 border-purple-700 text-purple-300',
  whatsapp:        'bg-green-900/30 border-green-700 text-green-300',
  generic_webhook: 'bg-gray-800 border-gray-600 text-gray-300',
};

// ── ChannelModal ──────────────────────────────────────────────────────────────
interface ModalProps {
  channel?: IntegrationChannel | null;
  types:    IntegrationType[];
  events:   IntegrationEvent[];
  onClose:  () => void;
  onSave:   () => void;
}
function ChannelModal({ channel, types, events, onClose, onSave }: ModalProps) {
  const [name,       setName]       = useState(channel?.name ?? '');
  const [type,       setType]       = useState(channel?.type ?? 'slack');
  const [webhookUrl, setWebhookUrl] = useState(channel?.webhook_url ?? '');
  const [token,      setToken]      = useState(channel?.token ?? '');
  const [chatId,     setChatId]     = useState(channel?.chat_id ?? '');
  const [selEvents,  setSelEvents]  = useState<string[]>(channel?.events ?? []);
  const [saving,     setSaving]     = useState(false);

  const selectedType = types.find(t => t.key === type);
  const needsWebhook = selectedType?.fields.includes('webhook_url');
  const needsToken   = selectedType?.fields.includes('token');

  const toggleEvent = (key: string) => {
    if (key === '*') { setSelEvents(['*']); return; }
    setSelEvents(prev => {
      const without = prev.filter(e => e !== '*');
      return without.includes(key) ? without.filter(e => e !== key) : [...without, key];
    });
  };

  const submit = async () => {
    if (!name.trim()) return toast.error('El nombre es requerido');
    setSaving(true);
    try {
      const payload = {
        name, type,
        webhook_url: webhookUrl || null,
        token:       token      || null,
        chat_id:     chatId     || null,
        events:      selEvents,
      };
      if (channel) {
        await adminService.updateIntegrationChannel(channel.id, payload);
        toast.success('Canal actualizado');
      } else {
        await adminService.createIntegrationChannel(payload);
        toast.success('Canal creado');
      }
      onSave();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {channel ? 'Editar canal' : 'Nuevo canal de integración'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Ej: Slack Alertas Críticas" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tipo *</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
              {types.map(t => (
                <option key={t.key} value={t.key}>{TYPE_ICONS[t.key]} {t.label}</option>
              ))}
            </select>
          </div>
          {needsWebhook && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Webhook URL *</label>
              <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} type="url"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                placeholder="https://hooks.slack.com/services/..." />
            </div>
          )}
          {needsToken && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Token del bot *</label>
                <input value={token} onChange={e => setToken(e.target.value)} type="password"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="12345:ABCdef..." />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Chat ID / Channel ID *</label>
                <input value={chatId} onChange={e => setChatId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="-1001234567890" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Eventos que disparan este canal</label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {events.map(ev => (
                <button key={ev.key}
                  onClick={() => toggleEvent(ev.key)}
                  className={`px-2 py-1 rounded-full text-xs border transition-all ${
                    selEvents.includes(ev.key)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {selEvents.includes(ev.key) && <Check size={10} className="inline mr-1" />}
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'sent')    return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={11} />Enviado</span>;
  if (status === 'failed')  return <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={11} />Fallido</span>;
  return <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} />Pendiente</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [tab,       setTab]       = useState<'channels' | 'logs'>('channels');
  const [stats,     setStats]     = useState<IntegrationStats | null>(null);
  const [channels,  setChannels]  = useState<IntegrationChannel[]>([]);
  const [logs,      setLogs]      = useState<IntegrationLog[]>([]);
  const [meta,      setMeta]      = useState<{ types: IntegrationType[]; events: IntegrationEvent[] } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [testing,   setTesting]   = useState<string | null>(null);
  const [toggling,  setToggling]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [modal,     setModal]     = useState<'none' | 'create' | 'edit'>('none');
  const [editing,   setEditing]   = useState<IntegrationChannel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ch, m] = await Promise.all([
        adminService.getIntegrationsStats(),
        adminService.listIntegrationChannels(),
        adminService.getIntegrationsMeta(),
      ]);
      setStats(s); setChannels(ch); setMeta(m);
    } catch { toast.error('Error cargando integraciones'); }
    finally { setLoading(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    try { setLogs(await adminService.getIntegrationLogs()); }
    catch { toast.error('Error cargando logs'); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);

  const toggle = async (ch: IntegrationChannel) => {
    setToggling(ch.id);
    try {
      await adminService.updateIntegrationChannel(ch.id, { enabled: !ch.enabled });
      toast.success(ch.enabled ? 'Canal desactivado' : 'Canal activado');
      load();
    } catch { toast.error('Error'); }
    finally { setToggling(null); }
  };

  const testChannel = async (id: string) => {
    setTesting(id);
    try {
      const r = await adminService.testIntegrationChannel(id);
      r.ok ? toast.success(r.message) : toast.error(r.message);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Error en test');
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleting !== id) { setDeleting(id); return; }
    try {
      await adminService.deleteIntegrationChannel(id);
      toast.success('Canal eliminado');
      setDeleting(null);
      load();
    } catch { toast.error('Error al eliminar'); setDeleting(null); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plug className="text-indigo-400" size={24} />
          <div>
            <h1 className="text-xl font-bold text-white">Integraciones</h1>
            <p className="text-sm text-gray-400">Slack, Telegram, Discord, Webhooks y más</p>
          </div>
        </div>
        {tab === 'channels' && (
          <button onClick={() => { setEditing(null); setModal('create'); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">
            <Plus size={14} /> Nuevo canal
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Canales',     value: stats.total_channels,   icon: Plug,          color: 'text-indigo-400' },
            { label: 'Activos',     value: stats.enabled_channels, icon: Zap,           color: 'text-green-400'  },
            { label: 'Enviados',    value: stats.total_sent,       icon: CheckCircle,   color: 'text-blue-400'   },
            { label: 'Fallidos',    value: stats.total_failed,     icon: AlertTriangle, color: 'text-red-400'    },
            { label: 'Últimas 24h', value: stats.last_24h,         icon: Activity,      color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} className={s.color} />
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
              <span className="text-2xl font-bold text-white">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit border border-gray-700">
        {(['channels', 'logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            {t === 'channels' ? 'Canales' : 'Registro de envíos'}
          </button>
        ))}
      </div>

      {/* ── Tab: Channels ── */}
      {tab === 'channels' && (
        loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw className="animate-spin mr-2" size={18} /> Cargando…
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
            <Plug size={32} className="text-gray-600" />
            <p className="text-sm">No hay canales configurados.</p>
            <button onClick={() => { setEditing(null); setModal('create'); }}
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
              <Plus size={14} /> Crear primer canal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {channels.map(ch => (
              <div key={ch.id} className={`bg-gray-800 rounded-xl border p-5 transition-all ${
                ch.enabled ? 'border-gray-700 hover:border-gray-600' : 'border-gray-800 opacity-60'
              }`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TYPE_ICONS[ch.type] ?? '🔗'}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{ch.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TYPE_COLORS[ch.type] ?? ''}`}>
                        {ch.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {/* toggle habilitado */}
                  <button onClick={() => toggle(ch)} disabled={toggling === ch.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${ch.enabled ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                    {toggling === ch.id
                      ? <RefreshCw size={10} className="absolute left-1 text-white animate-spin" />
                      : <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${ch.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    }
                  </button>
                </div>

                {/* Eventos */}
                {ch.events.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {ch.events.slice(0, 3).map(e => (
                      <span key={e} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{e}</span>
                    ))}
                    {ch.events.length > 3 && (
                      <span className="text-[10px] text-gray-500">+{ch.events.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Último test */}
                {ch.last_test_at && (
                  <p className="text-[10px] text-gray-500 mb-3">
                    Último test: {ch.last_test_ok
                      ? <span className="text-green-400">OK</span>
                      : <span className="text-red-400">Fallido</span>
                    } — {new Date(ch.last_test_at).toLocaleString('es-CL')}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                  <span><span className="text-white">{ch.log_count}</span> envíos</span>
                  {ch.fail_count > 0 && <span className="text-red-400">{ch.fail_count} fallidos</span>}
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button onClick={() => testChannel(ch.id)} disabled={testing === ch.id || !ch.enabled}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs disabled:opacity-40">
                    {testing === ch.id
                      ? <><RefreshCw size={11} className="animate-spin" /> Probando…</>
                      : <><Send size={11} /> Test</>}
                  </button>
                  <button onClick={() => { setEditing(ch); setModal('edit'); }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(ch.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      deleting === ch.id ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                    }`}>
                    {deleting === ch.id ? <Check size={11} /> : <Trash2 size={11} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tab: Logs ── */}
      {tab === 'logs' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <span className="text-sm font-medium text-white">Registro de envíos (últimos 50)</span>
            <button onClick={loadLogs} className="text-gray-400 hover:text-white">
              <RefreshCw size={14} />
            </button>
          </div>
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Sin registros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs">
                    <th className="text-left px-4 py-2">Canal</th>
                    <th className="text-left px-4 py-2">Evento</th>
                    <th className="text-left px-4 py-2">Estado</th>
                    <th className="text-left px-4 py-2">Error</th>
                    <th className="text-left px-4 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span>{TYPE_ICONS[log.channel_type] ?? '🔗'}</span>
                          <span className="text-white text-xs">{log.channel_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs font-mono">{log.event ?? '—'}</td>
                      <td className="px-4 py-2"><StatusBadge status={log.status} /></td>
                      <td className="px-4 py-2 text-xs text-red-400 max-w-[200px] truncate">{log.error ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {new Date(log.sent_at).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {(modal === 'create' || modal === 'edit') && meta && (
        <ChannelModal
          channel={modal === 'edit' ? editing : null}
          types={meta.types}
          events={meta.events}
          onClose={() => { setModal('none'); setEditing(null); }}
          onSave={() => { setModal('none'); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
