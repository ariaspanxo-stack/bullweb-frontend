import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldOff, ShieldCheck, Trash2, Plus, RefreshCw,
  AlertTriangle, Clock, Search, X, Info
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { IpEntry } from '@/services/adminService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function StatusBadge({ entry }: { entry: IpEntry }) {
  const now     = new Date();
  const expired = entry.expiresAt && new Date(entry.expiresAt) <= now;

  if (!entry.isActive) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><ShieldCheck className="w-3 h-3" /> Desbloqueada</span>;
  }
  if (expired) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Expirada</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><ShieldOff className="w-3 h-3" /> Bloqueada</span>;
}

function AddIpModal({ onClose, onSave }: { onClose: () => void; onSave: (p: any) => void }) {
  const [form, setForm] = useState({ ipAddress: '', reason: '', expiresAt: '', notes: '' });
  const [err, setErr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ipAddress.trim()) { setErr('La IP es requerida'); return; }
    onSave({
      ipAddress: form.ipAddress.trim(),
      reason:    form.reason    || undefined,
      expiresAt: form.expiresAt || null,
      notes:     form.notes     || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-red-500" />
            Bloquear dirección IP
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {err}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección IP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ej. 192.168.1.100 o 2001:db8::1"
              value={form.ipAddress}
              onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <input
              type="text"
              placeholder="ej. Intentos de fuerza bruta, spam..."
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expira el <span className="text-gray-400 font-normal">(vacío = permanente)</span>
            </label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas adicionales para el equipo..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Bloquear IP
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IpBlocklistPage() {
  const qc = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [showAdd, setShowAdd]   = useState(false);
  const [search, setSearch]     = useState('');
  const [onlyActive, setOnlyActive] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-ip-blocklist', onlyActive],
    queryFn:  () => adminService.getIpBlocklist(onlyActive),
    refetchInterval: 60_000,
  });

  const mutBlock = useMutation({
    mutationFn: (p: any) => adminService.blockIp(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-ip-blocklist'] }); setShowAdd(false); },
  });

  const mutUnblock = useMutation({
    mutationFn: (id: string) => adminService.unblockIp(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ip-blocklist'] }),
  });

  const mutDelete = useMutation({
    mutationFn: (id: string) => adminService.deleteIpEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ip-blocklist'] }),
  });

  const entries: IpEntry[] = data?.data ?? [];
  const stats   = data?.stats ?? { total: 0, active: 0, expired: 0 };

  const filtered = entries.filter(e =>
    !search ||
    e.ipAddress.includes(search) ||
    (e.reason?.toLowerCase().includes(search.toLowerCase())) ||
    (e.blockedBy?.toLowerCase().includes(search.toLowerCase()))
  );

  const now = new Date();
  const isEffectivelyBlocked = (e: IpEntry) =>
    e.isActive && (!e.expiresAt || new Date(e.expiresAt) > now);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de IPs Bloqueadas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de acceso por dirección IP
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            <Plus className="w-4 h-4" />
            Bloquear IP
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total registros',   value: stats.total,   color: 'gray',   icon: Info },
          { label: 'Activas',           value: stats.active,  color: 'red',    icon: ShieldOff },
          { label: 'Expiradas',         value: stats.expired, color: 'yellow', icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg bg-${color}-50`}>
              <Icon className={`w-5 h-5 text-${color}-500`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar IP, motivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={e => setOnlyActive(e.target.checked)}
            className="rounded"
          />
          Solo activas
        </label>
        {search && (
          <span className="text-sm text-gray-500">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bloqueada por</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bloqueada el</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expira</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <ShieldCheck className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No hay IPs bloqueadas</p>
                    <p className="text-gray-300 text-xs mt-1">El sistema está operando sin restricciones de IP</p>
                  </td>
                </tr>
              ) : (
                filtered.map(entry => (
                  <tr key={entry.id} className={`hover:bg-gray-50 transition-colors ${isEffectivelyBlocked(entry) ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-sm">
                      {entry.ipAddress}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge entry={entry} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                      {entry.reason ?? <span className="text-gray-300 italic">Sin motivo</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.blockedBy ?? <span className="text-gray-300 italic">sistema</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(entry.blockedAt), "dd/MM/yy HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {entry.expiresAt
                        ? <span className={new Date(entry.expiresAt) <= now ? 'text-yellow-600 font-medium' : ''}>
                            {format(new Date(entry.expiresAt), "dd/MM/yy HH:mm", { locale: es })}
                          </span>
                        : <span className="text-gray-300">Permanente</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {entry.isActive && (
                          <button
                            onClick={() => mutUnblock.mutate(entry.id)}
                            disabled={mutUnblock.isPending}
                            title="Desbloquear"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const ok = await confirmDialog({ message: `¿Eliminar entrada para ${entry.ipAddress}?`, confirmLabel: 'Eliminar' });
                            if (ok) mutDelete.mutate(entry.id);
                          }}
                          disabled={mutDelete.isPending}
                          title="Eliminar"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-medium">Comportamiento del bloqueo</p>
          <p>Las IPs bloqueadas reciben un <code className="bg-blue-100 rounded px-1">403 Forbidden</code> en todos los endpoints. Las entradas expiradas se mantienen como historial pero dejan de bloquear automáticamente.</p>
        </div>
      </div>

      {/* Modal */}
      <ConfirmDialog {...dialogProps} />
      {showAdd && (
        <AddIpModal
          onClose={() => setShowAdd(false)}
          onSave={params => mutBlock.mutate(params)}
        />
      )}
    </div>
  );
}
