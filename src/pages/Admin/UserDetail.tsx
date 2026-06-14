/**
 * BULLWEB ENTERPRISE — User Detail Page
 * Vista completa de un usuario: info, seguridad, rol, actividad.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, User, Mail, Phone, Shield, ShieldCheck,
  AlertTriangle, Lock, LockOpen, ShieldOff, CheckCircle2,
  XCircle, Save, Edit3, RefreshCw, Clock, Activity,
  Key, ChevronDown, ChevronUp, Plus, Ban, Trash2,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { AdminRole } from '@/services/adminService';
import { MODULES, ACTIONS } from '@/pages/Admin/RoleMatrix';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    INFO:     'bg-blue-400',
    WARNING:  'bg-amber-400',
    CRITICAL: 'bg-red-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[severity] ?? 'bg-gray-300'}`} />;
}

// ── Assign Role Modal ─────────────────────────────────────────────────────────
function AssignRoleModal({
  userId,
  currentRoleId,
  onClose,
}: {
  userId:        string;
  currentRoleId: string;
  onClose:       () => void;
}) {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(currentRoleId);

  const { data: roles = [] } = useQuery<AdminRole[]>({
    queryKey: ['admin-roles'],
    queryFn:  () => adminService.listRoles(),
  });

  const assign = useMutation({
    mutationFn: () => adminService.assignRole(userId, { roleId: selectedRole }),
    onSuccess: () => {
      toast.success('Rol asignado');
      qc.invalidateQueries({ queryKey: ['admin-user', userId] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: () => toast.error('Error al asignar rol'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Cambiar rol</h2>
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {roles.map(role => (
            <label
              key={role.id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                selectedRole === role.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role.id}
                checked={selectedRole === role.id}
                onChange={() => setSelectedRole(role.id)}
                className="accent-indigo-600"
              />
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: role.color ?? '#6366f1' }}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{role.name}</p>
                {role.description && <p className="text-xs text-gray-400">{role.description}</p>}
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => assign.mutate()}
            disabled={assign.isPending || selectedRole === currentRoleId}
            className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {assign.isPending ? 'Guardando…' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn:  () => adminService.getUser(id!),
    enabled:  !!id,
    onSuccess: (u: any) => {
      setForm({ name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' });
    },
  } as any);

  const updateMut = useMutation({
    mutationFn: () => adminService.updateUser(id!, {
      firstName: form.name.split(' ')[0] ?? form.name,
      lastName:  form.name.split(' ').slice(1).join(' ') || undefined,
      email:     form.email,
      phone:     form.phone || undefined,
    }),
    onSuccess:  () => { toast.success('Usuario actualizado'); setEditing(false); qc.invalidateQueries({ queryKey: ['admin-user', id] }); },
    onError:    () => toast.error('Error al guardar'),
  });

  const toggleActive = useMutation({
    mutationFn: () => adminService.updateUser(id!, { active: !(user as any)?.active }),
    onSuccess:  () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['admin-user', id] }); },
    onError:    () => toast.error('Error'),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="text-lg">Usuario no encontrado</p>
        <button onClick={() => navigate('/admin/users')} className="mt-4 text-sm text-indigo-600 underline">
          Volver a usuarios
        </button>
      </div>
    );
  }

  const u = user as any;
  const sec = u.user_security_profiles;
  const isLocked = sec?.lockedUntil && new Date(sec.lockedUntil) > new Date();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ChevronLeft className="w-4 h-4" /> Usuarios
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
          style={{ backgroundColor: u.roles?.color ?? '#6366f1' }}
        >
          {initials(u.name ?? u.email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{u.name}</h1>
            {u.active ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3" /> Activo
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                <XCircle className="w-3 h-3" /> Suspendido
              </span>
            )}
            {u.roles && (
              <span
                className="px-2 py-0.5 rounded-md text-xs font-semibold text-white"
                style={{ backgroundColor: u.roles.color ?? '#6366f1' }}
              >
                {u.roles.name}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{u.email}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            Creado {formatDistanceToNow(parseISO(u.createdAt), { addSuffix: true, locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setEditing(!editing); if (!editing) setForm({ name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' }); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4" /> {editing ? 'Cancelar' : 'Editar'}
          </button>
          <button
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
            className={`px-3 py-2 text-sm rounded-xl border transition-colors ${
              u.active ? 'hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-600' : 'hover:bg-green-50 hover:border-green-200 hover:text-green-600 text-gray-600'
            }`}
          >
            {u.active ? 'Suspender' : 'Activar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: info + security */}
        <div className="lg:col-span-2 space-y-6">

          {/* Edit form */}
          {editing && (
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><User className="w-4 h-4" /> Información personal</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    type="email"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    type="tel"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                onClick={() => updateMut.mutate()}
                disabled={updateMut.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" /> {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* Security profile */}
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" /> Seguridad
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className={`rounded-xl p-4 border ${sec?.twoFactorEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={`w-4 h-4 ${sec?.twoFactorEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-gray-600">Autenticación 2FA</span>
                </div>
                <p className={`text-sm font-semibold ${sec?.twoFactorEnabled ? 'text-green-700' : 'text-gray-500'}`}>
                  {sec?.twoFactorEnabled ? 'Activada' : 'No configurada'}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${isLocked ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Lock className={`w-4 h-4 ${isLocked ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-gray-600">Estado de cuenta</span>
                </div>
                <p className={`text-sm font-semibold ${isLocked ? 'text-red-600' : 'text-gray-500'}`}>
                  {isLocked ? 'Bloqueada' : 'Normal'}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${(sec?.failedAttempts ?? 0) >= 3 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${(sec?.failedAttempts ?? 0) >= 3 ? 'text-amber-500' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-gray-600">Intentos fallidos</span>
                </div>
                <p className={`text-2xl font-bold ${(sec?.failedAttempts ?? 0) >= 3 ? 'text-amber-700' : 'text-gray-700'}`}>
                  {sec?.failedAttempts ?? 0}
                </p>
              </div>
              <div className="rounded-xl p-4 border bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Último cambio de contraseña</span>
                </div>
                <p className="text-sm text-gray-600">
                  {sec?.lastPasswordAt
                    ? formatDistanceToNow(parseISO(sec.lastPasswordAt), { addSuffix: true, locale: es })
                    : 'Nunca'}
                </p>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800 text-sm">Actividad reciente</h2>
            </div>
            <div className="divide-y">
              {!u.recentActivity?.length && (
                <p className="text-center py-8 text-gray-400 text-sm">Sin actividad registrada</p>
              )}
              {(u.recentActivity ?? []).slice(0, 12).map((log: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <SeverityDot severity="INFO" />
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    <code className="bg-gray-100 text-xs px-1 py-0.5 rounded mr-1.5 font-mono">{log.action}</code>
                    {log.targetDesc ?? log.module}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(parseISO(log.createdAt), { addSuffix: true, locale: es })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: role + info */}
        <div className="space-y-5">

          {/* Role assignment */}
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-semibold text-gray-800 flex items-center justify-between mb-4">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Rol asignado</span>
            </h2>
            <div className="mb-4">
              {u.roles ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: u.roles.color ?? '#6366f1' }} />
                  <span className="text-sm font-semibold text-gray-800">{u.roles.name}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin rol asignado</p>
              )}
            </div>
            <button
              onClick={() => setShowRoleModal(true)}
              className="w-full px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 text-gray-600"
            >
              Cambiar rol
            </button>
            <button
              onClick={() => setShowPerms(v => !v)}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm border border-indigo-200 rounded-xl hover:bg-indigo-50 text-indigo-600"
            >
              <Key className="w-4 h-4" />
              {showPerms ? 'Ocultar' : 'Ver'} permisos granulares
              {showPerms ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Contact info */}
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Datos de contacto
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm text-gray-800 break-all">{u.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="text-sm text-gray-800">{u.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Última actualización</p>
                  <p className="text-sm text-gray-800">
                    {u.updatedAt ? formatDistanceToNow(parseISO(u.updatedAt), { addSuffix: true, locale: es }) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User assignments */}
          {(u.user_role_assignments?.length > 0) && (
            <div className="bg-white rounded-2xl border p-5">
              <h2 className="font-semibold text-gray-800 mb-3 text-sm">Asignaciones por sucursal</h2>
              <div className="space-y-2">
                {u.user_role_assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{a.branch?.name ?? 'Global'}</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: a.role?.color ?? '#6366f1' }}
                    >
                      {a.role?.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Permisos Granulares ── */}
      {showPerms && u.roleId && (
        <UserPermissionsPanel userId={id!} roleId={u.roleId} userName={u.name} />
      )}

      {showRoleModal && (
        <AssignRoleModal
          userId={id!}
          currentRoleId={u.roleId}
          onClose={() => setShowRoleModal(false)}
        />
      )}
    </div>
  );
}

// ── UserPermissionsPanel ──────────────────────────────────────────────────────
type Override = { id: string; module: string; action: string; granted: boolean };

function UserPermissionsPanel({ userId, roleId, userName }: { userId: string; roleId: string; userName: string }) {
  const qc = useQueryClient();

  // Permisos del rol base
  const { data: rolePerms = [], isLoading: loadingRole } = useQuery({
    queryKey: ['role-perms', roleId],
    queryFn:  () => adminService.getRolePermissions(roleId),
    staleTime: 60_000,
  });

  // Overrides del usuario
  const { data: overrides = [], isLoading: loadingOv } = useQuery({
    queryKey: ['user-overrides', userId],
    queryFn:  () => adminService.getUserOverrides(userId).catch(() => [] as Override[]),
    staleTime: 30_000,
  });

  const addOverride = useMutation({
    mutationFn: (vars: { module: string; action: string; granted: boolean }) =>
      adminService.setUserOverride(userId, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-overrides', userId] }),
  });

  const delOverride = useMutation({
    mutationFn: (overrideId: string) => adminService.deleteUserOverride(userId, overrideId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['user-overrides', userId] }),
  });

  const roleSet = new Set(rolePerms.map((p: { module: string; action: string }) => `${p.module}::${p.action}`));
  const ovMap   = new Map<string, Override>(overrides.map((o: Override) => [`${o.module}::${o.action}`, o]));

  function effectivePerm(mod: string, action: string) {
    const key = `${mod}::${action}`;
    if (ovMap.has(key)) return ovMap.get(key)!.granted ? 'override-grant' : 'override-deny';
    return roleSet.has(key) ? 'role-grant' : 'none';
  }

  function handleCell(mod: string, action: string) {
    const key = `${mod}::${action}`;
    const existing = ovMap.get(key);
    const fromRole  = roleSet.has(key);

    if (existing) {
      // ciclo: override → quitar override (volver a rol)
      delOverride.mutate(existing.id);
    } else if (fromRole) {
      // tiene por rol → override deny
      addOverride.mutate({ module: mod, action: action, granted: false });
    } else {
      // no tiene → override grant
      addOverride.mutate({ module: mod, action: action, granted: true });
    }
  }

  const loading = loadingRole || loadingOv;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <Key className="w-4 h-4 text-indigo-500" />
        <h2 className="font-semibold text-gray-800 text-sm flex-1">Permisos Granulares</h2>
        <span className="text-xs text-gray-400">Sobreescribe los permisos del rol para este usuario específicamente</span>
      </div>

      {/* Leyenda */}
      <div className="px-5 py-2 flex items-center gap-5 text-xs text-gray-500 border-b bg-gray-50">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-green-100 border border-green-300 inline-block" />
          Del rol
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-indigo-200 border-2 border-indigo-500 inline-block" />
          Override: otorgado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-red-100 border-2 border-red-400 inline-block" />
          Override: denegado
        </span>
        <span className="text-gray-400 ml-auto">Click en celda para ciclar: rol → denegar → otorgar → quitar override</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <RefreshCw className="animate-spin mr-2" size={16} /> Cargando permisos…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 w-36">Módulo</th>
                {ACTIONS.map(a => (
                  <th key={a.key} className="px-2 py-2.5 text-center">
                    <span className={`font-semibold text-[11px] px-1.5 py-0.5 rounded ${a.color}`}>{a.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, i) => (
                <tr key={mod.key} className={`border-b hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-700">{mod.label.replace(/^\S+\s/, '')}</p>
                  </td>
                  {ACTIONS.map(action => {
                    const state = effectivePerm(mod.key, action.key);
                    return (
                      <td key={action.key} className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleCell(mod.key, action.key)}
                          title={{
                            'role-grant':    'Del rol — click para denegar',
                            'override-grant':'Override otorgado — click para quitar',
                            'override-deny': 'Override denegado — click para quitar',
                            'none':          'Sin permiso — click para otorgar override',
                          }[state]}
                          className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-all hover:scale-110 border ${
                            state === 'role-grant'    ? 'bg-green-100 border-green-300' :
                            state === 'override-grant'? 'bg-indigo-200 border-indigo-500 ring-1 ring-indigo-400' :
                            state === 'override-deny' ? 'bg-red-100 border-red-400 ring-1 ring-red-300' :
                            'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {state === 'role-grant'     && <CheckCircle2 size={11} className="text-green-600" />}
                          {state === 'override-grant' && <Plus size={11} className="text-indigo-600" />}
                          {state === 'override-deny'  && <Ban size={11} className="text-red-500" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400">{overrides.length} override(s) activos para {userName}</span>
        {overrides.length > 0 && (
          <button
            onClick={() => overrides.forEach((o: Override) => delOverride.mutate(o.id))}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <Trash2 size={11} /> Quitar todos los overrides
          </button>
        )}
      </div>
    </div>
  );
}
