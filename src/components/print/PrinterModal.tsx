import { useState, useEffect, useRef } from 'react';
import { X, Check, RefreshCw } from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { Printer as PrinterType, Branch, PrintAgent } from '@/services/adminService';
import toast from 'react-hot-toast';

// ─── Constantes ───────────────────────────────────────────────────────────────
const PRINTER_TYPES    = ['receipt', 'kitchen', 'kds', 'label'] as const;
const PROTOCOLS        = ['escpos', 'star', 'zpl'] as const;
const PAPER_WIDTHS     = [58, 62, 80] as const;
const CONNECTION_TYPES = ['ethernet', 'usb', 'serial', 'os_driver', 'bluetooth'] as const;
const BAUD_RATES       = [9600, 19200, 38400, 57600, 115200] as const;

const TYPE_LABEL: Record<string, string> = {
  receipt: 'Recibo',
  kitchen: 'Cocina / Comanda',
  kds:     'KDS',
  label:   'Etiquetas',
};

const CONN_LABEL: Record<string, string> = {
  ethernet:  '🌐 Ethernet',
  usb:       '🔌 USB',
  serial:    '📡 Serial',
  os_driver: '🖨️ Driver SO',
  bluetooth: '📶 Bluetooth',
};

const QR_TYPES = [
  { value: 'receipt',            label: '🧾 Recibo digital' },
  { value: 'menu',               label: '📋 Carta / Menú' },
  { value: 'review_google',      label: '⭐ Reseña Google' },
  { value: 'review_tripadvisor', label: '🦉 TripAdvisor' },
  { value: 'custom',             label: '🔗 URL personalizada' },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PrinterModalProps {
  printer?: PrinterType | null;
  branches: Branch[];
  agents:   PrintAgent[];
  onClose:  () => void;
  onSave:   (dto: Partial<PrinterType>) => void;
  saving:   boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PrinterModal({ printer, branches, agents, onClose, onSave, saving }: PrinterModalProps) {
  const [form, setForm] = useState({
    name:            printer?.name            ?? '',
    type:            printer?.type            ?? 'receipt',
    connection_type: printer?.connection_type ?? 'ethernet',
    ip_address:      printer?.ip_address      ?? '',
    port:            printer?.port            ?? 9100,
    usb_vendor_id:   printer?.usb_vendor_id   ?? '',
    usb_product_id:  printer?.usb_product_id  ?? '',
    serial_port:     printer?.serial_port     ?? '',
    serial_baud:     printer?.serial_baud     ?? 9600,
    com_port:        (printer as any)?.com_port ?? '',
    os_printer_name: printer?.os_printer_name ?? '',
    agent_id:        printer?.agent_id        ?? '',
    protocol:        printer?.protocol        ?? 'escpos',
    paper_width:     printer?.paper_width     ?? 80,
    branch_id:       printer?.branch_id       ?? '',
    notes:           printer?.notes           ?? '',
    print_qr:        printer?.print_qr        ?? false,
    qr_type:         printer?.qr_type         ?? 'receipt',
    qr_custom_url:   printer?.qr_custom_url   ?? '',
  });

  // Limpiar campos al cambiar tipo de conexión
  const prevConnType = useRef(form.connection_type);
  useEffect(() => {
    if (prevConnType.current !== form.connection_type) {
      prevConnType.current = form.connection_type;
      setForm(f => ({
        ...f,
        ip_address: '', port: 9100,
        usb_vendor_id: '', usb_product_id: '',
        serial_port: '', serial_baud: 9600, com_port: '',
        os_printer_name: '',
      }));
    }
  }, [form.connection_type]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Validaciones por tipo de conexión ──────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};

    // Nombre
    if (!form.name.trim())            e.name = 'Nombre requerido';
    else if (form.name.trim().length < 2)  e.name = 'Mínimo 2 caracteres';
    else if (form.name.trim().length > 30) e.name = 'Máximo 30 caracteres';

    switch (form.connection_type) {
      case 'ethernet': {
        const ip = form.ip_address.trim();
        if (!ip) {
          e.ip = 'IP requerida';
        } else {
          const octets = ip.split('.');
          const valid  = octets.length === 4 && octets.every(o => {
            const n = Number(o);
            return /^\d+$/.test(o) && n >= 0 && n <= 255;
          });
          if (!valid) e.ip = 'IPv4 inválida (ej: 192.168.1.100)';
        }
        const p = Number(form.port);
        if (!p || p < 1 || p > 65535) e.port = 'Puerto debe estar entre 1 y 65535';
        break;
      }
      case 'usb': {
        const hexRe = /^(0x)?[\dA-Fa-f]{4}$/;
        if (!form.usb_vendor_id.trim())          e.vendor = 'Vendor ID requerido';
        else if (!hexRe.test(form.usb_vendor_id.trim())) e.vendor = 'Formato inválido (ej: 0x04b8 o 04b8)';
        if (!form.usb_product_id.trim())         e.product = 'Product ID requerido';
        else if (!hexRe.test(form.usb_product_id.trim())) e.product = 'Formato inválido (ej: 0x0202 o 0202)';
        break;
      }
      case 'serial': {
        const portVal = form.serial_port.trim();
        if (!portVal) {
          e.serial_port = 'Puerto requerido (ej: COM3 o /dev/ttyUSB0)';
        } else if (!/^(COM\d+|\/dev\/tty\S+)$/i.test(portVal)) {
          e.serial_port = 'Formato inválido (ej: COM3 o /dev/ttyUSB0)';
        }
        if (!form.serial_baud) e.serial_baud = 'Baud rate requerido';
        break;
      }
      case 'os_driver': {
        if (!form.os_printer_name.trim()) e.os_printer = 'Nombre del driver requerido';
        break;
      }
      case 'bluetooth': {
        const comVal = form.com_port.trim();
        if (!comVal) {
          e.com_port = 'Puerto COM requerido (ej: COM4)';
        } else if (!/^COM\d+$/i.test(comVal)) {
          e.com_port = 'Formato inválido — debe ser un puerto COM (ej: COM4)';
        }
        break;
      }
    }

    // QR custom URL
    if (form.print_qr && (form.qr_type === 'custom' || form.qr_type?.startsWith('review_'))) {
      const url = form.qr_custom_url.trim();
      if (!url) {
        e.qr_url = 'URL requerida';
      } else if (!/^https?:\/\/.+/.test(url)) {
        e.qr_url = 'URL inválida (debe comenzar con https://)';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (k: string, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  const [btPorts, setBtPorts]     = useState<{ path: string; manufacturer?: string }[]>([]);
  const [btLoading, setBtLoading] = useState(false);

  const [osPrinters, setOsPrinters]     = useState<{ name: string; driverName?: string }[]>([]);
  const [osPrintersLoading, setOsPrintersLoading] = useState(false);

  async function detectOsPrinters() {
    if (!form.agent_id) return;
    setOsPrintersLoading(true);
    try {
      const list = await adminService.getOsPrinters(form.agent_id);
      setOsPrinters(list);
      if (!list.length) toast.error('No se detectaron impresoras en el agente');
    } catch {
      toast.error('Error al obtener impresoras del agente');
    } finally {
      setOsPrintersLoading(false);
    }
  }

  async function detectBluetoothPorts() {
    if (!form.agent_id) return;
    setBtLoading(true);
    try {
      const ports = await adminService.getBluetoothPorts(form.agent_id);
      setBtPorts(ports);
      if (!ports.length) toast.error('No se detectaron puertos COM en el agente');
    } catch {
      toast.error('Error al obtener puertos del agente');
    } finally {
      setBtLoading(false);
    }
  }

  const connType   = form.connection_type as string;
  const needsAgent = connType !== 'ethernet';

  const handleSave = () => {
    if (!validate()) return;
    const dto: Partial<PrinterType> = {
      name:            form.name,
      type:            form.type,
      connection_type: form.connection_type as PrinterType['connection_type'],
      protocol:        form.protocol,
      paper_width:     Number(form.paper_width),
      branch_id:       form.branch_id    || null,
      notes:           form.notes        || null,
      agent_id:        form.agent_id     || null,
      ip_address:      connType === 'ethernet'  ? (form.ip_address      || null) : null,
      port:            connType === 'ethernet'  ? Number(form.port)              : 9100,
      usb_vendor_id:   connType === 'usb'       ? (form.usb_vendor_id   || null) : null,
      usb_product_id:  connType === 'usb'       ? (form.usb_product_id  || null) : null,
      serial_port:     connType === 'serial'    ? (form.serial_port     || null) : null,
      serial_baud:     connType === 'serial'    ? Number(form.serial_baud)       : null,
      os_printer_name: connType === 'os_driver' ? (form.os_printer_name || null) : null,
      ...(connType === 'bluetooth' ? { serial_port: form.com_port || null, serial_baud: Number(form.serial_baud), com_port: form.com_port || null } : {}),
      ...(form.type === 'receipt' ? {
        print_qr:      form.print_qr,
        qr_type:       form.qr_type       || null,
        qr_custom_url: form.qr_custom_url || null,
      } : { print_qr: false, qr_type: null, qr_custom_url: null }),
    };
    onSave(dto);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {printer ? 'Editar impresora' : 'Nueva impresora'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: Impresora Caja 1"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {PRINTER_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Sin sucursal</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo de conexión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de conexión</label>
            <div className="grid grid-cols-2 gap-2">
              {CONNECTION_TYPES.map(ct => (
                <button key={ct} type="button" onClick={() => set('connection_type', ct)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    form.connection_type === ct
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}>
                  {CONN_LABEL[ct]}
                </button>
              ))}
            </div>
          </div>

          {/* Campos dinámicos por conexión */}
          {connType === 'ethernet' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección IP</label>
                <input value={form.ip_address} onChange={e => set('ip_address', e.target.value)}
                  placeholder="192.168.1.201"
                  className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                    errors.ip ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`} />
                {errors.ip && <p className="text-xs text-red-500 mt-1">{errors.ip}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                <input type="number" value={form.port} onChange={e => set('port', Number(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                    errors.port ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`} />
                {errors.port && <p className="text-xs text-red-500 mt-1">{errors.port}</p>}
              </div>
            </div>
          )}

          {connType === 'usb' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
                  <input value={form.usb_vendor_id} onChange={e => set('usb_vendor_id', e.target.value)}
                    placeholder="0x04b8"
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                      errors.vendor ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`} />
                  {errors.vendor && <p className="text-xs text-red-500 mt-1">{errors.vendor}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input value={form.usb_product_id} onChange={e => set('usb_product_id', e.target.value)}
                    placeholder="0x0202"
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                      errors.product ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`} />
                  {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}
                </div>
              </div>
              <p className="text-xs text-gray-400">Epson: 0x04b8 / Star: 0x0519. El Agente BullWeb puede detectarlos automáticamente.</p>
            </div>
          )}

          {connType === 'serial' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerto COM</label>
                <input value={form.serial_port} onChange={e => set('serial_port', e.target.value)}
                  placeholder="COM3 o /dev/ttyUSB0"
                  className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                    errors.serial_port ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`} />
                {errors.serial_port && <p className="text-xs text-red-500 mt-1">{errors.serial_port}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baud rate</label>
                <select value={form.serial_baud} onChange={e => set('serial_baud', Number(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                    errors.serial_baud ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}>
                  {BAUD_RATES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {errors.serial_baud && <p className="text-xs text-red-500 mt-1">{errors.serial_baud}</p>}
              </div>
            </div>
          )}

          {connType === 'os_driver' && (
            <div className="space-y-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre en el sistema</label>
                  {osPrinters.length > 0 ? (
                    <select
                      value={form.os_printer_name}
                      onChange={e => set('os_printer_name', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm ${
                        errors.os_printer ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}>
                      <option value="">Seleccionar impresora...</option>
                      {osPrinters.map(p => (
                        <option key={p.name} value={p.name}>
                          {p.name}{p.driverName ? ` — ${p.driverName}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.os_printer_name}
                      onChange={e => set('os_printer_name', e.target.value)}
                      placeholder="Ej: EPSON TM-T88V (copia 1)"
                      className={`w-full border rounded-lg px-3 py-2 text-sm ${
                        errors.os_printer ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                  )}
                  {errors.os_printer && <p className="text-xs text-red-500 mt-1">{errors.os_printer}</p>}
                </div>
                <button
                  type="button"
                  onClick={detectOsPrinters}
                  disabled={osPrintersLoading || !form.agent_id}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap">
                  {osPrintersLoading
                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                    : <RefreshCw className="w-3 h-3" />}
                  Detectar
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {osPrinters.length > 0
                  ? `${osPrinters.length} impresora(s) detectada(s). Selecciona o escribe el nombre.`
                  : 'Haz clic en Detectar para listar las impresoras instaladas en el agente.'}
              </p>
            </div>
          )}

          {connType === 'bluetooth' && (
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puerto COM (Bluetooth)</label>
                  {btPorts.length > 0 ? (
                    <select
                      value={form.com_port}
                      onChange={e => set('com_port', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                        errors.com_port ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}>
                      <option value="">Seleccionar puerto...</option>
                      {btPorts.map(p => (
                        <option key={p.path} value={p.path}>
                          {p.path}{p.manufacturer ? ` — ${p.manufacturer}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.com_port}
                      onChange={e => set('com_port', e.target.value)}
                      placeholder="COM4 (empareja la impresora primero)"
                      className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                        errors.com_port ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                  )}
                  {errors.com_port && <p className="text-xs text-red-500 mt-1">{errors.com_port}</p>}
                </div>
                <button
                  type="button"
                  onClick={detectBluetoothPorts}
                  disabled={btLoading || !form.agent_id}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap">
                  {btLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Detectar
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baud rate</label>
                <select value={form.serial_baud} onChange={e => set('serial_baud', Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono">
                  {BAUD_RATES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400 p-2 bg-cyan-50 border border-cyan-200 rounded">
                📶 Asegúrate de emparejar la impresora Bluetooth con Windows antes de configurarla aquí.
                Aparecerá como un puerto COM virtual. Haz clic en "Detectar" para ver los puertos disponibles en el agente.
              </p>
            </div>
          )}

          {/* Agente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agente BullWeb
              {needsAgent
                ? <span className="text-red-400"> *</span>
                : <span className="text-gray-400 font-normal"> (requerido si la IP es de red local)</span>}
            </label>
            <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar agente...</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.is_online ? '\u25cf Conectado' : '\u25cb Desconectado'}{a.ip_address ? ` (${a.ip_address})` : ''}
                </option>
              ))}
            </select>
            {!form.agent_id && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Sin agente: los trabajos de impresión no serán encolados.
              </p>
            )}
            {agents.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠ Sin agentes registrados. Descargá e instalá el Agente BullWeb primero.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protocolo ESC/POS</label>
              <select value={form.protocol} onChange={e => set('protocol', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {PROTOCOLS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ancho papel (mm)</label>
              <select value={form.paper_width} onChange={e => set('paper_width', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {PAPER_WIDTHS.map(w => <option key={w} value={w}>{w} mm</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Descripción opcional"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* QR en recibo */}
          {form.type === 'receipt' && (
            <div className="space-y-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">🔲 Imprimir código QR</span>
                <input
                  type="checkbox"
                  checked={!!form.print_qr}
                  onChange={e => set('print_qr', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>
              {form.print_qr && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de QR</label>
                    <select
                      value={form.qr_type}
                      onChange={e => set('qr_type', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {QR_TYPES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                    </select>
                  </div>
                  {(form.qr_type === 'custom' || form.qr_type?.startsWith('review_')) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                      <input
                        value={form.qr_custom_url}
                        onChange={e => set('qr_custom_url', e.target.value)}
                        placeholder="https://..."
                        className={`w-full border rounded-lg px-3 py-2 text-sm font-mono ${
                          errors.qr_url ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      {errors.qr_url && <p className="text-xs text-red-500 mt-1">{errors.qr_url}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name || (needsAgent && !form.agent_id) || saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
