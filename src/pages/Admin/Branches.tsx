import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type Branch, type BranchTemplate } from '@/services/adminService';
import {
  PlusCircle, Pencil, Trash2, ToggleLeft, ToggleRight,
  Building2, MapPin, Phone, Mail, Clock, DollarSign, Loader2, AlertTriangle, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportSheet, fmtDateTime } from '@/utils/exportExcel';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'America/Santiago', 'America/New_York', 'America/Los_Angeles',
  'America/Bogota', 'America/Lima', 'America/Buenos_Aires',
  'Europe/Madrid', 'UTC',
];

const CURRENCIES = ['CLP', 'USD', 'EUR', 'COP', 'PEN', 'ARS', 'MXN'];

interface BranchFormData {
  name:        string;
  address:     string;
  phone:       string;
  email:       string;
  timezone:    string;
  currency:    string;
  taxRate:     number;
  templateId:  string;
}

const emptyForm = (): BranchFormData => ({
  name: '', address: '', phone: '', email: '',
  timezone: 'America/Santiago', currency: 'CLP',
  taxRate: 19, templateId: '',
});

// ─── Status Badge ──────────────────────────────────────────────────────────────

const StatusBadge = ({ active }: { active: boolean }) => (
  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
    active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
    {active ? 'Activa' : 'Inactiva'}
  </span>
);

// ─── Branch Form Modal ─────────────────────────────────────────────────────────

interface BranchModalProps {
  branch?:    Branch | null;
  templates:  BranchTemplate[];
  onClose:    () => void;
  onSave:     (data: BranchFormData) => void;
  saving:     boolean;
}

const BranchModal = ({ branch, templates, onClose, onSave, saving }: BranchModalProps) => {
  const [form, setForm] = useState<BranchFormData>(
    branch
      ? {
          name: branch.name, address: branch.address ?? '', phone: branch.phone ?? '',
          email: branch.email ?? '', timezone: branch.timezone, currency: branch.currency,
          taxRate: branch.taxRate, templateId: '',
        }
      : emptyForm()
  );

  const set = (key: keyof BranchFormData, val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {branch ? 'Editar sucursal' : 'Nueva sucursal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Template selector — only on create */}
          {!branch && templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plantilla (opcional)</label>
              <select
                value={form.templateId}
                onChange={e => set('templateId', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin plantilla</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
            <input
              type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Casa Matriz Santiago"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Dirección
              </label>
              <input
                type="text" value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="Av. Providencia 1234"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Teléfono
              </label>
              <input
                type="text" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+56 2 2222 3333"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="sucursal@empresa.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Zona horaria
              </label>
              <select
                value={form.timezone} onChange={e => set('timezone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Currency */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Moneda
              </label>
              <select
                value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Tax rate */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tasa IVA (%)</label>
              <input
                type="number" min={0} max={100} step={1}
                value={form.taxRate}
                onChange={e => set('taxRate', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {branch ? 'Guardar cambios' : 'Crear sucursal'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete confirmation ───────────────────────────────────────────────────────

const DeleteConfirm = ({ branch, onConfirm, onCancel, loading }: {
  branch: Branch; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Eliminar sucursal</h3>
          <p className="mt-1 text-sm text-gray-500">
            ¿Estás seguro de que deseas eliminar <strong>{branch.name}</strong>?<br />
            Esta acción no se puede deshacer.
          </p>
          {branch.userCount > 0 && (
            <p className="mt-2 text-sm text-red-600 font-medium">
              Esta sucursal tiene {branch.userCount} usuario(s) asignado(s).
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900">
          Cancelar
        </button>
        <button
          onClick={onConfirm} disabled={loading || branch.userCount > 0}
          className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Eliminar
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Branches() {
  const qc = useQueryClient();

  const [showModal,    setShowModal]    = useState(false);
  const [editBranch,   setEditBranch]   = useState<Branch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn:  () => adminService.listBranches(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['admin', 'branch-templates'],
    queryFn:  () => adminService.getBranchTemplates(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'branches'] });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof adminService.createBranch>[0]) => adminService.createBranch(d),
    onSuccess:  () => { invalidate(); setShowModal(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminService.updateBranch>[1] }) =>
      adminService.updateBranch(id, data),
    onSuccess: () => { invalidate(); setEditBranch(null); },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => adminService.toggleBranchActive(id),
    onSuccess:  invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deleteBranch(id),
    onSuccess:  () => { invalidate(); setDeleteBranch(null); },
  });

  const handleSave = (form: BranchFormData) => {
    const { templateId, ...rest } = form;
    if (editBranch) {
      updateMut.mutate({ id: editBranch.id, data: rest });
    } else {
      createMut.mutate({ ...rest, ...(templateId ? { templateId } : {}) });
    }
  };

  const handleExport = () => {
    exportSheet(
      branches.map((b: Branch) => ({
        'Nombre':       b.name,
        'Slug':         (b as any).slug ?? '',
        'Dirección':    (b as any).address ?? '',
        'Teléfono':     (b as any).phone ?? '',
        'Email':        (b as any).email ?? '',
        'Zona horaria': (b as any).timezone ?? '',
        'Moneda':       (b as any).currency ?? '',
        'Usuarios':     b.userCount,
        'Dispositivos': (b as any).deviceCount ?? 0,
        'Estado':       b.isActive ? 'Activa' : 'Inactiva',
        'Creada':       (b as any).createdAt ? fmtDateTime((b as any).createdAt) : '',
      })),
      `sucursales_${new Date().toISOString().slice(0,10)}`,
      'Sucursales',
    );
    toast.success(`${branches.length} sucursales exportadas a Excel`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de sedes y locales del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileDown className="w-4 h-4" /> Exportar Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva sucursal
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total sucursales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{branches.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Activas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{branches.filter(b => b.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total usuarios asignados</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{branches.reduce((s, b) => s + b.userCount, 0)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando sucursales…
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Building2 className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay sucursales registradas</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Sucursal', 'Slug', 'Dirección', 'Usuarios', 'Dispositivos', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {branches.map(branch => (
                <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                        <p className="text-xs text-gray-400">{branch.currency} · {branch.taxRate}% IVA</p>
                      </div>
                    </div>
                  </td>
                  {/* Slug */}
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{branch.slug}</code>
                  </td>
                  {/* Address */}
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">
                    {branch.address ?? <span className="text-gray-300 italic">Sin dirección</span>}
                  </td>
                  {/* Users */}
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">{branch.userCount}</td>
                  {/* Devices */}
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">{branch.deviceCount}</td>
                  {/* Status */}
                  <td className="px-4 py-3"><StatusBadge active={branch.isActive} /></td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleMut.mutate(branch.id)}
                        disabled={toggleMut.isPending}
                        title={branch.isActive ? 'Desactivar' : 'Activar'}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {branch.isActive
                          ? <ToggleRight className="w-4 h-4 text-blue-500" />
                          : <ToggleLeft  className="w-4 h-4" />
                        }
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => setEditBranch(branch)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteBranch(branch)}
                        disabled={branch.slug === 'principal'}
                        title={branch.slug === 'principal' ? 'No se puede eliminar la sucursal principal' : 'Eliminar'}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
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

      {/* Modals */}
      {(showModal || editBranch) && (
        <BranchModal
          branch={editBranch}
          templates={templates}
          onClose={() => { setShowModal(false); setEditBranch(null); }}
          onSave={handleSave}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}

      {deleteBranch && (
        <DeleteConfirm
          branch={deleteBranch}
          onConfirm={() => deleteMut.mutate(deleteBranch.id)}
          onCancel={() => setDeleteBranch(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
