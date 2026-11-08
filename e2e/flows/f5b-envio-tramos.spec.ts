// F5 (LOTE 314, solo bullweb_test): carta QR a 360 px con envio por tramos. Direccion fuera de zona -> "No llegamos" y opcion retiro;
// direccion dentro -> "Envío $1.500 · 2,0 km" antes del pago y en el total; el POS acepta con el costo sugerido y, al cambiarlo, exige motivo.
// Google simulado local (127.0.0.1:4397): T314-A = 2,0 km, T314-D = 9 km. Al final el sandbox vuelve a FIJO (el rollback del montaje quita settings.envio).
import { test, expect, shot, goto, loginPanel, api, creds, guardContext, pausaApi } from '../lib/base';
import { assertFlow, MARK, SANDBOX_SLUG, currentEnv } from '../lib/guard';

const F = 'F5';
test.beforeAll(() => assertFlow(F));

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('F5 envio por tramos: carta 360 px con direccion fuera y dentro de zona, aceptar con motivo', async ({ page, browser, violations }) => {
  test.skip(currentEnv() !== 'local', 'solo local: usa el Google simulado y configura tramos en el sandbox de bullweb_test');
  const c = creds();
  const cliente = `${MARK}F5T-${Date.now().toString(36)}`;
  const telefono = `+56 9 0001 ${String(Date.now()).slice(-4)}`;
  const token = await loginPanel(page, c.admin);
  let orderId = '';

  const movil = await browser.newContext({
    viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    locale: 'es-CL', timezoneId: 'America/Santiago', serviceWorkers: 'block',
  });
  await guardContext(movil, violations);
  const cli = await movil.newPage();

  try {
    await test.step('Config > Delivery: direccion del local y tramos', async () => {
      const o = await api(page, 'POST', '/delivery-zones/origen', token, { direccion: 'Local T314-L 1, Chillan' });
      expect(o.status, 'origen verificado').toBe(200);
      const s = await api(page, 'PUT', '/delivery-zones', token, { modo_envio: 'TRAMOS', envio_gratis_desde: null, radio_maximo: null, tramos: [
        { km_hasta: 2, costo: 1500, pedido_minimo: null }, { km_hasta: 5, costo: 2500, pedido_minimo: null }, { km_hasta: 8, costo: 3500, pedido_minimo: null }] });
      expect(s.status, 'tramos guardados').toBe(200);
      await goto(page, '/settings/delivery');
      await expect(page.getByTestId('envio-tramo-km-2')).toHaveValue('8');
      await page.getByTestId('envio-probar-direccion').fill('Calle T314-A 100, Chillan');
      await page.getByTestId('envio-probar').click();
      await expect(page.getByTestId('envio-probar-resultado')).toContainText('2,0 km');
      await expect(page.getByTestId('envio-probar-resultado')).toContainText('$1.500');
      await shot(page, F, 't01_config_delivery');
    });

    await test.step('carta 360 px: delivery con direccion fuera de zona', async () => {
      await pausaApi();
      const menu = await (await page.request.get(`/api/public/menu?slug=${SANDBOX_SLUG}`)).json();
      const productos = menu.data.categories.flatMap((x: any) => x.products ?? []);
      const prod = productos.find((p: any) => p.available && p.price > 0 && !(p.modifierGroups ?? []).length && !(p.trackStock && Number(p.stock) <= 0));
      expect(prod, 'producto sin modificadores').toBeTruthy();
      await goto(cli, `/carta/${SANDBOX_SLUG}`);
      await cli.getByPlaceholder('Buscar en el menú...').fill(prod.name);
      await cli.getByRole('button', { name: new RegExp(`^Agregar ${esc(prod.name)}$`, 'i') }).first().click();
      const agregar = cli.getByRole('button', { name: /^Agregar \$/ });
      if (await agregar.isVisible().catch(() => false)) await agregar.click();
      await cli.getByRole('button', { name: 'Ver pedido' }).click();
      await cli.getByRole('button', { name: /Elegir forma de entrega/ }).click();
      await cli.getByRole('button', { name: /Delivery/ }).first().click();
      await cli.getByPlaceholder('¿Cómo te llamamos?').fill(cliente);
      await cli.getByPlaceholder('+56 9 1234 5678').fill(telefono);
      await cli.getByPlaceholder('Calle, número, piso, referencias...').fill('Calle T314-D 100');
      await cli.getByPlaceholder('Chillán, Santiago, Concepción...').fill('Chillan');
      await expect(cli.getByTestId('carta-envio-pie')).toContainText('No llegamos');
      await cli.getByTestId('carta-envio-fuera').scrollIntoViewIfNeeded();
      await expect(cli.getByTestId('carta-envio-fuera')).toBeVisible();
      await expect(cli.getByTestId('carta-envio-retiro')).toBeVisible();
      await expect(cli.getByRole('button', { name: /Ir a pagar/ })).toBeDisabled();
      const ancho = await cli.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho, 'sin desborde horizontal a 360 px').toBeLessThanOrEqual(360);
      await shot(cli, F, 't02_fuera_de_zona');
    });

    await test.step('direccion dentro de zona: envio y km antes del pago, total con envio', async () => {
      await cli.getByPlaceholder('Calle, número, piso, referencias...').fill('Calle T314-A 100');
      await expect(cli.getByTestId('carta-envio-costo')).toContainText('$1.500');
      await expect(cli.getByTestId('carta-envio-costo')).toContainText('2,0 km');
      await expect(cli.getByTestId('carta-envio-pie')).toContainText('Envío $1.500 · 2,0 km');
      await cli.getByTestId('carta-envio-costo').scrollIntoViewIfNeeded();
      await shot(cli, F, 't03_envio_dentro');
      await cli.getByRole('button', { name: /Ir a pagar/ }).click();
      await expect(cli.getByTestId('carta-pago-envio')).toContainText('$1.500');
      const metodo = cli.locator('button').filter({ hasText: /efectivo|transferencia|débito|debito|crédito|credito/i }).first();
      await expect(metodo).toBeVisible();
      await metodo.click();
      const conCuanto = cli.getByPlaceholder('20000');
      if (await conCuanto.isVisible().catch(() => false)) await conCuanto.fill('50000');
      await shot(cli, F, 't04_pago_con_envio');
      const resp = cli.waitForResponse((r) => r.url().includes('/api/public/orders') && r.request().method() === 'POST');
      await cli.getByRole('button', { name: /Confirmar pedido/ }).click();
      const r = await resp;
      expect(r.status(), 'POST /public/orders').toBeLessThan(300);
      const body = await r.json();
      orderId = body.data?.orderId ?? body.orderId;
      expect(orderId, 'id del pedido QR').toBeTruthy();
    });

    await test.step('POS: costo sugerido por tramos; cambiarlo exige motivo', async () => {
      await goto(page, '/online-orders');
      const tarjeta = page.locator('div').filter({ hasText: new RegExp(cliente, 'i') }).filter({ has: page.getByRole('button', { name: 'Rechazar' }) }).last();
      await expect(tarjeta).toBeVisible({ timeout: 45000 });
      await tarjeta.getByRole('button', { name: 'Aceptar', exact: true }).click();
      await expect(page.getByTestId('qr-envio-cotizado')).toContainText('$1.500');
      await expect(page.getByTestId('qr-envio-cotizado')).toContainText('2,0 km');
      await page.getByRole('textbox', { name: 'Costo de envío' }).fill('1000');
      const confirmar = page.getByRole('button', { name: 'Confirmar', exact: true });
      await expect(confirmar).toBeDisabled();
      await shot(page, F, 't05_motivo_obligatorio');
      await page.getByTestId('qr-envio-motivo').selectOption('promocion');
      await expect(confirmar).toBeEnabled();
      const resp = page.waitForResponse((r) => /\/api\/qr-orders\/[^/]+\/accept/.test(r.url()));
      await confirmar.click();
      expect((await resp).status(), 'aceptar con motivo').toBeLessThan(300);
      await page.waitForTimeout(1000);
      await shot(page, F, 't06_aceptado');
      const pedidos = await api(page, 'GET', `/pos/orders?limit=200`, token);
      const lista = (Array.isArray(pedidos.data) ? pedidos.data : pedidos.data?.orders ?? pedidos.data?.data ?? []).filter((o: any) => String(o.customerName).toLowerCase() === cliente.toLowerCase());
      expect(lista.length, 'un pedido').toBe(1);
      orderId = lista[0].id;
      expect(Number(lista[0].deliveryFee), 'envio cobrado').toBe(1000);
      test.info().annotations.push({ type: 'observacion', description: `pedido ${String(orderId).slice(0, 8)} envio 1000 (sugerido 1500, motivo promocion)` });
    });
  } finally {
    if (orderId && orderId.length > 0) {
      const anula = await api(page, 'DELETE', `/pos/orders/${orderId}`, token, { reason: `${MARK}limpieza` }).catch(() => null);
      test.info().annotations.push({ type: 'observacion', description: `anulacion del pedido de prueba: ${anula?.status ?? 'sin respuesta'}` });
    }
    const fijo = await api(page, 'PUT', '/delivery-zones', token, { modo_envio: 'FIJO', envio_gratis_desde: null, radio_maximo: null, tramos: [] }).catch(() => null);
    test.info().annotations.push({ type: 'observacion', description: `sandbox vuelve a FIJO: ${fijo?.status ?? 'sin respuesta'}` });
    await movil.close();
  }
});
