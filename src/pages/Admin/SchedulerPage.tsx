/**
 * BULLWEB ENTERPRISE — Admin Scheduler Page
 * Gestión de tareas programadas (cron jobs).
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock, Play, Pause, Trash2, Plus, RefreshCw,
  CheckCircle2, XCircle, Loader2, Edit2, Zap, Clock,
  AlertTriangle
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { ScheduledTask, SchedulerAction } from '@/services/adminService';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-gray-400">Sin ejecución</span>;
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    success: { icon: CheckCircle2, label: 'Exitosa',    cls: 'bg-green-100 text-green-700' },
    failed:  { icon: XCircle,      label: 'Fallida',    cls: 'bg-red-100   text-red-700'   },
    running: { icon: Loader2,      label: 'Ejecutando', cls: 'bg-blue-100  text-blue-700'  },
  };
  const { icon: Icon, label, cls } = map[status] ?? map.success;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={10} className={status === 'running' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}

// ─── TaskForm ────────────────────────────────────────────────────────────────

interface TaskFormData {
  name:           string;
  description:    string;
  cronExpression: string;
  action:         string;
  paramsJson:     string;
  enabled:        boolean;
}

const EMPTY_FORM: TaskFormData = {
  name: '', description: '', cronExpression: '0 2 * * *',
  action: 'backup.create', paramsJson: '{}', enabled: true,
};

// Cron presets
const PRESETS = [
  { label: 'Cada día a las 2am',     value: '0 2 * * *'   },
  { label: 'Cada domingo a las 3am', value: '0 3 * * 0'   },
  { label: 'Cada hora',              value: '0 * * * *'   },
  { label: 'Cada 6 horas',           value: '0 */6 * * *' },
  { label: 'Primer día del mes',     value: '0 3 1 * *'   },
];

