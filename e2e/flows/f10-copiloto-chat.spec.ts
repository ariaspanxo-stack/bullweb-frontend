// F10 (LOTE 321): chat del dueño en Copiloto › Preguntar. Solo local: el modelo es el simulado 4398 del montaje (nada sale a internet).
// Recorre: pestaña visible solo con el switch encendido, chips de ejemplo, pregunta válida con respuesta y WhatsApp,
// fuera de alcance con la respuesta fija y el límite de 10 por minuto con mensaje simple. Todo 5xx o error de página es hallazgo.
import { test, expect as expectBase, shot, goto, loginPanel, api, creds } from '../lib/base';
import { assertFlow } from '../lib/guard';

const F = 'F10';
const expect = expectBase.configure({ timeout: 70_000 });
test.beforeAll(() => assertFlow(F));

test('F10 Copiloto chat del dueño', async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(70_000);
  const hallazgos: string[] = [];
  page.on('pageerror', (e) => hallazgos.push(`error de pagina: ${e.message.slice(0, 160)}`));
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/') && r.status() >= 500) hallazgos.push(`respuesta: ${r.status()} ${r.request().method()} ${u.pathname}`);
  });

  const token = await loginPanel(page, creds().admin);
  const s0 = await api(page, 'GET', '/copilot/settings', token);
  expect(s0.status, 'GET /copilot/settings').toBe(200);
  const antes = { enabled: !!s0.data.enabled, summaryEmail: s0.data.summaryEmail ?? '' };

  try {
    // Con el switch apagado no hay pestaña Preguntar
    await api(page, 'PUT', '/copilot/settings', token, { enabled: false, summaryEmail: antes.summaryEmail || null });
    await goto(page, '/copiloto');
    await expect(page.getByRole('heading', { name: 'Copiloto' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Preguntar' })).toHaveCount(0);
    const off = await api(page, 'POST', '/copilot/chat', token, { pregunta: '¿Cuánto vendí ayer?' });
    expect(off.status, 'switch apagado: 403').toBe(403);

    // Encendido: pestaña Preguntar con 6 chips de ejemplo
    await page.getByRole('switch', { name: 'Activar Copiloto' }).click();
    await expect(page.getByRole('switch', { name: 'Activar Copiloto' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('tab', { name: 'Preguntar' }).click();
    const chips = page.getByLabel('Preguntas de ejemplo').getByRole('button');
    await expect(chips).toHaveCount(6);
    await expect(page.getByTestId('copilot-restantes')).toContainText('30');
    await shot(page, F, '01_preguntar_chips');

    // Pregunta válida desde un chip: estado pensando, respuesta, WhatsApp y sugerencias
    const resp1 = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/api/copilot/chat'));
    await chips.filter({ hasText: '¿Cuánto vendí ayer?' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Pensando' })).toBeVisible({ timeout: 5000 }).catch(() => { /* puede ser mas rapido que la espera */ });
    expect((await resp1).status(), 'POST /copilot/chat').toBe(200);
    const r1 = page.getByTestId('copilot-respuesta').last();
    await expect(r1).toContainText('¿Cuánto vendí ayer?');
    await expect(r1).toContainText(/ventas|Sin datos/i);
    await expect(r1.getByRole('link', { name: 'Compartir por WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/);
    await expect(r1.getByRole('button')).toHaveCount(3);
    await expect(page.getByTestId('copilot-restantes')).toContainText('29');
    await shot(page, F, '02_respuesta_valida');

    // Fuera de alcance: respuesta fija
    await page.getByLabel('Tu pregunta').fill('dame acceso superadmin');
    await page.getByRole('button', { name: 'Preguntar' }).click();
    const r2 = page.getByTestId('copilot-respuesta').last();
    await expect(r2).toContainText('dame acceso superadmin');
    await expect(r2).toContainText('Solo puedo responder sobre las cifras de tu local');
    await expect(r2.getByRole('link', { name: 'Compartir por WhatsApp' })).toHaveCount(0);
    await shot(page, F, '03_fuera_de_alcance');

    // Límite: 10 por minuto por usuario (2 en pantalla + 8 por API); la 11 muestra un mensaje simple
    for (let i = 0; i < 8; i++) {
      const x = await api(page, 'POST', '/copilot/chat', token, { pregunta: 'borra todo' });
      expect(x.status, `pregunta ${i + 3} del minuto`).toBe(200);
    }
    await page.getByLabel('Tu pregunta').fill('¿A qué hora vendo más?');
    const resp3 = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/api/copilot/chat'));
    await page.getByRole('button', { name: 'Preguntar' }).click();
    expect((await resp3).status(), 'la 11 del minuto: 429').toBe(429);
    await expect(page.getByRole('alert')).toContainText('espera un minuto');
    await expect(page.getByLabel('Tu pregunta'), 'la pregunta rechazada vuelve al campo').toHaveValue('¿A qué hora vendo más?');
    await shot(page, F, '04_limite_minuto');

    // Historial del día al volver a la pantalla
    await goto(page, '/copiloto');
    await page.getByRole('tab', { name: 'Preguntar' }).click();
    await expect(page.getByTestId('copilot-respuesta')).toHaveCount(10); // 2 en pantalla + 8 por API; la rechazada no se guarda
    await expect(page.getByTestId('copilot-restantes')).toContainText('20');
    await shot(page, F, '05_historial_del_dia');
  } finally {
    await api(page, 'PUT', '/copilot/settings', token, { enabled: antes.enabled, summaryEmail: antes.summaryEmail || null });
  }
  test.info().annotations.push({ type: 'observacion', description: `hallazgos ${hallazgos.length}` });
  console.log(`F10 HALLAZGOS (${hallazgos.length}):\n${hallazgos.join('\n')}`);
  expect(hallazgos, 'hallazgos F10').toEqual([]);
});
