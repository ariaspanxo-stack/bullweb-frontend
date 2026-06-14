import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, ShoppingCart, Package, LayoutGrid, CreditCard, Trash2, Shield, Plus, ChevronDown, ChevronUp, KeyRound, Eye, EyeOff, Puzzle } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import superadminService, { type Tenant } from '@/services/superadmin/superadminService';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Props {
  tenant: Tenant;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'bg-emerald-900/50 text-emerald-400',
  SUSPENDED: 'bg-rose-900/50 text-rose-400',
  TRIAL:     'bg-amber-900/50 text-amber-400',
  CANCELLED: 'bg-gray-800 text-gray-500',
};

const PLAN_STYLE: Record<string, string> = {
  STARTER:    'bg-gray-700 text-gray-300',
  PRO:        'bg-indigo-900/50 text-indigo-300',
  ENTERPRISE: 'bg-yellow-900/50 text-yellow-300',
};

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Módulos opcionales ─────────────────────────────────────────────────────────
const MODULE_DEFS = [
  { key: 'fidelizacion', label: 'Fidelización',  price: '$4.990/mes', emoji: '💜' },
  { key: 'cupones',      label: 'Cupones',        price: '$2.990/mes', emoji: '🎟️' },
  { key: 'clientes',     label: 'Clientes',       price: '$4.990/mes', emoji: '👥' },
] as const;

