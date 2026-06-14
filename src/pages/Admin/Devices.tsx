import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type Device } from '@/services/adminService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import {
  PlusCircle, Pencil, Trash2, ToggleLeft, ToggleRight,
  Printer, Monitor, Cpu, ScanLine, Loader2, RefreshCw,
  Wifi, WifiOff, AlertCircle, HelpCircle, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportSheet, fmtDateTime } from '@/utils/exportExcel';

// ─── Tipo → icono / etiqueta ───────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.FC<any> }> = {
  PRINTER:      { label: 'Impresora',  icon: Printer  },
  DISPLAY:      { label: 'Display',    icon: Monitor  },
  KIOSK:        { label: 'Kiosco',     icon: Cpu      },
  POS_TERMINAL: { label: 'POS',        icon: Cpu      },
  KDS:          { label: 'KDS',        icon: Monitor  },
  SCANNER:      { label: 'Escáner',    icon: ScanLine },
};

const STATUS_META: Record<string, { label: string; color: string; Icon: React.FC<any> }> = {
  ONLINE:  { label: 'En línea',  color: 'text-green-600 bg-green-50',  Icon: Wifi        },
  OFFLINE: { label: 'Sin línea', color: 'text-gray-500 bg-gray-100',   Icon: WifiOff     },
  ERROR:   { label: 'Error',     color: 'text-red-600 bg-red-50',      Icon: AlertCircle },
  UNKNOWN: { label: 'Desconocido', color: 'text-yellow-600 bg-yellow-50', Icon: HelpCircle },
};

const DEVICE_TYPES = Object.keys(TYPE_META) as (keyof typeof TYPE_META)[];

// ─── Formulario ──────────────────────────────────────────────────────────────

interface DeviceFormData {
  branchId:   string;
  name:       string;
  type:       string;
  model:      string;
  ipAddress:  string;
  macAddress: string;
  zone:       string;
}

const emptyForm = (branchId = ''): DeviceFormData => ({
  branchId, name: '', type: 'PRINTER', model: '',
  ipAddress: '', macAddress: '', zone: '',
});

interface DeviceModalProps {
  device?:   Device | null;
  branches:  { id: string; name: string }[];
  onClose:   () => void;
  onSave:    (data: DeviceFormData) => void;
  saving:    boolean;
}

