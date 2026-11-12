// F5 + LOTE MP-A (solo bullweb_test con MP simulado): conectar la cuenta desde Configuracion -> Pagos, pedir en la carta a 360 px con
// "Pagar con Mercado Pago", rechazo con Reintentar, aprobacion, tracking, tarjeta del POS "Pagado con Mercado Pago", cerrar pedido -> PAID y desconectar.
// LOTE 329: traido de la rama e2e-mp-a (f33eb22) + portada: la tarjeta "Cobra en linea con Mercado Pago" lleva a Configuracion -> Pagos sin
// cuenta y, conectada, muestra "Conectado" y lo cobrado en linea de la semana. Corre con E2E_MP=1 (montaje local con MP simulado).
import { test, expect, shot, goto, loginPanel, api, creds, guardContext, pausaApi } from '../lib/base';
import { assertFlow, currentEnv, MARK, SANDBOX_SLUG } from '../lib/guard';

const F = 'F5';
test.beforeAll(() => assertFlow(F));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('F5 pago Mercado Pago simulado: conectar, rechazo y reintento, aprobado, POS pagado, cerrar y desconectar', async ({ page, browser, violations }) => {
  test.skip(currentEnv() !== 'local' || process.env.E2E_MP !== '1', 'solo local, con rama que trae Mercado Pago');
  const c = creds();
  const cliente = `${MARK}F5MP-${Date.now().toString(36)}`;
  const telefono = `+56 9 0001 ${String(Date.now()).slice(-4)}`;
  const movil = await browser.newContext({
    viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    locale: 'es-CL', timezoneId: 'America/Santiago', serviceWorkers: 'block',
  });
  await guardContext(movil, violations);
  const cli = await movil.newPage();
  let token = '';
  let conectado = false;

  try {
    await test.step('LOTE 329 portada sin cuenta: la tarjeta de Mercado Pago lleva a Configuracion -> Pagos', async () => {
      token = await loginPanel(page, c.admin);
      await goto(page, '/restaurant');
      const card = page.getByTestId('home-mp');
      await expect(card).toBeVisible({ timeout: 30000 });
      await expect(card.getByText('Cobra en línea con Mercado Pago')).toBeVisible();
      const btn = card.getByRole('button', { name: 'Conectar Mercado Pago' });
      expect((await btn.boundingBox())?.height ?? 0, 'boton de 44 px o mas').toBeGreaterThanOrEqual(44);
      await shot(page, F, 'mp_00_portada_sin_cuenta');
      await btn.click();
      await page.waitForURL(/\/settings\/pagos/, { timeout: 30000 });
    });

    await test.step('Configuracion -> Pagos: conectar con OAuth simulado', async () => {
      await expect(page.getByText('Sin conectar')).toBeVisible();
      await shot(page, F, 'mp_01_pagos_sin_conectar');
      await page.getByRole('button', { name: 'Conectar Mercado Pago' }).click();
      await page.waitForURL(/\/settings\/pagos/, { timeout: 30000 });
      await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
      await expect(page.getByText('Comision BullWeb')).toBeVisible();
      conectado = true;
      await shot(page, F, 'mp_02_pagos_conectado');
    });

    await test.step('carta 360 px: elegir Pagar con Mercado Pago', async () => {
      await pausaApi();
      const menu = await (await page.request.get(`/api/public/menu?slug=${SANDBOX_SLUG}`)).json();
      const prod = menu.data.categories.flatMap((x: any) => x.products ?? []).find((p: any) => p.available && (p.modifierGroups ?? []).some((g: any) => g.required || g.minSelect > 0));
      expect(prod).toBeTruthy();
      await goto(cli, `/carta/${SANDBOX_SLUG}`);
      await cli.getByPlaceholder('Buscar en el menú...').fill(prod.name);
      await cli.getByRole('button', { name: new RegExp(`^Agregar ${esc(prod.name)}$`, 'i') }).first().click();
      const grupo = prod.modifierGroups.find((g: any) => g.required || g.minSelect > 0);
      await cli.getByRole('button', { name: new RegExp(esc(grupo.options[0].name), 'i') }).first().click();
      await cli.getByRole('button', { name: /^Agregar \$/ }).click();
      await cli.getByRole('button', { name: 'Ver pedido' }).click();
      await cli.getByRole('button', { name: /Elegir forma de entrega/ }).click();
      await cli.getByRole('button', { name: /Retiro en mostrador/ }).click();
      await cli.getByPlaceholder('¿Cómo te llamamos?').fill(cliente);
      await cli.getByPlaceholder('+56 9 1234 5678').fill(telefono);
      await cli.getByRole('button', { name: /Ir a pagar/ }).click();
      const mp = cli.getByRole('button', { name: /Pagar con Mercado Pago/ });
      await expect(mp).toBeVisible();
      const alto = await mp.boundingBox();
      expect(alto?.height ?? 0, 'boton de 44 px o mas').toBeGreaterThanOrEqual(44);
      await mp.click();
      await shot(cli, F, 'mp_03_checkout');
      await cli.getByRole('button', { name: /Confirmar pedido/ }).click();
      await expect(cli.getByText(/Total a pagar/)).toBeVisible();
      await shot(cli, F, 'mp_04_tracking_pagar');
    });

    const pagarEnPopup = async (boton: RegExp, accion: string) => {
      const [pop] = await Promise.all([movil.waitForEvent('page'), cli.getByRole('button', { name: boton }).click()]);
      const btn = pop.getByRole('button', { name: accion });
      await expect(btn).toBeVisible({ timeout: 30000 });
      await btn.click();
      await expect(pop.locator('#resultado')).toBeVisible();
      await pop.close();
    };

    await test.step('rechazo: estado visible y Reintentar', async () => {
      await pagarEnPopup(/^Pagar con Mercado Pago$/, 'Rechazar pago');
      await expect(cli.getByRole('button', { name: 'Reintentar pago' })).toBeVisible({ timeout: 45000 });
      await expect(cli.getByText(/Tu pago fue rechazado/)).toBeVisible();
      await expect(cli.getByRole('button', { name: 'Pagar en caja' })).toBeVisible();
      await shot(cli, F, 'mp_05_rechazado');
    });

    await test.step('reintento aprobado: el tracking pasa a pagado y aceptado', async () => {
      await pagarEnPopup(/^Reintentar pago$/, 'Aprobar pago');
      await expect(cli.getByText(/Pago recibido con Mercado Pago/)).toBeVisible({ timeout: 45000 });
      await expect(cli.getByText(/Pedido aceptado/)).toBeVisible();
      await shot(cli, F, 'mp_06_pagado');
    });

    await test.step('LOTE 329 portada conectada: "Conectado" y lo cobrado en linea de la semana', async () => {
      await goto(page, '/restaurant');
      const card = page.getByTestId('home-mp');
      await expect(card.getByText('Conectado', { exact: true })).toBeVisible({ timeout: 30000 });
      await expect(card.getByText(/Cobrado en línea esta semana/)).toBeVisible();
      await expect(card.getByText(/\(\d+ pagos?\)/)).toBeVisible();
      await expect(card.getByRole('button', { name: 'Conectar Mercado Pago' })).toHaveCount(0);
      await shot(page, F, 'mp_06b_portada_conectada');
    });

    await test.step('POS: tarjeta Pagado con Mercado Pago; cerrar deja PAID', async () => {
      await goto(page, '/restaurant');
      await page.getByRole('button', { name: 'Mostrador' }).click();
      const nombre = new RegExp(esc(cliente), 'i');
      const tarjeta = page.locator('div').filter({ hasText: nombre }).filter({ has: page.getByRole('button', { name: 'Cerrar pedido' }) }).last();
      await expect(tarjeta).toBeVisible({ timeout: 60000 });
      await expect(tarjeta.getByText(/Pagado con Mercado Pago/)).toBeVisible();
      await expect(tarjeta.getByRole('button', { name: 'Cobrar' })).toHaveCount(0);
      await shot(page, F, 'mp_07_pos_pagado');
      await tarjeta.getByRole('button', { name: 'Cerrar pedido' }).click();
      await expect.poll(async () => {
        const r = await api(page, 'GET', '/pos/orders?limit=200&status=PAID', token);
        const lista = Array.isArray(r.data) ? r.data : r.data?.orders ?? r.data?.data ?? [];
        return lista.filter((o: any) => String(o.customerName).toLowerCase() === cliente.toLowerCase()).length;
      }, { timeout: 30000 }).toBe(1);
      await shot(page, F, 'mp_08_pos_cerrado');
    });

    await test.step('Desconectar: la carta deja de ofrecer Mercado Pago', async () => {
      await goto(page, '/settings/pagos');
      await page.getByRole('button', { name: 'Desconectar' }).click();
      await page.getByRole('button', { name: 'Desconectar' }).last().click();
      await expect(page.getByRole('button', { name: 'Conectar Mercado Pago' })).toBeVisible();
      conectado = false;
      await shot(page, F, 'mp_09_desconectado');
      await pausaApi();
      const m = await (await page.request.get(`/api/public/menu?slug=${SANDBOX_SLUG}`)).json();
      expect(m.data.cartaSettings.mercadoPago.connected).toBe(false);
    });

    await test.step('local fuera de la lista blanca: Configuracion no muestra Pagos y /settings/pagos redirige', async () => {
      await page.route('**/api/payments/mp/status', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { enabled: false } }) }));
      await goto(page, '/settings');
      await expect(page.getByRole('heading', { name: 'Configuración' }).first()).toBeVisible();
      await page.waitForTimeout(1500);
      await expect(page.getByText('Mercado Pago')).toHaveCount(0);
      await shot(page, F, 'mp_10_fuera_de_lista');
      await goto(page, '/settings/pagos');
      await page.waitForURL((u) => u.pathname === '/settings', { timeout: 15000 });
      await expect(page.getByRole('button', { name: 'Conectar Mercado Pago' })).toHaveCount(0);
      await page.unroute('**/api/payments/mp/status');
    });
  } finally {
    if (token && conectado) await api(page, 'POST', '/payments/mp/disconnect', token, {}).catch(() => null);
    await movil.close();
  }
});
