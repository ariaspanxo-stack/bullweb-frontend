/**
 * BULLWEB ENTERPRISE — Admin Backup Page
 * Lista backups, permite crear, descargar y eliminar.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database, Download, Trash2, Plus, RefreshCw,
  CheckCircle2, XCircle, Clock, Loader2, HardDrive,
  AlertTriangle
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { BackupRecord, BackupStats } from '@/services/adminService';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: BackupRecord['status'] }) {
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    completed: { icon: CheckCircle2, label: 'Completado', cls: 'bg-green-100 text-green-700' },
    failed:    { icon: XCircle,      label: 'Error',      cls: 'bg-red-100   text-red-700'   },
    running:   { icon: Loader2,      label: 'Ejecutando', cls: 'bg-blue-100  text-blue-700'  },
    pending:   { icon: Clock,        label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-700'},
  };
  const { icon: Icon, label, cls } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={10} className={status === 'running' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: BackupRecord['type'] }) {
  const map: Record<string, string> = {
    manual:     'bg-gray-100 text-gray-600',
    scheduled:  'bg-indigo-100 text-indigo-600',
    'pre-update': 'bg-orange-100 text-orange-600',
  };
  const labels: Record<string, string> = {
    manual:     'Manual',
    scheduled:  'Programado',
    'pre-update': 'Pre-actualización',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${map[type] ?? map.manual}`}>
      {labels[type] ?? type}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-indigo-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Modal crear backup ──────────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [type,  setType]  = useState<'manual' | 'pre-update'>('manual');
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () => adminService.createBackup({ type, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'backups'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-800">Nuevo Backup</h3>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={type}
            onChange={e => setType(e.target.value as any)}
          >
            <option value="manual">Manual</option>
            <option value="pre-update">Pre-actualización</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Notas (opcional)</label>
          <textarea
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Ej: Backup antes de migración v3.1"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2 text-yellow-800 text-xs">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>El backup puede tardar varios segundos dependiendo del tamaño de la base de datos.</span>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5"
          >
            {mut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
            {mut.isPending ? 'Iniciando…' : 'Crear Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BackupPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [delId, setDelId]           = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'backups'],
    queryFn:  () => adminService.listBackups(),
    refetchInterval: 8_000, // refresca cada 8s (para ver backups que terminan)
  });

  const backups: BackupRecord[] = data?.data  ?? [];
  const stats:   BackupStats    = data?.stats ?? { total: 0, completed: 0, failed: 0, lastBackupAt: null, totalSizeBytes: 0 };

  const delMut = useMutation({
    mutationFn: (id: string) => adminService.deleteBackup(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'backups'] }); setDelId(null); },
  });

  // URL de descarga con token del header
  const handleDownload = (backup: BackupRecord) => {
    const token = localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? '';
    const url   = `/api/admin/backup/${backup.id}/download`;
    const a     = document.createElement('a');
    a.href      = url;
    a.setAttribute('download', backup.filename);
    // Fetch con auth header para forzar descarga
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Database size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Backup & Restore</h1>
            <p className="text-xs text-gray-500">Copias de seguridad de la base de datos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            <Plus size={14} />
            Nuevo Backup
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Database}   label="Total backups"  value={stats.total}    />
        <StatCard icon={CheckCircle2} label="Completados"  value={stats.completed} />
        <StatCard icon={HardDrive}  label="Espacio usado"  value={formatBytes(stats.totalSizeBytes)} />
        <StatCard
          icon={Clock}
          label="Último backup"
          value={stats.lastBackupAt ? formatDate(stats.lastBackupAt) : '—'}
        />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : backups.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center text-gray-400">
          <Database size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Sin backups</p>
          <p className="text-xs mt-1">Crea el primero con el botón "Nuevo Backup"</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Archivo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Tamaño</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Creado por</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-gray-800 font-mono text-xs truncate max-w-[220px]" title={b.filename}>
                        {b.filename}
                      </p>
                      {b.notes && <p className="text-[11px] text-gray-400 mt-0.5">{b.notes}</p>}
                      {b.errorMsg && <p className="text-[11px] text-red-500 mt-0.5 truncate max-w-xs" title={b.errorMsg}>{b.errorMsg}</p>}
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={b.type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {b.sizeBytes > 0 ? formatBytes(b.sizeBytes) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(b.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{b.createdBy ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {b.status === 'completed' && (
                          <button
                            onClick={() => handleDownload(b)}
                            title="Descargar"
                            className="p-1.5 hover:bg-indigo-50 rounded text-gray-400 hover:text-indigo-600"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setDelId(b.id)}
                          title="Eliminar"
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      {/* Confirm eliminar */}
      {delId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 size={18} />
              <h3 className="font-bold text-gray-800">Eliminar backup</h3>
            </div>
            <p className="text-sm text-gray-600">
              Esta acción eliminará el archivo del servidor y el registro. <strong>No se puede deshacer.</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelId(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => delMut.mutate(delId!)}
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