function TaskFormModal({
  initial,
  actions,
  onClose,
}: {
  initial?: Partial<TaskFormData & { id: string }>;
  actions: SchedulerAction[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<TaskFormData>({
    name:           initial?.name           ?? EMPTY_FORM.name,
    description:    initial?.description    ?? EMPTY_FORM.description,
    cronExpression: initial?.cronExpression ?? EMPTY_FORM.cronExpression,
    action:         initial?.action         ?? EMPTY_FORM.action,
    paramsJson:     initial?.paramsJson     ?? EMPTY_FORM.paramsJson,
    enabled:        initial?.enabled        ?? EMPTY_FORM.enabled,
  });
  const [jsonError, setJsonError] = useState('');

  const set = (k: keyof TaskFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (k === 'paramsJson') setJsonError('');
  };

  const mut = useMutation({
    mutationFn: async () => {
      let params: Record<string, any> = {};
      try {
        params = JSON.parse(form.paramsJson || '{}');
      } catch {
        setJsonError('JSON inválido');
        throw new Error('JSON inválido');
      }
      if (isEdit) {
        return adminService.updateScheduledTask(initial!.id!, {
          name: form.name, description: form.description,
          cronExpression: form.cronExpression, action: form.action,
          params, enabled: form.enabled,
        });
      }
      return adminService.createScheduledTask({
        name: form.name, description: form.description,
        cronExpression: form.cronExpression, action: form.action,
        params, enabled: form.enabled,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'scheduler'] });
      onClose();
    },
  });

  // Auto-fill params JSON when action changes
  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const a = actions.find(x => x.value === e.target.value);
    setForm(f => ({
      ...f,
      action:     e.target.value,
      paramsJson: JSON.stringify(a?.params ?? {}, null, 2),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <CalendarClock size={18} className="text-indigo-600" />
          {isEdit ? 'Editar tarea' : 'Nueva tarea programada'}
        </h3>

        {/* Name */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Backup Diario" value={form.name} onChange={set('name')} />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Opcional" value={form.description} onChange={set('description')} />
        </div>

        {/* Action */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Acción *</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.action} onChange={handleActionChange}>
            {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        {/* Cron Expression */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Expresión Cron *</label>
            <select
              className="text-xs border rounded px-1.5 py-0.5 text-gray-500 focus:outline-none"
              value=""
              onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))}
            >
              <option value="" disabled>Preset rápido…</option>
              {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0 2 * * *"
            value={form.cronExpression} onChange={set('cronExpression')}
          />
          <p className="text-[11px] text-gray-400 mt-0.5">Formato: minutos horas día mes díaSemana (5 campos)</p>
        </div>

        {/* Params JSON */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Parámetros (JSON)</label>
          <textarea
            rows={3}
            className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${jsonError ? 'border-red-400' : ''}`}
            value={form.paramsJson} onChange={set('paramsJson')}
          />
          {jsonError && <p className="text-xs text-red-500 mt-0.5">{jsonError}</p>}
        </div>

        {/* Enabled */}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="task-enabled" checked={form.enabled}
            onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 rounded" />
          <label htmlFor="task-enabled" className="text-sm text-gray-700">Activar inmediatamente</label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5"
          >
            {mut.isPending && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </div>
        {mut.isError && (
          <p className="text-xs text-red-500 text-center">{(mut.error as any)?.message ?? 'Error'}</p>
        )}
      </div>
    </div>
  );
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  actions,
  onEdit,
  onDelete,
}: {
  task: ScheduledTask;
  actions: SchedulerAction[];
  onEdit: (t: ScheduledTask) => void;
  onDelete: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [runFeedback, setRunFeedback] = useState<string | null>(null);

  const toggleMut = useMutation({
    mutationFn: () => adminService.toggleScheduledTask(task.id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin', 'scheduler'] }),
  });

  const runMut = useMutation({
    mutationFn: () => adminService.runScheduledTaskNow(task.id),
    onSuccess: (r) => {
      setRunFeedback(r.message);
      qc.invalidateQueries({ queryKey: ['admin', 'scheduler'] });
      setTimeout(() => setRunFeedback(null), 4000);
    },
  });

  const actionLabel = actions.find(a => a.value === task.action)?.label ?? task.action;

  return (
    <div className={`bg-white rounded-xl border p-4 space-y-3 transition-opacity ${!task.enabled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{task.name}</span>
            {task.enabled
              ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">ACTIVA</span>
              : <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">PAUSADA</span>
            }
          </div>
          {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
        </div>
        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => runMut.mutate()}
            disabled={runMut.isPending}
            title="Ejecutar ahora"
            className="p-1.5 hover:bg-indigo-50 rounded text-gray-400 hover:text-indigo-600"
          >
            {runMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          </button>
          <button
            onClick={() => onEdit(task)}
            title="Editar"
            className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => toggleMut.mutate()}
            disabled={toggleMut.isPending}
            title={task.enabled ? 'Pausar' : 'Activar'}
            className={`p-1.5 rounded ${task.enabled ? 'hover:bg-yellow-50 text-yellow-500 hover:text-yellow-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}
          >
            {task.enabled ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            title="Eliminar"
            className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <div>
          <span className="text-gray-400">Acción</span>
          <p className="text-gray-700 font-medium">{actionLabel}</p>
        </div>
        <div>
          <span className="text-gray-400">Cron</span>
          <p className="text-gray-700 font-mono">{task.cronExpression}</p>
        </div>
        <div>
          <span className="text-gray-400">Última ejecución</span>
          <p className="text-gray-700">{formatDate(task.lastRunAt)}</p>
        </div>
        <div>
          <span className="text-gray-400">Veces ejecutada</span>
          <p className="text-gray-700">{task.runCount}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <StatusBadge status={task.lastStatus} />
        {task.lastError && (
          <span className="text-[11px] text-red-500 truncate max-w-xs" title={task.lastError}>
            {task.lastError}
          </span>
        )}
      </div>

      {/* Run feedback */}
      {runFeedback && (
        <div className="bg-indigo-50 text-indigo-700 text-xs rounded-lg px-3 py-2 flex items-center gap-1.5">
          <CheckCircle2 size={12} />
          {runFeedback}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SchedulerPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState<ScheduledTask | null>(null);
  const [delId,      setDelId]      = useState<string | null>(null);

  const { data: tasks = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'scheduler'],
    queryFn:  () => adminService.listScheduledTasks(),
    refetchInterval: 10_000,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['admin', 'scheduler-actions'],
    queryFn:  () => adminService.getSchedulerActions(),
    staleTime: Infinity,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => adminService.deleteScheduledTask(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin', 'scheduler'] }); setDelId(null); },
  });

  const activeCount  = tasks.filter(t => t.enabled).length;
  const failedCount  = tasks.filter(t => t.lastStatus === 'failed').length;
  const totalRuns    = tasks.reduce((s, t) => s + t.runCount, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <CalendarClock size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Tareas Programadas</h1>
            <p className="text-xs text-gray-500">Automatiza operaciones del sistema con cron jobs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            <Plus size={14} />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total tareas',    value: tasks.length,  color: 'text-gray-800' },
          { label: 'Activas',         value: activeCount,   color: 'text-green-600' },
          { label: 'Con error',       value: failedCount,   color: 'text-red-600' },
          { label: 'Total ejecuciones', value: totalRuns,   color: 'text-indigo-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Aviso zona horaria */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-blue-700 text-xs">
        <Clock size={13} className="shrink-0" />
        Las tareas se ejecutan en zona horaria <strong className="mx-1">America/Santiago</strong> (hora de Chile).
      </div>

      {/* Lista de tareas */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center text-gray-400">
          <CalendarClock size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Sin tareas programadas</p>
          <p className="text-xs mt-1">Crea una usando el botón "Nueva tarea"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              actions={actions}
              onEdit={setEditing}
              onDelete={setDelId}
            />
          ))}
        </div>
      )}

      {/* Modal crear */}
      {showCreate && (
        <TaskFormModal actions={actions} onClose={() => setShowCreate(false)} />
      )}

      {/* Modal editar */}
      {editing && (
        <TaskFormModal
          actions={actions}
          initial={{
            id:             editing.id,
            name:           editing.name,
            description:    editing.description ?? '',
            cronExpression: editing.cronExpression,
            action:         editing.action,
            paramsJson:     JSON.stringify(editing.params ?? {}, null, 2),
            enabled:        editing.enabled,
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Confirm eliminar */}
      {delId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-bold text-gray-800">Eliminar tarea</h3>
            </div>
            <p className="text-sm text-gray-600">
              La tarea se eliminará permanentemente y dejará de ejecutarse. <strong>No se puede deshacer.</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelId(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => delMut.mutate(delId)}
                disabled={delMut.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5"
              >
                {delMut.isPending && <Loader2 size={13} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
