// ═══════════════════════════════════════════════════════════════
// PRINT UTILS — Generadores de HTML para tickets y comandas
// Funciones puras, sin side effects, fácilmente testeables.
// ═══════════════════════════════════════════════════════════════

import {
  type PrintSettings,
  type PrintSize,
  truncateName,
  fmtCurrency,
  printId,
} from '@/services/printSettingsService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TicketItem {
  name:      string;
  quantity:  number;
  unitPrice: number;
  note?:     string;
}

export interface TicketData {
  tableNumber: number | string;
  orderId?:    string;
  items:       TicketItem[];
  total:       number;
  createdAt?:  string | Date;
}

export interface ComandaItem {
  name:        string;
  quantity:    number;
  note?:       string;
  /** true = ítem cancelado (tachado) */
  cancelled?:  boolean;
  /** ID de la estación de cocina asignada al producto */
  stationId?:  string;
  /** Nombre de la estación (para agrupar en split de comandas) */
  stationName?: string;
}

export interface KitchenStation {
  id:          string;
  name:        string;
  printerId?:  string | null;
  active?:     boolean;
}

export interface ComandaData {
  tableNumber:  number | string | null;
  orderId?:     string;
  orderType?:   string;   // DINE_IN | TAKEAWAY | DELIVERY
  items:        ComandaItem[];
  waiterName?:  string;
  createdAt?:   string | Date;
}

// ─── Helpers internos ────────────────────────────────────────────────────────

const SZ: Record<PrintSize, string> = {
  SMALL:  '10px',
  NORMAL: '12px',
  LARGE:  '14px',
};

function scaleStyle(size: PrintSize, height: string, width: string): string {
  const scY = height === 'DOUBLE' ? 2 : 1;
  const scX = width  === 'DOUBLE' ? 2 : 1;
  const transform = (scY !== 1 || scX !== 1)
    ? `transform:scaleY(${scY}) scaleX(${scX});display:inline-block;transform-origin:left top;`
    : '';
  return `font-size:${SZ[size]};${transform}`;
}

function formatDate(d?: string | Date): string {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleString('es-CL');
}

// ─── generateTicketHtml ───────────────────────────────────────────────────────
/**
 * Genera el HTML completo de un ticket de pre-cuenta / control de mesa.
 * Aplica toda la configuración del tenant (tamaños, escala, textos, ID).
 *
 * @example
 * const html = generateTicketHtml(ticketData, printCfg);
 * window.open('', '_blank').document.write(html);
 */
export function generateTicketHtml(data: TicketData, cfg: PrintSettings): string {
  const hdrStyle = scaleStyle(cfg.cmHeaderSize, cfg.cmHeaderHeight, cfg.cmHeaderWidth);
  const bdyStyle = scaleStyle(cfg.cmBodySize,   cfg.cmBodyHeight,   cfg.cmBodyWidth);
  const ftrStyle = scaleStyle(cfg.cmFooterSize, cfg.cmFooterHeight, cfg.cmFooterWidth);

  const idStr    = data.orderId ? printId(data.orderId, cfg) : '';
  const metaLine = [
    data.tableNumber != null ? `Mesa ${data.tableNumber}` : null,
    idStr                    ? `Venta: #${idStr}`         : null,
  ].filter(Boolean).join('  ·  ');

  const headerBlock = cfg.cmHeaderText?.trim()
    ? `<div class="header-text" style="${hdrStyle}">${cfg.cmHeaderText.trim().split('\n').join('<br>')}</div>
    <div class="line"></div>`
    : `<div class="line"></div>`;

  const footerBlock = cfg.cmFooterText
    ? `<div class="footer-text" style="${ftrStyle}">${cfg.cmFooterText.split('\n').join('<br>')}</div>`
    : `<div class="footer-text" style="${ftrStyle}">Este no es un documento tributario válido</div>`;

  const itemsHtml = data.items.map(item => {
    const name   = truncateName(item.name, cfg);
    const amount = fmtCurrency(item.unitPrice * item.quantity, cfg);
    const noteHtml = item.note
      ? `<div style="${ftrStyle};color:#666;padding-left:12px">→ ${item.note}</div>`
      : '';
    return `
      <div class="item-row" style="${bdyStyle}">
        <span>${item.quantity}x ${name}</span>
        <span>${amount}</span>
      </div>${noteHtml}`;
  }).join('');

  return `<html><head><meta charset="UTF-8"><style>
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      max-width: 300px;
      margin: 0 auto;
      padding: 8px;
    }
    .title {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 4px;
    }
    .header-text {
      text-align: center;
      margin-bottom: 4px;
      white-space: pre-wrap;
    }
    .line {
      border-bottom: 1px dashed #000;
      margin: 4px 0;
    }
    .meta {
      font-size: 11px;
      margin: 2px 0;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      margin-top: 4px;
    }
    .footer-text {
      text-align: center;
      margin-top: 8px;
      white-space: pre-wrap;
    }
    @media print {
      body { max-width: 100%; padding: 0; }
    }
  </style></head><body>
    <div class="title">PRE-CUENTA</div>
    ${headerBlock}
    <div class="meta" style="${bdyStyle}">${metaLine}</div>
    <div class="meta" style="${bdyStyle}">${formatDate(data.createdAt)}</div>
    <div class="line"></div>
    ${itemsHtml}
    <div class="line"></div>
    <div class="total-row" style="${bdyStyle}">
      <span>TOTAL</span>
      <span>${fmtCurrency(data.total, cfg)}</span>
    </div>
    <div class="line"></div>
    ${footerBlock}
  </body></html>`;
}

