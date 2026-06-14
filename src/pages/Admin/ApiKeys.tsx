import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type ApiKey, AVAILABLE_SCOPES } from '@/services/adminService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import {
  PlusCircle, Trash2, ToggleLeft, ToggleRight, Copy, Eye, EyeOff,
  Key, CheckCircle2, XCircle, Loader2, ShieldCheck, Clock,
} from 'lucide-react';

// ─── Scope chip ───────────────────────────────────────────────────────────────

const ScopeChip = ({ scope }: { scope: string }) => (
  <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
    {scope}
  </span>
);

// ─── Reveal box — muestra la clave raw una sola vez ───────────────────────────

const RevealBox = ({ rawKey, onDismiss }: { rawKey: string; onDismiss: () => void }) => {
  const [visible, setVisible] = useState(false);
  const [copied,  setCopied]  = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">API Key generada</h3>
            <p className="text-xs text-amber-600 font-medium">⚠ Copia este valor ahora. No se mostrará de nuevo.</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg px-4 py-3 font-mono text-sm flex items-center justify-between gap-3 mb-4">
          <span className="text-green-400 break-all">
            {visible ? rawKey : rawKey.replace(/./g, '•')}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setVisible(v => !v)} className="text-gray-400 hover:text-white">
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={copy} className="text-gray-400 hover:text-green-400">
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Entendido, ya copié la clave
        </button>
      </div>
    </div>
  );
};

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onSave:  (data: { name: string; scopes: string[]; allowedIPs: string[]; expiresAt: string | null }) => void;
  saving:  boolean;
}

const CreateModal = ({ onClose, onSave, saving }: CreateModalProps) => {
  const [name,       setName]       = useState('');
  const [scopes,     setScopes]     = useState<string[]>([]);
  const [allowedIPs, setAllowedIPs] = useState('');
  const [expiresAt,  setExpiresAt]  = useState('');

  const toggleScope = (s: string) =>
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" /> Nueva API Key
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Integración POS externo"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Permisos (scopes) *</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map(s => (
                <button
                  key={s} type="button"
                  onClick={() => toggleScope(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    scopes.includes(s)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">IPs permitidas</label>
              <input
                type="text" value={allowedIPs} onChange={e => setAllowedIPs(e.target.value)}
                placeholder="192.168.1.0/24, 10.0.0.1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Separar con comas. Vacío = sin restricción.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expiración</label>
              <input
                type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Vacío = sin expiración</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">Cancelar</button>
          <button
            onClick={() => onSave({
              name,
              scopes,
              allowedIPs: allowedIPs.split(',').map(s => s.trim()).filter(Boolean),
              expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            })}
            disabled={saving || !name.trim() || scopes.length === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Generar API Key
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ApiKeys() {
  const qc = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [rawKey,     setRawKey]     = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['admin', 'apikeys'],
    queryFn:  () => adminService.listApiKeys(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'apikeys'] });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof adminService.createApiKey>[0]) => adminService.createApiKey(d),
    onSuccess: (data) => {
      invalidate();
      setShowCreate(false);
      setRawKey((data as any).rawKey ?? null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => adminService.toggleApiKeyActive(id),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deleteApiKey(id),
    onSuccess: invalidate,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Claves para integraciones externas</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          <PlusCircle className="w-4 h-4" /> Nueva API Key
        </button>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Las claves API se muestran <strong>solo una vez</strong> al crearlas. Guárdalas de forma segura.
          Los valores almacenados están cifrados con SHA-256 y no pueden recuperarse.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando claves…
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Key className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay API Keys creadas</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Nombre', 'Prefijo', 'Scopes', 'IPs', 'Expira', 'Último uso', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keys.map((k: ApiKey) => (
                <tr key={k.id} className={`hover:bg-gray-50 ${!k.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{k.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{k.keyPrefix}…</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {k.scopes.slice(0, 3).map(s => <ScopeChip key={s} scope={s} />)}
                      {k.scopes.length > 3 && (
                        <span className="text-xs text-gray-400">+{k.scopes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {k.allowedIPs.length > 0 ? k.allowedIPs.join(', ') : <span className="text-gray-300">Sin restricción</span>}
                  </td>
                  <td className="px-4 py-3">
                    {k.expiresAt ? (
                      <span className={`flex items-center gap-1 text-xs ${new Date(k.expiresAt) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(k.expiresAt).toLocaleDateString('es-CL')}
                      </span>
                    ) : <span className="text-xs text-gray-300">Sin expirar</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('es-CL') : <span className="text-gray-300">Nunca</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${k.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {k.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {k.isActive ? 'Activa' : 'Revocada'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleMut.mutate(k.id)} disabled={toggleMut.isPending}
                        title={k.isActive ? 'Revocar' : 'Activar'}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        {k.isActive ? <ToggleRight className="w-4 h-4 text-blue-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={async () => { const ok = await confirmDialog({ message: `¿Eliminar la clave "${k.name}"? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar' }); if (ok) deleteMut.mutate(k.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSave={d => createMut.mutate(d as any)}
          saving={createMut.isPending}
        />
      )}

      {rawKey && (
        <RevealBox rawKey={rawKey} onDismiss={() => setRawKey(null)} />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
