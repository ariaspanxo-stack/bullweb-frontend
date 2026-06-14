import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, Plus, RefreshCw, Search, Eye, Download, Trash2, ChevronLeft, ChevronRight, Archive, ArchiveRestore } from 'lucide-react';
import superadminService, { type Tenant } from '@/services/superadmin/superadminService';
import SuperAdminTenantModal from './SuperAdminTenantModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ─── Constantes ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const MRR_BY_PLAN: Record<string, number> = {
  STARTER: 28000, PRO: 40000, ENTERPRISE: 80000,
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'bg-emerald-900/50 text-emerald-300',
  SUSPENDED: 'bg-rose-900/50 text-rose-300',
  TRIAL:     'bg-amber-900/50 text-amber-300',
  PAST_DUE:  'bg-yellow-900/50 text-yellow-300',
  CANCELLED: 'bg-gray-800 text-gray-500',
};

const PLAN_STYLE: Record<string, string> = {
  STARTER:    'bg-gray-800 text-gray-300',
  PRO:        'bg-indigo-900/50 text-indigo-300',
  ENTERPRISE: 'bg-yellow-900/50 text-yellow-300',
};

const SEMAFORO_ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRelative(d?: string | null): { text: string; isOld: boolean; isOnline: boolean } {
  if (!d) return { text: 'Sin acceso', isOld: true, isOnline: false };
  const diff = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 10)  return { text: 'En línea', isOld: false, isOnline: true };
  if (mins < 60)  return { text: `Hace ${mins} min`,       isOld: false, isOnline: false };
  if (hours < 24) return { text: `Hace ${hours} h`,        isOld: hours > 12, isOnline: false };
  if (days < 30)  return { text: `Hace ${days} días`,      isOld: days > 14,  isOnline: false };
  const months = Math.floor(days / 30);
  return { text: months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`, isOld: true, isOnline: false };
}

function calcSemaforo(t: any): 'green' | 'yellow' | 'red' {
  const now = Date.now();
  if (t.status === 'SUSPENDED' || t.status === 'CANCELLED') return 'red';
  if (t.status === 'TRIAL' && t.trialEndsAt && new Date(t.trialEndsAt).getTime() < now) return 'red';
  const diff = t.lastLogin ? now - new Date(t.lastLogin).getTime() : Infinity;
  const days = diff / 86_400_000;
  if (diff < 10 * 60_000) return 'green'; // en línea ahora mismo
  if (days > 14) return 'red';
  const trialSoon = t.status === 'TRIAL' && t.trialEndsAt &&
    new Date(t.trialEndsAt).getTime() - now < 3 * 86400000;
  if (days > 7 || trialSoon) return 'yellow';
  return 'green';
}

function getMrr(t: any): number {
  if (t.status === 'SUSPENDED' || t.status === 'CANCELLED' || t.status === 'TRIAL') return 0;
  return MRR_BY_PLAN[t.plan?.toUpperCase() ?? ''] ?? 0;
}

function fmt$(n: number) { return '$' + n.toLocaleString('es-CL'); }

// ─── Componente ─────────────────────────────────────────────────────────────

export default function SuperAdminTenants() {
  const qc = useQueryClient();

  const [q, setQ]                         = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [planFilter, setPlanFilter]       = useState('');
  const [testFilter, setTestFilter]       = useState<'all' | 'real' | 'test'>('real');
  const [archivedFilter, setArchivedFilter] = useState(false);
  const [page, setPage]                   = useState(1);
  const [selectedTenant, setSelected]     = useState<Tenant | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Tenant | null>(null);
  const [planChangeConfirm, setPlanChangeConfirm] = useState<{ tenant: Tenant; plan: string } | null>(null);

  const { data: tenantsResp, isLoading, refetch } = useQuery({
    queryKey: ['superadmin', 'tenants', { archived: archivedFilter }],
    queryFn:  () => superadminService.listTenants({ limit: 500, archived: archivedFilter }),
  });
  const tenants: any[] = (tenantsResp as any)?.tenants ?? (Array.isArray(tenantsResp) ? tenantsResp : []);

  const suspendMut = useMutation({
    mutationFn: (id: string) => superadminService.suspendTenant(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Cliente suspendido'); },
    onError:    () => toast.error('Error al suspender'),
  });
  const activateMut = useMutation({
    mutationFn: (id: string) => superadminService.activateTenant(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Cliente activado'); },
    onError:    () => toast.error('Error al activar'),
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => superadminService.archiveTenant(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Cliente archivado'); },
    onError:    () => toast.error('Error al archivar'),
  });
  const unarchiveMut = useMutation({
    mutationFn: (id: string) => superadminService.unarchiveTenant(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Cliente restaurado'); },
    onError:    () => toast.error('Error al restaurar'),
  });
  const extendMut = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => superadminService.extendTrial(id, days),
    onSuccess:  (_d, { days }) => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success(`Trial extendido ${days} días`); },
    onError:    () => toast.error('Error al extender trial'),
  });
  const changePlanMut = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) => superadminService.changePlan(id, plan),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Plan actualizado'); },
    onError:    () => toast.error('Error al cambiar plan'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => superadminService.deleteTenant(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Tenant eliminado'); },
    onError:    (e: any) => toast.error(e?.message || 'Error al eliminar tenant'),
  });

  const isBusy = suspendMut.isPending || activateMut.isPending || extendMut.isPending || changePlanMut.isPending || archiveMut.isPending || unarchiveMut.isPending;

  // Filtrar + ordenar
  const filtered = useMemo(() => {
    const result = tenants
      .filter(t => testFilter === 'all' ? true : testFilter === 'real' ? !t.isTest : !!t.isTest)
      .filter(t => !statusFilter || t.status === statusFilter)
      .filter(t => !planFilter   || t.plan?.toUpperCase() === planFilter)
      .filter(t => !q || t.name?.toLowerCase().includes(q.toLowerCase()) || t.slug?.toLowerCase().includes(q.toLowerCase()));
    result.sort((a, b) => {
      const diff = (SEMAFORO_ORDER[calcSemaforo(a)] ?? 3) - (SEMAFORO_ORDER[calcSemaforo(b)] ?? 3);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
    return result;
  }, [tenants, testFilter, statusFilter, planFilter, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function setFilter<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  // Exportar CSV
  function exportCSV() {
    const headers = ['Nombre','Slug','Plan','Estado','MRR','Usuarios','Registro','Último acceso','Trial vence','isTest'];
    const rows = filtered.map(t => [
      t.name ?? '', t.slug ?? '', t.plan?.toUpperCase() ?? '', t.status ?? '',
      getMrr(t), t._count?.users ?? 0,
      t.created_at ? new Date(t.created_at).toLocaleDateString('es-CL') : '',
      fmtRelative(t.lastLogin).text,
      t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('es-CL') : '',
      t.isTest ? 'Sí' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tenants_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImpersonate(tenant: Tenant) { setImpersonateTarget(tenant); }

  async function doImpersonate(tenant: Tenant) {
    try {
      const data = await superadminService.impersonate(tenant.id);
      localStorage.setItem('superadmin_token_backup', localStorage.getItem('superadmin_token') || '');
      localStorage.setItem('bullweb_token_backup',    localStorage.getItem('bullweb_token')    || '');
      localStorage.setItem('auth-storage-backup',     localStorage.getItem('auth-storage')     || '');
      localStorage.setItem('impersonate_tenant', JSON.stringify({ id: tenant.id, name: tenant.name, slug: tenant.slug }));
      localStorage.setItem('bullweb_token', data.token);
      let authStorage: any;
      try {
        const raw = localStorage.getItem('auth-storage');
        authStorage = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      } catch (parseErr) {
        console.warn('auth-storage corrupto, limpiando...', parseErr);
        localStorage.removeItem('auth-storage');
        authStorage = { state: {}, version: 0 };
      }
      authStorage.state = { ...(authStorage.state || {}), token: data.token, isAuthenticated: false };
      localStorage.setItem('auth-storage', JSON.stringify(authStorage));
      window.open('https://app.bullwebchile.com/dashboard', '_blank');
      toast.success(`Accediendo al sistema de ${tenant.name}`);
    } catch {
      toast.error('Error al impersonar cliente');
    }
  }

  return (
    <div className="p-6">

      {/* Modal detalle */}
      {selectedTenant && (
        <SuperAdminTenantModal tenant={selectedTenant} onClose={() => setSelected(null)} />
      )}

      {/* Confirm impersonar */}
      <ConfirmModal
        isOpen={!!impersonateTarget}
        title={`Acceder al sistema de "${impersonateTarget?.name}"`}
        message={`Tendrás acceso completo como administrador del cliente.\nDuración de la sesión: 8 horas.`}
        confirmLabel="Sí, ingresar"
        variant="warning"
        onConfirm={() => { const t = impersonateTarget!; setImpersonateTarget(null); doImpersonate(t); }}
        onCancel={() => setImpersonateTarget(null)}
      />

      {/* Confirm eliminar */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`¿Eliminar tenant "${deleteTarget?.name}"?`}
        message={`Esta acción es irreversible ⚠️\nSe eliminarán todos los datos del tenant de la BD.`}
        confirmLabel="Sí, eliminar"
        variant="danger"
        onConfirm={() => { const t = deleteTarget!; setDeleteTarget(null); deleteMut.mutate(t.id); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Confirm cambio de plan */}
      <ConfirmModal
        isOpen={!!planChangeConfirm}
        title={`¿Cambiar plan de "${planChangeConfirm?.tenant?.name}"?`}
        message={`Se cambiará el plan a ${planChangeConfirm?.plan?.toUpperCase()}.`}
        confirmLabel="Sí, cambiar"
        variant="warning"
        onConfirm={() => {
          if (planChangeConfirm) changePlanMut.mutate({ id: planChangeConfirm.tenant.id, plan: planChangeConfirm.plan });
          setPlanChangeConfirm(null);
        }}
        onCancel={() => setPlanChangeConfirm(null)}
      />

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} de {tenants.length} tenants
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <Link
            to="/superadmin/tenants/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo cliente
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={q}
            onChange={e => setFilter(setQ)(e.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filtro TEST/REAL */}
        <div className="flex rounded-lg border border-gray-800 overflow-hidden text-sm">
          {(['all', 'real', 'test'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(setTestFilter)(f)}
              className={`px-3 py-2 transition-colors ${testFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
            >
              {f === 'all' ? 'Todos' : f === 'real' ? 'Solo reales' : 'Solo test'}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={e => setFilter(setStatusFilter)(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todos los estados</option>
          <option value="TRIAL">TRIAL</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <select
          value={planFilter}
          onChange={e => setFilter(setPlanFilter)(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todos los planes</option>
          <option value="STARTER">STARTER</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </select>

        {/* Filtro Archivados */}
        <button
          onClick={() => { setArchivedFilter(v => !v); setPage(1); }}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
            archivedFilter
              ? 'bg-amber-700 text-amber-100 border-amber-600'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Archivados
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-600">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No se encontraron clientes</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800 bg-gray-900/70">
                    <th className="px-3 py-3 w-8"></th>
                    <th className="px-3 py-3 font-medium">Nombre</th>
                    <th className="px-3 py-3 font-medium">Slug</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">MRR</th>
                    <th className="px-3 py-3 font-medium text-right">Órdenes 7d</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Trial vence</th>
                    <th className="px-3 py-3 font-medium">Registro</th>
                    <th className="px-3 py-3 font-medium text-right">Usuarios</th>
                    <th className="px-3 py-3 font-medium">Último acceso</th>
                    <th className="px-3 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {paginated.map((t: any) => {
                    const sem = calcSemaforo(t);
                    const { text: lastAccess, isOld, isOnline } = fmtRelative(t.lastLogin);
                    const mrr = getMrr(t);
                    return (
                      <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">

                        {/* Semáforo */}
                        <td className="px-3 py-3">
                          <div
                            className={`w-3 h-3 rounded-full mx-auto ${sem === 'green' ? 'bg-emerald-400' : sem === 'yellow' ? 'bg-amber-400' : 'bg-rose-500'}`}
                            title={sem === 'green' ? 'Activo y saludable' : sem === 'yellow' ? 'Atención requerida' : 'Crítico'}
                          />
                        </td>

                        {/* Nombre + badge TEST */}
                        <td className="px-3 py-3 font-medium text-white">
                          <div className="flex items-center gap-2 flex-wrap">
                            {t.name}
                            {t.isTest && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-normal">TEST</span>
                            )}
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs text-gray-400">{t.slug}</span>
                        </td>

                        {/* Plan */}
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${PLAN_STYLE[t.plan?.toUpperCase()] ?? 'bg-gray-800 text-gray-300'}`}>
                            {t.plan}
                          </span>
                        </td>

                        {/* MRR */}
                        <td className="px-3 py-3 text-xs">
                          {mrr > 0 ? <span className="text-emerald-400 font-medium">{fmt$(mrr)}</span> : <span className="text-gray-600">—</span>}
                        </td>

                        {/* Órdenes 7d */}
                        <td className="px-3 py-3 text-right">
                          <span className={`font-mono text-sm ${(t.orders7d ?? 0) > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {t.orders7d ?? 0}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-gray-800 text-gray-400'}`}>
                            {t.status}
                          </span>
                        </td>

                        {/* Trial vence */}
                        <td className="px-3 py-3 text-xs text-gray-400">
                          {t.status === 'TRIAL' ? fmtDate(t.trialEndsAt) : '—'}
                        </td>

                        {/* Registro */}
                        <td className="px-3 py-3 text-xs text-gray-400">
                          {fmtDate(t.created_at)}
                        </td>

                        {/* Usuarios */}
                        <td className="px-3 py-3 text-right text-gray-400">{t._count?.users ?? 0}</td>

                        {/* Último acceso */}
                        <td className="px-3 py-3 text-xs">
                          {isOnline ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                              En línea
                            </span>
                          ) : (
                            <span className={isOld ? 'text-rose-400' : 'text-gray-400'}>{lastAccess}</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            <Link
                              to={`/superadmin/tenants/${t.id}`}
                              className="text-xs px-2.5 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                            >
                              Ver
                            </Link>

                            <button
                              onClick={() => handleImpersonate(t)}
                              className="text-xs px-2.5 py-1 rounded-md bg-indigo-800 hover:bg-indigo-700 text-indigo-200 transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />Entrar
                            </button>

                            {/* Cambiar plan */}
                            <select
                              defaultValue=""
                              onChange={e => {
                                if (e.target.value) setPlanChangeConfirm({ tenant: t, plan: e.target.value });
                                e.currentTarget.value = '';
                              }}
                              className="text-xs px-2 py-1 rounded-md bg-violet-900/50 hover:bg-violet-800/60 text-violet-300 border border-violet-700/30 cursor-pointer focus:outline-none transition-colors"
                            >
                              <option value="" disabled>Plan ▼</option>
                              <option value="STARTER">Starter</option>
                              <option value="PRO">Pro</option>
                              <option value="ENTERPRISE">Enterprise</option>
                            </select>

                            {t.status === 'TRIAL' && (
                              <button
                                onClick={() => extendMut.mutate({ id: t.id, days: 7 })}
                                disabled={isBusy}
                                className="text-xs px-2.5 py-1 rounded-md bg-amber-900/50 hover:bg-amber-800/60 text-amber-300 transition-colors disabled:opacity-50"
                              >
                                +7d
                              </button>
                            )}

                            {t.status === 'SUSPENDED' ? (
                              <button
                                onClick={() => activateMut.mutate(t.id)}
                                disabled={isBusy}
                                className="text-xs px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                              >
                                Activar
                              </button>
                            ) : (
                              <button
                                onClick={() => suspendMut.mutate(t.id)}
                                disabled={isBusy}
                                className="text-xs px-2.5 py-1 rounded-md bg-rose-700 hover:bg-rose-600 text-white transition-colors disabled:opacity-50"
                              >
                                Suspender
                              </button>
                            )}

                            {/* Eliminar — solo TEST */}
                            {t.isTest && (
                              <button
                                onClick={() => setDeleteTarget(t)}
                                disabled={deleteMut.isPending}
                                className="text-xs px-2.5 py-1 rounded-md bg-rose-900/70 hover:bg-rose-800 text-rose-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />Eliminar
                              </button>
                            )}

                            {/* Archivar / Restaurar */}
                            {!archivedFilter ? (
                              <button
                                onClick={() => archiveMut.mutate(t.id)}
                                disabled={isBusy}
                                title="Archivar cliente"
                                className="text-xs px-2.5 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                onClick={() => unarchiveMut.mutate(t.id)}
                                disabled={isBusy}
                                className="text-xs px-2.5 py-1 rounded-md bg-amber-700 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <ArchiveRestore className="w-3 h-3" />Restaurar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between text-sm text-gray-400">
                <span>
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} tenants
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-gray-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((p, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span key={`e${p}`} className="px-1 text-gray-600">…</span>
                        )}
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${page === p ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'}`}
                        >
                          {p}
                        </button>
                      </>
                    ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded hover:bg-gray-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
