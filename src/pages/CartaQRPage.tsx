// ═══════════════════════════════════════════════════════════════
// CARTA QR PAGE — gestión admin de la carta digital
// Tabs: Código QR / Vista previa / Instrucciones / Horarios
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import api from '../services/api';
import {
  ExternalLink, Download, Copy, Check,
  Smartphone, Eye, QrCode, Loader2,
  Share2, Printer, LayoutGrid, Clock, Save, X,
  Palette, BarChart2, Smartphone as SmartphoneIcon, Monitor, Tablet,
  ShoppingBag, CheckCircle, XCircle, RefreshCw, Phone, MapPin, Upload,
} from 'lucide-react';

type ActiveTab = 'qr' | 'preview' | 'instrucciones' | 'horarios' | 'personalizar' | 'analiticas' | 'pedidos' | 'mesas';

function fmtCLP(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString('es-CL', { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ── Presets de color para la carta ──────────────────────────────
const THEME_COLOR_PRESETS = [
  { label: 'Naranja',  color: '#f97316' },
  { label: 'Rojo',    color: '#ef4444' },
  { label: 'Rosa',    color: '#ec4899' },
  { label: 'Violeta', color: '#8b5cf6' },
  { label: 'Azul',    color: '#3b82f6' },
  { label: 'Verde',   color: '#22c55e' },
  { label: 'Teal',    color: '#14b8a6' },
  { label: 'Ámbar',   color: '#f59e0b' },
] as const;

// ── Presets de color ─────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: 'Clásico',  fg: '#000000', bg: '#ffffff' },
  { label: 'Naranja',  fg: '#ea580c', bg: '#fff7ed' },
  { label: 'Verde',    fg: '#16a34a', bg: '#f0fdf4' },
  { label: 'Azul',     fg: '#2563eb', bg: '#eff6ff' },
  { label: 'Violeta',  fg: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Oscuro',   fg: '#f97316', bg: '#111827' },
] as const;

// ── Horarios config ───────────────────────────────────────────────
const DAYS = [
  { key: 'monday',    label: 'Lunes'     },
  { key: 'tuesday',   label: 'Martes'    },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves'    },
  { key: 'friday',    label: 'Viernes'   },
  { key: 'saturday',  label: 'Sábado'    },
  { key: 'sunday',    label: 'Domingo'   },
];

const DEFAULT_HOURS: Record<string, { enabled: boolean; open: string; close: string }> = {
  monday:    { enabled: true,  open: '12:00', close: '22:00' },
  tuesday:   { enabled: true,  open: '12:00', close: '22:00' },
  wednesday: { enabled: true,  open: '12:00', close: '22:00' },
  thursday:  { enabled: true,  open: '12:00', close: '22:00' },
  friday:    { enabled: true,  open: '12:00', close: '23:00' },
  saturday:  { enabled: true,  open: '12:00', close: '23:00' },
  sunday:    { enabled: false, open: '12:00', close: '20:00' },
};

export default function CartaQRPage() {
  const [activeTab,     setActiveTab]     = useState<ActiveTab>('qr');
  const [qrDataUrl,     setQrDataUrl]     = useState('');
  const [qrLoading,     setQrLoading]     = useState(true);
  const [copied,        setCopied]        = useState(false);
  const [qrFgColor,     setQrFgColor]     = useState('#000000');
  const [qrBgColor,     setQrBgColor]     = useState('#ffffff');
  const [selectedTable, setSelectedTable] = useState('');
  const [tables,        setTables]        = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [businessHours,   setBusinessHours]   = useState(DEFAULT_HOURS);
  const [savingHours,     setSavingHours]     = useState(false);
  const [hoursSaved,      setHoursSaved]      = useState(false);

  // ── Estado: Personalizar ─────────────────────────────────────
  const [cartaLogo,       setCartaLogo]       = useState('');
  const [cartaBanner,     setCartaBanner]     = useState('');
  const [cartaTheme,      setCartaTheme]      = useState('#f97316');
  const [cartaTagline,    setCartaTagline]    = useState('');
  const [cartaSlug,       setCartaSlug]       = useState('');
  const [slugEdit,        setSlugEdit]        = useState('');
  const [slugEditMode,    setSlugEditMode]    = useState(false);
  const [savingSlug,      setSavingSlug]      = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [savingPersonal,  setSavingPersonal]  = useState(false);
  const [savedPersonal,   setSavedPersonal]   = useState(false);
  const [restaurantName,  setRestaurantName]  = useState('');
  const [uploadingLogo,   setUploadingLogo]   = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // ── Estado: Contacto (carta pública) ──────────────────────
  const [cartaAddress, setCartaAddress] = useState('');
  const [cartaPhone,   setCartaPhone]   = useState('');
  const [cartaEmail,   setCartaEmail]   = useState('');

  // ── Estado: Analíticas ───────────────────────────────────────
  const [analytics,       setAnalytics]       = useState<any>(null);
  const [loadingAnalytics,setLoadingAnalytics]= useState(false);

  // ── Estado: Pedidos QR ───────────────────────────────────────
  const [qrOrders,        setQrOrders]        = useState<any[]>([]);
  const [loadingOrders,   setLoadingOrders]   = useState(false);
  const [ordersFilter,    setOrdersFilter]    = useState<string>('ALL');
  const [mesaQrUrls,      setMesaQrUrls]      = useState<Record<string, string>>({});
  const [loadingMesaQrs,  setLoadingMesaQrs]  = useState(false);

  // Cargar settings de carta al montar
  useEffect(() => {
    api.get('/menu/carta-settings')
      .then(res => {
        // handleResponse ya desenvuelve data.data, así que res.data = el payload directo
        // Pero por seguridad usamos: res.data?.data ?? res.data
        const s = res.data?.data ?? res.data ?? {};
        if (s.cartaLogo)      setCartaLogo(s.cartaLogo);
        if (s.cartaBannerUrl) setCartaBanner(s.cartaBannerUrl);
        if (s.cartaThemeColor)setCartaTheme(s.cartaThemeColor);
        if (s.cartaTagline)   setCartaTagline(s.cartaTagline);
        if (s.restaurantName) setRestaurantName(s.restaurantName);
        setHideUnavailable(s.hideUnavailableProducts ?? false);
        if (s.cartaAddress !== undefined) setCartaAddress(s.cartaAddress ?? '');
        if (s.cartaPhone  !== undefined) setCartaPhone(s.cartaPhone ?? '');
        if (s.cartaEmail  !== undefined) setCartaEmail(s.cartaEmail ?? '');

        const name = s.restaurantName ?? '';
        if (s.cartaSlug) {
          setCartaSlug(s.cartaSlug);
          setSlugEdit(s.cartaSlug);
        } else if (name) {
          // Auto-generar slug del nombre del restaurante
          const derived = name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          if (derived) {
            setCartaSlug(derived);
            setSlugEdit(derived);
            api.patch('/menu/carta-settings', { cartaSlug: derived }).catch(() => {});
          }
        }
      })
      .catch(() => { /* silencioso */ });
  }, []);

  // Cargar analíticas cuando se activa esa tab
  useEffect(() => {
    if (activeTab !== 'analiticas') return;
    setLoadingAnalytics(true);
    api.get('/menu/carta-analytics')
      .then(res => setAnalytics(res.data.data ?? {}))
      .catch(() => setAnalytics(null))
      .finally(() => setLoadingAnalytics(false));
  }, [activeTab]);

  // ── Subir logo vía archivo ─────────────────────────────────────────────────
  const handleLogoUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const token   = localStorage.getItem('bullweb_token') ?? '';
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4200/api';
      const resp    = await fetch(`${baseUrl}/menu/upload-logo`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await resp.json();
      if (data.url) setCartaLogo(data.url);
    } catch { /* silencioso */ }
    finally { setUploadingLogo(false); }
  };

  // ── Subir banner vía archivo ───────────────────────────────────────────────
  const handleBannerUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('banner', file);
      const token   = localStorage.getItem('bullweb_token') ?? '';
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4200/api';
      const resp    = await fetch(`${baseUrl}/menu/upload-banner`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await resp.json();
      if (data.url) setCartaBanner(data.url);
    } catch { /* silencioso */ }
    finally { setUploadingBanner(false); }
  };

  const handleSaveSlug = async () => {
    const raw = slugEdit.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!raw) return;
    setSavingSlug(true);
    try {
      await api.patch('/menu/carta-settings', { cartaSlug: raw });
      setCartaSlug(raw);
      setSlugEdit(raw);
      setSlugEditMode(false);
    } catch { /* silencioso */ }
    finally { setSavingSlug(false); }
  };

  const handleSavePersonal = async () => {
    setSavingPersonal(true);
    try {
      await api.patch('/menu/carta-settings', {
        cartaLogo:               cartaLogo   || null,
        cartaBannerUrl:          cartaBanner || null,
        cartaThemeColor:         cartaTheme,
        cartaTagline:            cartaTagline || null,
        hideUnavailableProducts: hideUnavailable,
        cartaAddress:            cartaAddress || null,
        cartaPhone:              cartaPhone   || null,
        cartaEmail:              cartaEmail   || null,
      });
      setSavedPersonal(true);
      setTimeout(() => setSavedPersonal(false), 2500);
    } catch {
      // silencioso
    } finally {
      setSavingPersonal(false);
    }
  };

  // URL dinámica según slug + mesa seleccionada
  const baseCartaUrl = cartaSlug
    ? `${window.location.origin}/carta/${cartaSlug}`
    : `${window.location.origin}/carta`;
  const cartaUrl = selectedTable
    ? `${baseCartaUrl}?mesa=${selectedTable}`
    : baseCartaUrl;

  const whatsappMessage = encodeURIComponent(
    `🍽️ *${restaurantName || 'Nuestra Carta Digital'}*\n\n` +
    `Te invito a ver nuestra carta:\n` +
    `${baseCartaUrl}\n\n` +
    `Podés ver el menú completo y hacer tu pedido desde el celular 📱`
  );

  // Cargar pedidos QR cuando se activa esa tab
  const loadQrOrders = () => {
    setLoadingOrders(true);
    const params = ordersFilter !== 'ALL' ? `?status=${ordersFilter}` : '';
    api.get(`/qr-orders${params}`)
      .then(res => setQrOrders(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => {
    if (activeTab !== 'pedidos') return;
    loadQrOrders();
  }, [activeTab, ordersFilter]);

  // Cargar mesas al montar
  useEffect(() => {
    api.get('/tables')
      .then(res => {
        const t: any[] = res.data?.data?.tables ?? res.data?.tables ?? [];
        setTables(t
          .filter((tb: any) => !tb.deletedAt)
          .sort((a: any, b: any) => {
            const na = parseInt(a.number) || 0;
            const nb = parseInt(b.number) || 0;
            return na - nb;
          })
        );
      })
      .catch(() => { /* silencioso */ })
      .finally(() => setLoadingTables(false));
  }, []);

  // Cargar horarios existentes al montar
  useEffect(() => {
    if (!cartaSlug) return;
    api.get(`/public/hours?slug=${cartaSlug}`)
      .then(res => {
        if (res.data.data?.hours) setBusinessHours(res.data.data.hours);
      })
      .catch(() => { /* usar defaults */ });
  }, [cartaSlug]);

  // Generar QR al montar y al cambiar colores/mesa
  useEffect(() => {
    setQrLoading(true);
    QRCode.toDataURL(cartaUrl, {
      width:                512,
      margin:               2,
      errorCorrectionLevel: 'H',
      color: { dark: qrFgColor, light: qrBgColor },
    })
      .then(url => { setQrDataUrl(url); setQrLoading(false); })
      .catch(() => setQrLoading(false));
  }, [cartaUrl, qrFgColor, qrBgColor]);

  // Generar QRs de mesas cuando se activa el tab
  useEffect(() => {
    if (activeTab !== 'mesas' || tables.length === 0 || !cartaSlug) return;
    setLoadingMesaQrs(true);
    Promise.all(
      tables.map(table =>
        QRCode.toDataURL(`https://app.bullwebchile.com/mesa/${cartaSlug}?mesa=${table.number}`, {
          width: 512, margin: 2, errorCorrectionLevel: 'H',
          color: { dark: '#1f2937', light: '#ffffff' },
        }).then(url => ({ number: String(table.number), url }))
      )
    ).then(results => {
      const map: Record<string, string> = {};
      results.forEach(r => { map[r.number] = r.url; });
      setMesaQrUrls(map);
    }).catch(() => {}).finally(() => setLoadingMesaQrs(false));
  }, [activeTab, tables, cartaSlug]);

  // ── Copiar URL ───────────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(cartaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Descargar PNG ────────────────────────────────────────────
  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const a    = document.createElement('a');
    a.href     = qrDataUrl;
    a.download = 'carta-qr.png';
    a.click();
  };

  // ── Descargar SVG (generar aparte) ───────────────────────────
  const handleDownloadSVG = async () => {
    try {
      const svgStr = await QRCode.toString(cartaUrl, {
        type:                 'svg',
        errorCorrectionLevel: 'H',
        margin:               2,
        color: { dark: qrFgColor, light: qrBgColor },
      });
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'carta-qr.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silencioso */ }
  };

  // ── Compartir con Web Share API (si está disponible) ─────────
  const handleShare = async () => {
    if (!('share' in navigator)) return;
    await (navigator as any).share({
      title: 'Carta Digital',
      text:  'Escanea o accede a nuestra carta digital',
      url:   cartaUrl,
    });
  };

  // ── Imprimir QR ───────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Carta QR</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column;
               align-items: center; justify-content: center;
               min-height: 100vh; font-family: sans-serif; }
        img  { width: 280px; height: 280px; }
        p    { margin-top: 12px; font-size: 13px; color: #6b7280; }
      </style></head>
      <body>
        <img src="${qrDataUrl}" alt="QR Carta Digital" />
        <p>${cartaUrl}</p>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  // ── Imprimir hoja A4 con 4 tarjetas ──────────────────────────
  const handlePrintTemplate = async () => {
    if (!qrDataUrl) return;
    // Generar también SVG para máxima calidad en la plantilla
    let svgDataUrl = qrDataUrl;
    try {
      const svgStr = await QRCode.toString(cartaUrl, {
        type: 'svg', errorCorrectionLevel: 'H', margin: 2,
        color: { dark: qrFgColor, light: qrBgColor },
      });
      svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
    } catch { /* usar PNG como fallback */ }

    const win = window.open('', '_blank');
    if (!win) return;
    const card = `
      <div class="card">
        <img src="${svgDataUrl}" alt="QR Carta Digital" />
        <div class="card-title">Carta Digital</div>
        <div class="card-url">${cartaUrl}</div>
        <div class="card-hint">Escanea para ver el menú</div>
      </div>`;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Carta QR — 4 tarjetas A4</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', sans-serif;
               background: #fff; }
        .grid { display: grid; grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr; gap: 10mm;
                width: 100%; height: calc(297mm - 30mm); }
        .card { border: 2px solid #e5e7eb; border-radius: 12px;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                gap: 8px; padding: 12mm; }
        .card img { width: 140px; height: 140px; }
        .card-title { font-size: 18px; font-weight: 800;
                      color: #111827; letter-spacing: -0.3px; }
        .card-url   { font-size: 9px; color: #6b7280;
                      font-family: monospace; text-align: center; }
        .card-hint  { font-size: 10px; color: #9ca3af; }
      </style></head>
      <body>
        <div class="grid">
          ${card}${card}${card}${card}
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  // ── Imprimir QR para todas las mesas ────────────────────────
  const handlePrintAllTables = async () => {
    if (tables.length === 0) return;
    const origin = window.location.origin;
    try {
      const results = await Promise.all(
        tables.map(table =>
          QRCode.toString(
            `${origin}/carta?mesa=${table.number}`,
            { type: 'svg', errorCorrectionLevel: 'H', margin: 1,
              color: { dark: qrFgColor, light: qrBgColor } }
          ).then(svg => ({ table, svg }))
        )
      );
      const win = window.open('', '_blank');
      if (!win) return;
      const cards = results.map(({ table, svg }) => `
        <div class="card">
          <div class="qr">${svg}</div>
          <p class="mesa-num">Mesa ${table.number}</p>
          ${table.sections?.name ? `<p class="section">${table.sections.name}</p>` : ''}
          <p class="scan-text">📱 Escanea para ver el menú</p>
        </div>`).join('');
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>QR por Mesa</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: white; }
          .page { width: 210mm; padding: 8mm; display: grid;
                  grid-template-columns: repeat(3, 1fr); gap: 6mm; }
          .card { border: 1.5px dashed #e5e7eb; border-radius: 6mm; padding: 5mm;
                  display: flex; flex-direction: column; align-items: center;
                  gap: 2mm; text-align: center; }
          .qr svg { width: 38mm; height: 38mm; }
          .mesa-num { font-size: 14pt; font-weight: 800; color: #1f2937; }
          .section  { font-size: 8pt; color: #6b7280; }
          .scan-text{ font-size: 7pt; color: #9ca3af; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style></head><body>
        <div class="page">${cards}</div>
        <script>window.onload = () => window.print();</script>
      </body></html>`);
      win.document.close();
    } catch { /* silencioso */ }
  };

  // ── Guardar horarios ─────────────────────────────────────────
  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      await api.patch('/menu/restaurant-hours', { businessHours });
      setHoursSaved(true);
      setTimeout(() => setHoursSaved(false), 2500);
    } catch {
      // silencioso — el usuario puede reintentar
    } finally {
      setSavingHours(false);
    }
  };

  // ── Descargar QR de una mesa ──────────────────────────────────
  const downloadMesaQr = (tableNumber: string) => {
    const url = mesaQrUrls[tableNumber];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-Mesa-${tableNumber}.png`;
    a.click();
  };

  // ── Imprimir QR de una mesa ───────────────────────────────────
  const printMesaQr = (tableNumber: string) => {
    const url = mesaQrUrls[tableNumber];
    if (!url) return;
    const theme = cartaTheme || '#f97316';
    const name = restaurantName || 'Restaurante';
    const cardHtml = buildQrCardHtml(tableNumber, url, theme, name);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Mesa ${tableNumber}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; }
      body { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; }
      @media print { body { background: white; } @page { margin: 10mm; } }</style></head>
      <body>${cardHtml}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  // ── Generar HTML de card QR para impresión ─────────────────────
  const buildQrCardHtml = (tableNumber: string, qrImgSrc: string, theme: string, restName: string) => {
    const logoHtml = cartaLogo ? `<img src="${cartaLogo}" style="height:32px;width:32px;border-radius:50%;border:2px solid rgba(255,255,255,0.5);object-fit:cover;" />` : '';
    return `<div class="card">
      <div style="width:100%;background:${theme};padding:10px 16px;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px;">
        ${logoHtml}
        <h2 style="margin:0;color:white;font-size:16px;font-weight:800;letter-spacing:0.5px;">${restName}</h2>
      </div>
      <div style="padding:12px 0 8px 0;text-align:center;">
        <span style="font-size:28px;font-weight:900;color:${theme};">Mesa ${tableNumber}</span>
      </div>
      <div style="padding:0 16px;">
        <img src="${qrImgSrc}" style="width:180px;height:180px;" />
      </div>
      <div style="padding:10px 16px;text-align:center;flex:1;display:flex;align-items:center;justify-content:center;">
        <p style="margin:0;font-size:13px;color:${theme};font-weight:600;">🔔 Escanea para llamar al mesero</p>
      </div>
      <div style="width:100%;padding:8px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;gap:6px;">
        <span style="font-size:10px;color:#9ca3af;">Powered by</span>
        <img src="https://app.bullwebchile.com/logo-bullweb.png" style="height:16px;object-fit:contain;" />
      </div>
    </div>`;
  };

  // ── Imprimir todos los QRs de mesa ────────────────────────────
  const handlePrintAllMesaQrs = async () => {
    if (tables.length === 0 || !cartaSlug) return;
    const theme = cartaTheme || '#f97316';
    const name = restaurantName || 'Restaurante';
    try {
      const results = await Promise.all(
        tables.map(table =>
          QRCode.toDataURL(
            `https://app.bullwebchile.com/mesa/${cartaSlug}?mesa=${table.number}`,
            { width: 512, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#1f2937', light: '#ffffff' } }
          ).then(url => ({ table, url }))
        )
      );
      const cards = results.map(({ table, url }) =>
        buildQrCardHtml(String(table.number), url, theme, name)
      ).join('');
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>QR Mesas — Servicio de Mesa</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: white; }
          .grid { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 12px; }
          .card {
            width: calc(33.33% - 8px);
            min-width: 240px;
            border: 2px solid #e5e7eb;
            border-radius: 16px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            page-break-inside: avoid;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            background: white;
          }
          .card-header { width: 100%; padding: 10px 16px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px; }
          .card-mesa { padding: 12px 0 8px 0; text-align: center; }
          .card-qr { padding: 0 16px; }
          .card-leyend { padding: 10px 16px; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; }
          .card-footer { width: 100%; padding: 8px; text-align: center; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; gap: 6px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style></head><body>
        <div class="grid">${cards}</div>
        <script>window.onload = () => window.print();</script>
      </body></html>`);
      win.document.close();
    } catch { /* silencioso */ }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
          <QrCode className="w-7 h-7 text-orange-500" />
          Carta Digital QR
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Genera y gestiona el QR que tus clientes escanean para ver la carta
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {([
          { id: 'qr',            icon: QrCode,     label: 'Código QR'     },
          { id: 'preview',       icon: Eye,         label: 'Vista previa'  },
          { id: 'instrucciones', icon: Smartphone,  label: 'Instrucciones' },
          { id: 'horarios',      icon: Clock,       label: 'Horarios'      },          { id: 'personalizar',  icon: Palette,     label: 'Personalizar'  },
          { id: 'analiticas',    icon: BarChart2,   label: 'Analíticas'    },
          { id: 'pedidos',      icon: ShoppingBag, label: 'Pedidos'       },
          { id: 'mesas',        icon: LayoutGrid,  label: 'QR Mesas'     },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2
                px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-white shadow text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB: CÓDIGO QR ─────────────────────────────────────── */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* QR generado */}
          <div className="bg-white rounded-2xl border border-gray-100
                          shadow-sm p-6 flex flex-col items-center gap-4">

            {/* Selector de mesa */}
            <div className="w-full bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Mesa específica (opcional)
              </p>
              <div className="flex gap-2 items-center">
                <select
                  value={selectedTable}
                  onChange={e => setSelectedTable(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2
                             text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">🌐 QR general (todas las mesas)</option>
                  {loadingTables ? (
                    <option disabled>Cargando mesas...</option>
                  ) : (
                    tables.map(table => (
                      <option key={table.id} value={table.number}>
                        Mesa {table.number}
                        {table.sections?.name ? ` — ${table.sections.name}` : ''}
                      </option>
                    ))
                  )}
                </select>
                {selectedTable && (
                  <button
                    onClick={() => setSelectedTable('')}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {selectedTable && (
                <p className="text-xs text-orange-600 mt-2">
                  📍 QR exclusivo para Mesa {selectedTable}
                </p>
              )}
            </div>

            {qrLoading ? (
              <div className="w-[220px] h-[220px] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
              </div>
            ) : qrDataUrl ? (
              <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-inner">
                <img
                  src={qrDataUrl}
                  alt="QR Carta Digital"
                  className="w-[220px] h-[220px] rounded-xl"
                />
              </div>
            ) : (
              <p className="text-sm text-red-500">Error al generar el QR</p>
            )}
            <p className="text-xs text-gray-400 text-center">
              Corrección de error: Alto (H) — resiste hasta 30% de daño
            </p>
          </div>

          {/* Acciones */}
          <div className="space-y-4">

            {/* URL + editar slug */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                URL de la carta
              </p>
              {/* URL actual */}
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white border border-gray-200
                                 rounded-lg px-3 py-2 text-gray-700 truncate">
                  {cartaUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 p-2 rounded-lg border-2 transition-all
                    ${copied
                      ? 'border-green-400 bg-green-50 text-green-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-500'
                    }`}
                  title="Copiar URL"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {/* URL corta — solo lectura */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-gray-400">URL corta</p>
                  <span className="text-xs text-gray-400 italic">solo lectura</span>
                </div>
                  <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-2 cursor-not-allowed">
                    <span className="text-xs text-gray-400 shrink-0">/carta/</span>
                    <span className="flex-1 text-sm text-gray-600 font-mono truncate">
                      {cartaSlug || <span className="text-gray-400 italic">sin configurar</span>}
                    </span>
                    <button
                      onClick={handleCopy}
                      title="Copiar URL completa"
                      className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      {copied
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
              </div>
            </div>

            {/* Colores del QR */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Color del QR
              </p>
              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-3">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setQrFgColor(preset.fg); setQrBgColor(preset.bg); }}
                    title={preset.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      border-2 text-xs font-medium transition-all
                      ${qrFgColor === preset.fg && qrBgColor === preset.bg
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-gray-300 shrink-0"
                      style={{ background: preset.fg }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
              {/* Pickers manuales */}
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="color"
                    value={qrFgColor}
                    onChange={e => setQrFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    title="Color del QR (primer plano)"
                  />
                  <span className="text-xs text-gray-500">Primer plano</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="color"
                    value={qrBgColor}
                    onChange={e => setQrBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    title="Color de fondo del QR"
                  />
                  <span className="text-xs text-gray-500">Fondo</span>
                </label>
              </div>
              {qrFgColor === qrBgColor && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                  ⚠️ El color de primer plano y fondo son iguales — el QR no será legible.
                </p>
              )}
            </div>

            {/* Descargar */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Descargar QR
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPNG}
                  disabled={!qrDataUrl}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40
                             text-white font-medium rounded-xl text-sm
                             flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  PNG
                </button>
                <button
                  onClick={handleDownloadSVG}
                  className="flex-1 py-3 border-2 border-gray-200 hover:border-gray-300
                             text-gray-600 font-medium rounded-xl text-sm
                             flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  SVG
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!qrDataUrl}
                  className="flex-1 py-3 border-2 border-gray-200 hover:border-gray-300
                             disabled:opacity-40 text-gray-600 font-medium rounded-xl
                             text-sm flex items-center justify-center gap-2 transition-colors"
                  title="Imprimir QR"
                >
                  <Printer className="w-4 h-4" />
                  1 QR
                </button>
              </div>
              {/* Botón hoja A4 */}
              <button
                onClick={handlePrintTemplate}
                disabled={!qrDataUrl}
                className="mt-2 w-full py-3 border-2 border-orange-200 hover:border-orange-300
                           hover:bg-orange-50 disabled:opacity-40 text-orange-600 font-medium
                           rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Imprimir hoja A4 (4 tarjetas)
              </button>
              {/* Botón imprimir todos los QR de mesas */}
              {tables.length > 0 && (
                <button
                  onClick={handlePrintAllTables}
                  className="mt-2 w-full py-3 border-2 border-dashed border-gray-300
                             hover:border-orange-300 text-gray-500 hover:text-orange-600
                             font-medium rounded-xl text-sm flex items-center justify-center
                             gap-2 transition-colors"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Imprimir QR de todas las mesas ({tables.length})
                </button>
              )}
            </div>

            {/* Acciones extra */}
            <div className="flex gap-3 flex-wrap">
              {/* Ver como cliente */}
              <a
                href={cartaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3
                           border-2 border-orange-200 text-orange-600 font-medium
                           rounded-xl text-sm hover:bg-orange-50 transition-colors
                           min-w-[120px]"
              >
                <ExternalLink className="w-4 h-4" />
                Ver carta
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4
                           bg-green-600 hover:bg-green-500
                           text-white font-medium rounded-xl text-sm transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>

              {/* Compartir (si está disponible la Web Share API) */}
              {'share' in navigator && (
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 px-4
                             border-2 border-gray-200 text-gray-600 font-medium
                             rounded-xl text-sm hover:border-gray-300 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
              )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">
                💡 ¿Cómo usarlo?
              </p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Descarga el PNG e imprímelo en cada mesa</li>
                <li>• Usa "4 tarjetas A4" para imprimir y recortar</li>
                <li>• El cliente escanea → ve el menú completo</li>
                <li>• El menú se actualiza automáticamente</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: VISTA PREVIA ──────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Barra tipo browser */}
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-gray-500 font-mono ml-2 hidden sm:block">
                {cartaUrl}
              </span>
            </div>
            <a
              href={cartaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-orange-500 hover:underline flex items-center gap-1"
            >
              Abrir <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* iframe */}
          <iframe
            src={cartaUrl}
            className="w-full border-0"
            style={{ height: '70vh' }}
            title="Vista previa Carta Digital"
          />
        </div>
      )}

      {/* ─── TAB: INSTRUCCIONES ─────────────────────────────────── */}
      {activeTab === 'instrucciones' && (
        <div className="space-y-4">
          {([
            {
              step:  '1',
              icon:  '📥',
              title: 'Descarga el QR',
              desc:  'Ve a la pestaña "Código QR" y descarga el archivo PNG (recomendado para impresión) o SVG (vectorial para diseño).',
            },
            {
              step:  '2',
              icon:  '🖨️',
              title: 'Imprímelo en cada mesa',
              desc:  'Puedes imprimirlo en papel normal, plastificarlo, o grabarlo en acrílico para mayor durabilidad.',
            },
            {
              step:  '3',
              icon:  '🧾',
              title: 'O configúralo en la impresora térmica',
              desc:  `Ve a Configuración → Impresoras → Plantillas de Ticket → activa "Imprimir QR" y selecciona "Personalizado" con URL: ${cartaUrl}`,
            },
            {
              step:  '4',
              icon:  '✅',
              title: 'El menú se actualiza solo',
              desc:  'Cualquier cambio que hagas en el módulo Menú se refleja automáticamente en la carta digital. No hay que reimprimir el QR.',
            },
          ]).map(item => (
            <div key={item.step}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5
                         flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center
                              justify-center flex-shrink-0 text-xl">
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-orange-500 bg-orange-50
                                   px-2 py-0.5 rounded-full">
                    Paso {item.step}
                  </span>
                  <h3 className="font-semibold text-gray-800 text-sm">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB: HORARIOS ─────────────────────────────────────── */}
      {activeTab === 'horarios' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-2">
            Configura los horarios de atención. El cliente verá un banner en la carta cuando el local esté cerrado.
          </p>

          {DAYS.map(day => {
            const hours = businessHours[day.key as keyof typeof businessHours];
            return (
              <div key={day.key}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800 text-sm">{day.label}</span>
                  <button
                    onClick={() => {
                      const next = { ...hours, enabled: !hours.enabled };
                      setBusinessHours(prev => ({ ...prev, [day.key]: next }));
                    }}
                    className={`relative inline-flex w-12 h-6 rounded-full transition-colors ${hours.enabled ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${hours.enabled ? 'translate-x-7' : 'translate-x-1'}`}
                    />
                  </button>
                </div>

                {hours.enabled ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Apertura</label>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={e => { const v = e.target.value; setBusinessHours(p => ({ ...p, [day.key]: { ...hours, open: v } })); }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    <span className="text-gray-400 pt-5">→</span>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Cierre</label>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={e => { const v = e.target.value; setBusinessHours(p => ({ ...p, [day.key]: { ...hours, close: v } })); }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">🔴 Cerrado este día</p>
                )}
              </div>
            );
          })}

          <button
            onClick={handleSaveHours}
            disabled={savingHours}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold
                       rounded-2xl flex items-center justify-center gap-2
                       disabled:opacity-50 transition-colors mt-2"
          >
            {savingHours ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : hoursSaved ? (
              <><Check className="w-4 h-4" /> ¡Guardado!</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar horarios</>
            )}
          </button>
        </div>
      )}

      {/* ─── TAB: PERSONALIZAR ──────────────────────────────────── */}
      {activeTab === 'personalizar' && (
        <div className="space-y-5 max-w-xl">
          <p className="text-sm text-gray-500">
            Personaliza el aspecto de tu carta digital: logo, banner, color y eslogan.
          </p>

          {/* Logo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Logo del restaurante</label>
            <p className="text-xs text-gray-400 mb-3">Sube una imagen o pega la URL. Aparece en el header de la carta.</p>
            {/* Botón subir archivo */}
            <label className={`flex items-center justify-center gap-2 w-full py-3 mb-3
                              border-2 border-dashed rounded-xl cursor-pointer text-sm font-medium transition-colors
                              ${uploadingLogo
                                ? 'border-orange-200 bg-orange-50 text-orange-400 cursor-not-allowed'
                                : 'border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 text-orange-600'
                              }`}>
              {uploadingLogo
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                : <><Upload className="w-4 h-4" /> Subir imagen desde equipo</>}
              <input type="file" accept="image/*" className="hidden"
                     onChange={handleLogoUpload} disabled={uploadingLogo} />
            </label>
            <p className="text-xs text-gray-400 mb-2 text-center">— o pega una URL directamente —</p>
            <input
              type="url"
              value={cartaLogo}
              onChange={e => setCartaLogo(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {cartaLogo && (
              <div className="mt-3 flex items-center gap-3">
                <img src={cartaLogo} alt="Preview logo" className="w-12 h-12 rounded-xl object-contain bg-gray-100 border border-gray-200"
                     onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                <span className="text-xs text-gray-400">Vista previa del logo</span>
              </div>
            )}
          </div>

          {/* Banner */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Banner superior</label>
            <p className="text-xs text-gray-400 mb-3">Imagen de fondo ancha (1200×400 px recomendado). Aparece en la parte superior de la carta.</p>
            {/* Botón subir archivo */}
            <label className={`flex items-center justify-center gap-2 w-full py-3 mb-3
                              border-2 border-dashed rounded-xl cursor-pointer text-sm font-medium transition-colors
                              ${uploadingBanner
                                ? 'border-orange-200 bg-orange-50 text-orange-400 cursor-not-allowed'
                                : 'border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 text-orange-600'
                              }`}>
              {uploadingBanner
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                : <><Upload className="w-4 h-4" /> Subir imagen desde equipo</>}
              <input type="file" accept="image/*" className="hidden"
                     onChange={handleBannerUpload} disabled={uploadingBanner} />
            </label>
            <p className="text-xs text-gray-400 mb-2 text-center">— o pega una URL directamente —</p>
            <input
              type="url"
              value={cartaBanner}
              onChange={e => setCartaBanner(e.target.value)}
              placeholder="https://ejemplo.com/banner.jpg"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {cartaBanner && (
              <div className="mt-3 flex items-center gap-3">
                <img src={cartaBanner} alt="Preview banner" className="flex-1 h-20 object-cover rounded-xl border border-gray-200"
                     onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <button
                  onClick={() => setCartaBanner('')}
                  className="shrink-0 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                  title="Quitar banner"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Color de tema */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Color principal</label>
            <p className="text-xs text-gray-400 mb-3">Se usa en botones, precios y acentos de la carta digital.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {THEME_COLOR_PRESETS.map(p => (
                <button
                  key={p.color}
                  onClick={() => setCartaTheme(p.color)}
                  title={p.label}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    cartaTheme === p.color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: p.color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cartaTheme}
                onChange={e => setCartaTheme(e.target.value)}
                className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
              />
              <span className="text-sm text-gray-600 font-mono">{cartaTheme}</span>
              <div className="flex-1 h-8 rounded-lg" style={{ background: cartaTheme, opacity: 0.2 }} />
            </div>
          </div>

          {/* Eslogan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Eslogan / tagline</label>
            <p className="text-xs text-gray-400 mb-3">Frase corta que aparece debajo del nombre del restaurante.</p>
            <input
              type="text"
              value={cartaTagline}
              onChange={e => setCartaTagline(e.target.value.slice(0, 80))}
              placeholder="Ej: Cocina casera con sabor a hogar"
              maxLength={80}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{cartaTagline.length}/80</p>
          </div>

          {/* Datos de contacto */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Datos de contacto</label>
            <p className="text-xs text-gray-400 mb-3">Aparecen en la barra inferior de la carta digital.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Dirección</label>
                <input
                  type="text"
                  value={cartaAddress}
                  onChange={e => setCartaAddress(e.target.value.slice(0, 200))}
                  placeholder="Ej: Av. Principal 123, Santiago"
                  maxLength={200}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                <input
                  type="text"
                  value={cartaPhone}
                  onChange={e => setCartaPhone(e.target.value.slice(0, 30))}
                  placeholder="Ej: +56 9 1234 5678"
                  maxLength={30}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  type="email"
                  value={cartaEmail}
                  onChange={e => setCartaEmail(e.target.value.slice(0, 100))}
                  placeholder="Ej: contacto@miristor.cl"
                  maxLength={100}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Toggle: ocultar no disponibles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Ocultar productos no disponibles</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Los clientes solo verán lo que está disponible ahora
                </p>
              </div>
              <button
                onClick={() => setHideUnavailable(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  hideUnavailable ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  hideUnavailable ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Guardar */}
          <button
            onClick={handleSavePersonal}
            disabled={savingPersonal}
            className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: cartaTheme }}
          >
            {savingPersonal ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : savedPersonal ? (
              <><Check className="w-4 h-4" /> ¡Guardado!</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar personalización</>
            )}
          </button>
        </div>
      )}

      {/* ─── TAB: ANALÍTICAS ────────────────────────────────────── */}
      {activeTab === 'analiticas' && (
        <div className="space-y-5">
          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            </div>
          ) : !analytics ? (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No se pudieron cargar las estadísticas.</p>
            </div>
          ) : (
            <>
              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {([
                  { label: 'Escaneos hoy',    value: analytics.scansToday   ?? 0, icon: '📱', color: 'orange' },
                  { label: 'Escaneos semana', value: analytics.scansWeek    ?? 0, icon: '📊', color: 'blue'   },
                  { label: 'Pedidos vía QR',  value: analytics.ordersFromQr ?? 0, icon: '🛒', color: 'green'  },
                ] as const).map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
                    <span className="text-2xl">{stat.icon}</span>
                    <span className="text-2xl font-black text-gray-800">{stat.value}</span>
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Dispositivos */}
              {(analytics.mobile !== undefined) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <SmartphoneIcon className="w-4 h-4 text-orange-500" /> Dispositivos
                  </h3>
                  <div className="space-y-3">
                    {([
                      { label: 'Móvil',    pct: analytics.mobile  ?? 0, icon: <SmartphoneIcon className="w-4 h-4" /> },
                      { label: 'Tablet',   pct: analytics.tablet  ?? 0, icon: <Tablet className="w-4 h-4" /> },
                      { label: 'Escritorio', pct: analytics.desktop ?? 0, icon: <Monitor className="w-4 h-4" /> },
                    ]).map(d => (
                      <div key={d.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1.5 text-xs text-gray-600">{d.icon}{d.label}</span>
                          <span className="text-xs font-semibold text-gray-700">{d.pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-orange-400 h-2 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top mesas */}
              {analytics.topTables?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">🏆 Mesas más activas</h3>
                  <div className="space-y-2">
                    {analytics.topTables.map((t: { table: string; count: number }, i: number) => (
                      <div key={t.table} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="text-sm text-gray-700">Mesa {t.table}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-500">{t.count} escaneos</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón recargar */}
              <button
                onClick={() => {
                  setLoadingAnalytics(true);
                  api.get('/menu/carta-analytics')
                    .then(res => setAnalytics(res.data.data ?? {}))
                    .catch(() => setAnalytics(null))
                    .finally(() => setLoadingAnalytics(false));
                }}
                className="w-full py-3 border-2 border-gray-200 hover:border-orange-300 text-gray-500 hover:text-orange-600 font-medium rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <BarChart2 className="w-4 h-4" /> Actualizar estadísticas
              </button>
            </>
          )}
        </div>
      )}
      {/* ─── TAB: PEDIDOS QR ────────────────────────────────── */}
      {activeTab === 'pedidos' && (
        <div className="space-y-4">
          {/* Filtros + refresco */}
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL','PENDING_APPROVAL','CONFIRMED','REJECTED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setOrdersFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  ordersFilter === f
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {({'ALL': 'Todos', 'PENDING_APPROVAL': 'Pendiente', 'CONFIRMED': 'Confirmado', 'REJECTED': 'Rechazado'} as Record<string, string>)[f]}
              </button>
            ))}
            <button
              onClick={loadQrOrders}
              disabled={loadingOrders}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {/* Lista de pedidos */}
          {loadingOrders ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            </div>
          ) : qrOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay pedidos{ordersFilter !== 'ALL' ? ' con ese estado' : ' aún'}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {qrOrders.map(order => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  PENDING:   { label: 'Pendiente',   cls: 'bg-yellow-100 text-yellow-700' },
                  CONFIRMED: { label: 'Confirmado',  cls: 'bg-green-100  text-green-700'  },
                  REJECTED:  { label: 'Rechazado',   cls: 'bg-red-100    text-red-700'    },
                };
                const st = statusMap[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-600' };
                const items: { name: string; qty: number; price: number }[] = order.items ?? [];
                const total = order.total ?? items.reduce((s, i) => s + i.price * i.qty, 0);
                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                          {order.orderType === 'delivery' ? '🛵 Delivery' : '🏠 Mostrador'}
                        </span>
                        {order.tableNumber && (
                          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Mesa {order.tableNumber}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmtDate(order.createdAt)}</span>
                    </div>

                    {/* Cliente */}
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-gray-800 text-sm">{order.customerName || '—'}</p>
                      {order.customerPhone && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
                        </p>
                      )}
                      {order.deliveryAddress && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="w-3.5 h-3.5" /> {order.deliveryAddress}
                        </p>
                      )}
                    </div>

                    {/* Items */}
                    {items.length > 0 && (
                      <div className="border-t border-gray-50 pt-3 space-y-1">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-600">
                            <span>{item.qty}× {item.name}</span>
                            <span className="font-medium">{fmtCLP(item.price * item.qty)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {order.paymentMethod && (
                          <span className="font-medium text-gray-700">
                            {{ CASH: '💵 Efectivo', CARD: '💳 Tarjeta', TRANSFER: '🏦 Transferencia', WALLET: '📱 Billetera digital' }[order.paymentMethod as string] ?? order.paymentMethod}
                          </span>
                        )}
                        {order.paymentMethod === 'CASH' && order.cashAmount && (
                          <span className="ml-1 text-gray-400">· Paga con {fmtCLP(order.cashAmount)} · Vuelto {fmtCLP(Math.max(0, order.cashAmount - total))}</span>
                        )}
                      </div>
                      <p className="text-base font-black text-gray-800">{fmtCLP(total)}</p>
                    </div>

                    {/* Razón de rechazo */}
                    {order.rejectReason && (
                      <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                        <XCircle className="w-3.5 h-3.5 inline mr-1" />
                        Motivo: {order.rejectReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: QR MESAS ──────────────────────────────────────── */}
      {activeTab === 'mesas' && (
        <div className="space-y-6">
          {!cartaSlug ? (
            <div className="text-center py-16 text-gray-400">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Configura un slug para tu carta primero (tab Personalizar).</p>
            </div>
          ) : loadingMesaQrs ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay mesas configuradas. Crea mesas desde Configuración → Mesas.</p>
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-orange-700 mb-1">📱 QR de Servicio de Mesa</p>
                <p className="text-xs text-orange-600">
                  Estos QRs llevan a la página de servicio donde el cliente puede llamar al mesero o pedir la cuenta.
                  Imprime uno por mesa.
                </p>
              </div>

              {/* Group by section — excluir Delivery */}
              {Object.entries(
                tables.reduce((acc: Record<string, any[]>, t: any) => {
                  const sec = t.sections?.name || 'Sin sección';
                  if (sec.toLowerCase().includes('delivery')) return acc;
                  if (!acc[sec]) acc[sec] = [];
                  acc[sec].push(t);
                  return acc;
                }, {})
              ).map(([section, secsTables]: [string, any[]]) => (
                <div key={section}>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    {section}
                    <span className="text-xs font-normal text-gray-400">({secsTables.length} mesas)</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {secsTables.map((table: any) => (
                      <div key={table.id} id={`qr-mesa-${table.number}`}
                        className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
                        <h3 className="font-bold text-gray-900 text-base">{restaurantName || 'Restaurante'}</h3>
                        <p className="text-sm font-semibold text-gray-600">Mesa {table.number}</p>
                        {table.capacity && (
                          <p className="text-xs text-gray-400">{table.capacity} personas</p>
                        )}
                        {mesaQrUrls[table.number] ? (
                          <img
                            src={mesaQrUrls[table.number]}
                            alt={`QR Mesa ${table.number}`}
                            className="w-[200px] h-[200px] rounded-lg"
                          />
                        ) : (
                          <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 text-center">Escanea para llamar al mesero</p>
                        <div className="flex gap-2 w-full mt-2">
                          <button
                            onClick={() => downloadMesaQr(String(table.number))}
                            disabled={!mesaQrUrls[table.number]}
                            className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors"
                          >
                            Descargar
                          </button>
                          <button
                            onClick={() => printMesaQr(String(table.number))}
                            disabled={!mesaQrUrls[table.number]}
                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 disabled:opacity-40 transition-colors"
                          >
                            Imprimir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Print all */}
              <button
                onClick={handlePrintAllMesaQrs}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-extrabold text-lg rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                🖨️ Imprimir todos los QR de mesa ({tables.length})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
