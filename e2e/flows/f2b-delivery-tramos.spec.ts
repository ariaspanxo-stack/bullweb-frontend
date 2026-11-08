// F2 (LOTE 314, solo bullweb_test): POS Delivery con envio por tramos. La direccion trae el costo sugerido con km y tramo;
// el cajero lo cambia, debe elegir motivo y la orden queda con el motivo (auditoria en el servidor). Google simulado local (T314-B = 2,001 km, tramo 2).
import { test, expect, shot, goto, loginPanel, api, creds, pausaApi } from '../lib/base';
import { assertFlow, MARK, SANDBOX_SLUG } from '../lib/guard';

const F = 'F2';
test.beforeAll(() => assertFlow(F));

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('F2 delivery por tramos: costo sugerido con km, cambio con motivo obligatorio', async ({ page }) => {
  const c = creds();
  const cliente = `${MARK}F2T-${Date.now().toString(36)}`;
  const token = await loginPanel(page, c.admin);
  let orderId = '';
  try {
    await test.step('sandbox en modo tramos', async () => {
      const o = await api(page, 'POST', '/delivery-zones/origen', token, { direccion: 'Local T314-L 1, Chillan' });
      expect(o.status, 'origen verificado').toBe(200);
      const s = await api(page, 'PUT', '/delivery-zones', token, { modo_envio: 'TRAMOS', envio_gratis_desde: null, radio_maximo: null, tramos: [
        { km_hasta: 2, costo: 1500, pedido_minimo: null }, { km_hasta: 5, costo: 2500, pedido_minimo: null }] });
      expect(s.status, 'tramos guardados').toBe(200);
    });

    await test.step('Nuevo Delivery: costo sugerido por tramos', async () => {
      await goto(page, '/restaurant');
      await page.getByRole('button', { name: 'Delivery' }).first().click();
      await page.getByRole('button', { name: /Nuevo Delivery/ }).first().click();
      await page.getByPlaceholder('Nombre completo').fill(cliente);
      await page.getByPlaceholder('+56 9 1234 5678').fill('+56900031402');
      await page.getByPlaceholder('Calle, número, depto...').fill('Calle T314-B 100');
      await page.getByPlaceholder('Ej: Santiago').fill('Chillan');
      await expect(page.getByTestId('pos-envio-sugerido')).toContainText('tramo 2');
      await expect(page.getByTestId('pos-envio-sugerido')).toContainText('2,0 km');
      await expect(page.getByTestId('pos-envio-costo')).toHaveValue('2500');
      await shot(page, F, 't01_delivery_sugerido');
    });

    await test.step('cambiar el costo exige motivo', async () => {
      await page.getByTestId('pos-envio-costo').fill('2000');
      await expect(page.getByTestId('pos-envio-motivo')).toBeVisible();
      await shot(page, F, 't02_motivo_visible');
      await page.getByTestId('pos-envio-motivo').selectOption('cliente_frecuente');
      await page.getByRole('button', { name: /Continuar — Elegir productos/ }).click();
      await pausaApi();
      const menu = await (await page.request.get(`/api/public/menu?slug=${SANDBOX_SLUG}`)).json();
      const productos = menu.data.categories.flatMap((x: any) => x.products ?? []);
      const simple = productos.find((p: any) => p.available && p.price > 0 && !(p.modifierGroups ?? []).length && !(p.trackStock && Number(p.stock) <= 0));
      expect(simple, 'producto sin modificadores').toBeTruthy();
      await page.getByPlaceholder('Buscar producto...').fill(simple.name);
      await page.getByRole('button', { name: new RegExp(esc(simple.name), 'i') }).first().click();
      const vender = page.getByRole('button', { name: 'Vender igual' });
      if (await vender.isVisible().catch(() => false)) await vender.click();
      await shot(page, F, 't03_productos');
      const resp = page.waitForResponse((r) => r.url().endsWith('/api/pos/orders') && r.request().method() === 'POST');
      await page.getByRole('button', { name: /Crear Delivery/ }).first().click();
      const r = await resp;
      expect(r.status(), 'POST /pos/orders').toBeLessThan(300);
      orderId = (await r.json()).data?.id;
      expect(orderId, 'id de la orden').toBeTruthy();
      const det = (await api(page, 'GET', `/pos/orders/${orderId}`, token)).data;
      expect(Number(det.deliveryFee), 'envio cobrado').toBe(2000);
      await shot(page, F, 't04_delivery_creado');
      test.info().annotations.push({ type: 'observacion', description: `orden ${String(orderId).slice(0, 8)} envio 2000 (sugerido 2500 tramo 2, motivo cliente_frecuente)` });
    });
  } finally {
    if (orderId) {
      const anula = await api(page, 'DELETE', `/pos/orders/${orderId}`, token, { reason: `${MARK}limpieza` }).catch(() => null);
      test.info().annotations.push({ type: 'observacion', description: `anulacion de la orden de prueba: ${anula?.status ?? 'sin respuesta'}` });
    }
    const fijo = await api(page, 'PUT', '/delivery-zones', token, { modo_envio: 'FIJO', envio_gratis_desde: null, radio_maximo: null, tramos: [] }).catch(() => null);
    test.info().annotations.push({ type: 'observacion', description: `sandbox vuelve a FIJO: ${fijo?.status ?? 'sin respuesta'}` });
  }
});
