// F1: login del panel, login del mesero y token viejo rechazado con "Sesion cerrada" VISIBLE en pantalla (orden del Comandante: falla hasta que el producto lo muestre). Corre en local y sandbox.
import { test, expect, shot, goto, loginPanel, api, creds } from '../lib/base';
import type { Page } from '@playwright/test';
import { assertFlow, SANDBOX_SLUG, assertToken } from '../lib/guard';

const F = 'F1';
test.beforeAll(() => assertFlow(F));

/** Tarjeta del aviso de pago: la del heading, no la pantalla de atras (el panel y el mesero tienen otro "Cerrar sesión" detras). */
const avisoPago = (page: Page) => page.locator('div', { has: page.getByRole('heading', { name: 'Tu período de prueba terminó' }) }).last();

async function logoutVisibleYAlto(aviso: ReturnType<typeof avisoPago>) {
  const salir = aviso.getByRole('button', { name: 'Cerrar sesión' });
  await expect(salir).toBeVisible();
  expect((await salir.boundingBox())?.height ?? 0, 'boton de al menos 44 px').toBeGreaterThanOrEqual(44);
  return salir;
}

/** El sandbox no esta vencido: el 402 y el estado de billing se simulan en el navegador; el cierre de sesion va al servidor real. */
async function bloqueoPanel(page: Page) {
  await page.route('**/api/billing/status', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'TRIAL', trialActive: false, expiredReason: 'TRIAL_ENDED', plan: 'TODO', priceCLP: 34000, daysLeft: 0 }) }));
  await page.route('**/api/tables**', (r) => r.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: 'subscription_required', status: 'TRIAL', expiredReason: 'TRIAL_ENDED' }) }));
}

/** Tras un rechazo la pagina recarga: espera a que se asiente y comprueba que no quedo sesion ni panel. Devuelve donde termino. */
async function estadoTrasRechazo(page: Page) {
  await expect.poll(() => page.evaluate(() => localStorage.getItem('bullweb_token')).catch(() => 'navegando'), { timeout: 20000 }).toBeNull();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);
  return new URL(page.url()).pathname;
}

