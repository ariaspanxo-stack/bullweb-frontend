// F11 (LOTE 324): Config > Canales enciende la Pantalla de pedidos; /tv/<token> sin login muestra el pedido de mostrador en
// "Preparando", pasa a "Listo" sola (polling 10 s) y sale al entregarse; 16:9 sin scroll y ninguna letra bajo 48 px; sin datos
// personales; regenerar invalida el enlace anterior y apagar deja 404. Corre en local y sandbox (deja la pantalla apagada).
import { test, expect, shot, goto, loginPanel, api, creds, guardContext } from '../lib/base';
import { assertFlow, MARK, SANDBOX_SLUG } from '../lib/guard';

const F = 'F11';
test.beforeAll(() => assertFlow(F));

test('F11 pantalla de pedidos: encender, ver Preparando y Listo, regenerar y apagar', async ({ page, browser, violations }) => {
  // La TV va en un contexto aparte (sin la sesion del panel): misma lista blanca de trafico
  const tvPage = async () => { const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); await guardContext(ctx, violations); return ctx.newPage(); };
  test.setTimeout(240_000);
  const c = creds();
  const token = await loginPanel(page, c.admin);
  let link = '';
  let orderId = '';
  let numero = '';

  try {
    await test.step('Config > Canales: encender la pantalla', async () => {
      await goto(page, '/settings');
      await page.getByTestId('settings-canales').click();
      await expect(page.getByRole('heading', { name: 'Pantalla de pedidos' })).toBeVisible();
      const sw = page.getByTestId('channels-tv-switch');
      expect((await sw.boundingBox())?.height ?? 0, 'switch de al menos 44 px').toBeGreaterThanOrEqual(44);
      await expect(sw).toBeEnabled(); // la config ya cargo (mientras carga se pinta apagado y deshabilitado)
      if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click();
      await expect(sw).toHaveAttribute('aria-checked', 'true');
      link = (await page.getByTestId('channels-tv-link').innerText()).trim();
      expect(link).toMatch(/\/tv\/[0-9a-f]{48}$/);
      await shot(page, F, '01_canales_encendida');
    });

    await test.step('pedido de mostrador por la API', async () => {
      const menu = await api(page, 'GET', `/public/menu?slug=${SANDBOX_SLUG}`, token);
      const prod = (menu.data?.categories ?? []).flatMap((x: any) => x.products ?? [])
        .find((p: any) => p.available !== false && p.price > 0 && !(p.modifierGroups ?? []).some((g: any) => g.required || g.minSelect > 0) && !(p.trackStock && Number(p.stock) <= 0));
      expect(prod, 'producto sin modificador obligatorio').toBeTruthy();
      const r = await api(page, 'POST', '/pos/orders', token, { type: 'TAKEAWAY', customerName: `${MARK}F11-${Date.now().toString(36)}`, items: [{ productId: prod.id, quantity: 1 }] });
      expect(r.status, r.text.slice(0, 200)).toBe(201);
      orderId = r.data?.id;
      numero = String(r.data?.orderNumber ?? '').split('-').pop() ?? '';
      expect(numero).not.toBe('');
    });

    await test.step('la TV sin login muestra el pedido en Preparando, 16:9 y letras de 48 px o mas', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const tv = await tvPage();
      await goto(tv, new URL(link).pathname);
      const board = tv.getByTestId('tv-board');
      await expect(board).toBeVisible();
      const prep = tv.getByTestId('tv-col-preparing');
      await expect(prep.getByTestId('tv-item').filter({ hasText: numero })).toBeVisible({ timeout: 20_000 });
      const medidas = await tv.evaluate(() => {
        const root = document.querySelector('[data-testid="tv-board"]') as HTMLElement;
        const min = Math.min(...Array.from(root.querySelectorAll('*')).filter((e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize)));
        return { min, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, w: innerWidth, h: innerHeight, texto: root.innerText };
      });
      expect(medidas.min, 'ninguna letra bajo 48 px').toBeGreaterThanOrEqual(48);
      expect(medidas.sw <= medidas.w && medidas.sh <= medidas.h, '16:9 sin scroll').toBe(true);
      expect(medidas.texto.includes(MARK), 'sin el nombre completo del cliente').toBe(false);
      await shot(tv, F, '02_tv_preparando');

      expect((await api(page, 'PATCH', `/pos/orders/${orderId}`, token, { status: 'READY' })).status).toBeLessThan(300);
      await expect(tv.getByTestId('tv-col-ready').getByTestId('tv-item').filter({ hasText: numero })).toBeVisible({ timeout: 25_000 });
      await expect(prep.getByTestId('tv-item').filter({ hasText: numero })).toHaveCount(0);
      await shot(tv, F, '03_tv_listo');

      expect((await api(page, 'PATCH', `/pos/orders/${orderId}`, token, { status: 'DELIVERED' })).status).toBeLessThan(300);
      await expect(board.getByTestId('tv-item').filter({ hasText: numero })).toHaveCount(0, { timeout: 25_000 });
      await shot(tv, F, '04_tv_entregado_fuera');
      await tv.context().close();
    });

    await test.step('regenerar invalida el enlace anterior', async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await goto(page, '/settings/canales');
      await page.getByTestId('channels-tv-regenerate').click();
      await page.getByRole('button', { name: 'Regenerar', exact: true }).last().click();
      await expect(page.getByTestId('channels-tv-link')).not.toHaveText(link);
      const nuevo = (await page.getByTestId('channels-tv-link').innerText()).trim();
      const tv = await tvPage();
      await goto(tv, new URL(link).pathname);
      await expect(tv.getByTestId('tv-missing')).toBeVisible({ timeout: 15_000 });
      await goto(tv, new URL(nuevo).pathname);
      await expect(tv.getByTestId('tv-board')).toBeVisible();
      await tv.context().close();
      link = nuevo;
      await shot(page, F, '05_regenerado');
    });
  } finally {
    await test.step('apagar: el enlace queda en 404', async () => {
      await goto(page, '/settings/canales');
      const sw = page.getByTestId('channels-tv-switch');
      await expect(sw).toBeVisible();
      await expect(sw).toBeEnabled();
      if ((await sw.getAttribute('aria-checked')) === 'true') await sw.click();
      await expect(sw).toHaveAttribute('aria-checked', 'false');
      if (link) {
        const r = await api(page, 'GET', `/public/tv/${link.split('/').pop()}`, token);
        expect(r.status, 'pantalla apagada').toBe(404);
      }
      await shot(page, F, '06_apagada');
    });
  }
});
