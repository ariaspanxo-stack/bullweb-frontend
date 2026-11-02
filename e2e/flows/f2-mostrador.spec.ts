// F2 (solo bullweb_test): turno -> pedido Mostrador con modificador obligatorio -> comanda -> Preparar/Listo por item -> cobro en efectivo con vuelto.
import { test, expect, shot, goto, loginPanel, api, creds, pausaApi } from '../lib/base';
import { assertFlow, MARK, SANDBOX_SLUG } from '../lib/guard';

const F = 'F2';
test.beforeAll(() => assertFlow(F));

const fmt = (n: number) => Math.round(n).toLocaleString('es-CL');

test('F2 turno, Mostrador con modificador obligatorio, comanda, Preparar y Listo por item, cobro con vuelto', async ({ page }) => {
  const c = creds();
  const cliente = `${MARK}F2-${Date.now().toString(36)}`;
  const token = await loginPanel(page, c.admin);

  await test.step('abrir turno', async () => {
    await goto(page, '/restaurant');
    await page.getByRole('button', { name: 'Mostrador' }).click();
    const abrir = page.getByRole('button', { name: 'Abrir', exact: true });
    await expect(abrir.or(page.getByText('Turno abierto', { exact: true })).first()).toBeVisible();
    if (await abrir.isVisible()) {
      await shot(page, F, '01_sin_turno');
      await abrir.click();
      await page.getByPlaceholder('0', { exact: true }).fill('10000');
      await page.getByRole('button', { name: 'Abrir turno' }).click();
    }
    await expect(page.getByText('Turno abierto', { exact: true })).toBeVisible();
    await shot(page, F, '02_turno_abierto');
  });

  let elegida = '';
  await test.step('pedido Mostrador: el modificador obligatorio bloquea', async () => {
    await page.getByRole('button', { name: 'Nueva Orden' }).click();
    await page.getByPlaceholder('Ej: Juan Pérez').fill(cliente);
    await page.getByRole('button', { name: /Continuar/ }).click();
    await page.getByPlaceholder('Buscar producto...').fill('Barros Luco');
    await page.getByRole('button', { name: /Barros Luco/ }).first().click();
    const dlg = page.getByRole('dialog', { name: 'Barros Luco' });
    await expect(dlg).toBeVisible();
    const grupo = dlg.getByRole('region', { name: /Tamaño/ });
    await expect(grupo.getByText('Obligatorio', { exact: false })).toBeVisible();
    const marcadas = await grupo.locator('button[aria-pressed="true"]').count();
    if (marcadas === 0) {
      await dlg.getByRole('button', { name: 'Agregar', exact: true }).click();
      await expect(dlg.getByRole('alert').first()).toBeVisible();
      await shot(page, F, '03_obligatorio_bloquea');
    } else {
      // Con opcion por defecto no hay como dejar el grupo vacio: se elige la otra y se comprueba que llega al pedido.
      test.info().annotations.push({ type: 'observacion', description: 'grupo obligatorio con opcion por defecto: el bloqueo por vacio no aplica en este producto' });
      await shot(page, F, '03_obligatorio_con_defecto');
    }
    const opcion = grupo.locator('button[aria-pressed="false"]').first();
    elegida = (await opcion.locator('span.truncate').innerText()).trim();
    await opcion.click();
    await dlg.getByRole('button', { name: 'Agregar', exact: true }).click();
    await expect(dlg).toBeHidden();
    await shot(page, F, '04_item_en_ticket');
  });

  await test.step('segundo item sin modificadores', async () => {
    await pausaApi();
    const menu = await (await page.request.get(`/api/public/menu?slug=${SANDBOX_SLUG}`)).json();
    const productos = menu.data.categories.flatMap((x: any) => x.products ?? []);
    const simple = productos.find((p: any) => p.available && !(p.modifierGroups ?? []).length && !/Barros/i.test(p.name));
    expect(simple, 'producto sin modificadores en la carta').toBeTruthy();
    await page.getByPlaceholder('Buscar producto...').fill(simple.name);
    await page.getByRole('button', { name: new RegExp(simple.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first().click();
    const vender = page.getByRole('button', { name: 'Vender igual' });
    if (await vender.isVisible().catch(() => false)) await vender.click();
    await shot(page, F, '05_dos_items');
  });

  let order: any;
  await test.step('crear la orden', async () => {
    const resp = page.waitForResponse((r) => r.url().endsWith('/api/pos/orders') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Crear Orden/ }).click();
    const r = await resp;
    expect(r.status(), 'POST /pos/orders').toBeLessThan(300);
    const creada = (await r.json()).data;
    order = (await api(page, 'GET', `/pos/orders/${creada.id}`, token)).data;
    expect(order.order_items.length).toBe(2);
    expect(JSON.stringify(order.order_items), 'la opcion elegida llega al pedido').toContain(elegida);
    await expect(page.getByText(new RegExp(cliente, 'i')).first()).toBeVisible();
    await shot(page, F, '06_orden_creada');
  });

  await test.step('comanda en cocina: Preparar y Listo por item', async () => {
    const cocina = await page.context().newPage();
    await goto(cocina, '/kds');
    const tarjeta = cocina.locator('div').filter({ hasText: new RegExp(cliente, 'i') }).filter({ hasText: /Barros Luco/i }).filter({ has: cocina.getByRole('button', { name: /Urgente/ }) }).last();
    await expect(tarjeta).toBeVisible({ timeout: 30000 });
    await expect(tarjeta.getByText(/Barros Luco/i)).toBeVisible();
    await shot(cocina, F, '07_comanda_kds');

    await tarjeta.getByRole('button', { name: 'Iniciar' }).first().click();
    await expect(tarjeta.getByRole('button', { name: 'Listo' })).toHaveCount(1);
    await shot(cocina, F, '08_item1_preparando');
    await tarjeta.getByRole('button', { name: 'Listo' }).click();
    await expect.poll(async () => {
      const r = await api(cocina, 'GET', `/pos/orders/${order.id}`, token);
      return r.data.order_items.filter((i: any) => i.status === 'READY').length;
    }).toBe(1);
    await shot(cocina, F, '09_item1_listo');

    // Un item listo no adelanta al otro: el segundo sigue pendiente hasta que se marca.
    const parcial = await api(cocina, 'GET', `/pos/orders/${order.id}`, token);
    expect(parcial.data.order_items.filter((i: any) => i.status === 'PENDING').length).toBe(1);

    await tarjeta.getByRole('button', { name: 'Iniciar' }).first().click();
    await tarjeta.getByRole('button', { name: 'Listo' }).click();
    await expect.poll(async () => {
      const r = await api(cocina, 'GET', `/pos/orders/${order.id}`, token);
      return r.data.order_items.filter((i: any) => i.status === 'READY').length;
    }).toBe(2);
    await shot(cocina, F, '10_items_listos');
    await cocina.close();
  });

  await test.step('cobro en efectivo con vuelto', async () => {
    await goto(page, '/restaurant');
    await page.getByRole('button', { name: 'Mostrador' }).click();
    const tarjeta = page.locator('div').filter({ hasText: new RegExp(cliente, 'i') }).filter({ has: page.getByRole('button', { name: 'Cobrar' }) }).last();
    await expect(tarjeta).toBeVisible();
    await tarjeta.getByRole('button', { name: 'Cobrar' }).click();

    const total = Math.round(Number(order.total));
    const pagaCon = (Math.ceil(total / 1000) + 2) * 1000;
    const vuelto = pagaCon - total;
    const metodo = page.locator('select').filter({ has: page.locator('option', { hasText: /efectivo/i }) }).first();
    const valor = await metodo.locator('option', { hasText: /efectivo/i }).first().getAttribute('value');
    await metodo.selectOption(valor as string);
    await page.getByPlaceholder(/^Venta:/).first().fill(String(pagaCon));
    await expect(page.getByText('Vuelto', { exact: true })).toBeVisible();
    await expect(page.getByText(`$${fmt(vuelto)}`, { exact: true }).first()).toBeVisible();
    await shot(page, F, '11_vuelto');

    const pago = page.waitForResponse((r) => /\/api\/pos\/orders\/[^/]+\/pay|\/api\/payments|\/pay/.test(r.url()) && r.request().method() === 'POST');
    await page.getByRole('button', { name: /^Cobrar \$/ }).click();
    expect((await pago).status()).toBeLessThan(300);
    await expect.poll(async () => (await api(page, 'GET', `/pos/orders/${order.id}`, token)).data.status).toBe('PAID');
    await shot(page, F, '12_pagado');
    test.info().annotations.push({ type: 'observacion', description: `total ${total}, paga con ${pagaCon}, vuelto ${vuelto}` });
  });
});
