import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, ChevronDown, ChevronUp, Check, Save, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  printSettingsService,
  PRINT_SETTINGS_DEFAULTS,
  fmtCurrency,
  type PrintSettings,
  type PrintSize,
} from '@/services/printSettingsService';

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-orange-500' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// HOTFIX 270: tamaño por bloque = Normal o Grande (doble alto y ancho en la impresora)
const SIZE_OPTIONS: { value: PrintSize; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LARGE',  label: 'Grande' },
];
const sizeValue = (v: PrintSize): PrintSize => (v === 'LARGE' ? 'LARGE' : 'NORMAL');

// Card con título naranja
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-orange-50">
        <h4 className="text-sm font-semibold text-orange-700">{title}</h4>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

// Fila de configuración
function Row({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

// Fila de tamaño con 3 selects por zona
function SizeRow({
  label,
  size,
  onSize,
}: {
  label: string;
  size: PrintSize;
  onSize: (v: PrintSize) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">Tamaño</span>
        <Select value={sizeValue(size)} onChange={onSize} options={SIZE_OPTIONS} />
      </div>
    </div>
  );
}

// Modal encabezado/pie
function TextModal({
  title,
  headerText,
  footerText,
  onSave,
  onClose,
}: {
  title: string;
  headerText: string;
  footerText: string;
  onSave: (header: string, footer: string) => void;
  onClose: () => void;
}) {
  const [h, setH] = useState(headerText);
  const [f, setF] = useState(footerText);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Encabezado</label>
            <textarea
              value={h}
              onChange={e => setH(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Texto del encabezado..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Pie</label>
            <textarea
              value={f}
              onChange={e => setF(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Texto del pie..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onSave(h, f); onClose(); }}
            className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vista previa de ticket ───────────────────────────────────────────────────

function PrintPreview({ cfg }: { cfg: PrintSettings }) {
  const sampleItems = [
    { name: 'Hamburguesa Clásica con Queso y Tocino', qty: 2, price: 6990 },
    { name: 'Bebida Cola', qty: 1, price: 1990 },
    { name: 'Papas Fritas', qty: 1, price: 2490 },
  ];

  const total = sampleItems.reduce((s, i) => s + i.price * i.qty, 0);

  // HOTFIX 270: Normal / Grande (en la impresora Grande es doble alto y ancho)
  const SIZE_MAP: Record<PrintSize, string> = {
    SMALL:  '12px',
    NORMAL: '12px',
    LARGE:  '17px',
  };

  const headerStyle = `font-size:${SIZE_MAP[cfg.cmHeaderSize]};display:inline-block;`;

  return (
    <div className="font-mono text-xs bg-white border border-dashed border-gray-300 rounded-lg p-4 max-w-[240px] overflow-hidden">
      <div style={{ overflowX: 'hidden' }}>
        <div style={{ all: 'revert' as any }}>
          <span style={{ ...Object.fromEntries(headerStyle.split(';').filter(Boolean).map(s => { const [k, v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v?.trim()]; })) }}>
            <div className="text-center font-bold">
              {cfg.cmHeaderText || 'RESTAURANTE'}
            </div>
            <div className="text-center">PRE-CUENTA</div>
            <div className="text-center">Mesa 3</div>
          </span>
        </div>
        <div className="border-t border-dashed border-gray-400 my-1" />
        {sampleItems.map((item, i) => (
          <div key={i} className="flex justify-between gap-1" style={{ fontSize: SIZE_MAP[cfg.cmBodySize] }}>
            <span>{item.qty}x {item.name}</span>
            <span>{fmtCurrency(item.price * item.qty, cfg)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-400 my-1" />
        <div className="flex justify-between font-bold" style={{ fontSize: SIZE_MAP[cfg.cmBodySize] }}>
          <span>TOTAL</span>
          <span>{fmtCurrency(total, cfg)}</span>
        </div>
        <div className="border-t border-dashed border-gray-400 my-1" />
        <div className="text-center text-gray-500" style={{ fontSize: SIZE_MAP[cfg.cmFooterSize] }}>
          {cfg.cmFooterText || 'Este documento no es boleta'}
        </div>
      </div>
    </div>
  );
}

// ─── Sección colapsable ────────────────────────────────────────────────────

function SectionBlock({
  title,
  badge,
  defaultOpen,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-orange-600">{title}</span>
          {badge && (
            <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 font-medium">
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="space-y-3 p-4 pt-0">{children}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrintSettingsPage() {
  const qc = useQueryClient();
  const { data: remote } = useQuery({
    queryKey: ['print-settings'],
    queryFn:  () => printSettingsService.get(),
    staleTime: 60_000,
  });

  const [cfg, setCfg]         = useState<PrintSettings>(PRINT_SETTINGS_DEFAULTS);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCmText, setShowCmText]   = useState(false);
  const [showKdText, setShowKdText]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar desde API cuando llega
  useEffect(() => {
    if (remote) setCfg(remote);
  }, [remote]);

  const update = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setCfg(prev => {
      const next = { ...prev, [key]: value };
      // Auto-guardado con debounce 1s
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => handleSave(next), 1000);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async (data: PrintSettings = cfg) => {
    try {
      setSaving(true);
      await printSettingsService.update(data);
      qc.setQueryData(['print-settings'], data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      toast.error('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // HOTFIX 270: prueba REAL — guarda lo pendiente y encola un job a la impresora (sale por la extensión o el agente)
  const [testing, setTesting] = useState<'precuenta' | 'comanda' | null>(null);
  const handlePrintTest = async (template: 'precuenta' | 'comanda') => {
    try {
      setTesting(template);
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      await printSettingsService.update(cfg);
      qc.setQueryData(['print-settings'], cfg);
      const r = await printSettingsService.test(template);
      toast.success(`Prueba enviada a "${r.printer}"`);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo enviar la prueba');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Printer className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opciones de Impresión</h1>
            <p className="text-gray-500 text-sm mt-0.5">Configura el formato de tickets y comandas</p>
          </div>
        </div>
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Ocultar vista previa' : 'Vista previa'}
        </button>
      </div>

      {/* Vista previa */}
      {showPreview && (
        <div className="flex justify-center">
          <div>
            <p className="text-xs text-gray-400 text-center mb-2">Vista previa pre-cuenta</p>
            <PrintPreview cfg={cfg} />
          </div>
        </div>
      )}

      {/* ════════════════════════════════ A — PRE-CUENTA ═════════════════════ */}
      <SectionBlock title="A. Pre-cuenta" defaultOpen={true}>

        {/* CARD 1 — Tamaño de letra */}
        <Card title="Tamaño de letra">
          <SizeRow label="Encabezado" size={cfg.cmHeaderSize} onSize={v => update('cmHeaderSize', v)} />
          <SizeRow label="Cuerpo"     size={cfg.cmBodySize}   onSize={v => update('cmBodySize', v)} />
          <SizeRow label="Pie"        size={cfg.cmFooterSize} onSize={v => update('cmFooterSize', v)} />
        </Card>

        {/* CARD 2 — Imprimir al cerrar */}
        <Card title="Imprimir al cobrar o cerrar">
          <Row
            label="Imprimir automáticamente"
            description="Imprime el ticket de venta en la impresora de caja cuando la orden queda pagada (Mesas, Mostrador y Delivery)"
            control={<Toggle value={cfg.cmPrintOnClose} onChange={v => update('cmPrintOnClose', v)} />}
          />
        </Card>

        {/* HOTFIX 270: modificadores, largo del nombre, ID de venta y comanda de cancelación quedan fijos (fuera de la UI) */}
        {/* CARD 5 — Símbolo de moneda */}
        <Card title="Símbolo de moneda">
          <Row
            label="Mostrar símbolo $"
            description="Muestra el símbolo $ junto a los importes"
            control={<Toggle value={cfg.cmShowCurrency} onChange={v => update('cmShowCurrency', v)} />}
          />
        </Card>

        {/* CARD 7 — Encabezado y Pie */}
        <Card title="Encabezado y Pie">
          <Row
            label="Personalizar texto"
            description="Texto del encabezado y pie de la pre-cuenta, el delivery y el ticket de venta"
            control={
              <button
                onClick={() => setShowCmText(true)}
                className="px-3 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Configurar
              </button>
            }
          />
          {(cfg.cmHeaderText || cfg.cmFooterText) && (
            <div className="px-5 pb-3 space-y-1">
              {cfg.cmHeaderText && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 font-mono">{cfg.cmHeaderText}</p>
              )}
              {cfg.cmFooterText && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 font-mono">{cfg.cmFooterText}</p>
              )}
            </div>
          )}
        </Card>

        {/* CARD 8 — Prueba de impresión */}
        <Card title="Prueba de impresión">
          <Row
            label="Imprimir prueba de Pre-cuenta"
            description="Guarda y envía una pre-cuenta de ejemplo a la impresora de caja"
            control={
              <button
                onClick={() => handlePrintTest('precuenta')}
                disabled={testing !== null}
                className="flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                {testing === 'precuenta' ? 'Enviando...' : 'Imprimir prueba'}
              </button>
            }
          />
        </Card>
      </SectionBlock>

      {/* ════════════════════════════════ B — COMANDAS ══════════════════════ */}
      <SectionBlock title="B. Comandas" defaultOpen={false}>

        {/* CARD 1 — Tamaño de letra */}
        <Card title="Tamaño de letra">
          <SizeRow label="Encabezado" size={cfg.kdHeaderSize} onSize={v => update('kdHeaderSize', v)} />
          <SizeRow label="Cuerpo"     size={cfg.kdBodySize}   onSize={v => update('kdBodySize', v)} />
          <SizeRow label="Pie"        size={cfg.kdFooterSize} onSize={v => update('kdFooterSize', v)} />
        </Card>

        {/* CARD 2 — Encabezado y pie */}
        <Card title="Encabezado y Pie de Comanda">
          <Row
            label="Personalizar texto"
            description="Texto del encabezado y pie de la comanda de cocina y de mostrador"
            control={
              <button
                onClick={() => setShowKdText(true)}
                className="px-3 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Configurar
              </button>
            }
          />
          {(cfg.kdHeaderText || cfg.kdFooterText) && (
            <div className="px-5 pb-3 space-y-1">
              {cfg.kdHeaderText && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 font-mono">{cfg.kdHeaderText}</p>
              )}
              {cfg.kdFooterText && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 font-mono">{cfg.kdFooterText}</p>
              )}
            </div>
          )}
        </Card>

        {/* HOTFIX 270 — Prueba de impresión de comanda (job real) */}
        <Card title="Prueba de impresión">
          <Row
            label="Imprimir prueba de Comanda"
            description="Guarda y envía una comanda de ejemplo a la impresora de cocina (o a la de caja si no hay)"
            control={
              <button
                onClick={() => handlePrintTest('comanda')}
                disabled={testing !== null}
                className="flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                {testing === 'comanda' ? 'Enviando...' : 'Imprimir prueba'}
              </button>
            }
          />
        </Card>
      </SectionBlock>

      {/* Botón guardar sticky */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-end z-10">
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar configuración'}
        </button>
      </div>

      {/* Modales de texto */}
      {showCmText && (
        <TextModal
          title="Encabezado y Pie — Pre-cuenta"
          headerText={cfg.cmHeaderText}
          footerText={cfg.cmFooterText}
          onSave={(h, f) => { update('cmHeaderText', h); update('cmFooterText', f); }}
          onClose={() => setShowCmText(false)}
        />
      )}
      {showKdText && (
        <TextModal
          title="Encabezado y Pie — Comanda"
          headerText={cfg.kdHeaderText}
          footerText={cfg.kdFooterText}
          onSave={(h, f) => { update('kdHeaderText', h); update('kdFooterText', f); }}
          onClose={() => setShowKdText(false)}
        />
      )}
    </div>
  );
}
