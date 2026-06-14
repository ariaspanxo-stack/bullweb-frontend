/**
 * BULLWEB ENTERPRISE — Role Matrix Editor
 * Tabla editable interactiva tipo Notion para gestión de permisos micro-granulares.
 *
 * Features:
 *  - Panel lateral izquierdo con lista de roles (renombrar, eliminar, color, count)
 *  - Botón "Nuevo rol" con modal de creación
 *  - Cada celda es un toggle click-able
 *  - Columna "seleccionar todo" por módulo
 *  - Fila "seleccionar todo" por acción
 *  - Indicador "sin guardar" cuando hay cambios pendientes
 *  - Advertencia antes de cambiar de rol con cambios pendientes
 *  - Diff visual antes/después (verde = ganó permiso, rojo = perdió permiso)
 *  - Bloqueo de roles de sistema
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Copy, AlertTriangle, CheckCircle2, Loader2, Info,
  Plus, Trash2, Pencil, Shield, X, Users
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { PermissionMatrix, AdminRole } from '@/services/adminService';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Config de módulos y acciones
// ---------------------------------------------------------------------------
export const MODULES = [
  { key: 'ventas',    label: '💰 Ventas',       description: 'Pedidos y cobros en sala' },
  { key: 'caja',      label: '🧾 Caja',          description: 'Apertura, cierre y saldos' },
  { key: 'cocina',    label: '🍳 Cocina/KDS',    description: 'Estado de órdenes en cocina' },
  { key: 'campanas',  label: '📣 Campañas',      description: 'Marketing y comunicaciones' },
  { key: 'clientes',  label: '👥 Clientes',      description: 'Gestión y fidelización' },
  { key: 'reportes',  label: '📊 Reportes',      description: 'Análisis y exportación' },
  { key: 'menu',      label: '🍽️ Menú',           description: 'Productos, categorías, precios' },
  { key: 'empleados', label: '👔 Empleados',     description: 'RRHH y horarios' },
  { key: 'devices',   label: '🖨️ Dispositivos',  description: 'Impresoras y hardware' },
  { key: 'branches',  label: '🏪 Sucursales',    description: 'Multi-tienda y configuración' },
  { key: 'config',         label: '⚙️ Configuración',    description: 'Settings generales del sistema' },
  { key: 'admin',          label: '🛡️ Administración',   description: 'Usuarios, roles y permisos' },
  { key: 'cash',           label: '💰 Caja',              description: 'Arqueos y turnos de caja' },
  { key: 'cash_movements', label: '💸 Mov. Caja',         description: 'Ingresos y egresos de caja' },
  { key: 'billing',        label: '🧾 Boletas DTE',       description: 'Emisión de documentos tributarios' },
  { key: 'tips',           label: '⭐ Propinas',           description: 'Gestión de propinas' },
  { key: 'delivery',       label: '🛵 Delivery',           description: 'Pedidos a domicilio' },
  { key: 'campaigns',      label: '📣 Campañas',           description: 'Marketing y comunicaciones' },
  { key: 'qr_menu',        label: '📱 Carta QR',           description: 'Menú digital QR' },
] as const;

export const ACTIONS = [
  { key: 'read',    label: 'Ver',      color: 'bg-blue-100   text-blue-700'   },
  { key: 'create',  label: 'Crear',    color: 'bg-green-100  text-green-700'  },
  { key: 'update',  label: 'Editar',   color: 'bg-yellow-100 text-yellow-700' },
  { key: 'delete',  label: 'Borrar',   color: 'bg-red-100    text-red-700'    },
  { key: 'export',  label: 'Exportar', color: 'bg-purple-100 text-purple-700' },
  { key: 'approve', label: 'Aprobar',  color: 'bg-indigo-100 text-indigo-700' },
  { key: 'void',    label: 'Anular',   color: 'bg-orange-100 text-orange-700' },
] as const;

// Colores disponibles para roles
const ROLE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899',
];

// ---------------------------------------------------------------------------
// Cell component
// ---------------------------------------------------------------------------
const PermCell = ({
  allowed,
  original,
  disabled,
  onChange,
}: {
  allowed:  boolean;
  original: boolean;
  disabled: boolean;
  onChange: () => void;
}) => {
  const changed = allowed !== original;
  const gained  = changed && allowed;
  const lost    = changed && !allowed;

  return (
    <button
      onClick={onChange}
      disabled={disabled}
      title={disabled ? 'Rol de sistema: no editable' : (allowed ? 'Permitido — click para denegar' : 'Denegado — click para permitir')}
      className={`
        w-7 h-7 rounded-md flex items-center justify-center transition-all border
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
        ${gained ? 'bg-green-200 border-green-400 ring-1 ring-green-400' :
          lost  ? 'bg-red-200   border-red-300   ring-1 ring-red-400'   :
          allowed ? 'bg-green-100 border-green-300 hover:bg-green-200'   :
                    'bg-gray-100  border-gray-200  hover:bg-gray-200'    }
      `}
    >
      {allowed
        ? <CheckCircle2 size={14} className={gained ? 'text-green-700' : 'text-green-600'} />
        : <span className={`text-xs font-bold ${lost ? 'text-red-600' : 'text-gray-300'}`}>✕</span>
      }
    </button>
  );
};

// ---------------------------------------------------------------------------
// CreateRoleModal
// ---------------------------------------------------------------------------
interface CreateRoleModalProps {
  onClose:   () => void;
  onCreated: (role: AdminRole) => void;
}

const CreateRoleModal = ({ onClose, onCreated }: CreateRoleModalProps) => {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [color,       setColor]       = useState('#6366f1');
  const [creating,    setCreating]    = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const role = await adminService.createRole({
        name:        name.trim(),
        description: description.trim() || undefined,
        color,
      });
      toast.success(`Rol "${role.name}" creado`);
      onCreated(role);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al crear rol');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Plus size={16} className="text-orange-500" /> Nuevo Rol
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Nombre del rol *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
            placeholder="ej: Supervisor de turno"
            autoFocus
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Descripción (opcional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ej: Gestiona turnos y cajeros"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Color del badge</label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {ROLE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-md text-white"
              style={{ backgroundColor: color }}
            >
              {name || 'Vista previa'}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            El rol se creará sin permisos. Podrás configurarlos en la matriz de permisos a continuación.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Crear y configurar permisos
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RenameRoleModal
// ---------------------------------------------------------------------------
interface RenameRoleModalProps {
  role:      AdminRole;
  onClose:   () => void;
  onRenamed: () => void;
}

const RenameRoleModal = ({ role, onClose, onRenamed }: RenameRoleModalProps) => {
  const [name,    setName]    = useState(role.name);
  const [color,   setColor]   = useState(role.color ?? '#6366f1');
  const [saving,  setSaving]  = useState(false);
  const qc = useQueryClient();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminService.updateRole(role.id, { name: name.trim(), color });
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Rol actualizado');
      onRenamed();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al renombrar rol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Editar rol</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
            autoFocus
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Color</label>
          <div className="flex gap-2 mt-2">
            {ROLE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Unsaved Changes Warning Modal
// ---------------------------------------------------------------------------
interface UnsavedChangesModalProps {
  onDiscard:     () => void;
  onKeepEditing: () => void;
}

const UnsavedChangesModal = ({ onDiscard, onKeepEditing }: UnsavedChangesModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-orange-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Cambios sin guardar</h3>
          <p className="text-sm text-gray-500 mt-0.5">La matriz de permisos tiene cambios sin guardar.</p>
        </div>
      </div>
      <p className="text-sm text-gray-600">¿Deseas descartar los cambios y cambiar de rol?</p>
      <div className="flex justify-end gap-2">
        <button onClick={onKeepEditing} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border">
          Seguir editando
        </button>
        <button
          onClick={onDiscard}
          className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Descartar cambios
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
interface RoleMatrixProps {
  roleId?: string;
}

export const RoleMatrix = ({ roleId }: RoleMatrixProps) => {
  const qc = useQueryClient();

  // Dialogs
  const [showCreateModal,    setShowCreateModal]    = useState(false);
  const [renameRole,         setRenameRole]         = useState<AdminRole | null>(null);
  const [cloneDialogOpen,    setCloneDialogOpen]    = useState(false);
  const [cloneDialogName,    setCloneDialogName]    = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingRoleId,      setPendingRoleId]      = useState<string | null>(null);

  // Cargar roles
  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn:  adminService.listRoles,
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roleId ?? '');
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Matrix local editable
  const [matrix,         setMatrix]         = useState<PermissionMatrix>({});
  const [originalMatrix, setOriginalMatrix] = useState<PermissionMatrix>({});
  const [loaded,         setLoaded]         = useState(false);

  // Cargar matrix del role seleccionado
  const { isLoading: roleLoading } = useQuery({
    queryKey: ['admin-role-detail', selectedRoleId],
    queryFn:  () => adminService.getRole(selectedRoleId),
    enabled:  !!selectedRoleId,
    onSuccess: (role: AdminRole) => {
      setMatrix(JSON.parse(JSON.stringify(role.matrix)));
      setOriginalMatrix(role.matrix);
      setLoaded(true);
    },
  } as any);

  // Detectar cambios pendientes
  const hasChanges = useMemo(() => {
    if (!loaded) return false;
    return JSON.stringify(matrix) !== JSON.stringify(originalMatrix);
  }, [matrix, originalMatrix, loaded]);

  // Cambio de rol con advertencia si hay cambios
  const requestRoleChange = (newRoleId: string) => {
    if (newRoleId === selectedRoleId) return;
    if (hasChanges) {
      setPendingRoleId(newRoleId);
      setShowUnsavedWarning(true);
    } else {
      setSelectedRoleId(newRoleId);
      setLoaded(false);
    }
  };

  const confirmDiscard = () => {
    if (pendingRoleId) {
      setSelectedRoleId(pendingRoleId);
      setLoaded(false);
    }
    setPendingRoleId(null);
    setShowUnsavedWarning(false);
  };

  // Toggle individual
  const toggle = useCallback((mod: string, action: string) => {
    if (selectedRole?.isSystem) return;
    setMatrix((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod]?.[action] },
    }));
  }, [selectedRole]);

  // Toggle columna completa (módulo)
  const toggleModule = (mod: string) => {
    if (selectedRole?.isSystem) return;
    const allAllowed = ACTIONS.every((a) => matrix[mod]?.[a.key]);
    setMatrix((prev) => ({
      ...prev,
      [mod]: Object.fromEntries(ACTIONS.map((a) => [a.key, !allAllowed])),
    }));
  };

  // Toggle fila completa (acción)
  const toggleAction = (action: string) => {
    if (selectedRole?.isSystem) return;
    const allAllowed = MODULES.every((m) => matrix[m.key]?.[action]);
    setMatrix((prev) => {
      const next = { ...prev };
      MODULES.forEach((m) => {
        next[m.key] = { ...next[m.key], [action]: !allAllowed };
      });
      return next;
    });
  };

  // Guardar
  const saveMutation = useMutation({
    mutationFn: () => adminService.updateRoleMatrix(selectedRoleId, matrix),
    onSuccess:  () => {
      setOriginalMatrix(JSON.parse(JSON.stringify(matrix)));
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      qc.invalidateQueries({ queryKey: ['admin-role-detail', selectedRoleId] });
      toast.success('Permisos guardados');
    },
    onError: () => toast.error('Error al guardar permisos'),
  });

  // Clonar rol
  const cloneMutation = useMutation({
    mutationFn: (newName: string) => adminService.cloneRole(selectedRoleId, newName),
    onSuccess: (newRole: AdminRole) => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      setSelectedRoleId(newRole.id);
      setLoaded(false);
      toast.success(`Rol "${newRole.name}" creado`);
    },
  });

  // Eliminar rol
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      setSelectedRoleId('');
      setLoaded(false);
      toast.success('Rol eliminado');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'No se puede eliminar este rol'),
  });

  const openCloneDialog = () => {
    setCloneDialogName(selectedRole?.name ? `${selectedRole.name} (copia)` : '');
    setCloneDialogOpen(true);
  };

  const doClone = () => {
    if (!cloneDialogName.trim()) return;
    setCloneDialogOpen(false);
    cloneMutation.mutate(cloneDialogName.trim());
  };

  const handleDeleteRole = (role: AdminRole) => {
    const userCount = (role as any).userCount ?? 0;
    if (userCount > 0) {
      toast.error(`No se puede eliminar: tiene ${userCount} usuario(s) asignados`);
      return;
    }
    if (!confirm(`¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate(role.id);
  };

  return (
    <>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Layout: panel lateral + matriz */}
        <div className="flex gap-6">

          {/* =============================================================== */}
          {/* Panel lateral: lista de roles                                   */}
          {/* =============================================================== */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">Roles</h3>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition"
                  title="Nuevo rol"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-1">
                {roles.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No hay roles</p>
                )}
                {roles.map((role) => {
                  const userCount = (role as any).userCount ?? 0;
                  const isSelected = role.id === selectedRoleId;
                  return (
                    <div
                      key={role.id}
                      onClick={() => requestRoleChange(role.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all group ${
                        isSelected
                          ? 'bg-orange-50 border border-orange-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color ?? '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{role.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Users size={9} className="text-gray-400" />
                            <span className="text-xs text-gray-400">{userCount}</span>
                          </div>
                        </div>
                      </div>

                      {role.isSystem ? (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          Sys
                        </span>
                      ) : (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenameRole(role); }}
                            className="p-1 text-gray-400 hover:text-blue-500 rounded transition"
                            title="Editar nombre y color"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                            disabled={userCount > 0}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={userCount > 0 ? 'Tiene usuarios asignados' : 'Eliminar rol'}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* Panel derecho: matriz de permisos                               */}
          {/* =============================================================== */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Matriz de Permisos</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {selectedRole
                    ? `Editando: ${selectedRole.name}`
                    : 'Selecciona un rol del panel izquierdo'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedRoleId && (
                  <button
                    onClick={openCloneDialog}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                  >
                    <Copy size={14} /> Clonar
                  </button>
                )}

                {hasChanges && (
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
                  >
                    {saveMutation.isPending
                      ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                      : <><Save size={14} /> Guardar cambios</>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Warning rol sistema */}
            {selectedRole?.isSystem && (
              <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-600 shrink-0" />
                <p className="text-sm text-yellow-800">
                  <strong>{selectedRole.name}</strong> es un rol de sistema y no puede modificarse. Usa "Clonar" para crear una versión personalizada.
                </p>
              </div>
            )}

            {/* Indicador de cambios */}
            {hasChanges && !selectedRole?.isSystem && (
              <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded flex items-center gap-2">
                <Info size={14} className="text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  Hay cambios sin guardar.
                  <span className="ml-1 text-green-600 font-medium">Verde = nuevo permiso</span> ·
                  <span className="ml-1 text-red-600 font-medium">Rojo = permiso quitado</span>
                </p>
              </div>
            )}

            {/* Tabla de permisos */}
            {!selectedRoleId ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                <Shield size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-lg font-medium text-gray-300">Selecciona un rol</p>
                <p className="text-sm mt-1">Elige un rol del panel izquierdo o crea uno nuevo.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition mx-auto text-sm"
                >
                  <Plus size={14} /> Nuevo rol
                </button>
              </div>
            ) : roleLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[180px]">Módulo</th>
                      {ACTIONS.map((action) => (
                        <th key={action.key} className="px-2 py-3 text-center">
                          <button
                            className={`inline-flex flex-col items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition w-full ${selectedRole?.isSystem ? 'cursor-default' : 'cursor-pointer'}`}
                            onClick={() => toggleAction(action.key)}
                            title={`Toggle todos: ${action.label}`}
                          >
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${action.color}`}>
                              {action.label}
                            </span>
                          </button>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center w-16 font-semibold text-gray-500 text-xs">Todo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((mod, i) => {
                      const allEnabled = ACTIONS.every((a) => matrix[mod.key]?.[a.key]);
                      return (
                        <tr key={mod.key} className={`border-b hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{mod.label}</p>
                              <p className="text-gray-400 text-xs">{mod.description}</p>
                            </div>
                          </td>
                          {ACTIONS.map((action) => (
                            <td key={action.key} className="px-2 py-3 text-center">
                              <div className="flex justify-center">
                                <PermCell
                                  allowed={!!matrix[mod.key]?.[action.key]}
                                  original={!!originalMatrix[mod.key]?.[action.key]}
                                  disabled={!!selectedRole?.isSystem}
                                  onChange={() => toggle(mod.key, action.key)}
                                />
                              </div>
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => toggleModule(mod.key)}
                              disabled={!!selectedRole?.isSystem}
                              className={`text-xs px-2 py-1 rounded-md border transition ${
                                allEnabled
                                  ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                              title={allEnabled ? 'Quitar todos' : 'Otorgar todos'}
                            >
                              {allEnabled ? '✓ Todo' : '○ Todo'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Leyenda */}
            <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-300 flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-green-600" />
                </div> Permitido
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" /> Denegado
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-green-200 border border-green-400 ring-1 ring-green-400" /> Nuevo permiso
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-red-200 border border-red-300 ring-1 ring-red-400" /> Permiso quitado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modales ===== */}

      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newRole) => {
            qc.invalidateQueries({ queryKey: ['admin-roles'] });
            setSelectedRoleId(newRole.id);
            setLoaded(false);
            setShowCreateModal(false);
          }}
        />
      )}

      {renameRole && (
        <RenameRoleModal
          role={renameRole}
          onClose={() => setRenameRole(null)}
          onRenamed={() => setRenameRole(null)}
        />
      )}

      {showUnsavedWarning && (
        <UnsavedChangesModal
          onDiscard={confirmDiscard}
          onKeepEditing={() => {
            setPendingRoleId(null);
            setShowUnsavedWarning(false);
          }}
        />
      )}

      {cloneDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-gray-900">Clonar rol</h3>
            <p className="text-sm text-gray-500">Nombre para el nuevo rol:</p>
            <input
              type="text"
              value={cloneDialogName}
              onChange={(e) => setCloneDialogName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doClone(); if (e.key === 'Escape') setCloneDialogOpen(false); }}
              autoFocus
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCloneDialogOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={doClone} disabled={!cloneDialogName.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Clonar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleMatrix;