test('F1 login panel, login mesero y token viejo da Sesion cerrada', async ({ page, context, violations }) => {
  const c = creds();

  await test.step('clave mala no entra', async () => {
    await goto(page, '/login');
    await page.getByPlaceholder('turestaurante@bullwebchile.com').fill(c.cajero.email);
    await page.getByPlaceholder('••••••••').fill('clave-mala-e2e');
    const resp = page.waitForResponse((r) => r.url().includes('/api/auth/login'));
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    expect((await resp).status()).toBe(401);
    const fin = await estadoTrasRechazo(page);
    expect(fin).toBe('/login');
    await expect(page.getByText(/contraseña incorrect/i).first(), 'E2E-H1: mensaje de clave incorrecta en pantalla').toBeVisible();
    await shot(page, F, '01_clave_mala');
  });

  let tokenAdmin = '';
  await test.step('login panel administrador', async () => {
    tokenAdmin = await loginPanel(page, c.admin, F);
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot(page, F, '02_panel_admin');
    const me = await api(page, 'GET', '/auth/me', tokenAdmin);
    expect(me.status).toBe(200);
    expect(me.data.name ?? me.data.user?.name).toBe('E2E-Admin');
    await page.evaluate(() => localStorage.clear());
  });

  let tokenCajero = '';
  await test.step('login panel cajero', async () => {
    await page.context().clearCookies();
    tokenCajero = await loginPanel(page, c.cajero);
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot(page, F, '03_panel_cajero');
    expect((await api(page, 'GET', '/auth/me', tokenCajero)).status).toBe(200);
  });

  await test.step('panel: token viejo tras cerrar sesion', async () => {
    // Sin la app corriendo al revocar: su propio 401 la redirigia a /login y abortaba el goto de abajo (ERR_ABORTED intermitente).
    await page.goto('about:blank');
    const out = await api(page, 'POST', '/auth/logout', tokenCajero);
    expect(out.status).toBeLessThan(300);
    const old = await api(page, 'GET', '/auth/me', tokenCajero);
    expect(old.status).toBe(401);
    expect(old.text).toContain('Sesión cerrada');

    // La pantalla con el token viejo: sale del panel y queda pidiendo ingreso.
    let rejected = 0;
    page.on('response', (r) => { if (r.status() === 401 && r.url().includes('/api/')) rejected++; });
    await goto(page, '/profile');
    await expect.poll(() => rejected, { timeout: 20000 }).toBeGreaterThan(0);
    const fin = await estadoTrasRechazo(page);
    expect(fin).toBe('/login');
    await expect(page.getByText('Sesión cerrada').first(), 'E2E-H2: aviso de sesion cerrada en el panel').toBeVisible();
    await shot(page, F, '04_panel_token_viejo');
  });

  await test.step('panel con 402: administrador paga o sale; cerrar sesion vuelve al login', async () => {
    await page.evaluate(() => localStorage.clear());
    const token = await loginPanel(page, c.admin);
    await bloqueoPanel(page);
    await goto(page, '/restaurant');
    const aviso = avisoPago(page);
    await expect(aviso).toBeVisible({ timeout: 20000 });
    const pagar = aviso.getByRole('button', { name: /^Pagar/ });
    await expect(pagar).toBeVisible();
    await expect(pagar).toHaveClass(/bg-orange-500/);
    const verificar = aviso.getByRole('button', { name: 'Ya pagué, verificar ahora' });
    await expect(verificar).toBeVisible();
    expect((await verificar.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    const salir = await logoutVisibleYAlto(aviso);
    await shot(page, F, '08_aviso_402_admin');
    await salir.click();
    await page.waitForURL((u) => u.pathname === '/login', { timeout: 20000 });
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('bullweb_token'))).toBeNull();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await expect.poll(async () => (await api(page, 'GET', '/auth/me', token)).status, { timeout: 90000 }).toBe(401);
    await shot(page, F, '09_login_tras_402_admin');
  });

  await test.step('panel con 402: cajero no ve Pagar y puede salir', async () => {
    const token = await loginPanel(page, c.cajero);
    await bloqueoPanel(page);
    await goto(page, '/restaurant');
    const aviso = avisoPago(page);
    await expect(aviso).toBeVisible({ timeout: 20000 });
    await expect(aviso.getByRole('button', { name: /^Pagar/ })).toHaveCount(0);
    const salir = await logoutVisibleYAlto(aviso);
    await shot(page, F, '10_aviso_402_cajero');
    await salir.click();
    await page.waitForURL((u) => u.pathname === '/login', { timeout: 20000 });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await expect.poll(async () => (await api(page, 'GET', '/auth/me', token)).status, { timeout: 90000 }).toBe(401);
  });

  await test.step('login mesero con PIN', async () => {
    await page.evaluate(() => localStorage.clear());
    await goto(page, `/mesero/login?tenant=${SANDBOX_SLUG}`);
    await page.getByRole('button', { name: c.mesero.name }).click();
    await expect(page.getByText('Ingresa tu PIN')).toBeVisible();
    await shot(page, F, '05_mesero_pin');
    for (const d of c.mesero.pin) await page.getByRole('button', { name: d, exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/mesero', { timeout: 20000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot(page, F, '06_mesero_mesas');
  });

  await test.step('mesero: token viejo tras cerrar sesion', async () => {
    const token = await page.evaluate(() => localStorage.getItem('waiterToken'));
    expect(token).toBeTruthy();
    assertToken(token as string);
    const out = await api(page, 'POST', '/waiter/logout', token as string);
    expect(out.status).toBeLessThan(300);
    const old = await api(page, 'GET', '/waiter/tables', token as string);
    expect(old.status).toBe(401);
    expect(old.text).toContain('Sesión cerrada');
    // Sin recargar: la propia app detecta el rechazo en su siguiente llamada; recargar borraria el aviso. Tocar Mis Ordenes fuerza esa llamada.
    await page.getByRole('button', { name: /Mis Órdenes/ }).click({ timeout: 3000 }).catch(() => {});
    await expect(page.getByText('Sesión cerrada').first(), 'E2E-H3: aviso de sesion cerrada en la app mesero').toBeVisible();
    await page.waitForURL((u) => u.pathname === '/mesero/login', { timeout: 20000 });
    expect(await page.evaluate(() => localStorage.getItem('waiterToken'))).toBeNull();
    await shot(page, F, '07_mesero_token_viejo');
  });

  await test.step('mesero con 402: cerrar sesion vuelve a su login', async () => {
    await page.getByRole('button', { name: c.mesero.name }).click();
    await expect(page.getByText('Ingresa tu PIN')).toBeVisible();
    for (const d of c.mesero.pin) await page.getByRole('button', { name: d, exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/mesero', { timeout: 20000 });
    const token = await page.evaluate(() => localStorage.getItem('waiterToken'));
    await page.route('**/api/waiter/tables**', (r) => r.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: 'subscription_required', status: 'TRIAL', expiredReason: 'TRIAL_ENDED' }) }));
    await goto(page, '/mesero');
    const aviso = avisoPago(page);
    await expect(aviso).toBeVisible({ timeout: 20000 });
    await expect(aviso.getByRole('button', { name: /^Pagar/ })).toHaveCount(0);
    const salir = await logoutVisibleYAlto(aviso);
    await shot(page, F, '11_aviso_402_mesero');
    await salir.click();
    await page.waitForURL((u) => u.pathname === '/mesero/login', { timeout: 20000 });
    expect(await page.evaluate(() => localStorage.getItem('waiterToken'))).toBeNull();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await expect.poll(async () => (await api(page, 'GET', '/waiter/tables', token as string)).status, { timeout: 90000 }).toBe(401);
    await shot(page, F, '12_login_mesero_tras_402');
  });

  expect(violations).toEqual([]);
  await context.clearCookies();
});