// ─── Mapa de origen de pedido ────────────────────────────────────────────────

const ORIGIN_LABEL: Record<string, string> = {
  DINE_IN   : '🍽️  MESAS',
  TAKEAWAY  : '🏪  MOSTRADOR',
  DELIVERY  : '🛵  DELIVERY',
  TABLE     : '🍽️  MESAS',
  COUNTER   : '🏪  MOSTRADOR',
  BAR       : '🍺  BARRA',
  MESA      : '🍽️  MESAS',
  MOSTRADOR : '🏪  MOSTRADOR',
};

function originLabel(type?: string): string {
  if (!type) return 'PEDIDO';
  return ORIGIN_LABEL[type.toUpperCase()] ?? type;
}

// ─── generateComandaHtml ──────────────────────────────────────────────────────
/**
 * Genera el HTML completo de una comanda de cocina/barra.
 * Aplica los parámetros kd* de la configuración del tenant.
 *
 * @example
 * const html = generateComandaHtml(comandaData, printCfg);
 * window.open('', '_blank').document.write(html);
 */
export function generateComandaHtml(data: ComandaData, cfg: PrintSettings, stationName?: string): string {
  const hdrStyle = scaleStyle(cfg.kdHeaderSize, cfg.kdHeaderHeight, cfg.kdHeaderWidth);
  const bdyStyle = scaleStyle(cfg.kdBodySize,   cfg.kdBodyHeight,   cfg.kdBodyWidth);
  const ftrStyle = scaleStyle(cfg.kdFooterSize, cfg.kdFooterHeight, cfg.kdFooterWidth);

  const idStr    = data.orderId ? printId(data.orderId, cfg) : '';
  const origin   = originLabel(data.orderType);

  const metaLine = [
    data.tableNumber != null ? `Mesa ${data.tableNumber}` : null,
    idStr                    ? `Orden: #${idStr}`         : null,
  ].filter(Boolean).join('  ·  ') || origin;

  const headerBlock = cfg.kdHeaderText?.trim()
    ? `<div class="header-text" style="${hdrStyle}">${cfg.kdHeaderText.trim().split('\n').join('<br>')}</div>
    <div class="line"></div>`
    : `<div class="line"></div>`;

  const footerBlock = cfg.kdFooterText
    ? `<div class="footer-text" style="${ftrStyle}">${cfg.kdFooterText
        .split('\n').join('<br>')
        .replace('{mesa}', data.tableNumber != null ? String(data.tableNumber) : '')
        .replace('{hora}', formatDate(data.createdAt))
      }</div>`
    : '';

  const waiterBlock = data.waiterName
    ? `<div class="meta" style="${bdyStyle}">Garzón: ${data.waiterName}</div>`
    : '';

  const itemsHtml = data.items.map(item => {
    const style = item.cancelled
      ? `${bdyStyle};text-decoration:line-through;color:#999`
      : bdyStyle;
    const prefix = item.cancelled ? '✘ ' : '';
    const noteHtml = item.note
      ? `<div style="${ftrStyle};color:#666;padding-left:12px">→ ${item.note}</div>`
      : '';
    return `
      <div style="${style}">
        <strong>${item.quantity}x</strong> ${prefix}${item.name}
      </div>${noteHtml}`;
  }).join('');

  return `<html><head><meta charset="UTF-8"><style>
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      max-width: 300px;
      margin: 0 auto;
      padding: 8px;
    }
    .title {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 4px;
    }
    .header-text {
      text-align: center;
      margin-bottom: 4px;
      white-space: pre-wrap;
    }
    .origin {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 2px;
      margin: 3px 0;
    }
    .station {
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      margin: 2px 0;
    }
    .line {
      border-bottom: 1px dashed #000;
      margin: 4px 0;
    }
    .meta {
      font-size: 11px;
      margin: 2px 0;
    }
    .footer-text {
      text-align: center;
      margin-top: 8px;
      white-space: pre-wrap;
    }
    @media print {
      body { max-width: 100%; padding: 0; }
    }
  </style></head><body>
    <div class="title">COMANDA</div>
    ${headerBlock}
    <div class="origin">*** ${origin} ***</div>
    ${stationName ? `<div class="station">&gt;&gt; ${stationName} &lt;&lt;</div>` : ''}
    <div class="meta" style="${bdyStyle}">${metaLine}</div>
    ${waiterBlock}
    <div class="meta" style="${bdyStyle}">${formatDate(data.createdAt)}</div>
    <div class="line"></div>
    ${itemsHtml}
    <div class="line"></div>
    ${footerBlock}
  </body></html>`;
}

