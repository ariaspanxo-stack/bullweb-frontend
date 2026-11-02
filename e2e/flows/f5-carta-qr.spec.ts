// F5: Carta QR a 360 px: pedir con modificador, tracking con progreso, aceptar desde el POS; doble aceptacion deja 1 pedido. Corre en local y sandbox.
import { test, expect, shot, goto, loginPanel, api, creds, guardContext, pausaApi } from '../lib/base';
import { assertFlow, MARK, SANDBOX_SLUG } from '../lib/guard';

const F = 'F5';
test.beforeAll(() => assertFlow(F));

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('F5 carta QR a 360 px, modificador, tracking con progreso, aceptar desde POS, doble aceptacion 1 pedido', async ({ page, browser, violations }) => {
  const c = creds();
  const cliente = `${MARK}F5-${Date.now().toString(36)}`;
  const telefono = `+56 9 0000 ${String(Date.now()).slice(-4)}`;

  const movil = await browser.newContext({
    viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    locale: 'es-CL', timezoneId: 'America/Santiago', serviceWorkers: 'block',
  });
  await guardContext(movil, violations);
  const cli = await movil.newPage();
  let token = '';
  let orderId = '';

  try {
    await test.step('carta 360 px: producto con modificador obligatorio', async () => {
      await pausaApi();
      const menu = await (await page.request.get(`/api/public/menu?slug=${SANDBOX_SLUG}`)).json();
      const productos = menu.data.categories.flatMap((x: any) => x.products ?? []);
      const prod = productos.find((p: any) => p.available && (p.modifierGroups ?? []).some((g: any) => g.required || g.minSelect > 0));
      expect(prod, 'la carta debe tener un producto con modificador obligatorio').toBeTruthy();

      await goto(cli, `/carta/${SANDBOX_SLUG}`);
      await cli.getByPlaceholder('Buscar en el menú...').fill(prod.name);
      await shot(cli, F, '01_carta_360');
      const ancho = await cli.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho, 'sin desborde horizontal a 360 px').toBeLessThanOrEqual(360);

      await cli.getByRole('button', { name: new RegExp(`^Agregar ${esc(prod.name)}$`, 'i') }).first().click();
      const agregar = cli.getByRole('button', { name: /^Agregar \$/ });
      await expect(agregar).toBeVisible();
      await agregar.click();
      await expect(cli.getByText(/Elige una opción|Elige al menos/).first()).toBeVisible();
      await shot(cli, F, '02_obligatorio_bloquea');
      const grupo = prod.modifierGroups.find((g: any) => g.required || g.minSelect > 0);
      await cli.getByRole('button', { name: new RegExp(esc(grupo.options[0].name), 'i') }).first().click();
      await agregar.click();
      await expect(cli.getByRole('button', { name: 'Ver pedido' })).toBeVisible();
      await shot(cli, F, '03_modificador_elegido');
    });

    await test.step('enviar el pedido', async () => {
      await cli.getByRole('button', { name: 'Ver pedido' }).click();
      await cli.getByRole('button', { name: /Elegir forma de entrega/ }).click();
      await cli.getByRole('button', { name: /Retiro en mostrador/ }).click();
      await cli.getByPlaceholder('¿Cómo te llamamos?').fill(cliente);
      await cli.getByPlaceholder('+56 9 1234 5678').fill(telefono);
      await shot(cli, F, '04_datos');
      await cli.getByRole('button', { name: /Ir a pagar/ }).click();
      const efectivo = cli.getByRole('button', { name: /efectivo/i }).first();
      await expect(efectivo).toBeVisible();
      await efectivo.click();
      const conCuanto = cli.getByPlaceholder('20000');
      if (await conCuanto.isVisible()) await conCuanto.fill('20000');
      await shot(cli, F, '05_pago');
      const resp = cli.waitForResponse((r) => r.url().includes('/api/public/orders') && r.request().method() === 'POST');
      await cli.getByRole('button', { name: /Confirmar pedido/ }).click();
      const r = await resp;
      expect(r.status(), 'POST /public/orders').toBeLessThan(300);
      const body = await r.json();
      orderId = body.data?.orderId ?? body.data?.id ?? body.orderId ?? body.id;
      expect(orderId, 'id del pedido QR').toBeTruthy();
      await expect(cli.getByText('Esperando confirmación del local…')).toBeVisible();
      await shot(cli, F, '06_tracking_esperando');
    });

    await test.step('doble aceptacion desde dos POS: 1 solo pedido', async () => {
      token = await loginPanel(page, c.admin);
      await goto(page, '/online-orders');
      const pos2 = await page.context().newPage();
      await goto(pos2, '/online-orders');
      const nombre = new RegExp(cliente, 'i');
      const tarjeta = (p: typeof page) => p.locator('div').filter({ hasText: nombre }).filter({ has: p.getByRole('button', { name: 'Rechazar' }) }).last();
      await expect(tarjeta(page)).toBeVisible({ timeout: 45000 });
      await expect(tarjeta(pos2)).toBeVisible({ timeout: 45000 });
      await shot(page, F, '07_pos_pendiente');
      await tarjeta(page).getByRole('button', { name: 'Aceptar', exact: true }).click();
      await tarjeta(pos2).getByRole('button', { name: 'Aceptar', exact: true }).click();
      const confirmar = (p: typeof page) => p.getByRole('button', { name: 'Confirmar', exact: true });
      await expect(confirmar(page)).toBeVisible();
      await expect(confirmar(pos2)).toBeVisible();
      await shot(page, F, '08_pos_minutos');
      const respuestas: number[] = [];
      for (const p of [page, pos2]) p.on('response', (r) => { if (/\/api\/qr-orders\/[^/]+\/accept/.test(r.url())) respuestas.push(r.status()); });
      await Promise.all([confirmar(page).click(), confirmar(pos2).click()]);
      await expect.poll(() => respuestas.length, { timeout: 20000 }).toBe(2);
      respuestas.sort();
      expect(respuestas[0], 'la primera aceptacion responde OK').toBeLessThan(300);
      await page.waitForTimeout(1500);
      await shot(page, F, '09_pos_aceptado');
      await shot(pos2, F, '10_pos2_tras_doble');

      // Tercera aceptacion directa por API: tampoco crea otro pedido.
      const tercera = await api(page, 'POST', `/qr-orders/${orderId}/accept`, token, { estimatedMinutes: 15 });
      const pedidos = await api(page, 'GET', `/pos/orders?limit=200`, token);
      const lista = (Array.isArray(pedidos.data) ? pedidos.data : pedidos.data?.orders ?? pedidos.data?.data ?? []).filter((o: any) => String(o.customerName).toLowerCase() === cliente.toLowerCase());
      expect(lista.length, 'pedidos con el nombre del cliente').toBe(1);
      test.info().annotations.push({ type: 'observacion', description: `doble aceptacion: respuestas ${respuestas.join('/')}, tercera por API ${tercera.status}, pedidos=${lista.length}` });
      orderId = lista[0].id;
      await pos2.close();
    });

    await test.step('tracking con progreso en el celular', async () => {
      await expect(cli.getByText(/Pedido aceptado/)).toBeVisible({ timeout: 45000 });
      await shot(cli, F, '11_tracking_aceptado');
      const det = await api(page, 'GET', `/pos/orders/${orderId}`, token);
      const item = det.data.order_items[0];
      const prep = await api(page, 'PATCH', `/pos/orders/${orderId}/items/${item.id}/status`, token, { status: 'PREPARING' });
      expect(prep.status).toBeLessThan(300);
      await expect(cli.getByText(/\d+ de \d+/)).toBeVisible({ timeout: 45000 });
      await shot(cli, F, '12_tracking_preparando');
      const listo = await api(page, 'PATCH', `/pos/orders/${orderId}/items/${item.id}/status`, token, { status: 'READY' });
      expect(listo.status).toBeLessThan(300);
      await expect(cli.getByText(/1 de 1|listo para retirar/i).first()).toBeVisible({ timeout: 45000 });
      await shot(cli, F, '13_tracking_listo');
    });
  } finally {
    // Anular lo propio; el borrado y los conteos los hace e2e/sql/limpieza.sql al final de la corrida.
    if (token && orderId) {
      const anula = await api(page, 'DELETE', `/pos/orders/${orderId}`, token, { reason: `${MARK}limpieza` }).catch(() => null);
      test.info().annotations.push({ type: 'observacion', description: `anulacion del pedido de prueba: ${anula?.status ?? 'sin respuesta'}` });
    }
    await movil.close();
  }
});
