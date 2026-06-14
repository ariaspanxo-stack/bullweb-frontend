/**
 * BULLWEB ENTERPRISE — Admin Email Page
 * Configuración SMTP, plantillas de correo e historial de envíos.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Settings, FileText, Clock, Send,
  CheckCircle2, XCircle, RefreshCw, Edit2, Trash2, Plus,
  Eye, EyeOff, Loader2, Wifi
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { SmtpConfig, EmailTemplate, EmailLogEntry } from '@/services/adminService';

// ─── helpers ────────────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  if (status === 'sent')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><CheckCircle2 size={10} />Enviado</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold"><XCircle size={10} />Error</span>;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ─── SmtpTab ────────────────────────────────────────────────────────────────

function SmtpTab() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['admin', 'smtp-config'],
    queryFn: () => adminService.getSmtpConfig(),
  });

  const [form, setForm]     = useState<Partial<SmtpConfig>>({});
  const [testTo, setTestTo] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [testMsg, setTestMsg]   = useState<{ ok: boolean; msg: string } | null>(null);

  // Merge server data into form once loaded
  const val = (k: keyof SmtpConfig) =>
    form[k] !== undefined ? form[k] : (cfg as any)?.[k] ?? '';

  const saveMut = useMutation({
    mutationFn: (c: SmtpConfig) => adminService.saveSmtpConfig(c),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'smtp-config'] }); },
  });

  const testMut = useMutation({
    mutationFn: () => adminService.testSmtp({
      testTo,
      host:      String(val('host')),
      port:      Number(val('port') || 587),
      secure:    Boolean(val('secure')),
      user:      String(val('user')),
      pass:      String(val('pass')),
      fromName:  String(val('fromName')),
      fromEmail: String(val('fromEmail')),
    }),
    onSuccess: (r) => setTestMsg({ ok: r.ok, msg: r.message }),
    onError: (e: any) => setTestMsg({ ok: false, msg: e?.response?.data?.error ?? 'Error' }),
  });

  const handleSave = () => {
    saveMut.mutate({
      host:      String(val('host')),
      port:      Number(val('port') || 587),
      secure:    Boolean(val('secure')),
      user:      String(val('user')),
      pass:      String(val('pass')),
      fromName:  String(val('fromName')),
      fromEmail: String(val('fromEmail')),
    });
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Settings size={16} />Servidor SMTP</h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Host */}
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Host</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="smtp.gmail.com"
              value={String(val('host'))}
              onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
            />
          </div>
          {/* Port */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Puerto</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="587"
              value={String(val('port'))}
              onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
            />
          </div>
          {/* Secure */}
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="smtp-secure"
              checked={Boolean(val('secure'))}
              onChange={e => setForm(f => ({ ...f, secure: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="smtp-secure" className="text-sm text-gray-700">SSL/TLS (puerto 465)</label>
          </div>
          {/* User */}
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Usuario SMTP</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="tu@email.com"
              value={String(val('user'))}
              onChange={e => setForm(f => ({ ...f, user: e.target.value }))}
            />
          </div>
          {/* Password */}
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
                value={String(val('pass'))}
                onChange={e => setForm(f => ({ ...f, pass: e.target.value }))}
              />
              <button type="button" className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPass(s => !s)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {/* From Name */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre remitente</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="BullWeb"
              value={String(val('fromName'))}
              onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))}
            />
          </div>
          {/* From Email */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Email remitente</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="noreply@empresa.com"
              value={String(val('fromEmail'))}
              onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saveMut.isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          {saveMut.isPending ? 'Guardando…' : 'Guardar configuración'}
        </button>
        {saveMut.isSuccess && <p className="text-green-600 text-xs text-center">Configuración guardada ✓</p>}
      </div>

      {/* Test */}
      <div className="bg-white rounded-xl border p-6 space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Wifi size={16} />Probar conexión</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="destino@test.com"
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
          />
          <button
            onClick={() => { setTestMsg(null); testMut.mutate(); }}
            disabled={testMut.isPending || !testTo}
            className="bg-gray-800 hover:bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 flex items-center gap-1.5"
          >
            {testMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Probar
          </button>
        </div>
        {testMsg && (
          <p className={`text-sm flex items-center gap-1.5 ${testMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {testMsg.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {testMsg.msg}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── TemplatesTab ───────────────────────────────────────────────────────────

const EMPTY_TPL: Partial<EmailTemplate> = { slug: '', name: '', subject: '', htmlBody: '', textBody: '', category: 'general', isActive: true };

function TemplatesTab() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin', 'email-templates'],
    queryFn: () => adminService.listEmailTemplates(),
  });

  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null);

  const saveMut = useMutation({
    mutationFn: (t: any) => adminService.saveEmailTemplate(t),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] }); setEditing(null); },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => adminService.deleteEmailTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] }),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setEditing(EMPTY_TPL)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          <Plus size={14} />Nueva plantilla
        </button>
      </div>

      {templates.map(tpl => (
        <div key={tpl.id} className="bg-white rounded-xl border p-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-gray-800">{tpl.name}</span>
              <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tpl.slug}</span>
              {!tpl.isActive && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">inactiva</span>}
            </div>
            <p className="text-xs text-gray-500 truncate">Asunto: {tpl.subject}</p>
            {tpl.variables?.length > 0 && (
              <p className="text-[11px] text-indigo-500 mt-0.5">Variables: {tpl.variables.map(v => `{{${v}}}`).join(', ')}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setEditing(tpl)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600">
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => delMut.mutate(tpl.id)}
              disabled={delMut.isPending}
              className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Modal edición */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              {editing.id ? 'Editar plantilla' : 'Nueva plantilla'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Slug (identificador)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="welcome"
                  value={editing.slug ?? ''}
                  onChange={e => setEditing(s => s ? ({ ...s, slug: e.target.value }) : s)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bienvenida"
                  value={editing.name ?? ''}
                  onChange={e => setEditing(s => s ? ({ ...s, name: e.target.value }) : s)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Asunto</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bienvenido a {{appName}}"
                  value={editing.subject ?? ''}
                  onChange={e => setEditing(s => s ? ({ ...s, subject: e.target.value }) : s)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">HTML Body</label>
                <textarea
                  rows={12}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="<h1>Hola {{userName}}</h1>"
                  value={editing.htmlBody ?? ''}
                  onChange={e => setEditing(s => s ? ({ ...s, htmlBody: e.target.value }) : s)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Texto plano (opcional)</label>
                <textarea
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Hola {{userName}}, bienvenido..."
                  value={editing.textBody ?? ''}
                  onChange={e => setEditing(s => s ? ({ ...s, textBody: e.target.value }) : s)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Categoría</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editing.category ?? 'general'}
                  onChange={e => setEditing(s => s ? ({ ...s, category: e.target.value }) : s)}
                >
                  <option value="transactional">Transaccional</option>
                  <option value="auth">Autenticación</option>
                  <option value="system">Sistema</option>
                  <option value="marketing">Marketing</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="tpl-active"
                  checked={editing.isActive ?? true}
                  onChange={e => setEditing(s => s ? ({ ...s, isActive: e.target.checked }) : s)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="tpl-active" className="text-sm text-gray-700">Activa</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => saveMut.mutate(editing as any)}
                disabled={saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5"
              >
                {saveMut.isPending && <Loader2 size={13} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HistorialTab ───────────────────────────────────────────────────────────

function HistorialTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'email-logs'],
    queryFn: () => adminService.getEmailLogs(150),
  });

  const logs: EmailLogEntry[]       = data?.data  ?? [];
  const stats                        = data?.stats ?? { total: 0, sent: 0, failed: 0, today: 0 };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total"    value={stats.total}  color="text-gray-800" />
        <StatCard label="Enviados" value={stats.sent}   color="text-green-600" />
        <StatCard label="Fallidos" value={stats.failed} color="text-red-600" />
        <StatCard label="Hoy"      value={stats.today}  color="text-indigo-600" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600">
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />Actualizar
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Mail size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin registros de envío</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Destinatario</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Asunto</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Enviado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="text-gray-800">{log.toEmail}</p>
                      {log.toName && <p className="text-xs text-gray-400">{log.toName}</p>}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs truncate text-gray-600">{log.subject}</td>
                    <td className="px-4 py-2.5">
                      <Badge status={log.status} />
                      {log.errorMessage && (
                        <p className="text-[10px] text-red-500 mt-0.5 max-w-xs truncate" title={log.errorMessage}>{log.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{log.sentBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type Tab = 'smtp' | 'templates' | 'historial';

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>('smtp');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'smtp',      label: 'Configuración SMTP', icon: Settings  },
    { id: 'templates', label: 'Plantillas',         icon: FileText  },
    { id: 'historial', label: 'Historial',          icon: Clock     },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Mail size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Email y SMTP</h1>
          <p className="text-xs text-gray-500">Configura el servidor de correo y gestiona plantillas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'smtp'      && <SmtpTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'historial' && <HistorialTab />}
    </div>
  );
}
