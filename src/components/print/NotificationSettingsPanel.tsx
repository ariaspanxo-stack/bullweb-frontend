// ── components/print/NotificationSettingsPanel.tsx ───────────────────────────
// Panel de configuración de notificaciones push para eventos de impresión.
// Soporta webhook (Slack/Discord/n8n) y está preparado para email.

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Webhook, Mail, Check, RefreshCw, Send,
  ChevronDown, ChevronUp, AlertCircle, Clock, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { PrintNotificationSettings } from '@/services/adminService';

interface Props {
  branchId?: string;
}

const DEFAULT_SETTINGS: PrintNotificationSettings = {
  notify_webhook:   false,
  notify_email:     false,
  email_recipients: [],
  webhook_url:      null,
  webhook_secret:   null,
  on_print_failed:  true,
  on_agent_offline: true,
  on_agent_online:  false,
  on_stale_jobs:    true,
  cooldown_minutes: 15,
};

export function NotificationSettingsPanel({ branchId }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<PrintNotificationSettings>(DEFAULT_SETTINGS);
  const [newEmail, setNewEmail] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'print-notifications', 'settings', branchId],
    queryFn:  () => adminService.getPrintNotificationSettings(branchId),
    enabled:  expanded,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ...DEFAULT_SETTINGS,
        ...settings,
        email_recipients: settings.email_recipients ?? [],
      });
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => adminService.savePrintNotificationSettings(form, branchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'print-notifications', 'settings'] });
      toast.success('Configuración guardada');
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al guardar'),
  });

  const testMut = useMutation({
    mutationFn: () => adminService.testPrintWebhook(branchId),
    onSuccess: (r) => {
      if (r.success) toast.success('✅ Webhook de prueba enviado correctamente');
      else toast.error(`Error: ${r.error}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al probar'),
  });

  const set = (k: keyof PrintNotificationSettings, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email inválido');
      return;
    }
    if (form.email_recipients.includes(email)) {
      toast.error('Email ya agregado');
      return;
    }
    set('email_recipients', [...form.email_recipients, email]);
    setNewEmail('');
  };

  const removeEmail = (email: string) =>
    set('email_recipients', form.email_recipients.filter(e => e !== email));

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-gray-800">Notificaciones push</span>
          {(settings?.notify_webhook || settings?.notify_email) && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Activo</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-5">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" /> Cargando...
            </div>
          )}

          {/* ── Canales ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Canales de notificación
            </h4>
            <div className="space-y-3">

              {/* Webhook */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notify_webhook}
                    onChange={e => set('notify_webhook', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <Webhook className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Webhook (Slack / Discord / n8n)</span>
                </label>

                {form.notify_webhook && (
                  <div className="ml-7 space-y-2">
                    <input
                      value={form.webhook_url ?? ''}
                      onChange={e => set('webhook_url', e.target.value || null)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                    <input
                      value={form.webhook_secret ?? ''}
                      onChange={e => set('webhook_secret', e.target.value || null)}
                      placeholder="Secret HMAC (opcional — para verificar firma)"
                      type="password"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                    <button
                      onClick={() => testMut.mutate()}
                      disabled={!form.webhook_url || testMut.isPending}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                    >
                      {testMut.isPending
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Send className="w-3 h-3" />
                      }
                      Probar webhook
                    </button>
                    <p className="text-xs text-gray-400 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 shrink-0" />
                      Compatible con Slack Incoming Webhooks, Discord (format Slack), n8n, Zapier y cualquier endpoint HTTP POST que acepte JSON.
                    </p>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notify_email}
                    onChange={e => set('notify_email', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Próximamente</span>
                </label>

                {form.notify_email && (
                  <div className="ml-7 space-y-2">
                    {form.email_recipients.map(email => (
                      <div key={email} className="flex items-center gap-2">
                        <span className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 font-mono">{email}</span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >✕</button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addEmail()}
                        placeholder="gerente@restaurante.cl"
                        type="email"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                      />
                      <button
                        onClick={addEmail}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                      >+ Agregar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Eventos habilitados ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Alertas habilitadas
            </h4>
            <div className="space-y-2">
              {[
                { key: 'on_print_failed',  label: 'Fallo de impresión',           icon: '🖨️' },
                { key: 'on_agent_offline', label: 'Agente desconectado',           icon: '💻' },
                { key: 'on_agent_online',  label: 'Agente reconectado',            icon: '🟢' },
                { key: 'on_stale_jobs',    label: 'Jobs atascados (+5 min)',        icon: '⏳' },
              ].map(({ key, label, icon }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form[key as keyof PrintNotificationSettings]}
                    onChange={e => set(key as keyof PrintNotificationSettings, e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm">{icon} {label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Cooldown ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Cooldown
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">No repetir la misma alerta en:</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={form.cooldown_minutes}
                onChange={e => set('cooldown_minutes', Math.max(1, Number(e.target.value)))}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center"
              />
              <span className="text-sm text-gray-600">minutos</span>
            </div>
          </div>

          {/* ── Validación ── */}
          {form.notify_webhook && !form.webhook_url && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Habilitaste webhook pero no has ingresado una URL.
            </div>
          )}

          {/* ── Guardar ── */}
          <div className="flex justify-end border-t border-gray-100 pt-3">
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMut.isPending
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <Check className="w-3.5 h-3.5" />
              }
              Guardar configuración
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
