// ── components/print/TicketPreview.tsx ────────────────────────────────────────
// Simulador de papel térmico — vista previa en tiempo real para plantillas.

import type { TicketTemplate } from '../../services/adminService';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type TicketType    = 'kitchen_ticket' | 'receipt';
export type TicketWidth   = 58 | 80;

export interface PreviewItem {
  name:      string;
  qty:       number;
  price?:    number;
  modifiers?: string[];
  notes?:    string;
}

export interface PreviewOrder {
  order_number: string;
  table_name?:  string;
  waiter_name?: string;
  datetime:     string;
  items:        PreviewItem[];
  subtotal?:    number;
  tax?:         number;
  total?:       number;
  payment_method?: string;
}

export interface PreviewBusiness {
  name:    string;
  address?: string;
  phone?:  string;
  rut?:    string;
}

export interface TicketPreviewProps {
  type:        TicketType;
  paperWidth?: TicketWidth;
  template?:   Partial<TicketTemplate>;
  /** Si true, muestra datos de ejemplo en lugar de requerir order/business */
  demoMode?:   boolean;
  order?:      PreviewOrder;
  business?:   PreviewBusiness;
}

// ── Datos de demo ─────────────────────────────────────────────────────────────

const DEMO_BUSINESS: PreviewBusiness = {
  name:    'BullWeb Restaurant',
  address: 'Av. Principal 123, Santiago',
  phone:   '+56 9 1234 5678',
  rut:     '76.123.456-7',
};

const DEMO_ORDER: PreviewOrder = {
  order_number:   '#0042',
  table_name:     'Mesa 5',
  waiter_name:    'Carlos M.',
  datetime:       new Date().toLocaleString('es-CL'),
  items: [
    { name: 'Hamburguesa Clásica', qty: 2, price: 5990, modifiers: ['Sin cebolla', 'Extra queso'] },
    { name: 'Papas Fritas',        qty: 1, price: 2490 },
    { name: 'Coca-Cola 350ml',     qty: 2, price: 1990, notes: 'Sin hielo' },
  ],
  subtotal:       18450,
  tax:            3505,
  total:          21955,
  payment_method: 'Tarjeta de crédito',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-CL')}`;
}

