// V2 (lote 308b, solo local): cupon en la carta QR a 360 px: se aplica, el total baja, el pedido llega con descuento y al aceptar la orden queda con el mismo total.
import { test, expect, shot, goto, loginPanel, api, creds, guardContext, pausaApi } from '../lib/base';
import { assertFlow, MARK, SANDBOX_SLUG } from '../lib/guard';

const F = 'V2';
test.beforeAll(() => assertFlow(F));

test('V2 cupon en la carta QR a 360 px', async ({ page, browser, violations }) => {
  const c = creds();
  const cliente = `${MARK}V2-${Date.now().toString(36)}`;
  const telefono = `+56 9 0001 ${String(Date.now()).slice(-4)}`;
  const codigo = `E2EPW${Date.now().toString(36).toUpperCase()}`;
  const token = await loginPanel(page, c.admin);
  const nuevo = await api(page, 'POST', '/coupons', token, { code: codigo, type: 'PERCENTAGE', value: 10, expiresAt: '2030-01-15' });
  expect(nuevo.status, 'crear cupon').toBe(201);

  const movil = await browser.newContext({
    viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    locale: 'es-CL', timezoneId: 'America/Santiago', serviceWorkers: 'block',
  });
  await guardContext(movil, violations);
  const cli = await movil.newPage();
  try {
    await pausaApi();
    const menu = await (await page.request.get(`/api/public/menu?slug=${SANDBOX_SLUG}`)).json();
    expect(menu.data.cartaSettings.couponsEnabled, 'la carta informa cupones').toBe(true);
    const prod = menu.data.categories.flatMap((x: any) => x.products ?? []).find((p: any) => p.available && !(p.modifierGroups ?? []).length);
    expect(prod, 'producto sin modificadores').toBeTruthy();

    await goto(cli, `/carta/${SANDBOX_SLUG}`);
    await cli.getByPlaceholder('Buscar en el menú...').fill(prod.name);
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await cli.getByRole('button', { name: new RegExp(`^Agregar ${esc(prod.name)}$`, 'i') }).first().click();
    const agregar = cli.getByRole('button', { name: /^Agregar \$/ });
    if (await agregar.isVisible().catch(() => false)) await agregar.click();
    await cli.getByRole('button', { name: 'Ver pedido' }).click();
    await cli.getByRole('button', { name: /Elegir forma de entrega/ }).click();
    await cli.getByRole('button', { name: /Retiro en mostrador/ }).click();
    await cli.getByPlaceholder('¿Cómo te llamamos?').fill(cliente);
    await cli.getByPlaceholder('+56 9 1234 5678').fill(telefono);
    await cli.getByRole('button', { name: /Ir a pagar/ }).click();
    const efectivo = cli.getByRole('button', { name: /efectivo/i }).first();
    await expect(efectivo).toBeVisible();
    await efectivo.click();
    const conCuanto = cli.getByPlaceholder('20000');
    if (await conCuanto.isVisible()) await conCuanto.fill('200000');

    const campo = cli.getByLabel('Código de cupón');
    await campo.fill('NOEXISTE');
    await cli.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expect(cli.getByText(/no existe|no se puede usar/)).toBeVisible();
    await shot(cli, F, '01_cupon_invalido');

    await campo.fill(codigo.toLowerCase());
    await expect(campo).toHaveValue(codigo);
    await cli.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expect(cli.getByTestId('carta-cupon').getByText(codigo)).toBeVisible();
    await shot(cli, F, '02_cupon_aplicado');
    expect(await cli.evaluate(() => document.documentElement.scrollWidth), 'sin desborde').toBeLessThanOrEqual(360);

    const precio = Math.round(Number(prod.promoPrice ?? prod.price));
    const descuento = Math.round(precio * 0.1);
    const esperado = `$${(precio - descuento).toLocaleString('es-CL')}`;
    const confirmar = cli.getByRole('button', { name: /Confirmar pedido/ });
    await expect(confirmar).toContainText(esperado);

    const resp = cli.waitForResponse((r) => r.url().includes('/api/public/orders') && r.request().method() === 'POST');
    await confirmar.click();
    const r = await resp;
    expect(r.status(), 'POST /public/orders').toBeLessThan(300);
    const orderId = (await r.json()).orderId;
    await expect(cli.getByText('Esperando confirmación del local…')).toBeVisible();

    const acepta = await api(page, 'POST', `/qr-orders/${orderId}/accept`, token, { estimatedMinutes: 15 });
    expect(acepta.status, 'aceptar').toBe(200);
    expect(Number(acepta.json?.total), 'total de la orden con descuento').toBe(precio - descuento);
    await shot(cli, F, '03_seguimiento');
  } finally {
    await movil.close();
    await api(page, 'DELETE', `/coupons/${nuevo.data?.id}`, token);
  }
});
