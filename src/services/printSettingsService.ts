import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrintSize   = 'NORMAL' | 'SMALL' | 'LARGE';
export type PrintHeight = 'SIMPLE' | 'DOUBLE';
export type PrintWidth  = 'SIMPLE' | 'DOUBLE';
export type IdMode      = 'NONE' | 'FULL' | 'LAST_DIGITS';

export interface PrintSettings {
  // Control de Mesa
  cmHeaderSize:     PrintSize;
  cmHeaderHeight:   PrintHeight;
  cmHeaderWidth:    PrintWidth;
  cmBodySize:       PrintSize;
  cmBodyHeight:     PrintHeight;
  cmBodyWidth:      PrintWidth;
  cmFooterSize:     PrintSize;
  cmFooterHeight:   PrintHeight;
  cmFooterWidth:    PrintWidth;
  cmPrintOnClose:   boolean;
  cmPrintModifiers: boolean;
  cmMaxChars:       number;
  cmShowCurrency:   boolean;
  cmIdMode:         IdMode;
  cmIdDigits:       number;
  cmHeaderText:     string;
  cmFooterText:     string;
  // Comandas
  kdHeaderSize:     PrintSize;
  kdHeaderHeight:   PrintHeight;
  kdHeaderWidth:    PrintWidth;
  kdBodySize:       PrintSize;
  kdBodyHeight:     PrintHeight;
  kdBodyWidth:      PrintWidth;
  kdFooterSize:     PrintSize;
  kdFooterHeight:   PrintHeight;
  kdFooterWidth:    PrintWidth;
  kdHeaderText:     string;
  kdFooterText:     string;
  kdPrintCancel:    boolean;
}

export const PRINT_SETTINGS_DEFAULTS: PrintSettings = {
  cmHeaderSize:     'NORMAL',
  cmHeaderHeight:   'DOUBLE',
  cmHeaderWidth:    'DOUBLE',
  cmBodySize:       'NORMAL',
  cmBodyHeight:     'SIMPLE',
  cmBodyWidth:      'SIMPLE',
  cmFooterSize:     'NORMAL',
  cmFooterHeight:   'DOUBLE',
  cmFooterWidth:    'SIMPLE',
  cmPrintOnClose:   false,
  cmPrintModifiers: false,
  cmMaxChars:       29,
  cmShowCurrency:   true,
  cmIdMode:         'LAST_DIGITS',
  cmIdDigits:       4,
  cmHeaderText:     '',
  cmFooterText:     '',
  kdHeaderSize:     'NORMAL',
  kdHeaderHeight:   'SIMPLE',
  kdHeaderWidth:    'SIMPLE',
  kdBodySize:       'SMALL',
  kdBodyHeight:     'DOUBLE',
  kdBodyWidth:      'DOUBLE',
  kdFooterSize:     'NORMAL',
  kdFooterHeight:   'SIMPLE',
  kdFooterWidth:    'SIMPLE',
  kdHeaderText:     '',
  kdFooterText:     '',
  kdPrintCancel:    false,
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const printSettingsService = {
  async get(): Promise<PrintSettings> {
    try {
      // api.get ya desenvuelve la respuesta del servidor: handleResponse devuelve
      // directamente data.data (el objeto settings), no el envelope {success, data}.
      const { data } = await api.get<PrintSettings>('/settings/print');
      return { ...PRINT_SETTINGS_DEFAULTS, ...data };
    } catch {
      return PRINT_SETTINGS_DEFAULTS;
    }
  },

  async update(patch: Partial<PrintSettings>): Promise<PrintSettings> {
    const { data } = await api.patch<PrintSettings>('/settings/print', patch);
    return { ...PRINT_SETTINGS_DEFAULTS, ...data };
  },
};

// ─── Helpers para generar HTML ─────────────────────────────────────────────

const SIZE_MAP: Record<PrintSize, string> = {
  SMALL:  '10px',
  NORMAL: '12px',
  LARGE:  '14px',
};

export function buildPrintStyle(cfg: PrintSettings, zone: 'cm' | 'kd', section: 'Header' | 'Body' | 'Footer'): string {
  const prefix = zone === 'cm' ? 'cm' : 'kd';
  const size   = cfg[`${prefix}${section}Size`   as keyof PrintSettings] as PrintSize;
  const height = cfg[`${prefix}${section}Height` as keyof PrintSettings] as PrintHeight;
  const width  = cfg[`${prefix}${section}Width`  as keyof PrintSettings] as PrintWidth;

  return [
    `font-size:${SIZE_MAP[size]}`,
    `transform:scaleY(${height === 'DOUBLE' ? 2 : 1}) scaleX(${width === 'DOUBLE' ? 2 : 1})`,
    height === 'DOUBLE' || width === 'DOUBLE' ? 'display:inline-block;transform-origin:left top;' : '',
  ].filter(Boolean).join(';');
}

export function truncateName(name: string, cfg: PrintSettings): string {
  return name.length > cfg.cmMaxChars ? name.slice(0, cfg.cmMaxChars) : name;
}

export function fmtCurrency(n: number, cfg: PrintSettings): string {
  const formatted = n.toLocaleString('es-CL');
  return cfg.cmShowCurrency ? `$${formatted}` : formatted;
}

export function printId(id: string, cfg: PrintSettings): string {
  if (cfg.cmIdMode === 'NONE')        return '';
  if (cfg.cmIdMode === 'FULL')        return id;
  return id.slice(-(cfg.cmIdDigits));
}