// ─── generateStationComandas ─────────────────────────────────────────────────
/**
 * Divide una ComandaData en múltiples comandas agrupadas por estación.
 * Útil para preview en browser (el Print Agent hace esto automáticamente
 * usando station_name del payload backend).
 *
 * - Ítems sin stationId → grupo 'GENERAL' (sin etiqueta de estación)
 * - stationRoutingAvailable=false → una sola comanda con todos los ítems
 */
export function generateStationComandas(
  data: ComandaData,
  cfg: PrintSettings,
  stations: KitchenStation[],
): Array<{ stationName: string; html: string }> {
  // Verificar si algún ítem tiene stationId
  const hasStations = data.items.some(i => i.stationId);
  if (!hasStations || stations.length === 0) {
    // Fallback: una sola comanda sin split
    return [{ stationName: 'GENERAL', html: generateComandaHtml(data, cfg) }];
  }

  // Agrupar ítems por stationId
  const groups = new Map<string, { stationName: string; items: ComandaItem[] }>();

  for (const item of data.items) {
    const key  = item.stationId ?? 'GENERAL';
    const name = item.stationName
      ?? stations.find(s => s.id === item.stationId)?.name
      ?? 'GENERAL';
    if (!groups.has(key)) {
      groups.set(key, { stationName: name, items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  const result: Array<{ stationName: string; html: string }> = [];
  for (const [, group] of groups) {
    const groupData: ComandaData = { ...data, items: group.items };
    result.push({
      stationName: group.stationName,
      html: generateComandaHtml(
        groupData,
        cfg,
        group.stationName === 'GENERAL' ? undefined : group.stationName,
      ),
    });
  }
  return result;
}

// ─── openPrintWindow ──────────────────────────────────────────────────────────
/**
 * Abre el HTML en una ventana nueva, dispara window.print() y la cierra.
 */
export function openPrintWindow(html: string, preview = false): void {
  const win = window.open('', '_blank', 'width=380,height=650');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  if (!preview) {
    win.print();
    win.close();
  }
}
