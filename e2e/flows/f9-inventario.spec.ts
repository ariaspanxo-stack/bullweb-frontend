// F9 (LOTE 309): recorrido completo de Inventario como lo haria una administradora: proveedor, ingredientes, ficha con rendimiento, compra, merma, venta, movimientos, editar y borrar, Productos, Excel y plan Basico.
// La venta y el plan Basico solo corren en local (el sandbox de produccion no abre turno ni cambia de plan). Todo error 4xx/5xx no esperado, error de pagina o toast "Error" pelado es hallazgo y hace fallar el flujo.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, expect, shot, goto, loginPanel, api, creds } from '../lib/base';
import { assertFlow, currentEnv, loadEnvFile, FRONTEND_DIR, MARK, SANDBOX_TENANT_ID } from '../lib/guard';

const F = 'F9';
test.beforeAll(() => assertFlow(F));

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const R = Date.now().toString(36);
const N = {
  prov: `${MARK}F9-Proveedor-${R}`, contacto: `${MARK}Contacto`, rut: '76.123.456-7',
  harina: `${MARK}F9-Harina-${R}`, queso: `${MARK}F9-Queso-${R}`, sal: `${MARK}F9-Sal-${R}`, libre: `${MARK}F9-SinUso-${R}`,
  prod: `${MARK}F9-Pizza-${R}`, prodStock: `${MARK}F9-Bebida-${R}`, cliente: `${MARK}F9-${R}`,
};

