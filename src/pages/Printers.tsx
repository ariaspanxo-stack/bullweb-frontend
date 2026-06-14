import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { printersService, type Printer, type CreatePrinterDTO } from '@/services/printersService';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Printer as PrinterIcon,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  PlayCircle,
  X,
} from 'lucide-react';

// ─── Tipos de impresora ───────────────────────────────────────────────────────
const PRINTER_TYPES = [
  { value: 'receipt', label: 'Ticket', color: 'bg-blue-100 text-blue-800' },
  { value: 'kitchen', label: 'Cocina', color: 'bg-orange-100 text-orange-800' },
  { value: 'bar', label: 'Bar', color: 'bg-purple-100 text-purple-800' },
  { value: 'label', label: 'Etiqueta', color: 'bg-green-100 text-green-800' },
] as const;

const CONNECTION_TYPES = [
  { value: 'ethernet',  label: 'Ethernet / WiFi' },
  { value: 'usb',       label: 'USB directo' },
  { value: 'serial',    label: 'Puerto Serial (COM)' },
  { value: 'os_driver', label: 'Driver del SO (Windows/macOS)' },
] as const;

function getConnLabel(t: string) {
  return CONNECTION_TYPES.find(c => c.value === t)?.label ?? t;
}

function getTypeStyle(type: string) {
  return PRINTER_TYPES.find((t) => t.value === type) ?? PRINTER_TYPES[0];
}

// ─── Modal de Crear / Editar ─────────────────────────────────────────────────
interface PrinterModalProps {
  printer: Printer | null;
  onClose: () => void;
  onSave: (data: CreatePrinterDTO) => void;
  loading: boolean;
}

