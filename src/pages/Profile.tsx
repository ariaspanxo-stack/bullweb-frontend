import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Calendar, Lock, Eye, EyeOff, Edit3, Save, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import authService from '@/services/authService';
import toast from 'react-hot-toast';

// ─── helpers ────────────────────────────────────────────────────────────────
function avatarInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function avatarColor(name: string) {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-teal-500 to-teal-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ─── Password field ──────────────────────────────────────────────────────────
function PasswordInput({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, updateUser } = useAuthStore();

  // ── Edit profile ──
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName]   = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving]       = useState(false);

  const startEdit = () => {
    setEditName(user?.name ?? '');
    setEditEmail(user?.email ?? '');
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('El nombre no puede estar vacío'); return; }
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        name:  editName.trim(),
        email: editEmail.trim(),
      });
      updateUser(updated);
      setEditMode(false);
      toast.success('Perfil actualizado');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);



  const pwdValid =
    newPwd.length >= 8 &&
    /[A-Z]/.test(newPwd) &&
    /[0-9]/.test(newPwd) &&
    newPwd === confirmPwd;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd) { toast.error('Ingresa tu contraseña actual'); return; }
    if (!pwdValid) {
      if (newPwd !== confirmPwd) toast.error('Las contraseñas no coinciden');
      else toast.error('La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número');
      return;
    }
    setChangingPwd(true);
    try {
      await authService.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      toast.success('Contraseña actualizada exitosamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al cambiar contraseña');
    } finally {
      setChangingPwd(false);
    }
  };

  if (!user) return null;

  const initials = avatarInitials(user.name);
  const color    = avatarColor(user.name);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
          <User className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestiona tu información personal y seguridad</p>
        </div>
      </div>

      {/* ── Profile card ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-violet-600" />

        {/* Avatar + info */}
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center ring-4 ring-white shadow-lg`}>
              <span className="text-3xl font-bold text-white">{initials}</span>
            </div>
            {!editMode && (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Editar perfil
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              {user.role && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                  <Shield className="w-3 h-3" />
                  {user.role.name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info grid */}
        {!editMode && (
          <div className="border-t border-gray-100 px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Teléfono</p>
                <p className="text-sm font-medium text-gray-900">{user.phone ?? '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Miembro desde</p>
                <p className="text-sm font-medium text-gray-900">
                  {user.createdAt ? formatDate(user.createdAt) : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${user.active ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <div className={`w-3 h-3 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Estado</p>
                <p className={`text-sm font-medium ${user.active ? 'text-emerald-700' : 'text-red-700'}`}>
                  {user.active ? 'Cuenta activa' : 'Cuenta inactiva'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Change password ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Cambiar contraseña</h3>
            <p className="text-xs text-gray-500">Mínimo 8 caracteres, una mayúscula y un número</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <PasswordInput
            label="Contraseña actual"
            value={currentPwd}
            onChange={setCurrentPwd}
            placeholder="••••••••"
          />
          <PasswordInput
            label="Nueva contraseña"
            value={newPwd}
            onChange={setNewPwd}
            placeholder="Mínimo 8 caracteres"
          />
          <PasswordInput
            label="Confirmar nueva contraseña"
            value={confirmPwd}
            onChange={setConfirmPwd}
            placeholder="Repite la contraseña"
          />

          {/* Requisitos visuales */}
          {newPwd.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { ok: newPwd.length >= 8,    label: '8+ caracteres' },
                { ok: /[A-Z]/.test(newPwd),  label: 'Una mayúscula' },
                { ok: /[0-9]/.test(newPwd),  label: 'Un número' },
              ].map(({ ok, label }) => (
                <div key={label} className={`flex items-center gap-1 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {label}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={changingPwd || !currentPwd || !newPwd || !confirmPwd}
            className="w-full py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {changingPwd ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>


    </div>
  );
}
