// F13 (solo bullweb_test, TAREA 335): KDS para TV. Un toque avanza el item (pendiente -> preparando -> listo), "Todo listo" lo pasa a Listos,
// semaforo por tiempo con reloj simulado (verde, ambar, rojo con pulso), "Solo retrasados", pestana Antiguos con el archivado real del backend
// (runKdsArchive del montaje, solo tenant sandbox), sin texto bajo 20 px a 1920 y 300 tickets sin lag (API simulada en el navegador).
// Capturas a 1920x1080 y 1024x768. Los pedidos llevan la marca E2E-PW- (los borra limpieza.sql); la columna kds_archived_at la quita el montaje al bajar.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect, shot, goto, loginPanel, api, creds } from '../lib/base';
import { assertFlow, loadEnvFile, MARK, SANDBOX_SLUG, SANDBOX_TENANT_ID } from '../lib/guard';

const F = 'F13';
test.beforeAll(() => assertFlow(F));

const env = () => loadEnvFile();
const pgBin = () => env().E2E_PG_BIN ?? 'C:/Users/Francisco/bullweb_pgtest/pgsql/bin';
const pgData = () => env().E2E_PG_DATA ?? 'C:/Users/Francisco/bullweb_pgtest/data';

function psql(sql: string): string {
  const r = spawnSync(`${pgBin()}/psql.exe`, ['-h', '127.0.0.1', '-p', '5433', '-U', 'postgres', '-d', 'bullweb_test', '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`psql rc=${r.status}: ${(r.stderr ?? '').slice(0, 300)}`);
  return (r.stdout ?? '').trim();
}

/** El archivado de las 03:00 con el codigo del backend del montaje, limitado al tenant sandbox. */
function archivarSandbox(): number {
  const work = resolve(pgData(), '..', 'run', '_e2e_backend');
  const vars = Object.fromEntries(readFileSync(resolve(work, '.env.test'), 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m![1], m![2]]));
  const code = `require('./dist/modules/kds/kds-archive.js').runKdsArchive({ tenantId: '${SANDBOX_TENANT_ID}' }).then((n) => { console.log('archivados=' + n); process.exit(0); }).catch((e) => { console.error(e.message); process.exit(1); })`;
  const r = spawnSync(process.execPath, ['-e', code], { cwd: work, env: { ...process.env, DATABASE_URL: vars.DATABASE_URL, KDS_ARCHIVE_CRON: 'off' }, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`archivado rc=${r.status}: ${(r.stderr ?? '').slice(0, 300)}`);
  return Number((r.stdout.match(/archivados=(\d+)/) ?? [])[1] ?? -1);
}

const ticket = (p: Page, marca: string) => p.getByTestId('kds-ticket').filter({ hasText: new RegExp(marca, 'i') });

test('F13 KDS TV: toque por item, Todo listo a Listos, semaforo con reloj simulado, Antiguos, 20 px y 300 tickets', async ({ page }) => {
  const c = creds();
  const token = await loginPanel(page, c.admin);
  const sfx = Date.now().toString(36);
  const marcaA = `${MARK}F13A-${sfx}`;
  const marcaB = `${MARK}F13B-${sfx}`;
  let A: any; let B: any;

  await test.step('dos pedidos de mostrador por la API (A con 2 items y nota de cocina, B con 1)', async () => {
    const menu = await api(page, 'GET', `/public/menu?slug=${SANDBOX_SLUG}`, token);
    const prods = (menu.data?.categories ?? []).flatMap((x: any) => x.products ?? [])
      .filter((p: any) => p.available !== false && p.price > 0 && !(p.modifierGroups ?? []).some((g: any) => g.required || g.minSelect > 0) && !(p.trackStock && Number(p.stock) <= 2));
    expect(prods.length, 'dos productos sin modificador obligatorio').toBeGreaterThanOrEqual(2);
    const ra = await api(page, 'POST', '/pos/orders', token, { type: 'TAKEAWAY', customerName: marcaA, items: [{ productId: prods[0].id, quantity: 2, notes: 'Sin sal E2E' }, { productId: prods[1].id, quantity: 1 }] });
    expect(ra.status, ra.text.slice(0, 200)).toBe(201);
    const rb = await api(page, 'POST', '/pos/orders', token, { type: 'TAKEAWAY', customerName: marcaB, items: [{ productId: prods[1].id, quantity: 1 }] });
    expect(rb.status, rb.text.slice(0, 200)).toBe(201);
    A = (await api(page, 'GET', `/pos/orders/${ra.data.id}`, token)).data;
    B = (await api(page, 'GET', `/pos/orders/${rb.data.id}`, token)).data;
    expect(A.order_items.length).toBe(2);
  });

  const cocina = await page.context().newPage();
  await cocina.clock.install({ time: new Date() }); // reloj simulado: corre normal hasta adelantarlo
  await cocina.setViewportSize({ width: 1920, height: 1080 });

  await test.step('1920: tickets en verde, numero, canal, nombre, nota y sin texto bajo 20 px', async () => {
    await goto(cocina, '/kds');
    const ta = ticket(cocina, marcaA);
    await expect(ta).toBeVisible({ timeout: 30_000 });
    await expect(ta).toHaveAttribute('data-level', 'green');
    await expect(ta.getByTestId('kds-canal')).toHaveText('Mostrador');
    await expect(ta.getByText(`#${String(A.orderNumber).split('-').pop()}`)).toBeVisible();
    await expect(ta.getByTestId('kds-nota')).toContainText('Sin sal E2E');
    await expect(ta.getByTestId('kds-timer')).toHaveText(/^\d{2}:\d{2}$/);
    const m = await cocina.evaluate(() => {
      const root = document.querySelector('[data-testid="kds-root"]') as HTMLElement;
      const els = Array.from(root.querySelectorAll('*')).filter((e) => (e as HTMLElement).offsetParent !== null && Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim()));
      const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
      const cols = new Set(Array.from(root.querySelectorAll('[data-testid="kds-ticket"]')).map((t) => Math.round((t as HTMLElement).getBoundingClientRect().left))).size;
      return { min: Math.min(...sizes), base: parseFloat(getComputedStyle(root).fontSize), bg: getComputedStyle(root).backgroundColor, cols, sw: document.documentElement.scrollWidth, w: innerWidth };
    });
    test.info().annotations.push({ type: 'medidas', description: `1920: base ${m.base}px, letra minima ${m.min}px, fondo ${m.bg}, columnas visibles ${m.cols}` });
    expect(m.base, 'fuente base 24 px en 1920').toBe(24);
    expect(m.min, 'ninguna letra bajo 20 px').toBeGreaterThanOrEqual(20);
    expect(m.bg).toBe('rgb(17, 20, 24)');
    expect(m.sw, 'sin scroll horizontal').toBeLessThanOrEqual(m.w);
    await shot(cocina, F, '01_kds_1920_verde');
  });

  await test.step('un toque avanza el item: pendiente -> preparando -> listo', async () => {
    const ta = ticket(cocina, marcaA);
    const item = ta.getByTestId('kds-item').first();
    await expect(item).toHaveAttribute('data-status', 'PENDING');
    await item.click();
    await expect(item).toHaveAttribute('data-status', 'PREPARING');
    await expect(item).toContainText('Preparando');
    await shot(cocina, F, '02_item_preparando');
    await expect.poll(async () => (await api(cocina, 'GET', `/pos/orders/${A.id}`, token)).data.order_items.filter((i: any) => i.status === 'PREPARING').length).toBe(1);
    await expect(item).toBeEnabled();
    await item.click();
    await expect(item).toHaveAttribute('data-status', 'READY');
    await expect(item).toContainText('Listo');
    await expect.poll(async () => (await api(cocina, 'GET', `/pos/orders/${A.id}`, token)).data.order_items.filter((i: any) => i.status === 'READY').length).toBe(1);
    await expect(ta.getByTestId('kds-item').nth(1)).toHaveAttribute('data-status', 'PENDING'); // un item listo no adelanta al otro
  });

  await test.step('semaforo con reloj simulado: ambar a los 10 min, rojo con pulso pasados 20, Solo retrasados', async () => {
    await cocina.clock.fastForward('10:05');
    const tb = ticket(cocina, marcaB);
    await expect(tb).toHaveAttribute('data-level', 'amber');
    await expect(tb).toContainText('Demorado');
    await shot(cocina, F, '03_semaforo_ambar');
    await cocina.clock.fastForward('10:30');
    await expect(tb).toHaveAttribute('data-level', 'red');
    await expect(tb).toContainText('Atrasado');
    await expect(tb).toHaveClass(/kds-pulse/);
    await cocina.getByTestId('kds-solo-retrasados').click();
    await expect(ticket(cocina, marcaB)).toBeVisible();
    await shot(cocina, F, '04_semaforo_rojo_1920');
    await cocina.setViewportSize({ width: 1024, height: 768 });
    await expect(tb).toBeVisible();
    const cols = await cocina.evaluate(() => new Set(Array.from(document.querySelectorAll('[data-testid="kds-ticket"]')).map((t) => Math.round((t as HTMLElement).getBoundingClientRect().left))).size);
    test.info().annotations.push({ type: 'medidas', description: `1024: columnas visibles ${cols}` });
    await shot(cocina, F, '05_kds_1024');
    await cocina.setViewportSize({ width: 1920, height: 1080 });
    await cocina.getByTestId('kds-solo-retrasados').click();
  });

  await test.step('Todo listo: el ticket sale de En cocina y queda en Listos', async () => {
    const ta = ticket(cocina, marcaA);
    await ta.getByTestId('kds-todo-listo').click();
    await expect(ticket(cocina, marcaA)).toHaveCount(0);
    await expect.poll(async () => (await api(cocina, 'GET', `/pos/orders/${A.id}`, token)).data.order_items.filter((i: any) => i.status === 'READY').length).toBe(2);
    await cocina.getByTestId('kds-vista-listos').click();
    await expect(ticket(cocina, marcaA)).toBeVisible();
    await expect(ticket(cocina, marcaA)).toContainText('Listo');
    await shot(cocina, F, '06_listos');
    await cocina.getByTestId('kds-vista-cocina').click();
  });

  await test.step('Antiguos: un pedido de ayer se archiva (cron 03:00) y no se mezcla con los del dia', async () => {
    const n = psql(`UPDATE orders SET "createdAt" = "createdAt" - interval '1 day' WHERE id = '${B.id}' AND "customerName" LIKE 'E2E-PW-%' RETURNING id`);
    expect(n).toBe(B.id);
    const archivados = archivarSandbox();
    expect(archivados, 'items archivados en el sandbox').toBeGreaterThanOrEqual(1);
    expect(psql(`SELECT count(*) FROM order_items WHERE "orderId" = '${B.id}' AND kds_archived_at IS NOT NULL`)).toBe('1');
    expect(psql(`SELECT count(*) FROM order_items WHERE "orderId" = '${A.id}' AND kds_archived_at IS NOT NULL`), 'el pedido de hoy no se archiva').toBe('0');
    test.info().annotations.push({ type: 'archivado', description: `runKdsArchive sandbox: ${archivados} items` });
    const viejo = await page.context().newPage();
    await viejo.setViewportSize({ width: 1920, height: 1080 });
    await goto(viejo, '/kds');
    await expect(viejo.getByTestId('kds-root')).toBeVisible();
    await expect(viejo.getByTestId('kds-vista-antiguos')).toContainText(/[1-9]/);
    await expect(ticket(viejo, marcaB)).toHaveCount(0); // fuera del KDS del dia
    await viejo.getByTestId('kds-vista-antiguos').click();
    const tb = ticket(viejo, marcaB);
    await expect(tb).toBeVisible({ timeout: 20_000 });
    await expect(tb).toContainText('De días anteriores');
    await shot(viejo, F, '07_antiguos');
    const lista = (await api(viejo, 'GET', '/kds/orders', token)).data as any[];
    expect(lista.some((o) => o.id === B.id), '/kds/orders sin el archivado').toBe(false);
    const arch = (await api(viejo, 'GET', '/kds/archived', token)).data as any[];
    expect(arch.some((o) => o.id === B.id), '/kds/archived con el archivado').toBe(true);
    await viejo.close();
  });
  await cocina.close();

  await test.step('vacio "Cocina al dia" y 300 tickets sin lag (API del KDS simulada en el navegador)', async () => {
    const p = await page.context().newPage();
    await p.setViewportSize({ width: 1920, height: 1080 });
    await p.route('**/api/kds/orders', (r) => r.fulfill({ json: { success: true, data: [] } }));
    await p.route('**/api/kds/archived', (r) => r.fulfill({ json: { success: true, data: [] } }));
    await goto(p, '/kds');
    await expect(p.getByTestId('kds-vacio')).toContainText('Cocina al día');
    await expect(p.getByTestId('kds-ticket')).toHaveCount(0);
    await shot(p, F, '08_vacio');
    await p.close();

    const q = await page.context().newPage();
    await q.setViewportSize({ width: 1920, height: 1080 });
    const t0 = Date.now();
    const fake = Array.from({ length: 300 }, (_, k) => ({
      id: `f13-o-${k}`, orderNumber: `V-20261114-${String(k + 1).padStart(4, '0')}`, type: k % 3 ? 'TAKEAWAY' : 'DELIVERY', status: 'PENDING',
      customerName: `${MARK}F13-carga-${k}`, createdAt: new Date(t0 - (k % 30) * 60_000).toISOString(), source: k % 7 === 0 ? 'QR_CARTA' : null,
      items: Array.from({ length: 3 }, (_, j) => ({ id: `f13-i-${k}-${j}`, quantity: j + 1, status: 'PENDING', name: `Producto ${j}`, products: { name: `Producto ${j}`, stationId: null }, modifiers: j === 0 ? ['Sin cebolla'] : [], notes: null })),
    }));
    await q.route('**/api/kds/orders', (r) => r.fulfill({ json: { success: true, data: fake } }));
    await q.route('**/api/kds/archived', (r) => r.fulfill({ json: { success: true, data: [] } }));
    await q.route('**/api/kds/item/**', (r) => r.fulfill({ json: { success: true, data: {} } }));
    await goto(q, '/kds');
    await expect(q.getByTestId('kds-ticket')).toHaveCount(300, { timeout: 30_000 });
    const medida = await q.evaluate(async () => {
      // tareas largas (>50 ms) durante 5 s de reloj corriendo con 300 tickets y tiempo de respuesta de un toque
      const largas: number[] = [];
      const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => largas.push(Math.round(e.duration))));
      po.observe({ type: 'longtask', buffered: false });
      await new Promise((r) => setTimeout(r, 5000));
      const btn = document.querySelector('[data-testid="kds-item"][data-status="PENDING"]') as HTMLButtonElement;
      const t = performance.now();
      btn.click();
      await new Promise<void>((res) => { const loop = () => (btn.getAttribute('data-status') === 'PREPARING' ? res() : requestAnimationFrame(loop)); loop(); });
      const toque = Math.round(performance.now() - t);
      po.disconnect();
      return { largas, toque, tickets: document.querySelectorAll('[data-testid="kds-ticket"]').length };
    });
    test.info().annotations.push({ type: 'rendimiento', description: `300 tickets: carga ${Date.now() - t0} ms (incluye login de pagina), toque ${medida.toque} ms, tareas largas en 5 s de reloj: ${medida.largas.length} (max ${Math.max(0, ...medida.largas)} ms)` });
    expect(medida.tickets).toBe(300);
    expect(medida.toque, 'un toque se ve en menos de 300 ms con 300 tickets').toBeLessThan(300);
    expect(medida.largas.filter((d) => d > 200).length, 'sin congelamientos de mas de 200 ms con el reloj corriendo').toBe(0);
    await shot(q, F, '09_300_tickets');
    await q.close();
  });
});
