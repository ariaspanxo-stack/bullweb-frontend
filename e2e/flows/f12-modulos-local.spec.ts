// F12 (LOTE 325): caso 5 Estrellas en el sandbox LOCAL. Precondicion por SQL (run_f12): plan Full, precio 19.900 y fila
// module_subscriptions fidelizacion = inactive. Verifica: menu sin Fidelizacion, Clientes e Inventario visibles, /campaigns muestra
// "Modulo desactivado" (datos guardados), /inventory carga normal y /billing/status trae 19.900 con Full. Solo lectura. Solo local.
import { test, expect, shot, goto, loginPanel, api, creds } from '../lib/base';
import { assertFlow } from '../lib/guard';

const F = 'F12';
test.beforeAll(() => assertFlow(F));

test('F12 modulos por local: Full 19.900 con Fidelizacion apagada (caso 5 Estrellas)', async ({ page }) => {
  test.setTimeout(120_000);
  const c = creds();
  const token = await loginPanel(page, c.admin);

  const st = await api(page, 'GET', '/billing/status', token);
  const d = st.data;
  const mod = (k: string) => (d?.modules ?? []).find((m: any) => m.key === k);
  expect(d?.plan, 'plan Full').not.toBe('BASICO');
  expect(d?.priceCLP, 'precio guardado').toBe(19900);
  expect(mod('fidelizacion')?.state, `fidelizacion forzada apagada; modules=${JSON.stringify(d?.modules ?? null)} keys=${Object.keys(d ?? {}).join(',')}`).toBe('off');
  expect(mod('inventario')?.enabled, 'inventario visible').toBe(true);

  await goto(page, '/restaurant');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('a[href="/customers"]').first(), 'Clientes sigue en el menu').toBeVisible({ timeout: 15000 });
  await expect(page.locator('a[href="/campaigns"]'), 'Fidelizacion fuera del menu').toHaveCount(0);
  await shot(page, F, '01_menu_sin_fidelizacion');

  await goto(page, '/campaigns');
  await expect(page.getByTestId('module-disabled'), 'pantalla de modulo desactivado').toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Tus datos siguen guardados')).toBeVisible();
  await shot(page, F, '02_campanas_desactivado');

  await goto(page, '/inventory');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('module-disabled')).toHaveCount(0);
  await shot(page, F, '03_inventario_intacto');
});