function ModulesSection({
  tenantId,
  modules,
}: {
  tenantId: string;
  modules?: { fidelizacion: boolean; cupones: boolean; clientes: boolean };
}) {
  const qc = useQueryClient();
  const [localModules, setLocalModules] = useState(
    modules ?? { fidelizacion: false, cupones: false, clientes: false }
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Sync when detail loads (useEffect re-runs each time 'modules' prop changes)
  useEffect(() => { if (modules) setLocalModules(modules); }, [modules]);

  const toggle = async (key: 'fidelizacion' | 'cupones' | 'clientes') => {
    const newVal = !localModules[key];
    setLoadingKey(key);
    try {
      await superadminService.setModule(tenantId, key, newVal);
      setLocalModules(prev => ({ ...prev, [key]: newVal }));
      qc.invalidateQueries({ queryKey: ['superadmin', 'tenant', tenantId] });
      toast.success(`Módulo ${key} ${newVal ? 'activado' : 'desactivado'}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Error al actualizar módulo');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-800/60">
        <Puzzle className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-sm font-medium text-gray-300">Módulos opcionales</span>
      </div>
      <div className="px-3 py-3 divide-y divide-gray-800">
        {MODULE_DEFS.map(({ key, label, price, emoji }) => {
          const enabled = localModules[key as keyof typeof localModules];
          const isLoading = loadingKey === key;
          return (
            <div key={key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <div>
                  <p className="text-sm text-white font-medium">{label}</p>
                  <p className="text-xs text-gray-500">{price}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(key as 'fidelizacion' | 'cupones' | 'clientes')}
                disabled={isLoading}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${
                  enabled ? 'bg-indigo-600' : 'bg-gray-700'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperAdminTenantModal({ tenant: initialTenant, onClose }: Props) {
  const qc = useQueryClient();
  const [cleanConfirmOpen, setCleanConfirmOpen] = useState(false);
  const [showRoles,        setShowRoles]        = useState(false);
  const [newRoleName,      setNewRoleName]      = useState('');
  const [newRoleColor,     setNewRoleColor]     = useState('#6366f1');
  const [creatingRole,     setCreatingRole]     = useState(false);
  const [showResetPw,      setShowResetPw]      = useState(false);
  const [newPassword,      setNewPassword]      = useState('');
  const [showPwText,       setShowPwText]       = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['superadmin', 'tenant', initialTenant.id],
    queryFn:  () => superadminService.getTenant(initialTenant.id),
  });

  const suspendMut = useMutation({
    mutationFn: () => superadminService.suspendTenant(initialTenant.id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Cliente suspendido'); },
    onError:    () => toast.error('Error al suspender'),
  });

  const activateMut = useMutation({
    mutationFn: () => superadminService.activateTenant(initialTenant.id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Cliente activado'); },
    onError:    () => toast.error('Error al activar'),
  });

  const extendMut = useMutation({
    mutationFn: (days: number) => superadminService.extendTrial(initialTenant.id, days),
    onSuccess:  (_data, days) => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success(`Trial extendido ${days} días`); },
    onError:    () => toast.error('Error al extender trial'),
  });

  const changePlanMut = useMutation({
    mutationFn: (plan: string) => superadminService.changePlan(initialTenant.id, plan),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); toast.success('Plan actualizado'); },
    onError:    () => toast.error('Error al cambiar plan'),
  });

  const resetPwMut = useMutation({
    mutationFn: (password: string) => superadminService.resetPassword(initialTenant.id, password),
    onSuccess: (data) => {
      if (data.canLogin) {
        toast.success(`✅ Contraseña actualizada. Email de login: ${data.email}`);
      } else {
        toast(`⚠️ Contraseña guardada, pero ${data.email} no puede iniciar sesión (requiere @bullwebchile.com). Contacta soporte.`, { icon: '⚠️', duration: 8000 });
      }
      setNewPassword('');
      setShowResetPw(false);
    },
    onError: (err: any) => toast.error(err.message ?? 'Error al resetear contraseña'),
  });

  const cleanDemoMut = useMutation({
    mutationFn: () => superadminService.cleanDemo(initialTenant.id),
    onSuccess:  (data) => {
      qc.invalidateQueries({ queryKey: ['superadmin'] });
      toast.success(`Datos eliminados — ${data.orders} órdenes, ${data.products} productos, ${data.customers} clientes`);
    },
    onError: () => toast.error('Error al limpiar datos'),
  });
  // Roles del tenant
  const { data: tenantRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['superadmin', 'tenant-roles', initialTenant.id],
    queryFn:  async () => {
      const token = localStorage.getItem('superadmin_token') ?? '';
      const res = await fetch(`/api/superadmin/tenants/${initialTenant.id}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return (data.data ?? []) as Array<{ id: string; name: string; color: string | null; userCount: number }>;
    },
    enabled: showRoles,
  });

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) { toast.error('El nombre es requerido'); return; }
    setCreatingRole(true);
    try {
      const token = localStorage.getItem('superadmin_token') ?? '';
      const res = await fetch(`/api/superadmin/tenants/${initialTenant.id}/roles`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name: newRoleName.trim(), color: newRoleColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear rol');
      toast.success(data.message ?? `Rol "${newRoleName}" creado`);
      setNewRoleName('');
      refetchRoles();
    } catch (err: any) {
      toast.error(err.message ?? 'Error');
    } finally {
      setCreatingRole(false);
    }
  };
  // Usar datos del detalle si ya cargaron, sino los del listado
  const t = detail ?? (initialTenant as any);
  const isPending = suspendMut.isPending || activateMut.isPending || extendMut.isPending || changePlanMut.isPending || cleanDemoMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white">{t.name}</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{t.slug}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">

          {/* Info básica */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-xs mb-1">Plan</p>
              <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${PLAN_STYLE[t.plan?.toUpperCase()] ?? 'bg-gray-800 text-gray-300'}`}>
                {t.plan}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Estado</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-gray-800 text-gray-400'}`}>
                {t.status}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Trial vence</p>
              <p className="text-white text-xs">{fmtDate(t.trialEndsAt)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Registro</p>
              <p className="text-white text-xs">{fmtDate(t.created_at)}</p>
            </div>
          </div>

          {/* Contadores */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <StatBox icon={User}        label="Usuarios"  value={t._count?.users    ?? 0} />
              <StatBox icon={LayoutGrid}  label="Mesas"     value={t._count?.tables   ?? 0} />
              <StatBox icon={Package}     label="Productos" value={t._count?.products ?? 0} />
              <StatBox icon={ShoppingCart} label="Órdenes"  value={t._count?.orders   ?? 0} />
            </div>
          )}

          {/* Suscripción */}
          <div className="bg-gray-800/60 rounded-lg p-3">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Suscripción</p>
            {t.subscriptions ? (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Estado</span>
                  <span className="text-white">{t.subscriptions.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Próximo cobro</span>
                  <span className="text-white">{fmtDate(t.subscriptions.currentPeriodEnd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Precio mensual</span>
                  <span className="text-white">${(t.subscriptions.priceCLP || 0).toLocaleString('es-CL')}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-xs">Sin suscripción activa</p>
            )}
          </div>

          {/* Último pago */}
          {detail?.lastPayment && (
            <div className="bg-gray-800/60 rounded-lg p-3 flex items-center gap-3 text-xs">
              <CreditCard className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-gray-500 mb-0.5">Último pago</p>
                <p className="text-white">
                  ${detail.lastPayment.amount.toLocaleString('es-CL')} · {fmtDate(detail.lastPayment.paidAt)} · <span className="capitalize">{detail.lastPayment.status}</span>
                </p>
              </div>
            </div>
          )}

          {/* Cambiar plan */}
          <div>
            <p className="text-gray-500 text-xs mb-1.5 font-medium">Cambiar plan</p>
            <div className="flex gap-2">
              {['STARTER', 'PRO', 'ENTERPRISE'].map(p => (
                <button
                  key={p}
                  onClick={() => changePlanMut.mutate(p)}
                  disabled={isPending || t.plan?.toUpperCase() === p}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    t.plan?.toUpperCase() === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ── Resetear contraseña del admin ── */}
          <div className="border border-gray-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowResetPw(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800/60 hover:bg-gray-800 transition-colors text-sm"
            >
              <span className="flex items-center gap-2 text-gray-300 font-medium">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Resetear contraseña del admin
              </span>
              {showResetPw ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
            </button>

            {showResetPw && (
              <div className="px-3 py-3 space-y-2">
                <p className="text-xs text-gray-500">
                  Se actualizará la contraseña del usuario <span className="text-gray-300">administrador</span> de <span className="text-gray-300">{t.name}</span>.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPwText ? 'text' : 'password'}
                      className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 focus:outline-none rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 pr-8"
                      placeholder="Nueva contraseña (mín. 6 caracteres)..."
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && newPassword.trim().length >= 6 && resetPwMut.mutate(newPassword.trim())}
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwText(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPwText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => resetPwMut.mutate(newPassword.trim())}
                    disabled={resetPwMut.isPending || newPassword.trim().length < 6}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {resetPwMut.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                <p className="text-xs text-amber-500/80">⚠️ Avisa al cliente la nueva clave por WhatsApp o teléfono.</p>
              </div>
            )}
          </div>

          {/* ── Gestión de roles ── */}
          <div className="border border-gray-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowRoles(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800/60 hover:bg-gray-800 transition-colors text-sm"
            >
              <span className="flex items-center gap-2 text-gray-300 font-medium">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Roles del restaurante
              </span>
              {showRoles ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
            </button>

            {showRoles && (
              <div className="px-3 py-3 space-y-3">
                {/* Roles existentes */}
                {tenantRoles && tenantRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tenantRoles.map(r => (
                      <span
                        key={r.id}
                        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: r.color ?? '#6b7280' }}
                        />
                        <span className="text-gray-300">{r.name}</span>
                        <span className="text-gray-600">({r.userCount})</span>
                      </span>
                    ))}
                  </div>
                )}
                {tenantRoles?.length === 0 && (
                  <p className="text-xs text-gray-600">Sin roles personalizados aún</p>
                )}

                {/* Crear nuevo rol */}
                <div className="border-t border-gray-700/50 pt-3">
                  <p className="text-xs text-gray-500 mb-2">Crear nuevo rol para <span className="text-gray-300">{t.name}</span></p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:outline-none rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600"
                      placeholder="Nombre del rol..."
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateRole()}
                      maxLength={50}
                    />
                    <input
                      type="color"
                      value={newRoleColor}
                      onChange={e => setNewRoleColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5"
                      title="Color del rol"
                    />
                    <button
                      onClick={handleCreateRole}
                      disabled={creatingRole || !newRoleName.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {creatingRole ? '...' : 'Crear'}
                    </button>
                  </div>
                  <p className="text-xs text-amber-500/80 mt-1.5 flex items-center gap-1">
                    ⚠️ El rol quedará asignado a <strong>{t.name}</strong> — aparecerá en /admin/users
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Módulos opcionales ── */}
          <ModulesSection tenantId={initialTenant.id} modules={detail?.modules} />

        </div>

        {/* Footer — Acciones */}
        <div className="p-5 border-t border-gray-800 space-y-3">

          {/* Extender trial */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">Extender trial:</span>
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => extendMut.mutate(d)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-900/50 hover:bg-amber-800/60 text-amber-300 transition-colors disabled:opacity-50"
              >
                +{d}d
              </button>
            ))}
          </div>

          {/* Activate / Suspend */}
          <div className="flex gap-2">
            {t.status !== 'ACTIVE' && (
              <button
                onClick={() => activateMut.mutate()}
                disabled={isPending}
                className="flex-1 text-sm py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
              >
                Activar
              </button>
            )}
            {t.status !== 'SUSPENDED' && (
              <button
                onClick={() => suspendMut.mutate()}
                disabled={isPending}
                className="flex-1 text-sm py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white transition-colors disabled:opacity-50"
              >
                Suspender
              </button>
            )}
          </div>

          {/* Zona peligrosa */}
          <div className="border-t border-red-900/40 pt-3 mt-1">
            <p className="text-xs text-red-500/70 font-medium mb-2 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Zona peligrosa
            </p>
            <button
              onClick={() => setCleanConfirmOpen(true)}
              disabled={isPending}
              className="w-full text-xs py-2 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 transition-colors disabled:opacity-50"
            >
              {cleanDemoMut.isPending ? 'Limpiando…' : '🧹 Limpiar datos de prueba'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={cleanConfirmOpen}
        title="Limpiar datos de prueba"
        message={`⚠️ ¿Eliminar TODOS los datos de "${t.name}"?\n\nSe borrarán órdenes, productos, categorías y clientes. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, limpiar todo"
        variant="danger"
        isLoading={cleanDemoMut.isPending}
        onConfirm={() => { setCleanConfirmOpen(false); cleanDemoMut.mutate(); }}
        onCancel={() => setCleanConfirmOpen(false)}
      />
    </div>
  );
}