function getSeparator(style: TicketTemplate['separator_style'], width: TicketWidth): string {
  const len = width === 58 ? 32 : 42;
  const chars: Record<string, string> = {
    dashes:   '-',
    stars:    '*',
    equals:   '=',
    scissors: '- ',
  };
  const ch = chars[style ?? 'dashes'] ?? '-';
  return ch.repeat(Math.ceil(len / ch.length)).slice(0, len);
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

interface HeaderProps {
  business:  PreviewBusiness;
  template:  Partial<TicketTemplate>;
  type:      TicketType;
}
function TicketHeader({ business, template }: HeaderProps) {
  return (
    <div className="text-center mb-1">
      <div className="font-bold text-sm leading-tight">
        {template.header_logo_text ?? business.name}
      </div>
      {template.header_show_address !== false && business.address && (
        <div className="text-xs text-gray-600">{business.address}</div>
      )}
      {template.header_show_phone !== false && business.phone && (
        <div className="text-xs text-gray-600">{business.phone}</div>
      )}
      {template.header_show_rut !== false && business.rut && (
        <div className="text-xs text-gray-600">RUT: {business.rut}</div>
      )}
      {template.header_custom_line_1 && (
        <div className="text-xs mt-0.5">{template.header_custom_line_1}</div>
      )}
      {template.header_custom_line_2 && (
        <div className="text-xs">{template.header_custom_line_2}</div>
      )}
    </div>
  );
}

interface SeparatorProps {
  style?:     TicketTemplate['separator_style'];
  width:      TicketWidth;
}
function Separator({ style, width }: SeparatorProps) {
  return (
    <div className="text-xs text-gray-400 leading-tight tracking-tighter overflow-hidden whitespace-nowrap">
      {getSeparator(style, width)}
    </div>
  );
}

interface KitchenBodyProps {
  order:    PreviewOrder;
  template: Partial<TicketTemplate>;
  width:    TicketWidth;
}
function KitchenBody({ order, template, width }: KitchenBodyProps) {
  const big = template.font_size === 'large';
  const itemCls = `font-bold leading-tight ${big ? 'text-base' : 'text-sm'}`;

  return (
    <>
      {/* Encabezado del ticket */}
      <div className={`font-bold text-center ${big ? 'text-base' : 'text-sm'} mb-0.5`}>
        {template.type === 'kitchen_ticket' ? '*** COCINA ***' : '*** TICKET ***'}
      </div>

      {template.show_order_number !== false && (
        <div className={`font-bold ${big ? 'text-lg' : 'text-base'} text-center`}>
          {order.order_number}
        </div>
      )}

      {template.show_datetime !== false && (
        <div className="text-xs text-gray-500 text-center">{order.datetime}</div>
      )}

      {(template.show_table_name !== false && order.table_name) && (
        <div className="text-xs mt-0.5">
          <span className="font-semibold">Mesa:</span> {order.table_name}
        </div>
      )}
      {(template.show_waiter_name === true && order.waiter_name) && (
        <div className="text-xs">
          <span className="font-semibold">Mozo:</span> {order.waiter_name}
        </div>
      )}

      <Separator style={template.separator_style} width={width} />

      {/* Ítems */}
      {order.items.map((item, i) => (
        <div key={i} className="mb-1">
          <div className={itemCls}>
            {item.qty}x {template.item_name_uppercase !== false
              ? item.name.toUpperCase()
              : item.name}
          </div>
          {template.show_modifiers !== false && item.modifiers?.map((mod: any, j) => (
            <div key={j} className="text-xs text-gray-600 pl-3">• {mod?.name ?? mod}</div>
          ))}
          {template.show_notes !== false && item.notes && (
            <div className="text-xs italic text-gray-500 pl-3">⚑ {item.notes}</div>
          )}
        </div>
      ))}

      <Separator style={template.separator_style} width={width} />
    </>
  );
}

interface ReceiptBodyProps {
  order:    PreviewOrder;
  template: Partial<TicketTemplate>;
  width:    TicketWidth;
}
function ReceiptBody({ order, template, width }: ReceiptBodyProps) {
  const big = template.font_size === 'large';

  return (
    <>
      <div className={`font-bold text-center ${big ? 'text-base' : 'text-sm'} mb-0.5`}>
        BOLETA / RECIBO
      </div>

      {template.show_order_number !== false && (
        <div className={`font-bold text-center ${big ? 'text-base' : 'text-sm'}`}>
          {order.order_number}
        </div>
      )}
      {template.show_datetime !== false && (
        <div className="text-xs text-gray-500 text-center">{order.datetime}</div>
      )}
      {(template.show_table_name !== false && order.table_name) && (
        <div className="text-xs mt-0.5"><span className="font-semibold">Mesa:</span> {order.table_name}</div>
      )}
      {(template.show_waiter_name === true && order.waiter_name) && (
        <div className="text-xs"><span className="font-semibold">Atendido por:</span> {order.waiter_name}</div>
      )}

      <Separator style={template.separator_style} width={width} />

      {/* Ítems con precios */}
      {order.items.map((item, i) => (
        <div key={i} className="mb-0.5">
          <div className="flex justify-between text-xs">
            <span className={template.item_name_uppercase !== false ? 'uppercase' : ''}>
              {item.qty}x {item.name}
            </span>
            {template.show_item_price === true && item.price !== undefined && (
              <span>{formatPrice(item.price * item.qty)}</span>
            )}
          </div>
          {template.show_modifiers !== false && item.modifiers?.map((mod: any, j) => (
            <div key={j} className="text-xs text-gray-600 pl-3">• {mod?.name ?? mod}</div>
          ))}
          {template.show_notes !== false && item.notes && (
            <div className="text-xs italic text-gray-500 pl-3">⚑ {item.notes}</div>
          )}
        </div>
      ))}

      <Separator style={template.separator_style} width={width} />

      {/* Totales */}
      {order.subtotal !== undefined && (
        <div className="flex justify-between text-xs">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
      )}
      {order.tax > 0 && (
        <div className="flex justify-between text-xs text-gray-600">
          <span>IVA (19%)</span>
          <span>{formatPrice(order.tax)}</span>
        </div>
      )}
      {order.total !== undefined && (
        <div className="flex justify-between text-sm font-bold border-t border-gray-300 mt-0.5 pt-0.5">
          <span>TOTAL</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      )}
      {order.payment_method && (
        <div className="text-xs text-gray-500 text-right mt-0.5">{order.payment_method}</div>
      )}

      <Separator style={template.separator_style} width={width} />

      {/* QR placeholder */}
      {template.print_qr === true && (
        <div className="flex flex-col items-center my-1">
          <div className="border-2 border-gray-400 flex items-center justify-center bg-gray-100"
            style={{ width: `${(template.qr_size ?? 5) * 8}px`, height: `${(template.qr_size ?? 5) * 8}px` }}>
            <span className="text-gray-400 text-xs">QR</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {template.qr_type === 'custom' ? template.qr_custom_url ?? 'URL personalizada' : 'Recibo digital'}
          </div>
        </div>
      )}
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function TicketPreview({
  type,
  paperWidth = 80,
  template = {},
  demoMode  = true,
  order,
  business,
}: TicketPreviewProps) {
  const resolvedOrder    = order    ?? (demoMode ? DEMO_ORDER    : null);
  const resolvedBusiness = business ?? (demoMode ? DEMO_BUSINESS : null);

  if (!resolvedOrder || !resolvedBusiness) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Sin datos para previsualizar
      </div>
    );
  }

  // Ancho del ticket: 58mm ≈ 200px, 80mm ≈ 280px
  const widthPx = paperWidth === 58 ? 200 : 280;

  // Footer message
  const footerMsg = template.footer_message ?? '¡Gracias por su visita!';

  return (
    <div
      className="bg-amber-50 border border-gray-300 shadow-md font-mono text-gray-800 select-none"
      style={{
        width:     `${widthPx}px`,
        padding:   '10px 8px',
        borderRadius: '2px',
        lineHeight: '1.4',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(200,190,160,0.5)',
      }}
    >
      {/* ─── Header ─────────────────────────────────────── */}
      <TicketHeader business={resolvedBusiness} template={template} type={type} />

      <Separator style={template.separator_style} width={paperWidth} />

      {/* ─── Body según tipo ─────────────────────────────── */}
      {type === 'kitchen_ticket' ? (
        <KitchenBody order={resolvedOrder} template={template} width={paperWidth} />
      ) : (
        <ReceiptBody order={resolvedOrder} template={template} width={paperWidth} />
      )}

      {/* ─── Footer ─────────────────────────────────────── */}
      {footerMsg && (
        <div className="text-center text-xs text-gray-600 mt-0.5">{footerMsg}</div>
      )}
      {template.footer_custom_line && (
        <div className="text-center text-xs text-gray-500">{template.footer_custom_line}</div>
      )}
      {template.footer_show_powered_by !== false && (
        <div className="text-center text-xs text-gray-400 mt-0.5">Powered by BullWeb</div>
      )}

      {/* ─── Tear-off simulation ─────────────────────────── */}
      <div className="flex items-center gap-0.5 mt-2 opacity-30">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="w-1.5 h-0.5 bg-gray-400 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export default TicketPreview;
