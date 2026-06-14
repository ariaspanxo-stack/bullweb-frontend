import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, ChevronDown, ChevronUp, Check, Save, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  printSettingsService,
  PRINT_SETTINGS_DEFAULTS,
  fmtCurrency,
  truncateName,
  printId,
  type PrintSettings,
  type PrintSize,
  type PrintHeight,
  type PrintWidth,
  type IdMode,
} from '@/services/printSettingsService';
import { generateTicketHtml, openPrintWindow } from '@/utils/printUtils';

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

const SIZE_OPTIONS: { value: PrintSize; label: string }[] = [
  { value: 'SMALL',  label: 'Pequeño' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LARGE',  label: 'Grande' },
];
const HEIGHT_OPTIONS: { value: PrintHeight; label: string }[] = [
  { value: 'SIMPLE', label: 'Simple' },
  { value: 'DOUBLE', label: 'Doble' },
];
const WIDTH_OPTIONS: { value: PrintWidth; label: string }[] = [
  { value: 'SIMPLE', label: 'Simple' },
  { value: 'DOUBLE', label: 'Doble' },
];
const ID_OPTIONS: { value: IdMode; label: string }[] = [
  { value: 'NONE',        label: 'No incluir' },
  { value: 'FULL',        label: 'Imprimir completo' },
  { value: 'LAST_DIGITS', label: 'Últimos N dígitos' },
];

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
  height,
  width,
  onSize,
  onHeight,
  onWidth,
}: {
  label: string;
  size: PrintSize;
  height: PrintHeight;
  width: PrintWidth;
  onSize: (v: PrintSize) => void;
  onHeight: (v: PrintHeight) => void;
  onWidth: (v: PrintWidth) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Tamaño</span>
          <Select value={size} onChange={onSize} options={SIZE_OPTIONS} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Alto</span>
          <Select value={height} onChange={onHeight} options={HEIGHT_OPTIONS} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Ancho</span>
          <Select value={width} onChange={onWidth} options={WIDTH_OPTIONS} />
        </div>
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
  const sampleId = '8f3a1b9c-e2d4-4f7a-b6c5-12345678abcd';

  const SIZE_MAP: Record<PrintSize, string> = {
    SMALL:  '10px',
    NORMAL: '12px',
    LARGE:  '14px',
  };

  const headerStyle = `font-size:${SIZE_MAP[cfg.cmHeaderSize]};transform:scaleY(${cfg.cmHeaderHeight === 'DOUBLE' ? 2 : 1}) scaleX(${cfg.cmHeaderWidth === 'DOUBLE' ? 2 : 1});display:inline-block;transform-origin:left top;`;

  const idStr = printId(sampleId, cfg);

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
            <span>{item.qty}x {truncateName(item.name, cfg)}</span>
            <span>{fmtCurrency(item.price * item.qty, cfg)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-400 my-1" />
        <div className="flex justify-between font-bold" style={{ fontSize: SIZE_MAP[cfg.cmBodySize] }}>
          <span>TOTAL</span>
          <span>{fmtCurrency(total, cfg)}</span>
        </div>
        {idStr && <div className="text-center text-gray-500 mt-1"># {idStr}</div>}
        <div className="border-t border-dashed border-gray-400 my-1" />
        <div className="text-center text-gray-500" style={{ fontSize: '10px' }}>
          {cfg.cmFooterText || 'Este no es un documento tributario válido'}
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

  const handlePrintTest = () => {
    const sampleItems = [
      { name: 'Hamburguesa Clásica con Queso y Tocino', quantity: 2, unitPrice: 6990 },
      { name: 'Bebida Cola', quantity: 1, unitPrice: 1990 },
      { name: 'Papas Fritas', quantity: 1, unitPrice: 2490 },
    ];
    const total = sampleItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const html = generateTicketHtml(
      { tableNumber: 3, orderId: '8f3a1b9c-e2d4-4f7a-b6c5-12345678abcd', items: sampleItems, total },
      cfg,
    );
    openPrintWindow(html);
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
          <SizeRow
            label="Encabezado"
            size={cfg.cmHeaderSize}     onSize={v   => update('cmHeaderSize', v)}
            height={cfg.cmHeaderHeight} onHeight={v => update('cmHeaderHeight', v)}
            width={cfg.cmHeaderWidth}   onWidth={v  => update('cmHeaderWidth', v)}
          />
          <SizeRow
            label="Cuerpo"
            size={cfg.cmBodySize}       onSize={v   => update('cmBodySize', v)}
            height={cfg.cmBodyHeight}   onHeight={v => update('cmBodyHeight', v)}
            width={cfg.cmBodyWidth}     onWidth={v  => update('cmBodyWidth', v)}
          />
          <SizeRow
            label="Pie"
            size={cfg.cmFooterSize}     onSize={v   => update('cmFooterSize', v)}
            height={cfg.cmFooterHeight} onHeight={v => update('cmFooterHeight', v)}
            width={cfg.cmFooterWidth}   onWidth={v  => update('cmFooterWidth', v)}
          />
        </Card>

        {/* CARD 2 — Imprimir al cerrar */}
        <Card title="Imprimir al cerrar pedido">
          <Row
            label="Imprimir automáticamente"
            description="Imprime la pre-cuenta al cerrar desde Mostrador, Mesas y Delivery"
            control={<Toggle value={cfg.cmPrintOnClose} onChange={v => update('cmPrintOnClose', v)} />}
          />
        </Card>

        {/* CARD 3 — Modificadores sin precio */}
        <Card title="Imprimir grupos modificadores sin precio">
          <Row
            label="Imprimir modificadores sin precio"
            description="Los modificadores con precio siempre se imprimen"
            control={<Toggle value={cfg.cmPrintModifiers} onChange={v => update('cmPrintModifiers', v)} />}
          />
        </Card>

        {/* CARD 4 — Largo del texto */}
        <Card title="Largo del texto de productos">
          <Row
            label="Máximo de caracteres por nombre"
            description="Largo máximo antes de truncar. Mín 4, máx 100, defecto 29."
            control={
              <input
                type="number"
                min={4}
                max={100}
                value={cfg.cmMaxChars}
                onChange={e => update('cmMaxChars', Math.min(100, Math.max(4, Number(e.target.value) || 29)))}
                className="w-20 text-sm text-center border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            }
          />
        </Card>

        {/* CARD 5 — Símbolo de moneda */}
        <Card title="Símbolo de moneda">
          <Row
            label="Mostrar símbolo $"
            description="Muestra el símbolo $ junto a los importes"
            control={<Toggle value={cfg.cmShowCurrency} onChange={v => update('cmShowCurrency', v)} />}
          />
        </Card>

        {/* CARD 6 — ID de Venta */}
        <Card title="ID de Venta">
          <Row
            label="Incluir ID en el ticket"
            description="Identificador de la venta en la Pre-cuenta"
            control={
              <Select value={cfg.cmIdMode} onChange={v => update('cmIdMode', v)} options={ID_OPTIONS} />
            }
          />
          {cfg.cmIdMode === 'LAST_DIGITS' && (
            <Row
              label="Cantidad de dígitos"
              control={
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={cfg.cmIdDigits}
                  onChange={e => update('cmIdDigits', Math.min(36, Math.max(1, Number(e.target.value) || 4)))}
                  className="w-20 text-sm text-center border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              }
            />
          )}
        </Card>

        {/* CARD 7 — Encabezado y Pie */}
        <Card title="Encabezado y Pie">
          <Row
            label="Personalizar texto"
            description="Texto del encabezado y pie de la Pre-cuenta"
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
            description="Usa la configuración actual para generar un ticket de prueba"
            control={
              <button
                onClick={handlePrintTest}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir prueba
              </button>
            }
          />
        </Card>
      </SectionBlock>

      {/* ════════════════════════════════ B — COMANDAS ══════════════════════ */}
      <SectionBlock title="B. Comandas" defaultOpen={false}>

        {/* CARD 1 — Tamaño de letra */}
        <Card title="Tamaño de letra">
          <SizeRow
            label="Encabezado"
            size={cfg.kdHeaderSize}     onSize={v   => update('kdHeaderSize', v)}
            height={cfg.kdHeaderHeight} onHeight={v => update('kdHeaderHeight', v)}
            width={cfg.kdHeaderWidth}   onWidth={v  => update('kdHeaderWidth', v)}
          />
          <SizeRow
            label="Cuerpo"
            size={cfg.kdBodySize}       onSize={v   => update('kdBodySize', v)}
            height={cfg.kdBodyHeight}   onHeight={v => update('kdBodyHeight', v)}
            width={cfg.kdBodyWidth}     onWidth={v  => update('kdBodyWidth', v)}
          />
          <SizeRow
            label="Pie"
            size={cfg.kdFooterSize}     onSize={v   => update('kdFooterSize', v)}
            height={cfg.kdFooterHeight} onHeight={v => update('kdFooterHeight', v)}
            width={cfg.kdFooterWidth}   onWidth={v  => update('kdFooterWidth', v)}
          />
        </Card>

        {/* CARD 2 — Encabezado y pie */}
        <Card title="Encabezado y Pie de Comanda">
          <Row
            label="Personalizar texto"
            description="Texto del encabezado y pie de la comanda de cocina"
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

        {/* CARD 3 — Comanda de cancelación */}
        <Card title="Comanda de cancelación">
          <Row
            label="Habilitar comanda de cancelación"
            description="Imprime una comanda cuando se cancela un ítem de la orden"
            control={<Toggle value={cfg.kdPrintCancel} onChange={v => update('kdPrintCancel', v)} />}
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
