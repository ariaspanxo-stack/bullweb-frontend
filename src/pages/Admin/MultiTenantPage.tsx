import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Search, ToggleLeft, ToggleRight,
  Trash2, Edit3, Globe, Mail, Phone, RefreshCw,
  Users, TrendingUp, X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { Tenant, TenantStats } from '@/services/adminService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

// ─── Plan badge ───────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free:       'bg-gray-100 text-gray-600',
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

// ─── Modal crear/editar ───────────────────────────────────────────────────────
interface TenantModalProps {
  tenant?: Tenant | null;
  onClose: () => void;
  onSaved: () => void;
}

function TenantModal({ tenant, onClose, onSaved }: TenantModalProps) {
  const isEdit = !!tenant;
  const [form, setForm] = useState({
    name:          tenant?.name          ?? '',
    slug:          tenant?.slug          ?? '',
    domain:        tenant?.domain        ?? '',
    plan:          tenant?.plan          ?? 'starter',
    theme_color:   tenant?.theme_color   ?? '#2563eb',
    contact_email: tenant?.contact_email ?? '',
    contact_phone: tenant?.contact_phone ?? '',
  });

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? adminService.updateTenant(tenant!.id, form)
      : adminService.createTenant(form),
    onSuccess: () => {
      toast.success(isEdit ? 'Tenant actualizado' : 'Tenant creado');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al guardar'),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {isEdit ? `Editar "${tenant!.name}"` : 'Nuevo Tenant'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nombre de la empresa" />
            </div>
            {!isEdit && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug * (URL amigable)</label>
                <input value={form.slug}
                  onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="mi-empresa" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
              <select value={form.plan} onChange={e => set('plan', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {['free','starter','pro','enterprise'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color de tema</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                <input type="color" value={form.theme_color} onChange={e => set('theme_color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0" />
                <span className="text-sm font-mono text-gray-600">{form.theme_color}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dominio</label>
              <input value={form.domain} onChange={e => set('domain', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="mi-empresa.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email contacto</label>
              <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="admin@empresa.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono contacto</label>
              <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="+56 9 xxxx xxxx" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.name || (!isEdit && !form.slug) || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
          >
            {mutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Guardar cambios' : 'Crear tenant'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MultiTenantPage() {
  const qc = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [tab, setTab] = useState<'tenants' | 'audit'>('tenants');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; tenant?: Tenant | null }>({ open: false });

  const { data: stats } = useQuery<TenantStats>({
    queryKey: ['tenants', 'stats'],
    queryFn: () => adminService.getTenantStats(),
  });

  const { data: tenants = [], refetch: refetchTenants } = useQuery<Tenant[]>({
    queryKey: ['tenants', 'list', search],
    queryFn: () => adminService.listTenants(search || undefined),
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['tenants', 'audit'],
    queryFn: () => adminService.getTenantAuditLog(undefined, 50),
    enabled: tab === 'audit',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tenants'] });
  };

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminService.toggleTenant(id),
    onSuccess: (r) => { invalidate(); toast.success(r.is_active ? 'Tenant activado' : 'Tenant desactivado'); },
    onError: () => toast.error('Error al cambiar estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteTenant(id),
    onSuccess: () => { invalidate(); toast.success('Tenant eliminado'); },
    onError: () => toast.error('Error al eliminar'),
  });

  const statCards = [
    { label: 'Total tenants',  value: stats?.total   ?? 0, icon: Building2,   color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Activos',        value: stats?.active  ?? 0, icon: TrendingUp,  color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Inactivos',      value: stats?.inactive ?? 0, icon: Users,      color: 'text-gray-600',   bg: 'bg-gray-50' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Multi-empresa / Franquicia</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona tenants, dominios y planes white-label</p>
        </div>
        <div className="flex gap-2">
          {(['tenants', 'audit'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}>
              {t === 'tenants' ? 'Tenants' : 'Auditoría'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`${card.bg} rounded-xl p-3`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      {stats?.by_plan && stats.by_plan.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribución por plan</h3>
          <div className="flex gap-4 flex-wrap">
            {stats.by_plan.map(p => (
              <div key={p.plan}
                className={`px-4 py-2 rounded-full text-sm font-medium ${PLAN_COLORS[p.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                {p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}: {p.count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tenants Tab ─────────────────────────────────────────────────────── */}
      {tab === 'tenants' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tenant..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => refetchTenants()} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setModal({ open: true, tenant: null })}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Nuevo tenant
              </button>
            </div>
          </div>

          {tenants.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No hay tenants registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tenants.map(tenant => (
                <div key={tenant.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Color swatch */}
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: tenant.theme_color }}>
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{tenant.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[tenant.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                            {tenant.plan}
                          </span>
                          {!tenant.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Inactivo</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="font-mono text-blue-600">/{tenant.slug}</span>
                          {tenant.domain && (
                            <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{tenant.domain}</span>
                          )}
                          {tenant.contact_email && (
                            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{tenant.contact_email}</span>
                          )}
                          {tenant.contact_phone && (
                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{tenant.contact_phone}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />{tenant.branch_count} sucursal{tenant.branch_count !== 1 ? 'es' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setModal({ open: true, tenant })}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate(tenant.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          tenant.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={tenant.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {tenant.is_active
                          ? <ToggleRight className="w-5 h-5" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirmDialog({ message: `¿Eliminar tenant "${tenant.name}"?`, confirmLabel: 'Eliminar' });
                          if (ok) deleteMutation.mutate(tenant.id);
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Tab ──────────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Historial de cambios</h2>
          </div>
          {auditLog.length === 0 ? (
            <div className="p-10 text-center text-gray-400">Sin registros de auditoría</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Tenant</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Acción</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry: any) => (
                  <tr key={entry.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{entry.tenant_name}</span>
                      <span className="text-gray-400 ml-2 font-mono text-xs">/{entry.tenant_slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-mono">{entry.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(entry.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      <ConfirmDialog {...dialogProps} />
      {modal.open && (
        <TenantModal
          tenant={modal.tenant}
          onClose={() => setModal({ open: false })}
          onSaved={() => { setModal({ open: false }); invalidate(); }}
        />
      )}
    </div>
  );
}
