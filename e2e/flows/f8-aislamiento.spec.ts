// F8: el usuario del sandbox no ve datos de otro tenant en 3 rutas de pantalla ni pidiendo ids ajenos por la API. Solo lectura. Corre en local y sandbox.
import { test, expect, shot, goto, loginPanel, api, creds } from '../lib/base';
import { assertFlow, SANDBOX_TENANT_ID } from '../lib/guard';

const F = 'F8';
test.beforeAll(() => assertFlow(F));

function tenantIds(v: unknown, out = new Set<string>()) {
  if (Array.isArray(v)) v.forEach((x) => tenantIds(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (/^tenant_?id$/i.test(k) && typeof x === 'string') out.add(x);
      tenantIds(x, out);
    }
  }
  return out;
}

test('F8 aislamiento: sin datos de otro tenant en 3 rutas y por id ajeno', async ({ page }) => {
  test.setTimeout(120_000);
  const c = creds();
  const token = await loginPanel(page, c.admin);
  expect(c.ajeno.tenantId).not.toBe(SANDBOX_TENANT_ID);

  const rutas: Array<{ ruta: string; prueba: string; paso: string }> = [
    { ruta: '/products', prueba: 'productos', paso: '01_productos' },
    { ruta: '/orders', prueba: 'pedidos', paso: '02_pedidos' },
    { ruta: '/employees', prueba: 'empleados', paso: '03_empleados' },
  ];
  for (const r of rutas) {
    await test.step(`pantalla ${r.ruta}`, async () => {
      const cuerpos: Promise<void>[] = [];
      const vistos = new Set<string>();
      let textos = 0;
      let ajeno = 0;
      const malas: string[] = [];
      const onResp = (resp: any) => {
        if (!resp.url().includes('/api/')) return;
        if (resp.status() >= 400) malas.push(`${resp.status()} ${new URL(resp.url()).pathname}`);
        cuerpos.push(resp.text().then((t: string) => {
          textos++;
          for (const id of [c.ajeno.tenantId, c.ajeno.orderId, c.ajeno.productId, c.ajeno.customerId]) if (t.includes(id)) ajeno++;
          try { tenantIds(JSON.parse(t), vistos); } catch { /* sin json */ }
        }).catch(() => {}));
      };
      page.on('response', onResp);
      await goto(page, r.ruta);
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1500);
      page.off('response', onResp);
      await Promise.all(cuerpos);
      expect(new URL(page.url()).pathname, 'sigue en la ruta pedida').toBe(r.ruta);
      expect(malas, `respuestas con error en ${r.ruta}`).toEqual([]);
      expect(textos, 'la pantalla pidio datos').toBeGreaterThan(0);
      expect(ajeno, 'ids del otro tenant en las respuestas').toBe(0);
      expect([...vistos].filter((t) => t !== SANDBOX_TENANT_ID), 'tenantId ajeno en las respuestas').toEqual([]);
      if (r.ruta === '/employees') await expect(page.getByText('E2E-Admin').first()).toBeVisible();
      await shot(page, F, r.paso);
      test.info().annotations.push({ type: 'observacion', description: `${r.ruta}: ${textos} respuestas, tenantId vistos=${vistos.size}, ids ajenos=0` });
    });
  }

  await test.step('API: ids de otro tenant no se leen', async () => {
    const probes: Array<[string, string]> = [
      ['pedido', `/pos/orders/${c.ajeno.orderId}`],
      ['producto', `/menu/products/${c.ajeno.productId}`],
      ['cliente', `/customers/${c.ajeno.customerId}`],
    ];
    const res: string[] = [];
    for (const [nombre, ruta] of probes) {
      const r = await api(page, 'GET', ruta, token);
      res.push(`${nombre}=${r.status}`);
      expect([400, 403, 404], `${nombre}: ${r.status}`).toContain(r.status);
      expect(r.text).not.toContain(c.ajeno.tenantId);
    }
    test.info().annotations.push({ type: 'observacion', description: `ids ajenos por API: ${res.join(' ')}` });
  });

  await test.step('API: pedir otro tenant por parametro no cambia el resultado', async () => {
    for (const ruta of [`/pos/orders?tenantId=${c.ajeno.tenantId}`, `/menu/products?tenantId=${c.ajeno.tenantId}`, `/customers?tenantId=${c.ajeno.tenantId}`]) {
      const r = await api(page, 'GET', ruta, token);
      const ajenos = [...tenantIds(r.json)].filter((t) => t !== SANDBOX_TENANT_ID);
      expect(ajenos, ruta.split('?')[0]).toEqual([]);
      expect(r.text.replaceAll(c.ajeno.tenantId, '')).not.toContain(c.ajeno.orderId);
      expect(r.text).not.toContain(c.ajeno.productId);
      expect(r.text).not.toContain(c.ajeno.customerId);
    }
  });
});
