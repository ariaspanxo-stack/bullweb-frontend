// V1 (lote 308b): recorre las pantallas del panel con el Admin del sandbox y deja captura JPG <= 200 KB en 1280 y 360 px
// mas una medicion por pantalla: desborde horizontal, botones bajo 44 px, botones con relleno de otro color y tarjetas oscuras.
// Solo mira: no escribe nada. Salida en _auditoria/evidencia/_lote308b/capturas/<E2E_VISUAL_ETIQUETA>/.
import { test, expect, goto, loginPanel, creds } from '../lib/base';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FRONTEND_DIR } from '../lib/guard';

const ETIQUETA = process.env.E2E_VISUAL_ETIQUETA ?? 'despues';
const OUT = resolve(FRONTEND_DIR, '..', '_auditoria', 'evidencia', '_lote308b', 'capturas', ETIQUETA);
const MAX_JPG = 200 * 1024;

const PANTALLAS: Array<[string, string, string?]> = [
  ['pos_mesas', '/restaurant', 'Mesas'], ['pos_mostrador', '/restaurant', 'Mostrador'], ['pos_delivery', '/restaurant', 'Delivery'],
  ['ventas', '/sales'], ['caja', '/caja'], ['productos', '/products'], ['pedidos', '/orders'], ['pedidos_online', '/online-orders'],
  ['inventario', '/inventory'], ['arqueos', '/cash-registers'], ['clientes', '/customers'], ['fidelizacion', '/campaigns'],
  ['delivery', '/delivery'], ['empleados', '/employees'], ['asistencia', '/employees', 'Asistencia'], ['reportes', '/reports'],
  ['cupones', '/coupons'], ['promociones', '/promotions'], ['mesas_config', '/tables'], ['carta_qr', '/carta-qr'],
  ['configuracion', '/settings'], ['ajustes_impresion', '/settings/print'], ['pagos_config', '/settings/pagos'],
  ['perfil', '/profile'], ['perfil_local', '/profile/restaurant'], ['apps', '/apps'], ['suscripcion', '/subscription'],
  ['usuarios', '/admin/users'], ['roles', '/admin/roles'], ['impresoras', '/admin/printers'], ['medios_pago', '/admin/payment-methods'],
  ['propina', '/admin/propina'], ['app_mesero', '/admin/mesero-app'], ['auditoria', '/admin/audit'],
  // Modales (el tercer valor es el boton que se pulsa; no se guarda nada)
  ['modal_cupon', '/coupons', 'Nuevo cupón'], ['modal_promocion', '/promotions', 'Nueva Promoción'], ['modal_cliente', '/customers', 'Nuevo Cliente'],
  ['modal_producto', '/products', 'Nuevo producto'], ['modal_empleado', '/employees', 'Nuevo Empleado'], ['modal_mesa_mostrador', '/restaurant', 'Mostrador'],
];

const MEDIR = () => {
  const vis = (el: Element) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0; };
  const rgb = (c: string) => (c.match(/[\d.]+/g) || []).map(Number);
  const hue = ([r, g, b]: number[]) => { const x = Math.max(r, g, b), n = Math.min(r, g, b), d = x - n; if (d < 18) return -1; const h = x === r ? ((g - b) / d) % 6 : x === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
  const botones = [...document.querySelectorAll('button, a[role="button"]')].filter(vis);
  const bajos: string[] = []; const colores: string[] = [];
  for (const b of botones) {
    const r = b.getBoundingClientRect();
    const t = (b.textContent || b.getAttribute('aria-label') || b.getAttribute('title') || '(icono)').trim().slice(0, 30);
    if (r.height < 44 - 0.5 && !b.closest('nav, aside')) bajos.push(`${t} ${Math.round(r.height)}px`);
    const bg = rgb(getComputedStyle(b).backgroundColor);
    if (bg.length >= 3 && (bg[3] === undefined || bg[3] > 0.5) && !b.closest('nav, aside')) {
      const h = hue(bg);
      const sat = Math.max(bg[0], bg[1], bg[2]) - Math.min(bg[0], bg[1], bg[2]);
      const esNaranja = h >= 15 && h <= 40; const esRojo = h >= 350 || h < 15;
      if (h >= 0 && sat > 40 && !esNaranja && !esRojo) colores.push(`${t} rgb(${bg.slice(0, 3).join(',')})`);
    }
  }
  // Texto claro sobre fondo claro: se volvio invisible
  const lum = (c: number[]) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const fondo = (el: Element | null): number[] => { let e = el; while (e) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c; e = e.parentElement; } return [255, 255, 255]; };
  const invisibles: string[] = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n && invisibles.length < 8; n = tw.nextNode()) {
    const txt = (n.textContent || '').trim();
    const el = n.parentElement;
    if (!txt || !el || !vis(el) || el.closest('nav, aside, script, style')) continue;
    const c = rgb(getComputedStyle(el).color);
    if (lum(c) > 215 && lum(fondo(el)) > 215) invisibles.push(txt.slice(0, 30));
  }
  const main = document.querySelector('main') || document.body;
  const oscuras: string[] = [];
  for (const el of main.querySelectorAll('div, section, table')) {
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 20000 || !vis(el)) continue;
    const c = rgb(getComputedStyle(el).backgroundColor);
    if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5) && c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11 < 70) oscuras.push(`${el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return {
    url: location.pathname,
    desborde: document.documentElement.scrollWidth > window.innerWidth + 1 ? document.documentElement.scrollWidth - window.innerWidth : 0,
    botones: botones.length, bajos, colores, oscuras: oscuras.slice(0, 5), invisibles,
    vacia: (main.textContent || '').trim().length < 20,
  };
};

test('V1 capturas y medicion del panel', async ({ page }) => {
  test.setTimeout(540_000);
  mkdirSync(OUT, { recursive: true });
  const c = creds();
  await loginPanel(page, c.admin);
  const medidas: Record<string, unknown> = {};
  for (const [w, h] of [[1280, 800], [360, 780]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const [nombre, ruta, pestana] of PANTALLAS) {
      const k = `${nombre}_${w}`;
      try {
        await goto(page, ruta);
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(700);
        // Antes del lote el menu lateral partia abierto en celular y tapaba la pantalla
        if (w < 1024) await page.locator('aside button').first().click({ timeout: 1500 }).catch(() => {});
        await page.getByText(/Cargando/).first().waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
        if (pestana) {
          await page.getByRole('button', { name: pestana, exact: false }).first().click({ timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(600);
        }
        medidas[k] = await page.evaluate(MEDIR);
        let buf: Buffer = Buffer.alloc(0);
        for (const quality of [70, 55, 40, 28, 18]) {
          buf = await page.screenshot({ type: 'jpeg', quality, animations: 'disabled', timeout: 15000 });
          if (buf.length <= MAX_JPG) break;
        }
        expect(buf.length, `captura ${k} <= 200 KB`).toBeLessThanOrEqual(MAX_JPG);
        writeFileSync(resolve(OUT, `${k}.jpg`), buf);
      } catch (e) {
        medidas[k] = { error: String((e as Error).message).slice(0, 200) };
      }
    }
  }
  writeFileSync(resolve(OUT, 'medicion.json'), JSON.stringify(medidas, null, 1));
});
