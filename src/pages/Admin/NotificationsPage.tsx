/**
 * BULLWEB ENTERPRISE — Sprint 17
 * Centro de Notificaciones del Sistema.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  RefreshCw,
  Loader2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Filter,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { AdminNotification } from '@/services/adminService';

// ─── helpers ────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-900/30',   border: 'border-blue-800/50',  label: 'Info'    },
  warning: { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-900/30',  border: 'border-amber-800/50', label: 'Advertencia' },
  error:   { icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-900/30',    border: 'border-red-800/50',   label: 'Error'   },
  success: { icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-900/30',  border: 'border-green-800/50', label: 'Éxito'   },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  system:    'Sistema',
  security:  'Seguridad',
  backup:    'Backup',
  scheduler: 'Scheduler',
  user:      'Usuario',
  '2fa':     '2FA',
};

const ALL_TYPES     = ['info', 'warning', 'error', 'success'] as const;
const ALL_CATS      = ['system', 'security', 'backup', 'scheduler', 'user', '2fa'] as const;

function timeAgo(d: string) {
  return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es });
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: number | string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl bg-zinc-800/60 border border-zinc-700/50 p-4 flex items-center gap-3">
      <Icon className={`h-5 w-5 ${color} shrink-0`} />
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: 'info', category: 'system', title: '', message: '', link: '' });

  const mut = useMutation({
    mutationFn: () => adminService.createNotification({
      type:     form.type,
      category: form.category,
      title:    form.title,
      message:  form.message,
      link:     form.link || undefined,
    }),
    onSuccess: () => {
      toast.success('Notificación creada');
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-unread-count'] });
      onClose();
    },
    onError: () => toast.error('Error al crear notificación'),
  });

  const field = (key: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-400" /> Nueva notificación
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={e => field('type', e.target.value)}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={e => field('category', e.target.value)}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_CATS.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Título *</label>
            <input
              value={form.title}
              onChange={e => field('title', e.target.value)}
              placeholder="Título de la notificación"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Mensaje *</label>
            <textarea
              value={form.message}
              onChange={e => field('message', e.target.value)}
              rows={3}
              placeholder="Descripción detallada…"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Enlace (opcional)</label>
            <input
              value={form.link}
              onChange={e => field('link', e.target.value)}
              placeholder="/admin/health"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2.5 transition"
          >
            Cancelar
          </button>
          <button
            disabled={!form.title || !form.message || mut.isPending}
            onClick={() => mut.mutate()}
            className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 transition flex items-center justify-center gap-2"
          >
            {mut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</> : 'Crear notificación'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({ n, onRead, onDelete }: {
  n: AdminNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className={`flex gap-3 p-4 border-b border-zinc-800/60 transition hover:bg-zinc-800/30 ${!n.is_read ? 'bg-zinc-800/20' : ''}`}>
      {/* icon */}
      <div className={`shrink-0 mt-0.5 rounded-full p-1.5 ${cfg.bg} border ${cfg.border}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${n.is_read ? 'text-zinc-300' : 'text-white'}`}>
            {n.title}
          </span>
          {!n.is_read && (
            <span className="shrink-0 inline-flex rounded-full bg-indigo-600 h-2 w-2 mt-1.5" title="No leída" />
          )}
          <span className="ml-auto shrink-0 text-xs text-zinc-500 font-mono">
            {CATEGORY_LABELS[n.category] ?? n.category}
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-zinc-600">{timeAgo(n.created_at)}</span>
          {n.actor_email && (
            <span className="text-xs text-zinc-600">· {n.actor_email}</span>
          )}
          {n.link && (
            <Link
              to={n.link}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
            >
              Ver <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="shrink-0 flex items-start gap-1.5 mt-0.5">
        {!n.is_read && (
          <button
            onClick={() => onRead(n.id)}
            title="Marcar como leída"
            className="rounded-lg p-1.5 text-zinc-500 hover:text-green-400 hover:bg-green-900/20 transition"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(n.id)}
          title="Eliminar"
          className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const qc = useQueryClient();

  const [filterType, setFilterType]       = useState<string>('');
  const [filterCat, setFilterCat]         = useState<string>('');
  const [filterRead, setFilterRead]       = useState<string>('');
  const [showCreate, setShowCreate]       = useState(false);

  const params = {
    type:     filterType   || undefined,
    category: filterCat    || undefined,
    is_read:  filterRead === '' ? undefined : filterRead === 'true',
    limit:    100,
  };

  const statsQ = useQuery({
    queryKey: ['admin-notifications-stats'],
    queryFn:  adminService.getNotificationStats,
    refetchInterval: 30_000,
  });

  const notifQ = useQuery({
    queryKey: ['admin-notifications', params],
    queryFn:  () => adminService.listNotifications(params),
    refetchInterval: 30_000,
  });

  const readMut = useMutation({
    mutationFn: adminService.markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-unread-count'] });
    },
  });

  const readAllMut = useMutation({
    mutationFn: adminService.markAllNotificationsRead,
    onSuccess: (n) => {
      toast.success(`${n} notificaciones marcadas como leídas`);
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-unread-count'] });
    },
    onError: () => toast.error('Error'),
  });

  const deleteMut = useMutation({
    mutationFn: adminService.deleteNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-unread-count'] });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const deleteReadMut = useMutation({
    mutationFn: adminService.deleteReadNotifications,
    onSuccess: (n) => {
      toast.success(`${n} notificaciones eliminadas`);
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
    },
    onError: () => toast.error('Error'),
  });

  const stats = statsQ.data;
  const items = notifQ.data ?? [];

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Bell className="h-6 w-6 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Centro de Notificaciones</h1>
          <p className="text-sm text-zinc-400">Alertas y eventos del sistema en tiempo real</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['admin-notifications'] });
              qc.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
            }}
            className="text-zinc-400 hover:text-white transition p-1.5"
            title="Refrescar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => readAllMut.mutate()}
            disabled={readAllMut.isPending || !stats?.unread}
            title="Marcar todas como leídas"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 text-xs font-medium px-3 py-2 transition"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Marcar todo leído
          </button>
          <button
            onClick={() => deleteReadMut.mutate()}
            disabled={deleteReadMut.isPending}
            title="Eliminar notificaciones leídas"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 text-xs font-medium px-3 py-2 transition"
          >
            <Trash2 className="h-3.5 w-3.5" /> Limpiar leídas
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total"         value={stats.total}  color="text-zinc-200"  icon={Bell}         />
          <StatCard label="No leídas"     value={stats.unread} color="text-indigo-400" icon={BellOff}     />
          <StatCard label="Advertencias"  value={stats.byType?.warning ?? 0} color="text-amber-400"  icon={AlertTriangle} />
          <StatCard label="Errores"       value={stats.byType?.error   ?? 0} color="text-red-400"    icon={AlertCircle}   />
        </div>
      )}

      {/* Categorías mini-badges */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byCategory ?? {}).map(([cat, cnt]) => (
            <button
              key={cat}
              onClick={() => setFilterCat(prev => prev === cat ? '' : cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                filterCat === cat
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat} ({cnt})
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-zinc-500 shrink-0" />

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los tipos</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
        </select>

        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las categorías</option>
          {ALL_CATS.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>

        <select
          value={filterRead}
          onChange={e => setFilterRead(e.target.value)}
          className="rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas</option>
          <option value="false">No leídas</option>
          <option value="true">Leídas</option>
        </select>

        {(filterType || filterCat || filterRead) && (
          <button
            onClick={() => { setFilterType(''); setFilterCat(''); setFilterRead(''); }}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            <X className="h-3.5 w-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        {notifQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
            <BellOff className="h-10 w-10 opacity-40" />
            <p>No hay notificaciones{filterType || filterCat || filterRead ? ' con estos filtros' : ''}.</p>
          </div>
        ) : (
          <div>
            {items.map(n => (
              <NotifRow
                key={n.id}
                n={n}
                onRead={readMut.mutate}
                onDelete={deleteMut.mutate}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