const DeviceModal = ({ device, branches, onClose, onSave, saving }: DeviceModalProps) => {
  const [form, setForm] = useState<DeviceFormData>(
    device
      ? {
          branchId:   device.branch?.id ?? '',
          name:       device.name,
          type:       device.type,
          model:      device.model  ?? '',
          ipAddress:  device.ipAddress  ?? '',
          macAddress: device.macAddress ?? '',
          zone:       device.zone       ?? '',
        }
      : emptyForm(branches[0]?.id)
  );

  const set = (k: keyof DeviceFormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            {device ? 'Editar dispositivo' : 'Nuevo dispositivo'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Sucursal */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal *</label>
            <select
              value={form.branchId} onChange={e => set('branchId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Impresora Cocina"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
              <select
                value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {DEVICE_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_META[t].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Modelo */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Modelo</label>
              <input
                type="text" value={form.model} onChange={e => set('model', e.target.value)}
                placeholder="EPSON TM-T88VI"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {/* Zona */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Zona</label>
              <input
                type="text" value={form.zone} onChange={e => set('zone', e.target.value)}
                placeholder="Cocina / Bar / Caja"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* IP */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dirección IP</label>
              <input
                type="text" value={form.ipAddress} onChange={e => set('ipAddress', e.target.value)}
                placeholder="192.168.1.100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {/* MAC */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">MAC Address</label>
              <input
                type="text" value={form.macAddress} onChange={e => set('macAddress', e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">Cancelar</button>
          <button
            onClick={() => onSave(form)} disabled={saving || !form.name.trim() || !form.branchId}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {device ? 'Guardar cambios' : 'Registrar dispositivo'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const m = STATUS_META[status] ?? STATUS_META.UNKNOWN;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${m.color}`}>
      <m.Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Devices() {
  const qc = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [showModal,    setShowModal]    = useState(false);
  const [editDevice,   setEditDevice]   = useState<Device | null>(null);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'devices', filterBranch, filterType, filterStatus],
    queryFn:  () => adminService.listDevices({ branchId: filterBranch || undefined, type: filterType || undefined, status: filterStatus || undefined }),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn:  () => adminService.listBranches(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'devices'] });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof adminService.createDevice>[0]) => adminService.createDevice(d),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => adminService.updateDevice(id, data),
    onSuccess: () => { invalidate(); setEditDevice(null); },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => adminService.toggleDeviceActive(id),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deleteDevice(id),
    onSuccess: invalidate,
  });

  const handleSave = (form: DeviceFormData) => {
    const { branchId, ...rest } = form;
    if (editDevice) {
      updateMut.mutate({ id: editDevice.id, data: rest });
    } else {
      createMut.mutate({ branchId, ...rest } as any);
    }
  };

  const handleExport = () => {
    exportSheet(
      devices.map((d: Device) => ({
        'Nombre':     d.name,
        'Tipo':       TYPE_META[d.type]?.label ?? d.type,
        'Modelo':     (d as any).model ?? '',
        'IP':         (d as any).ipAddress ?? '',
        'MAC':        (d as any).macAddress ?? '',
        'Zona':       (d as any).zone ?? '',
        'Estado':     STATUS_META[d.status]?.label ?? d.status,
        'Sucursal':   (d as any).branch?.name ?? '',
        'Activo':     (d as any).active ? 'Sí' : 'No',
        'Registrado': (d as any).createdAt ? fmtDateTime((d as any).createdAt) : '',
      })),
      `dispositivos_${new Date().toISOString().slice(0,10)}`,
      'Dispositivos',
    );
    toast.success(`${devices.length} dispositivos exportados a Excel`);
  };

  const byStatus: Record<string, number> = {};
  devices.forEach(d => { byStatus[d.status] = (byStatus[d.status] ?? 0) + 1; });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispositivos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Impresoras, displays, terminales y periféricos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileDown className="w-4 h-4" /> Exportar Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <PlusCircle className="w-4 h-4" /> Nuevo dispositivo
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(STATUS_META).map(([s, m]) => (
          <div key={s} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.color}`}>
              <m.Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-xl font-bold text-gray-900">{byStatus[s] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <select
          value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las sucursales</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {DEVICE_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_META).map(([s, m]) => <option key={s} value={s}>{m.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando dispositivos…
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Cpu className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay dispositivos registrados</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Dispositivo', 'Tipo', 'Sucursal', 'Zona', 'IP', 'Firmware', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {devices.map(d => {
                const tm = TYPE_META[d.type] ?? TYPE_META.PRINTER;
                const TypeIcon = tm.icon;
                return (
                  <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${!d.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <TypeIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{d.name}</p>
                          {d.model && <p className="text-xs text-gray-400">{d.model}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{tm.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.branch?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.zone ?? '—'}</td>
                    <td className="px-4 py-3">
                      {d.ipAddress
                        ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{d.ipAddress}</code>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.firmwareVersion ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleMut.mutate(d.id)} disabled={toggleMut.isPending}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          {d.isActive ? <ToggleRight className="w-4 h-4 text-blue-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditDevice(d)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { const ok = await confirmDialog({ message: `¿Eliminar "${d.name}"?`, confirmLabel: 'Eliminar' }); if (ok) deleteMut.mutate(d.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog {...dialogProps} />
      {(showModal || editDevice) && (
        <DeviceModal
          device={editDevice}
          branches={branches}
          onClose={() => { setShowModal(false); setEditDevice(null); }}
          onSave={handleSave}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}
