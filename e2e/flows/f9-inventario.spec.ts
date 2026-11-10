// F9 (LOTE 309, extendido en el 310 con compras a credito, guias, factura, parcial y compra antigua): recorrido completo de Inventario como lo haria una administradora: proveedor, ingredientes, ficha con rendimiento, compra, merma, venta, movimientos, editar y borrar, Productos, Excel y plan Basico.
// La venta y el plan Basico solo corren en local (el sandbox de produccion no abre turno ni cambia de plan). Todo error 4xx/5xx no esperado, error de pagina o toast "Error" pelado es hallazgo y hace fallar el flujo.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, expect as expectBase, shot, goto, loginPanel, api, creds } from '../lib/base';
import { assertFlow, currentEnv, loadEnvFile, FRONTEND_DIR, MARK, SANDBOX_TENANT_ID } from '../lib/guard';

const F = 'F9';
// lib/base frena la API a 100 por minuto: una pantalla puede esperar hasta 61 s en cargar sin que sea un fallo
const expect = expectBase.configure({ timeout: 70_000 });
test.beforeAll(() => assertFlow(F));

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const R = Date.now().toString(36);
const N = {
  prov: `${MARK}F9-Proveedor-${R}`, contacto: `${MARK}Contacto`, rut: '76.123.456-7',
  harina: `${MARK}F9-Harina-${R}`, queso: `${MARK}F9-Queso-${R}`, sal: `${MARK}F9-Sal-${R}`, libre: `${MARK}F9-SinUso-${R}`,
  prod: `${MARK}F9-Pizza-${R}`, prodStock: `${MARK}F9-Bebida-${R}`, cliente: `${MARK}F9-${R}`,
  compra: `${MARK}F9-Aceite-${R}`, // LOTE 310: ingrediente propio para las compras con pago (no mueve el stock que miden las otras secciones)
};

