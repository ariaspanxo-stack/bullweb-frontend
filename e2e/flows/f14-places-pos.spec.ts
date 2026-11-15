// F14 (deploy 335, solo sandbox): autocompletado de direccion de Google Places en POS Delivery con la clave de navegador real.
// Solo lectura: abre Nuevo Delivery, escribe una direccion y espera sugerencias; no crea pedido ni cliente.
// La guarda de contexto aborta hosts externos: aqui se deja pasar solo places.googleapis.com (las rutas de pagina ganan a las de contexto).
import { test, expect, shot, goto, loginPanel, api, creds } from '../lib/base';
import { assertFlow } from '../lib/guard';

const F = 'F14';
test.beforeAll(() => assertFlow(F));

test('F14 POS Delivery: la direccion muestra sugerencias de Google Places', async ({ page }) => {
  const c = creds();
  const token = await loginPanel(page, c.admin);

  await test.step('el backend entrega clave de navegador al POS', async () => {
    const r = await api(page, 'GET', '/delivery-zones/places', token);
    expect(r.status, 'GET /delivery-zones/places').toBe(200);
    const key = String(r.data?.key ?? '');
    expect(key.length, 'clave presente (largo)').toBeGreaterThan(20);
    test.info().annotations.push({ type: 'observacion', description: `clave largo=${key.length} comuna=${r.data?.comuna ?? '-'} punto=${r.data?.lat != null}` });
  });

  const respuestas: number[] = [];
  await page.route('https://places.googleapis.com/**', (route) => route.continue());
  page.on('response', (res) => { if (res.url().startsWith('https://places.googleapis.com/')) respuestas.push(res.status()); });

  await test.step('Nuevo Delivery: escribir direccion y ver sugerencias', async () => {
    await goto(page, '/restaurant');
    await page.getByRole('button', { name: 'Delivery' }).first().click();
    await page.getByRole('button', { name: /Nuevo Delivery/ }).first().click();
    const campo = page.getByTestId('pos-envio-direccion');
    await campo.click();
    await campo.pressSequentially('Avenida Libertad 1000', { delay: 60 });
    const lista = page.getByTestId('pos-envio-direccion-sugerencias');
    await expect(lista, 'lista de sugerencias visible').toBeVisible({ timeout: 15000 });
    const n = await lista.locator('li').count();
    expect(n, 'al menos una sugerencia').toBeGreaterThan(0);
    await shot(page, F, 't01_sugerencias');
    expect(respuestas.length, 'llamadas a Places').toBeGreaterThan(0);
    expect(respuestas.every((s) => s === 200), `Places respondio ${respuestas.join(',')}`).toBe(true);
    test.info().annotations.push({ type: 'observacion', description: `sugerencias=${n} places_http=${respuestas.join(',')}` });
  });
});
