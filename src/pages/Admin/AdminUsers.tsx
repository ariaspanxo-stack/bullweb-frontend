/**
 * BULLWEB ENTERPRISE — Admin Users Page
 * Gestión completa de usuarios con:
 *  - Tabla con filtros, paginación y búsqueda
 *  - Bulk actions (suspender, activar, resetear)
 *  - Modal de creación/edición con validación de teléfono chileno
 *  - Cambio inline de rol desde la tabla
 *  - Reset password con modal de contraseña temporal
 *  - Simular sesión (endpoint real implementado)
 *  - Indicadores de seguridad (2FA, cuenta bloqueada)
 *  - Botón "Crear roles estándar" si hay pocos roles
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, UserPlus, Shield, AlertTriangle, CheckCircle,
  XCircle, Key, Trash2, RefreshCw, Mail,
  Lock, MoreVertical, Edit, Eye, PlayCircle, X, AlertOctagon,
  FileDown, EyeOff, Pencil, Info, Copy, CheckCheck
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { AdminUser, AdminRole } from '@/services/adminService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { exportSheet, fmtDateTime } from '@/utils/exportExcel';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Validación teléfono chileno
// ---------------------------------------------------------------------------
const phoneRegex = /^(\+56|56)?[\s-]?[2-9]\d{7,8}$/;

function isValidPhone(val: string): boolean {
  if (!val) return true; // opcional
  return phoneRegex.test(val.replace(/\s/g, ''));
}

// ---------------------------------------------------------------------------
// Badge de estado
// ---------------------------------------------------------------------------
const StatusBadge = ({ active }: { active: boolean }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
    active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }`}>
    {active ? <CheckCircle size={10} /> : <XCircle size={10} />}
    {active ? 'Activo' : 'Suspendido'}
  </span>
);

const RoleBadge = ({ name, color }: { name: string; color?: string | null }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-white"
    style={{ backgroundColor: color ?? '#6366f1' }}
  >
    {name}
  </span>
);

const SecurityIndicators = ({ profile }: { profile: AdminUser['user_security_profiles'] }) => {
  if (!profile) return null;
  return (
    <div className="flex items-center gap-1">
      {profile.twoFactorEnabled && (
        <span title="2FA activo" className="text-green-500"><Shield size={13} /></span>
      )}
      {profile.lockedUntil && new Date(profile.lockedUntil) > new Date() && (
        <span title="Cuenta bloqueada" className="text-red-500"><Lock size={13} /></span>
      )}
      {profile.failedAttempts >= 3 && !profile.lockedUntil && (
        <span title={`${profile.failedAttempts} intentos fallidos`} className="text-yellow-500">
          <AlertTriangle size={13} />
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// InlineRoleSelect — cambio de rol directo en la tabla
// ---------------------------------------------------------------------------
interface InlineRoleSelectProps {
  user:         AdminUser;
  roles:        AdminRole[];
  onRoleChange: (userId: string, newRoleId: string) => void;
}

const InlineRoleSelect = ({ user, roles, onRoleChange }: InlineRoleSelectProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const qc = useQueryClient();

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1.5 group">
        {user.roles && <RoleBadge name={user.roles.name} color={user.roles.color} />}
        <button
          onClick={() => setIsEditing(true)}
          className="p-0.5 text-gray-300 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
          title="Cambiar rol"
        >
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  return (
    <select
      autoFocus
      defaultValue={user.roleId}
      disabled={saving}
      onBlur={() => { if (!saving) setIsEditing(false); }}
      onChange={async (e) => {
        const newRoleId = e.target.value;
        if (newRoleId === user.roleId) { setIsEditing(false); return; }
        setSaving(true);
        try {
          await adminService.updateUser(user.id, {} as any);
          // Usar assignRole que actualiza el rol principal del usuario
          await adminService.assignRole(user.id, { roleId: newRoleId });
          onRoleChange(user.id, newRoleId);
          qc.invalidateQueries({ queryKey: ['admin-users'] });
          toast.success('Rol actualizado');
        } catch {
          toast.error('Error al actualizar rol');
        } finally {
          setSaving(false);
          setIsEditing(false);
        }
      }}
      className="text-xs border border-orange-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none min-w-[120px]"
    >
      {roles.map(role => (
        <option key={role.id} value={role.id}>{role.name}</option>
      ))}
    </select>
  );
};

// ---------------------------------------------------------------------------
// Simulate Session Modal — ahora con endpoint real
// ---------------------------------------------------------------------------
const SimulateModal = ({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const simulate = async () => {
    setLoading(true);
    try {
      const result = await adminService.simulateSession(user.id);
      const url = `${window.location.origin}/simulate?token=${result.token}`;
      window.open(url, '_blank', 'noopener');
      setDone(true);
    } catch {
      toast.error('No se pudo iniciar la sesión de simulación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle size={20} className="text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Simular sesión</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {!done ? (
            <>
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
                <AlertOctagon size={18} className="text-orange-500 mt-0.5 shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold mb-1">Advertencia de auditoría</p>
                  <p>Estás a punto de simular la sesión del usuario <strong>{user.name}</strong>. Esta acción quedará registrada en el audit log.</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Usuario</span>
                  <span className="font-medium text-gray-900">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-700">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rol</span>
                  <span className="font-medium" style={{ color: user.roles?.color ?? '#6366f1' }}>
                    {user.roles?.name ?? '—'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Se abrirá una nueva pestaña con su vista del sistema. No podrás realizar acciones destructivas como administrador desde esa sesión.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-900">Sesión de simulación iniciada</p>
              <p className="text-sm text-gray-500">Se abrió una nueva pestaña con la vista de <strong>{user.name}</strong>.</p>
            </div>
          )}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
            Cerrar
          </button>
          {!done && (
            <button
              onClick={simulate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              Simular sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isMeseroUser(user: AdminUser): boolean {
  const name = user.roles?.name?.toLowerCase() ?? '';
  return name === 'mesero' || name === 'waiter';
}

// ---------------------------------------------------------------------------
// EditUserModal — sección PIN para rol Mesero
// ---------------------------------------------------------------------------
const EditUserModal = ({
  user,
  onClose,
  onSuccess,
}: {
  user:      AdminUser;
  onClose:   () => void;
  onSuccess: () => void;
}) => {
  const [pin,        setPin]        = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError,   setPinError]   = useState('');
  const [showPin,    setShowPin]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  const isMesero = isMeseroUser(user);
  const pinsMatch = pin.length === 4 && pin === pinConfirm;

  const handleSavePin = async () => {
    if (!pinsMatch) return;
    setSaving(true);
    try {
      await adminService.setUserPin(user.id, pin);
      toast.success('🔐 PIN asignado correctamente');
      setPin('');
      setPinConfirm('');
      onSuccess();
    } catch {
      setPinError('Error al guardar el PIN');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePin = async () => {
    if (!window.confirm(`¿Eliminar el PIN de ${user.name}?`)) return;
    setSaving(true);
    try {
      await adminService.removeUserPin(user.id);
      toast.success('PIN eliminado');
      onSuccess();
    } catch {
      toast.error('Error al eliminar el PIN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {user.roles && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-white"
                  style={{ backgroundColor: user.roles.color ?? '#6366f1' }}
                >
                  {user.roles.name}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {!isMesero ? (
            <p className="text-sm text-gray-500 text-center py-4">
              El PIN solo aplica para usuarios con rol <strong>Mesero</strong>.
            </p>
          ) : (
            <div>
              {/* Estado actual del PIN */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">Estado del PIN</span>
                {user.hasPin ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    🔐 PIN activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                    ⚠️ Sin PIN
                  </span>
                )}
              </div>

              {/* Header sección PIN */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔐</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">PIN App Mesero</p>
                  <p className="text-xs text-gray-400">4 dígitos para iniciar sesión en la app del mesero</p>
                </div>
              </div>

              {/* Input PIN */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {user.hasPin ? 'Cambiar PIN' : 'Asignar PIN'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pin}
                    onChange={e => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm tracking-[0.5em] text-center focus:outline-none focus:border-orange-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirmar PIN */}
              {pin.length === 4 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar PIN</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={e => {
                      setPinConfirm(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    placeholder="••••"
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm tracking-[0.5em] text-center focus:outline-none ${
                      pinConfirm.length === 4 && pin !== pinConfirm
                        ? 'border-red-300 bg-red-50'
                        : pinConfirm.length === 4 && pin === pinConfirm
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200'
                    }`}
                  />
                  {pinConfirm.length === 4 && pin !== pinConfirm && (
                    <p className="text-xs text-red-500 mt-1">Los PINs no coinciden</p>
                  )}
                  {pinsMatch && (
                    <p className="text-xs text-green-600 mt-1">✅ PINs coinciden</p>
                  )}
                </div>
              )}

              {pinError && <p className="text-xs text-red-500 mb-2">{pinError}</p>}

              {/* Botón asignar PIN */}
              {pinsMatch && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSavePin}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors mb-2"
                >
                  {saving ? 'Guardando...' : `🔐 ${user.hasPin ? 'Actualizar PIN' : 'Asignar PIN'}`}
                </button>
              )}

              {/* Botón eliminar PIN */}
              {user.hasPin && !pin && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleRemovePin}
                  className="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-xl py-2 text-xs font-medium transition-colors"
                >
                  🗑️ Eliminar PIN
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Reset Password Modal — muestra contraseña temporal una sola vez
// ---------------------------------------------------------------------------
const ResetPasswordModal = ({
  userId,
  userName,
  onClose,
}: {
  userId:   string;
  userName: string;
  onClose:  () => void;
}) => {
  const [loading,  setLoading]  = useState(false);
  const [tempPass, setTempPass] = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);

  const doReset = async () => {
    setLoading(true);
    try {
      const result = await adminService.resetUserPassword(userId);
      setTempPass(result.temporaryPassword);
    } catch {
      toast.error('Error al resetear contraseña');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!tempPass) return;
    navigator.clipboard.writeText(tempPass).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={20} className="text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Resetear contraseña</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {!tempPass ? (
            <>
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <AlertTriangle size={18} className="text-yellow-500 mt-0.5 shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Confirmar reset de contraseña</p>
                  <p>Se generará una contraseña temporal para <strong>{userName}</strong>. El usuario deberá cambiarla en su próximo ingreso.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">Contraseña reseteada exitosamente</span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2 text-center">Contraseña temporal para <strong>{userName}</strong>:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-xl font-bold bg-gray-100 rounded-xl px-4 py-4 text-center tracking-widest select-all">
                    {tempPass}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                    title="Copiar"
                  >
                    {copied ? <CheckCheck size={18} className="text-green-600" /> : <Copy size={18} className="text-gray-500" />}
                  </button>
                </div>
                <p className="text-xs text-orange-600 mt-3 text-center font-medium">
                  ⚠ Esta contraseña no se mostrará de nuevo. Compártela ahora con el usuario.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
            {tempPass ? 'Cerrar' : 'Cancelar'}
          </button>
          {!tempPass && (
            <button
              onClick={doReset}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
              Generar contraseña temporal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bulk Actions Bar
// ---------------------------------------------------------------------------
const BulkActionsBar = ({
  selected,
  onAction,
  isLoading,
}: {
  selected:  string[];
  onAction:  (action: string) => void;
  isLoading: boolean;
}) => {
  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom">
      <span className="text-sm font-medium">{selected.length} seleccionado(s)</span>
      <div className="h-4 w-px bg-gray-600" />
      <button onClick={() => onAction('ACTIVATE')} className="flex items-center gap-1.5 text-sm hover:text-green-400 transition-colors" disabled={isLoading}>
        <CheckCircle size={15} /> Activar
      </button>
      <button onClick={() => onAction('SUSPEND')} className="flex items-center gap-1.5 text-sm hover:text-yellow-400 transition-colors" disabled={isLoading}>
        <XCircle size={15} /> Suspender
      </button>
      <button onClick={() => onAction('RESET_PASSWORD')} className="flex items-center gap-1.5 text-sm hover:text-blue-400 transition-colors" disabled={isLoading}>
        <Key size={15} /> Reset contraseña
      </button>
      <button onClick={() => onAction('REVOKE_SESSIONS')} className="flex items-center gap-1.5 text-sm hover:text-orange-400 transition-colors" disabled={isLoading}>
        <RefreshCw size={15} /> Cerrar sesiones
      </button>
      <button onClick={() => onAction('DELETE')} className="flex items-center gap-1.5 text-sm hover:text-red-400 transition-colors" disabled={isLoading}>
        <Trash2 size={15} /> Eliminar
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Create User Modal con validación de teléfono chileno
// ---------------------------------------------------------------------------
const CreateUserModal = ({
  roles,
  onSubmit,
  onClose,
  isLoading,
}: {
  roles:     { id: string; name: string; color: string | null }[];
  onSubmit:  (data: any) => void;
  onClose:   () => void;
  isLoading: boolean;
}) => {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', roleId: '',
    phone: '', comment: '', password: '', confirmPassword: '',
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const passwordMismatch = form.password && form.confirmPassword && form.password !== form.confirmPassword;
  const passwordWeak     = form.password && form.password.length < 8;
  const phoneInvalid     = form.phone && !isValidPhone(form.phone);
  const canSubmit = !isLoading && form.firstName && form.email && form.roleId
    && form.password.length >= 8 && !passwordMismatch && !phoneInvalid;

  const handleSubmit = () => {
    const { confirmPassword, ...payload } = form;
    onSubmit({ ...payload, sendInvite: false });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" /> Nuevo Usuario
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="María"
                value={form.firstName}
                onChange={set('firstName')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="González"
                value={form.lastName}
                onChange={set('lastName')}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="maria@restaurante.com"
              value={form.email}
              onChange={set('email')}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  passwordWeak ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
                }`}
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordWeak && <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres</p>}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  passwordMismatch ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
                }`}
                placeholder="Repetir contraseña"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordMismatch && <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>}
          </div>

          {/* Rol y Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.roleId}
                onChange={set('roleId')}
              >
                <option value="">Seleccionar rol</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  phoneInvalid ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
                }`}
                placeholder="+56 9 1234 5678"
                value={form.phone}
                onChange={set('phone')}
              />
              {phoneInvalid && (
                <p className="text-xs text-red-500 mt-1">Formato: +56912345678 o 912345678</p>
              )}
            </div>
          </div>

          {/* Comentario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentario (auditoría)</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="Cajero turno tarde, contrato hasta Dic 2026..."
              value={form.comment}
              onChange={set('comment')}
            />
          </div>

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <Shield size={14} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              El usuario podrá iniciar sesión inmediatamente con el email y contraseña que establezcas.
            </p>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isLoading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// UserCreatedModal — muestra datos de acceso tras crear usuario
// ---------------------------------------------------------------------------
interface CreatedUserInfo {
  name:       string;
  loginEmail: string;
  email:      string;
  password:   string;
}

const UserCreatedModal = ({
  user,
  onClose,
}: {
  user:    CreatedUserInfo;
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const copyAll = () => {
    const text = `Email BullWeb: ${user.loginEmail}\nEmail alternativo: ${user.email}\nContraseña: ${user.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied('all');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            <h2 className="text-xl font-bold text-gray-900">Usuario creado exitosamente</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Usuario: <span className="font-semibold text-gray-900">{user.name}</span>
          </p>

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos de Acceso</p>

          {/* Email BullWeb — login principal */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">🔑</span>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Email BullWeb (login principal)</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm text-blue-900 bg-white border border-blue-100 rounded-lg px-3 py-2 break-all">
                {user.loginEmail}
              </code>
              <button
                onClick={() => copy(user.loginEmail, 'login')}
                className="p-2 hover:bg-blue-100 rounded-lg transition shrink-0"
                title="Copiar"
              >
                {copied === 'login' ? <CheckCheck size={16} className="text-green-600" /> : <Copy size={16} className="text-blue-500" />}
              </button>
            </div>
          </div>

          {/* Email alternativo */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Mail size={13} className="text-gray-500" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email alternativo</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 break-all">
                {user.email}
              </code>
              <button
                onClick={() => copy(user.email, 'alt')}
                className="p-2 hover:bg-gray-100 rounded-lg transition shrink-0"
                title="Copiar"
              >
                {copied === 'alt' ? <CheckCheck size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Contraseña */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <Lock size={14} className="text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-0.5">Contraseña establecida</p>
              <p className="font-mono text-sm font-medium text-gray-800">{user.password}</p>
            </div>
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Guarda el Email BullWeb</span> — es el email oficial de ingreso al sistema. El email alternativo también puede usarse para iniciar sesión.
            </p>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={copyAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
          >
            {copied === 'all' ? <CheckCheck size={14} className="text-green-600" /> : <Copy size={14} />}
            Copiar todo
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Default Roles — roles estándar para restaurante
// ---------------------------------------------------------------------------
const DEFAULT_ROLES = [
  { name: 'Cajero',     description: 'Caja y punto de venta',                  color: '#22c55e', permissions: ['pos.access','pos.mesas','pos.mostrador','pos.create_order','pos.edit_order','pos.cancel_order_own','pos.discount_table','pos.discount_counter','pos.discount_delivery','tables.view','menu.view','customers.view','customers.create','cash_movements.view','cash_movements.income','billing.view','billing.issue_boleta'] },
  { name: 'Mesero',     description: 'Toma de pedidos en mesa',                 color: '#6366f1', permissions: ['pos.access','pos.mesas','pos.create_order','pos.edit_order','pos.cancel_order_own','tables.view','tables.order','menu.view','customers.view'] },
  { name: 'Cocinero',   description: 'Cocina y preparación',                    color: '#f97316', permissions: ['kitchen.view','kitchen.update','menu.view'] },
  { name: 'Supervisor', description: 'Supervisión sin configuración del sistema',color: '#8b5cf6', permissions: ['pos.access','pos.mesas','pos.mostrador','pos.delivery','pos.create_order','pos.edit_order','pos.cancel_order_any','pos.discount_table','pos.discount_counter','pos.discount_delivery','tables.view','tables.order','tables.manage','menu.view','menu.manage','customers.view','customers.create','customers.edit','customers.loyalty','reports.view','kitchen.view','kitchen.update','inventory.view','inventory.purchases','cash.view','cash_movements.view','cash_movements.income','cash_movements.expense','billing.view','billing.issue_boleta'] },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export const AdminUsers = () => {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { confirm: confirmDialog, dialogProps } = useConfirm();

  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [selected,      setSelected]      = useState<string[]>([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [simulateUser,  setSimulateUser]  = useState<AdminUser | null>(null);
  const [resetPwdUser,  setResetPwdUser]  = useState<AdminUser | null>(null);
  const [editUser,      setEditUser]      = useState<AdminUser | null>(null);
  const [creatingDefaultRoles, setCreatingDefaultRoles] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<CreatedUserInfo | null>(null);
  const pendingPasswordRef = useRef('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn:  () => adminService.listUsers({ search, page, limit: 20 }),
    staleTime: 30000,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn:  adminService.listRoles,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: adminService.createUser,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreate(false);
      setCreatedUserInfo({
        name:       result.name,
        loginEmail: (result as any).loginEmail ?? result.bullwebEmail ?? result.email,
        email:      result.email,
        password:   pendingPasswordRef.current,
      });
      pendingPasswordRef.current = '';
    },
    onError: (e: any) => toast.error(e?.message ?? e?.data?.message ?? 'Error al crear usuario'),
  });

  const bulkMutation = useMutation({
    mutationFn: adminService.bulkAction,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setSelected([]); },
  });

  const users = data?.data ?? [];
  const meta  = data?.meta;
  const roles = (rolesData ?? []).filter(
    (r) => !['superadmin', 'super admin', 'super_admin'].includes(r.name.toLowerCase())
  );

  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const toggleAll = () =>
    setSelected(selected.length === users.length ? [] : users.map((u) => u.id));

  const handleExport = () => {
    exportSheet(
      users.map((u: AdminUser) => ({
        'Nombre':  u.name,
        'Email':   u.email,
        'Rol':     u.roles?.name ?? '',
        'Estado':  u.active ? 'Activo' : 'Suspendido',
        '2FA':     u.user_security_profiles?.twoFactorEnabled ? 'Sí' : 'No',
        'Creado':  fmtDateTime(u.createdAt),
      })),
      `usuarios_${new Date().toISOString().slice(0, 10)}`,
      'Usuarios',
    );
    toast.success(`${users.length} usuarios exportados a Excel`);
  };

  const handleCreateDefaultRoles = async () => {
    setCreatingDefaultRoles(true);
    try {
      let created = 0;
      for (const r of DEFAULT_ROLES) {
        const exists = roles.find((x) => x.name === r.name);
        if (!exists) {
          await adminService.createRole({ name: r.name, description: r.description, color: r.color });
          created++;
        }
      }
      await qc.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success(created > 0 ? `${created} roles estándar creados` : 'Los roles ya existen');
    } catch {
      toast.error('Error al crear roles estándar');
    } finally {
      setCreatingDefaultRoles(false);
    }
  };

  // Número de roles no-sistema
  const customRolesCount = roles.filter((r) => !r.isSystem).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Banner roles estándar — visible si hay pocos roles personalizados */}
      {!isLoading && customRolesCount <= 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <Info size={18} className="text-blue-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-blue-800 text-sm">Configura los roles de tu restaurante</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Crea los roles estándar (Cajero, Mesero, Cocinero, Supervisor) con permisos preconfigurados.
            </p>
          </div>
          <button
            onClick={handleCreateDefaultRoles}
            disabled={creatingDefaultRoles}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium whitespace-nowrap hover:bg-blue-400 disabled:opacity-50 transition"
          >
            {creatingDefaultRoles ? 'Creando...' : 'Crear roles estándar'}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {meta?.total ?? 0} usuarios registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileDown size={16} /> Exportar Excel
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <UserPlus size={16} /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los roles</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Suspendidos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={selected.length === users.length && users.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Usuario</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Seguridad</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Creado</th>
              <th className="w-28 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="animate-pulse h-4 bg-gray-100 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No hay usuarios que coincidan con los filtros
                </td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-50 transition-colors group ${selected.includes(user.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selected.includes(user.id)}
                    onChange={() => toggleSelect(user.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    {user.bullwebEmail
                      ? <p className="text-blue-600 text-xs font-mono break-all" title={user.bullwebEmail}>{user.bullwebEmail}</p>
                      : <p className="text-gray-500 text-xs">{user.email}</p>
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <InlineRoleSelect
                    user={user}
                    roles={roles}
                    onRoleChange={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge active={user.active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <SecurityIndicators profile={user.user_security_profiles} />
                    {isMeseroUser(user) ? (
                      user.hasPin
                        ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                            🔐 PIN activo
                          </span>
                        )
                        : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                            ⚠️ Sin PIN
                          </span>
                        )
                    ) : (
                      !user.user_security_profiles?.twoFactorEnabled && !user.user_security_profiles?.lockedUntil && (user.user_security_profiles?.failedAttempts ?? 0) < 3 && (
                        <span className="text-gray-300 text-sm">—</span>
                      )
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(user.createdAt).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditUser(user)}
                      className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-500 transition"
                      title="Editar usuario (PIN App Mesero)"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => setResetPwdUser(user)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500 transition"
                      title="Resetear contraseña (genera temporal)"
                    >
                      <Key size={14} />
                    </button>
                    <button
                      onClick={() => setSimulateUser(user)}
                      className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-500 transition"
                      title="Simular sesión como este usuario"
                    >
                      <PlayCircle size={14} />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition"
                      title="Ver detalle"
                    >
                      <Eye size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && meta.pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>Mostrando {((page - 1) * 20) + 1}–{Math.min(page * 20, meta.total)} de {meta.total}</span>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
              <span className="px-3 py-1.5 text-gray-500">{page} / {meta.pages}</span>
              <button className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selected={selected}
        isLoading={bulkMutation.isPending}
        onAction={async (action) => {
          if (action === 'DELETE') {
            const ok = await confirmDialog({ message: `¿Eliminar ${selected.length} usuario(s)?`, confirmLabel: 'Eliminar' });
            if (!ok) return;
          }
          bulkMutation.mutate({ ids: selected, action: action as any });
        }}
      />

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin-users'] });
            setEditUser(null);
          }}
        />
      )}

      {showCreate && (
        <CreateUserModal
          roles={roles.map((r) => ({ id: r.id, name: r.name, color: r.color }))}
          isLoading={createMutation.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => {
            pendingPasswordRef.current = data.password ?? '';
            createMutation.mutate(data);
          }}
        />
      )}

      {simulateUser && (
        <SimulateModal user={simulateUser} onClose={() => setSimulateUser(null)} />
      )}

      {resetPwdUser && (
        <ResetPasswordModal
          userId={resetPwdUser.id}
          userName={resetPwdUser.name}
          onClose={() => setResetPwdUser(null)}
        />
      )}

      <ConfirmDialog {...dialogProps} />

      {createdUserInfo && (
        <UserCreatedModal
          user={createdUserInfo}
          onClose={() => setCreatedUserInfo(null)}
        />
      )}
    </div>
  );
};

export default AdminUsers;