function PrinterModal({ printer, onClose, onSave, loading }: PrinterModalProps) {
  const [form, setForm] = useState<CreatePrinterDTO>({
    name: printer?.name ?? '',
    type: printer?.type ?? 'receipt',
    connection_type: printer?.connection_type ?? 'ethernet',
    ip_address: printer?.ip_address ?? '',
    port: printer?.port ?? 9100,
    serial_port: printer?.serial_port ?? '',
    serial_baud: printer?.serial_baud ?? 9600,
    usb_vendor_id: printer?.usb_vendor_id ?? '',
    usb_product_id: printer?.usb_product_id ?? '',
    os_printer_name: printer?.os_printer_name ?? '',
    protocol: printer?.protocol ?? 'escpos',
    paper_width: printer?.paper_width ?? 80,
    is_active: printer?.is_active ?? true,
    notes: printer?.notes ?? '',
  });

  const set = (field: keyof CreatePrinterDTO, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const connType = form.connection_type ?? 'ethernet';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {printer ? 'Editar Impresora' : 'Nueva Impresora'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Impresora Caja 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {PRINTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de conexión</label>
            <select
              value={connType}
              onChange={(e) => set('connection_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {CONNECTION_TYPES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Campos ethernet */}
          {connType === 'ethernet' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección IP</label>
                <input
                  type="text"
                  value={form.ip_address ?? ''}
                  onChange={(e) => set('ip_address', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                <input
                  type="number"
                  value={form.port ?? 9100}
                  onChange={(e) => set('port', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Campos serial */}
          {connType === 'serial' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerto COM</label>
                <input
                  type="text"
                  value={form.serial_port ?? ''}
                  onChange={(e) => set('serial_port', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="COM3 o /dev/ttyUSB0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baud rate</label>
                <select
                  value={form.serial_baud ?? 9600}
                  onChange={(e) => set('serial_baud', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {[9600, 19200, 38400, 57600, 115200].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Campos USB */}
          {connType === 'usb' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
                <input
                  type="text"
                  value={form.usb_vendor_id ?? ''}
                  onChange={(e) => set('usb_vendor_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="0x04b8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                <input
                  type="text"
                  value={form.usb_product_id ?? ''}
                  onChange={(e) => set('usb_product_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="0x0202"
                />
              </div>
            </div>
          )}

          {/* Campos OS driver */}
          {connType === 'os_driver' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de impresora en el sistema</label>
              <input
                type="text"
                value={form.os_printer_name ?? ''}
                onChange={(e) => set('os_printer_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: EPSON TM-T20III"
              />
              <p className="text-xs text-gray-400 mt-1">Nombre exacto que aparece en Impresoras del sistema operativo.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protocolo</label>
              <select
                value={form.protocol}
                onChange={(e) => set('protocol', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="escpos">ESC/POS</option>
                <option value="star">STAR</option>
                <option value="zpl">ZPL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ancho papel (mm)</label>
              <select
                value={form.paper_width}
                onChange={(e) => set('paper_width', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value={58}>58 mm</option>
                <option value={80}>80 mm</option>
                <option value={112}>112 mm</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones opcionales..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Impresora activa
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : printer ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Printers() {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [filterType, setFilterType] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: printers = [], isLoading } = useQuery({
    queryKey: ['printers', filterType, showInactive],
    queryFn: () =>
      printersService.listPrinters({
        type: filterType || undefined,
        is_active: showInactive ? undefined : true,
      }),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CreatePrinterDTO) => printersService.createPrinter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      toast.success('Impresora creada');
      setModalOpen(false);
    },
    onError: () => toast.error('Error al crear impresora'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePrinterDTO }) =>
      printersService.updatePrinter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      toast.success('Impresora actualizada');
      setModalOpen(false);
      setEditingPrinter(null);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => printersService.deletePrinter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      toast.success('Impresora desactivada');
    },
    onError: () => toast.error('Error al desactivar'),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => printersService.testPrinter(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      toast.success(result.message);
    },
    onError: () => toast.error('Error al realizar el test'),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSave = (data: CreatePrinterDTO) => {
    if (editingPrinter) {
      updateMutation.mutate({ id: editingPrinter.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (p: Printer) => {
    setEditingPrinter(p);
    setModalOpen(true);
  };

  const handleDelete = async (p: Printer) => {
    const ok = await confirmDialog({ message: `¿Desactivar la impresora "${p.name}"?`, confirmLabel: 'Desactivar', variant: 'warning' });
    if (ok) deleteMutation.mutate(p.id);
  };

  const handleNew = () => {
    setEditingPrinter(null);
    setModalOpen(true);
  };

  const mutationLoading = createMutation.isPending || updateMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impresoras</h1>
          <p className="text-gray-500 mt-1">Gestión de impresoras de red</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nueva Impresora
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {PRINTER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === t.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 ml-auto text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          Mostrar inactivas
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando impresoras...</div>
        ) : printers.length === 0 ? (
          <div className="p-12 text-center">
            <PrinterIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay impresoras registradas</p>
            <button
              onClick={handleNew}
              className="mt-4 text-blue-600 hover:underline text-sm"
            >
              Agregar primera impresora
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Conexión</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Papel</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Último Test</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {printers.map((p) => {
                const typeStyle = getTypeStyle(p.type);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.notes && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{p.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeStyle.color}`}>
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getConnLabel(p.connection_type ?? 'ethernet')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {p.connection_type === 'ethernet' && p.ip_address
                        ? `${p.ip_address}:${p.port ?? 9100}`
                        : p.connection_type === 'serial' && p.serial_port
                        ? `${p.serial_port} @ ${p.serial_baud ?? 9600}`
                        : p.connection_type === 'usb' && p.usb_vendor_id
                        ? `${p.usb_vendor_id}:${p.usb_product_id}`
                        : p.connection_type === 'os_driver' && p.os_printer_name
                        ? p.os_printer_name
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.paper_width ? `${p.paper_width} mm` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <Wifi className="w-4 h-4" /> Activa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                          <WifiOff className="w-4 h-4" /> Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {p.last_test_at
                        ? new Date(p.last_test_at).toLocaleString('es', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => testMutation.mutate(p.id)}
                          disabled={testMutation.isPending}
                          title="Test de conexión"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          title="Editar"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleteMutation.isPending}
                          title="Desactivar"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
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

      {/* Modal */}
      {modalOpen && (
        <PrinterModal
          printer={editingPrinter}
          onClose={() => {
            setModalOpen(false);
            setEditingPrinter(null);
          }}
          onSave={handleSave}
          loading={mutationLoading}
        />
      )}
    </div>
  );
}