test('F9 Inventario completo en pantalla', async ({ page }) => {
  test.setTimeout(540_000);
  page.setDefaultTimeout(30_000); // lib/base frena la API a 100 por minuto: una pantalla puede tardar en cargar
  const hallazgos: string[] = [];
  const esperados: RegExp[] = [];
  page.on('pageerror', (e) => hallazgos.push(`error de pagina: ${e.message.slice(0, 160)}`));
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (!u.pathname.startsWith('/api/') || r.status() < 400) return;
    const firma = `${r.status()} ${r.request().method()} ${u.pathname}`;
    if (esperados.some((x) => x.test(firma))) return;
    if (/(inventory|suppliers|menu|pos|cash|qr-orders|notifications)/.test(u.pathname)) hallazgos.push(`respuesta: ${firma}`);
  });
  const seccion = async (nombre: string, fn: () => Promise<void>) => {
    const antes = hallazgos.length;
    try {
      await test.step(nombre, fn);
      if (await page.getByText('Algo salió mal').count()) hallazgos.push(`${nombre}: pantalla de error`);
      for (const t of await page.locator('[role="status"]').allInnerTexts()) if (/^\s*Error\s*$/.test(t)) hallazgos.push(`${nombre}: toast Error pelado`);
    } catch (e: any) {
      hallazgos.push(`${nombre}: ${String(e.message).split('\n')[0].slice(0, 200)}`);
      await shot(page, F, `falla_${nombre.replace(/\W+/g, '_').slice(0, 30)}`).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
    }
    console.log(`F9 ${nombre}: hallazgos nuevos ${hallazgos.length - antes}`);
  };
  const tab = (nombre: string) => page.getByRole('button', { name: nombre, exact: true }).first().click();
  const nuevo = () => page.getByRole('button', { name: 'Nuevo', exact: true }).click();
  const inventario = async (t: string) => { await goto(page, '/inventory'); await tab(t); };
  const fila = (texto: string) => page.locator('tr').filter({ hasText: texto });
  const post = (p: string) => page.waitForResponse((r) => r.url().includes(`/api${p}`) && ['POST', 'PATCH', 'DELETE'].includes(r.request().method()));
  const toast = (re: RegExp) => expect(page.getByText(re).first()).toBeVisible({ timeout: 15000 });

  const c = creds();
  const token = await loginPanel(page, c.admin);

  // Datos de arranque por API: productos con la marca, para no tocar el catalogo del sandbox
  const lista = await api(page, 'GET', '/menu/products?perPage=50', token);
  const base = (lista.json?.data ?? []).find((p: any) => p.categoryId && p.available && !p.deletedAt && !String(p.name).startsWith('E2E'));
  expect(base, 'producto base con categoria').toBeTruthy();
  const pr = await api(page, 'POST', '/menu/products', token, { name: N.prod, price: 9000, categoryId: base.categoryId, stationId: base.stationId ?? undefined, showInQr: false });
  expect(pr.status, 'alta de producto de prueba').toBeLessThan(300);
  const pr2 = await api(page, 'POST', '/menu/products', token, { name: N.prodStock, price: 1500, categoryId: base.categoryId, stationId: base.stationId ?? undefined, showInQr: false, trackStock: true, stock: 5, stockMin: 2 });
  expect(pr2.status, 'alta de producto con stock').toBeLessThan(300);
  const prodId = pr.data.id;
  const costoProducto = async () => Number((await api(page, 'GET', `/menu/products/${prodId}`, token)).data.cost);

  await seccion('proveedor crear y editar', async () => {
    await inventario('Proveedores');
    await nuevo();
    await page.getByPlaceholder('Nombre del proveedor').fill(N.prov);
    await page.getByPlaceholder('Nombre del contacto').fill(N.contacto);
    await page.getByPlaceholder('correo@proveedor.com').fill('compras@proveedor.test');
    await page.getByPlaceholder('+56 9 XXXX XXXX').fill('+56 9 1111 2222');
    await page.getByPlaceholder('12.345.678-9').fill(N.rut);
    await shot(page, F, '01_proveedor_formulario');
    const r = post('/suppliers');
    await page.getByRole('button', { name: 'Crear Proveedor' }).click();
    expect((await r).status(), 'POST /suppliers').toBe(201);
    await expect(fila(N.prov)).toBeVisible();
    await expect(fila(N.prov)).toContainText(N.contacto);
    await expect(fila(N.prov)).toContainText(N.rut);
    await shot(page, F, '02_proveedor_creado');
    await fila(N.prov).locator('button').first().click();
    await page.getByPlaceholder('+56 9 XXXX XXXX').fill('+56 9 3333 4444');
    await page.getByPlaceholder('Nombre del contacto').fill(`${N.contacto} 2`);
    const u = post('/suppliers/');
    await page.getByRole('button', { name: 'Actualizar' }).click();
    expect((await u).status(), 'PATCH /suppliers').toBe(200);
    await expect(fila(N.prov)).toContainText('+56 9 3333 4444');
    await expect(fila(N.prov)).toContainText(`${N.contacto} 2`);
  });

  await seccion('proveedor con correo invalido da mensaje claro', async () => {
    esperados.push(/^400 POST \/api\/suppliers$/);
    await inventario('Proveedores');
    await nuevo();
    await page.getByPlaceholder('Nombre del proveedor').fill(`${N.prov}-X`);
    await page.getByPlaceholder('correo@proveedor.com').fill('no-es-correo');
    await page.getByRole('button', { name: 'Crear Proveedor' }).click();
    await toast(/correo/i);
    await shot(page, F, '03_proveedor_correo_invalido');
    await page.getByRole('button', { name: 'Cancelar' }).click();
    esperados.pop();
  });

  const crearIngrediente = async (nombre: string, unidad: string, costo: string, minimo: string, stock: string) => {
    await nuevo();
    await page.getByPlaceholder('Ej: Tomate, Pollo, Arroz').fill(nombre);
    await page.locator('select[name="unit"]').selectOption(unidad);
    await page.locator('input[name="currentStock"]').fill(stock);
    await page.locator('input[name="minStock"]').fill(minimo);
    await page.locator('input[name="cost"]').fill(costo);
    const r = post('/inventory/ingredients');
    await page.getByRole('button', { name: 'Crear Ingrediente' }).click();
    expect((await r).status(), `POST ingrediente ${nombre}`).toBe(201);
    await expect(fila(nombre)).toBeVisible();
  };

  await seccion('crear ingredientes', async () => {
    await inventario('Ingredientes');
    await crearIngrediente(N.harina, 'kg', '1000', '2', '10');
    await shot(page, F, '04_ingrediente_creado');
    await crearIngrediente(N.queso, 'kg', '5000', '1', '6');
    await crearIngrediente(N.sal, 'kg', '2000', '0', '3');
    await crearIngrediente(N.libre, 'unidad', '100', '0', '0');
    await expect(fila(N.harina)).toContainText(fmt(1000));
    await shot(page, F, '05_ingredientes');
  });

  const filaFicha = (i: number) => page.locator('select').filter({ hasText: 'Seleccionar ingrediente...' }).nth(i);
  await seccion('crear ficha con 3 ingredientes y rendimiento', async () => {
    await goto(page, '/products');
    await page.getByRole('button', { name: /Fichas técnicas/ }).click();
    await page.getByRole('button', { name: 'Nueva ficha' }).click();
    await page.locator('select').filter({ hasText: 'Seleccionar producto...' }).selectOption({ label: N.prod });
    const ponerItem = async (i: number, nombre: string, cant: string) => {
      await filaFicha(i).selectOption({ label: nombre });
      await page.locator('input[placeholder="Cant."]').nth(i).fill(cant);
    };
    await ponerItem(0, N.harina, '0.5');
    await page.getByRole('button', { name: 'Agregar otro ingrediente' }).click();
    await ponerItem(1, N.queso, '0.2');
    await page.getByRole('button', { name: 'Agregar otro ingrediente' }).click();
    await ponerItem(2, N.sal, '0.005');
    await page.getByLabel('Rendimiento').fill('2');
    await shot(page, F, '06_ficha_formulario');
    const r = post('/inventory/recipes');
    await page.getByRole('button', { name: 'Guardar ficha' }).click();
    expect((await r).status(), 'POST /inventory/recipes').toBe(201);
    const card = page.locator('h4', { hasText: N.prod }).locator('xpath=ancestor::div[contains(@class,"overflow-hidden")][1]');
    await expect(card).toContainText('Rinde 2');
    await expect(card).toContainText(fmt(755)); // (500 + 1000 + 10) / 2
    await shot(page, F, '07_ficha_creada');
    expect(await costoProducto(), 'costo del producto = total / rendimiento').toBeCloseTo(755, 1);
  });

  await seccion('editar ficha y que siga al volver a la pestana', async () => {
    await page.getByRole('button', { name: `Editar ficha de ${N.prod}` }).click();
    await page.locator('input[placeholder="Cant."]').nth(0).fill('1');
    const r = post('/inventory/recipes/');
    await page.getByRole('button', { name: 'Actualizar ficha' }).click();
    expect((await r).status(), 'PATCH /inventory/recipes').toBe(200);
    await expect(page.getByRole('button', { name: 'Actualizar ficha' })).toBeHidden();
    expect(await costoProducto(), 'costo tras editar').toBeCloseTo(1005, 1);
    await page.getByRole('button', { name: /^Productos/ }).click();
    await page.getByRole('button', { name: /Fichas técnicas/ }).click();
    await expect(page.locator('h4', { hasText: N.prod }), 'la ficha sigue al volver a la pestana').toBeVisible();
    await shot(page, F, '08_ficha_editada');
  });

  await seccion('compra actualiza stock y costo promedio', async () => {
    await inventario('Compras');
    await nuevo();
    await page.getByPlaceholder('Nombre del proveedor (opcional)').fill(N.prov);
    await page.locator('select').filter({ hasText: 'Seleccionar...' }).selectOption({ label: `${N.harina} (kg)` });
    await page.locator('input[type=number]').nth(0).fill('10');
    await page.locator('input[type=number]').nth(1).fill('2000');
    await shot(page, F, '09_compra_formulario');
    const r = post('/inventory/purchases');
    await page.getByRole('button', { name: 'Registrar Compra' }).click();
    expect((await r).status(), 'POST /inventory/purchases').toBe(201);
    await expect(fila(N.harina)).toBeVisible();
    await expect(fila(N.harina)).toContainText(N.prov);
    await expect(fila(N.harina)).toContainText('10');
    await shot(page, F, '10_compra_lista');
    await tab('Ingredientes');
    await expect(fila(N.harina)).toContainText('20');
    await expect(fila(N.harina)).toContainText(fmt(1500)); // (10 x 1000 + 10 x 2000) / 20
    expect(await costoProducto(), 'costo tras compra').toBeCloseTo(1255, 1);
  });

  await seccion('merma con motivo corto avisa y merma valida resta', async () => {
    esperados.push(/^400 POST \/api\/inventory\/movements$/);
    await inventario('Movimientos');
    await nuevo();
    await page.locator('select').filter({ hasText: 'Seleccionar ingrediente...' }).selectOption({ label: `${N.harina} — stock actual: 20 kg` });
    await page.getByPlaceholder('0', { exact: true }).fill('2');
    await page.getByPlaceholder('Descripción del movimiento').fill('mal');
    const corta = post('/inventory/movements');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    expect((await corta).status(), 'motivo corto').toBe(400);
    await toast(/muy corta/i);
    await shot(page, F, '11_merma_motivo_corto');
    esperados.pop();
    await page.getByPlaceholder('Descripción del movimiento').fill('Se cayo un saco');
    const r = post('/inventory/movements');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    expect((await r).status(), 'POST /inventory/movements').toBe(201);
    await expect(fila(N.harina).filter({ hasText: 'Merma' })).toContainText('-2');
    await shot(page, F, '12_merma');
  });

  if (currentEnv() === 'local') {
    await seccion('vender y descontar por ficha', async () => {
      await goto(page, '/restaurant');
      await page.getByRole('button', { name: 'Mostrador' }).click();
      const abrir = page.getByRole('button', { name: 'Abrir', exact: true });
      await expect(abrir.or(page.getByText('Turno abierto', { exact: true })).first()).toBeVisible();
      if (await abrir.isVisible()) {
        await abrir.click();
        await page.getByPlaceholder('0', { exact: true }).fill('10000');
        await page.getByRole('button', { name: 'Abrir turno' }).click();
        await expect(page.getByText('Turno abierto', { exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Nueva Orden' }).click();
      await page.getByPlaceholder('Ej: Juan Pérez').fill(N.cliente);
      await page.getByRole('button', { name: /Continuar/ }).click();
      await page.getByPlaceholder('Buscar producto...').fill(N.prod);
      await page.getByRole('button', { name: new RegExp(N.prod, 'i') }).first().click();
      const vender = page.getByRole('button', { name: 'Vender igual' });
      if (await vender.isVisible().catch(() => false)) await vender.click();
      const creada = page.waitForResponse((r) => r.url().endsWith('/api/pos/orders') && r.request().method() === 'POST');
      await page.getByRole('button', { name: /Crear Orden/ }).click();
      const order = (await (await creada).json()).data;
      await goto(page, '/restaurant');
      await page.getByRole('button', { name: 'Mostrador' }).click();
      const tarjeta = page.locator('div').filter({ hasText: new RegExp(N.cliente, 'i') }).filter({ has: page.getByRole('button', { name: 'Cobrar' }) }).last();
      await tarjeta.getByRole('button', { name: 'Cobrar' }).click();
      const metodo = page.locator('select').filter({ has: page.locator('option', { hasText: /efectivo/i }) }).first();
      await metodo.selectOption((await metodo.locator('option', { hasText: /efectivo/i }).first().getAttribute('value')) as string);
      await page.getByPlaceholder(/^Venta:/).first().fill('20000');
      await page.getByRole('button', { name: /^Cobrar \$/ }).click();
      await expect.poll(async () => (await api(page, 'GET', `/pos/orders/${order.id}`, token)).data.status).toBe('PAID');
      await inventario('Ingredientes');
      await expect(fila(N.harina)).toContainText('17.5'); // 18 - 1 / 2
      await expect(fila(N.queso)).toContainText('5.9'); // 6 - 0.2 / 2
      await shot(page, F, '13_stock_tras_venta');
      await tab('Movimientos');
      await expect(fila(N.harina).filter({ hasText: 'Venta' })).toContainText('-0.5');
      await shot(page, F, '14_movimientos_venta');
    });
  }

  await seccion('movimientos muestran compra y merma', async () => {
    await inventario('Movimientos');
    await expect(fila(N.harina).filter({ hasText: 'Compra' })).toBeVisible();
    await expect(fila(N.harina).filter({ hasText: 'Merma' })).toBeVisible();
    await shot(page, F, '15_movimientos');
  });

  await seccion('editar ingrediente en uso', async () => {
    await inventario('Ingredientes');
    await fila(N.queso).locator('button').first().click();
    await page.locator('input[name="minStock"]').fill('3');
    await page.locator('input[name="cost"]').fill('6000');
    await shot(page, F, '16_ingrediente_editar');
    const r = post('/inventory/ingredients/');
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    expect((await r).status(), 'PATCH ingrediente').toBe(200);
    await expect(fila(N.queso)).toContainText(fmt(6000));
    expect(await costoProducto(), 'costo tras editar el ingrediente').toBeCloseTo((1500 + 0.2 * 6000 + 10) / 2, 1);
  });

  await seccion('borrar ingrediente con uso da mensaje y sin uso se borra', async () => {
    esperados.push(/^409 DELETE \/api\/inventory\/ingredients\//);
    await inventario('Ingredientes');
    await fila(N.queso).locator('button').nth(1).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await toast(/ficha/i);
    await expect(fila(N.queso)).toBeVisible();
    await shot(page, F, '17_borrar_con_uso');
    esperados.pop();
    await fila(N.libre).locator('button').nth(1).click();
    const r = post('/inventory/ingredients/');
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    expect((await r).status(), 'DELETE ingrediente sin uso').toBeLessThan(300);
    await expect(fila(N.libre)).toBeHidden();
    await shot(page, F, '18_borrado_sin_uso');
  });

  await seccion('stock bajo filtra y buscar en Productos no rompe', async () => {
    await inventario('Ingredientes');
    await page.getByRole('button', { name: 'Stock Bajo' }).click();
    await expect(fila(N.harina)).toBeHidden();
    await page.getByRole('button', { name: 'Stock Bajo' }).click();
    await goto(page, '/products');
    await page.getByRole('button', { name: /^Ingredientes/ }).click();
    await page.getByPlaceholder(/Buscar/).first().fill('harina');
    await expect(page.getByText(N.harina).first()).toBeVisible();
    await shot(page, F, '19_productos_ingredientes_busqueda');
  });

  await seccion('pestana Productos ajusta stock simple', async () => {
    await inventario('Productos');
    await expect(fila(N.prodStock)).toContainText('5');
    await fila(N.prodStock).getByRole('button', { name: 'Ajustar' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.locator('input[type=number]').fill('7');
    await dlg.getByPlaceholder('Ej: conteo físico, reposición, merma').fill('Conteo F9');
    await dlg.getByRole('button', { name: 'Guardar ajuste' }).click();
    await expect(dlg).toBeHidden();
    await expect(fila(N.prodStock)).toContainText('7');
    await shot(page, F, '20_productos_ajuste');
  });

  await seccion('exportar Excel trae todas las hojas con datos', async () => {
    await goto(page, '/inventory');
    const d = page.waitForEvent('download', { timeout: 60000 });
    await page.getByRole('button', { name: 'Exportar Excel' }).click();
    const archivo = await (await d).path();
    const req = createRequire(resolve(FRONTEND_DIR, 'package.json'));
    const XLSX = req('xlsx');
    const wb = XLSX.read(readFileSync(archivo as string));
    const hoja = (n: string) => XLSX.utils.sheet_to_json(wb.Sheets[n]) as any[];
    expect(wb.SheetNames).toEqual(['Ingredientes', 'Compras', 'Movimientos', 'Proveedores']);
    const ing = hoja('Ingredientes').find((x) => x['Nombre'] === N.queso);
    expect(ing?.['Costo unit.'], 'Excel: costo del ingrediente').toBe(6000);
    expect(ing?.['Stock Mínimo'], 'Excel: minimo').toBe(3);
    expect(hoja('Compras').some((x) => x['Proveedor'] === N.prov && x['Ingrediente'] === N.harina), 'Excel: compra').toBeTruthy();
    expect(hoja('Movimientos').some((x) => x['Tipo'] === 'Merma' && x['Ingrediente'] === N.harina), 'Excel: merma').toBeTruthy();
    expect(hoja('Proveedores').some((x) => x['Nombre'] === N.prov && String(x['Contacto']).startsWith(N.contacto)), 'Excel: proveedor').toBeTruthy();
  });

  if (currentEnv() === 'local') {
    await seccion('plan Basico da 403 limpio y oculta pestanas', async () => {
      const env = loadEnvFile();
      const psql = (sql: string) => {
        const r = spawnSync(`${env.E2E_PG_BIN ?? 'C:/Users/Francisco/bullweb_pgtest/pgsql/bin'}/psql.exe`, ['-h', '127.0.0.1', '-p', '5433', '-U', 'postgres', '-d', 'bullweb_test', '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
        expect(r.status, `psql: ${r.stderr}`).toBe(0);
        return r.stdout.trim();
      };
      const antes = psql(`SELECT plan FROM subscriptions WHERE "tenantId"::text = '${SANDBOX_TENANT_ID}'`);
      psql(`UPDATE subscriptions SET plan = 'BASICO' WHERE "tenantId"::text = '${SANDBOX_TENANT_ID}'`);
      try {
        esperados.push(/^403 /);
        const ing = await api(page, 'GET', '/inventory/ingredients', token);
        expect(ing.status).toBe(403);
        expect(ing.json?.code).toBe('plan_upgrade_required');
        expect((await api(page, 'POST', '/suppliers', token, { name: `${N.prov}-B` })).status).toBe(403);
        expect((await api(page, 'POST', '/inventory/recipes', token, { productId: prodId, items: [] })).status).toBe(403);
        await goto(page, '/inventory');
        await expect(page.getByRole('button', { name: 'Productos', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Proveedores', exact: true })).toBeHidden();
        await expect(page.getByRole('button', { name: 'Compras', exact: true })).toBeHidden();
        await shot(page, F, '21_plan_basico');
      } finally {
        psql(`UPDATE subscriptions SET plan = '${antes}' WHERE "tenantId"::text = '${SANDBOX_TENANT_ID}'`);
        esperados.pop();
      }
    });
  }

  test.info().annotations.push({ type: 'observacion', description: `hallazgos ${hallazgos.length}` });
  console.log(`F9 HALLAZGOS (${hallazgos.length}):\n${hallazgos.join('\n')}`);
  expect(hallazgos, 'hallazgos del recorrido').toEqual([]);
});