test('F9 Inventario completo en pantalla', async ({ page }) => {
  test.setTimeout(540_000);
  page.setDefaultTimeout(70_000);
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
  // LOTE 323: el aviso se busca entre los toasts (role=status); con getByText en toda la pagina, /ficha/i tomaba el enlace
  // "Fichas tecnicas" de Inventario y la prueba avanzaba antes de la respuesta del servidor
  const toast = (re: RegExp) => expect(page.locator('[role="status"]').filter({ hasText: re }).first()).toBeVisible({ timeout: 20000 });

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
  const ingCompra = await api(page, 'POST', '/inventory/ingredients', token, { name: N.compra, unit: 'lt', currentStock: 0, minStock: 0, cost: 1000 });
  expect(ingCompra.status, 'alta de ingrediente para compras 310').toBeLessThan(300);
  const costoProducto = async () => Number((await api(page, 'GET', `/menu/products/${prodId}`, token)).data.cost);

  await seccion('proveedor crear y editar', async () => {
    // LOTE 316: la lista debe estar cargada antes de crear (si la carga inicial llega despues del POST, pisa la lista con datos viejos)
    const listaInicial = page.waitForResponse((r) => r.request().method() === 'GET' && /\/api\/suppliers(\?|$)/.test(r.url()), { timeout: 30000 }).catch(() => null);
    await inventario('Proveedores');
    await listaInicial;
    await nuevo();
    await page.getByPlaceholder('Nombre del proveedor').fill(N.prov);
    await page.getByPlaceholder('Nombre del contacto').fill(N.contacto);
    await page.getByPlaceholder('correo@proveedor.com').fill('compras@proveedor.test');
    await page.getByPlaceholder('+56 9 XXXX XXXX').fill('+56 9 1111 2222');
    await page.getByPlaceholder('12.345.678-9').fill(N.rut);
    await shot(page, F, '01_proveedor_formulario');
    const r = post('/suppliers');
    const recarga = page.waitForResponse((x) => x.request().method() === 'GET' && /\/api\/suppliers(\?|$)/.test(x.url()), { timeout: 30000 }).catch(() => null);
    await page.getByRole('button', { name: 'Crear Proveedor' }).click();
    expect((await r).status(), 'POST /suppliers').toBe(201);
    // LOTE 316: se espera la fila tras la recarga de la lista; si la recarga vino sin el proveedor, se reabre la pestana (queda anotado)
    const g = await recarga;
    const trae = g ? (await g.text().catch(() => '')).includes(N.prov) : false;
    if (!trae || !(await fila(N.prov).isVisible().catch(() => false))) {
      await fila(N.prov).waitFor({ state: 'visible', timeout: 15000 }).catch(async () => {
        test.info().annotations.push({ type: 'observacion', description: `lista de proveedores sin el nuevo tras crear (recarga ${g ? g.status() : 'sin GET'}, trae=${trae}): pestana reabierta` });
        console.log(`F9 OBSERVACION: lista de proveedores sin el nuevo tras crear (recarga ${g ? g.status() : 'sin GET'}, trae=${trae}); pestana reabierta`);
        await inventario('Proveedores');
      });
    }
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

  // LOTE 321: el caso que anoto F9 (lista sin el proveedor nuevo tras un POST 201). La carga inicial de la lista llega al
  // servidor ANTES del POST y su respuesta vuelve DESPUES (red lenta o el freno de la suite). Hasta el 321, invalidateQueries
  // se colgaba de esa peticion vieja y la fila no aparecia sin reabrir la pestana. Aqui NO se reabre: la fila debe llegar sola.
  await seccion('proveedor creado mientras la lista inicial aun carga', async () => {
    const nombre = `${N.prov}-R`;
    let demorada = false;
    let pendiente: Promise<void> | null = null;
    await page.route(/\/api\/suppliers(\?|$)/, async (route) => {
      if (demorada || route.request().method() !== 'GET') return route.fallback();
      demorada = true;
      pendiente = (async () => {
        const resp = await route.fetch(); // la peticion llega al servidor ya, antes del POST
        await new Promise((r) => setTimeout(r, 6000)); // y su respuesta vuelve tarde
        await route.fulfill({ response: resp }).catch(() => { /* la pagina ya la descarto: es lo esperado con el arreglo */ });
      })();
      await pendiente;
    });
    try {
      await inventario('Proveedores');
      await nuevo();
      await page.getByPlaceholder('Nombre del proveedor').fill(nombre);
      const r = post('/suppliers');
      await page.getByRole('button', { name: 'Crear Proveedor' }).click();
      expect((await r).status(), 'POST /suppliers con la lista aun cargando').toBe(201);
      await expect(fila(nombre), 'la fila nueva aparece sin reabrir la pestana').toBeVisible({ timeout: 20000 });
      await shot(page, F, '02b_proveedor_lista_lenta');
    } finally {
      await (pendiente as Promise<void> | null)?.catch(() => {});
      await page.unroute(/\/api\/suppliers(\?|$)/);
    }
  });

  const crearIngrediente =async (nombre: string, unidad: string, costo: string, minimo: string, stock: string) => {
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

  // LOTE 310: credito con guia, segunda guia, factura que cierra ambas y el resumen vuelve a lo de antes; parcial marcada pagada; compra antigua Pagada / —
  const porPagar = async () => Number((await api(page, 'GET', '/inventory/purchases/payables', token)).data?.totalPending ?? 0);
  let base310 = 0;
  const nuevaCompra = async (o: { qty: string; cost: string; medio: string; estado?: string; pagado?: string; doc?: string; num?: string }) => {
    await nuevo();
    const dlg = page.getByRole('dialog', { name: 'Nueva Compra' });
    await dlg.getByLabel('Proveedor').selectOption({ label: N.prov });
    await dlg.locator('select').filter({ hasText: 'Seleccionar...' }).selectOption({ label: `${N.compra} (lt)` });
    await dlg.locator('input[type=number]').nth(0).fill(o.qty);
    await dlg.locator('input[type=number]').nth(1).fill(o.cost);
    await dlg.getByLabel('Medio de pago').selectOption({ label: o.medio });
    if (o.estado) await dlg.getByLabel('Estado').selectOption({ label: o.estado });
    if (o.pagado) await dlg.getByLabel('Monto pagado').fill(o.pagado);
    if (o.doc) await dlg.getByLabel('Tipo de documento').selectOption({ label: o.doc });
    if (o.num) await dlg.getByLabel('N° documento').fill(o.num);
    await expect(dlg.getByTestId('total-compra')).toHaveText(fmt(Number(o.qty) * Number(o.cost)));
    return dlg;
  };
  await seccion('compras 310: credito con dos guias y factura que las cierra', async () => {
    base310 = await porPagar();
    await inventario('Compras');
    let dlg = await nuevaCompra({ qty: '2', cost: '1000', medio: 'Crédito proveedor', doc: 'Guía de despacho', num: 'G1-' + R });
    await expect(dlg.getByLabel('Estado'), 'credito fuerza Por pagar').toHaveValue('PENDING');
    await expect(dlg.getByLabel('Estado')).toBeDisabled();
    await expect(dlg.getByLabel('Vencimiento')).toBeVisible();
    await shot(page, F, '10b_compra_credito_guia');
    let r = post('/inventory/purchases');
    await dlg.getByRole('button', { name: 'Registrar Compra' }).click();
    expect((await r).status(), 'POST compra credito').toBe(201);
    const g1 = fila('G1-' + R);
    await expect(g1).toContainText('Por pagar');
    await expect(g1).toContainText('Crédito proveedor');
    await expect(g1).toContainText(fmt(2000));
    dlg = await nuevaCompra({ qty: '3', cost: '1000', medio: 'Crédito proveedor', doc: 'Guía de despacho', num: 'G2-' + R });
    r = post('/inventory/purchases');
    await dlg.getByRole('button', { name: 'Registrar Compra' }).click();
    expect((await r).status(), 'POST segunda guia').toBe(201);
    await expect(fila('G2-' + R)).toContainText('Por pagar');
    await expect(page.getByTestId('por-pagar')).toHaveText(fmt(base310 + 5000));
    await shot(page, F, '10c_dos_guias_por_pagar');
    await page.getByRole('button', { name: 'Registrar factura' }).click();
    const fx = page.getByRole('dialog', { name: 'Registrar factura' });
    await fx.getByLabel('Proveedor').selectOption({ label: N.prov + ' (2)' });
    for (const cb of await fx.locator('input[type=checkbox]').all()) await cb.check();
    await expect(fx.getByTestId('total-factura')).toHaveText(fmt(5000));
    await fx.getByLabel('N° factura').fill('F-' + R);
    await fx.getByLabel('¿Cómo se pagó?').selectOption({ label: 'Transferencia' });
    await shot(page, F, '10d_registrar_factura');
    r = post('/inventory/purchases/close-invoice');
    await fx.getByRole('button', { name: 'Registrar factura' }).click();
    expect((await r).status(), 'POST close-invoice').toBe(200);
    await expect(fx).toBeHidden();
    await expect(page.getByTestId('por-pagar'), 'resumen vuelve a lo de antes').toHaveText(fmt(base310));
    await expect(fila('G1-' + R)).toContainText('Pagada');
    await expect(fila('G2-' + R)).toContainText('Pagada');
    await expect(fila('G1-' + R)).toContainText('Transferencia');
    await shot(page, F, '10e_guias_pagadas');
    expect(await porPagar(), 'API: por pagar').toBeCloseTo(base310, 0);
  });

  await seccion('compras 310: parcial y marcar pagada', async () => {
    await inventario('Compras');
    const dlg = await nuevaCompra({ qty: '1', cost: '4000', medio: 'Transferencia', estado: 'Parcial', pagado: '1500', doc: 'Factura', num: 'FP-' + R });
    let r = post('/inventory/purchases');
    await dlg.getByRole('button', { name: 'Registrar Compra' }).click();
    expect((await r).status(), 'POST compra parcial').toBe(201);
    const fp = fila('FP-' + R);
    await expect(fp).toContainText('Parcial');
    await expect(page.getByTestId('por-pagar')).toHaveText(fmt(base310 + 2500));
    await fp.click();
    const det = page.getByRole('dialog', { name: 'Detalle de compra' });
    await expect(det).toContainText(fmt(2500));
    await det.getByRole('button', { name: 'Marcar pagada' }).click();
    await det.getByLabel('¿Cómo se pagó?').selectOption({ label: 'Efectivo' });
    await shot(page, F, '10f_marcar_pagada');
    r = page.waitForResponse((x) => x.url().includes('/mark-paid') && x.request().method() === 'POST');
    await det.getByRole('button', { name: 'Confirmar pago' }).click();
    expect((await r).status(), 'POST mark-paid').toBe(200);
    await expect(det.getByRole('button', { name: 'Marcar pagada' })).toBeHidden();
    await det.getByRole('button', { name: 'Cerrar' }).last().click();
    await expect(det).toBeHidden();
    await expect(fp).toContainText('Pagada');
    await expect(page.getByTestId('por-pagar'), 'resumen baja a lo de antes').toHaveText(fmt(base310));
  });

  if (currentEnv() === 'local') {
    await seccion('compras 310: compra antigua se ve Pagada sin medio ni documento', async () => {
      const env = loadEnvFile();
      const psql = (q: string) => {
        const x = spawnSync((env.E2E_PG_BIN ?? 'C:/Users/Francisco/bullweb_pgtest/pgsql/bin') + '/psql.exe', ['-h', '127.0.0.1', '-p', '5433', '-U', 'postgres', '-d', 'bullweb_test', '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-c', q], { encoding: 'utf8' });
        expect(x.status, 'psql: ' + x.stderr).toBe(0);
        return x.stdout.trim();
      };
      psql(`INSERT INTO stock_movements (id, "ingredientId", type, quantity, "previousStock", "newStock", reference, notes, "tenantId") SELECT gen_random_uuid()::text, id, 'PURCHASE', 1, "currentStock", "currentStock", '${N.prov}-Antigua', 'compra anterior al 310', "tenantId" FROM ingredients WHERE name = '${N.compra}'`);
      await inventario('Compras');
      const ant = fila(N.prov + '-Antigua');
      await expect(ant).toContainText('Pagada');
      const celdas = await ant.locator('td').allInnerTexts();
      expect(celdas[6], 'medio de compra antigua').toBe('—');
      expect(celdas[8], 'documento de compra antigua').toBe('—');
      await ant.click();
      const det = page.getByRole('dialog', { name: 'Detalle de compra' });
      await expect(det).toContainText('antes de los medios de pago');
      await shot(page, F, '10g_compra_antigua');
      await det.getByRole('button', { name: 'Cerrar' }).last().click();
    });
  }

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
    const d = page.waitForEvent('download', { timeout: 90000 });
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
