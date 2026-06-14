import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type Webhook, WEBHOOK_EVENTS } from '@/services/adminService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import {
  PlusCircle, Pencil, Trash2, ToggleLeft, ToggleRight, RefreshCw,
  Webhook as WebhookIcon, Play, RotateCcw, CheckCircle2, XCircle,
  Loader2, Clock, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Event tag ────────────────────────────────────────────────────────────────

const EventTag = ({ event }: { event: string }) => {
  const color = event.startsWith('order')    ? 'bg-blue-50 text-blue-700 border-blue-100'
    : event.startsWith('payment')            ? 'bg-green-50 text-green-700 border-green-100'
    : event.startsWith('customer')           ? 'bg-purple-50 text-purple-700 border-purple-100'
    : event.startsWith('device')             ? 'bg-orange-50 text-orange-700 border-orange-100'
    :                                          'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${color}`}>{event}</span>
  );
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

interface WebhookFormData {
  name:   string;
  url:    string;
  events: string[];
}

interface WebhookModalProps {
  webhook?:  Webhook | null;
  onClose:   () => void;
  onSave:    (d: WebhookFormData) => void;
  saving:    boolean;
}

const WebhookModal = ({ webhook, onClose, onSave, saving }: WebhookModalProps) => {
  const [name,   setName]   = useState(webhook?.name ?? '');
  const [url,    setUrl]    = useState(webhook?.url  ?? '');
  const [events, setEvents] = useState<string[]>(webhook?.events ?? []);

  const toggle = (e: string) =>
    setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  // Agrupar eventos por entidad
  const groups: Record<string, string[]> = {};
  WEBHOOK_EVENTS.forEach(ev => {
    const [entity] = ev.split('.');
    if (!groups[entity]) groups[entity] = [];
    groups[entity].push(ev);
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <WebhookIcon className="w-5 h-5 text-blue-600" />
            {webhook ? 'Editar webhook' : 'Nuevo webhook'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Notificaciones ERP"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">URL destino *</label>
              <input
                type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://tu-sistema.com/webhook"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Eventos a suscribir *</label>
            <div className="space-y-3">
              {Object.entries(groups).map(([entity, evs]) => (
                <div key={entity}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">{entity}</p>
                  <div className="flex flex-wrap gap-2">
                    {evs.map(ev => (
                      <button
                        key={ev} type="button" onClick={() => toggle(ev)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          events.includes(ev)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >{ev}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">Cancelar</button>
          <button
            onClick={() => onSave({ name, url, events })}
            disabled={saving || !name.trim() || !url.trim() || events.length === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {webhook ? 'Guardar' : 'Crear webhook'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Webhooks() {
  const qc = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [showCreate,   setShowCreate]   = useState(false);
  const [editWebhook,  setEditWebhook]  = useState<Webhook | null>(null);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [testResult,   setTestResult]   = useState<Record<string, { success: boolean; status: number }>>({});

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['admin', 'webhooks'],
    queryFn:  () => adminService.listWebhooks(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'webhooks'] });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof adminService.createWebhook>[0]) => adminService.createWebhook(d),
    onSuccess: () => { invalidate(); setShowCreate(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => adminService.updateWebhook(id, data),
    onSuccess: () => { invalidate(); setEditWebhook(null); },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => adminService.toggleWebhookActive(id),
    onSuccess: invalidate,
  });

  const rotateMut = useMutation({
    mutationFn: (id: string) => adminService.rotateWebhookSecret(id),
    onSuccess: invalidate,
  });

  const testMut = useMutation({
    mutationFn: (id: string) => adminService.testWebhook(id),
    onSuccess: (data, id) => {
      invalidate();
      setTestResult(prev => ({ ...prev, [id]: data as any }));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deleteWebhook(id),
    onSuccess: invalidate,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Notificaciones HTTP salientes a sistemas externos</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          <PlusCircle className="w-4 h-4" /> Nuevo webhook
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando webhooks…
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-xl border border-gray-100 text-gray-400">
          <WebhookIcon className="w-10 h-10 mb-3 opacity-30" />
          <p>No hay webhooks configurados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: Webhook) => {
            const tr = testResult[wh.id];
            return (
              <div key={wh.id} className={`bg-white rounded-xl border ${!wh.isActive ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
                {/* Row principal */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Icono estado */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    wh.failCount > 0 ? 'bg-red-50' : wh.isActive ? 'bg-green-50' : 'bg-gray-100'
                  }`}>
                    {wh.failCount > 0
                      ? <AlertTriangle className="w-5 h-5 text-red-500" />
                      : wh.isActive
                        ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                        : <XCircle className="w-5 h-5 text-gray-400" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{wh.name}</p>
                      {wh.failCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          {wh.failCount} fallos
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {wh.events.slice(0, 4).map(e => <EventTag key={e} event={e} />)}
                      {wh.events.length > 4 && <span className="text-xs text-gray-400">+{wh.events.length - 4}</span>}
                    </div>
                  </div>

                  {/* Último envío */}
                  <div className="text-right shrink-0 hidden sm:block">
                    {wh.lastSentAt ? (
                      <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(wh.lastSentAt).toLocaleString('es-CL')}
                      </div>
                    ) : <span className="text-xs text-gray-300">Sin envíos</span>}
                    {wh.lastStatus && (
                      <span className={`text-xs font-mono ${wh.lastStatus >= 200 && wh.lastStatus < 300 ? 'text-green-600' : 'text-red-500'}`}>
                        HTTP {wh.lastStatus}
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Test */}
                    <button
                      onClick={() => testMut.mutate(wh.id)}
                      disabled={testMut.isPending}
                      title="Enviar prueba"
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                    {/* Rotar secret */}
                    <button
                      onClick={async () => { const ok = await confirmDialog({ message: '¿Rotar el secreto? Deberás actualizar tu integración.', confirmLabel: 'Rotar', variant: 'warning' }); if (ok) rotateMut.mutate(wh.id); }}
                      title="Rotar secreto"
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    {/* Toggle */}
                    <button onClick={() => toggleMut.mutate(wh.id)} disabled={toggleMut.isPending}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      {wh.isActive ? <ToggleRight className="w-4 h-4 text-blue-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    {/* Edit */}
                    <button onClick={() => setEditWebhook(wh)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={async () => { const ok = await confirmDialog({ message: `¿Eliminar webhook "${wh.name}"?`, confirmLabel: 'Eliminar' }); if (ok) deleteMut.mutate(wh.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {/* Expand */}
                    <button onClick={() => setExpanded(expanded === wh.id ? null : wh.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                      {expanded === wh.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Test result toast */}
                {tr && (
                  <div className={`mx-5 mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${tr.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {tr.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    Test {tr.success ? 'exitoso' : 'fallido'} · HTTP {tr.status}
                    <button onClick={() => setTestResult(p => { const n = {...p}; delete n[wh.id]; return n; })} className="ml-auto opacity-60 hover:opacity-100">✕</button>
                  </div>
                )}

                {/* Expanded — secreto */}
                {expanded === wh.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 rounded-b-xl">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Secreto HMAC-SHA256</p>
                    <div className="bg-gray-900 rounded-lg px-3 py-2 font-mono text-xs text-green-400 flex items-center justify-between">
                      <span className="blur-sm hover:blur-none transition-all select-all cursor-pointer">{wh.secret}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(wh.secret)}
                        className="text-gray-500 hover:text-green-400 ml-3 shrink-0"
                        title="Copiar secreto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Valida la firma: <code className="bg-gray-100 px-1 rounded">X-Bullweb-Signature: sha256=HMAC(secret, body)</code>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
      {(showCreate || editWebhook) && (
        <WebhookModal
          webhook={editWebhook}
          onClose={() => { setShowCreate(false); setEditWebhook(null); }}
          onSave={form => {
            if (editWebhook) updateMut.mutate({ id: editWebhook.id, data: form });
            else             createMut.mutate(form as any);
          }}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}
