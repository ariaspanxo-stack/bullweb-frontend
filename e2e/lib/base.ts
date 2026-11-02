// E2E-1: test base. Bloquea lo que salga de la lista blanca, reporta violaciones y saca capturas JPG de 200 KB o menos.
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FRONTEND_DIR, assertUrl, assertToken, baseURL, creds, currentEnv, hostAllowed, type Creds } from './guard';

const MAX_JPG = 200 * 1024;
const FECHA = process.env.E2E_FECHA ?? new Date().toISOString().slice(0, 10);
export const EVID_DIR = resolve(FRONTEND_DIR, '..', '_auditoria', 'evidencia', '_e2e', FECHA);

// apiLimiter corre antes de autenticar: 120/min por IP, sumando todo /api. La suite se frena sola bajo ese tope
// para no medir un 429 propio y para no dejar sin servicio a quien trabaje desde la misma IP.
const TOPE_MIN = 100;
const SUAVE_DESDE = 40;
const stamps: number[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const purgar = () => { const t = Date.now(); while (stamps.length && t - stamps[0] > 61_000) stamps.shift(); };
export async function pausaApi() {
  for (;;) {
    purgar();
    if (stamps.length < TOPE_MIN) break;
    await sleep(61_000 - (Date.now() - stamps[0]) + 50);
  }
  stamps.push(Date.now());
  if (stamps.length > SUAVE_DESDE) await sleep(500);
}

export async function guardContext(ctx: BrowserContext, violations: string[]) {
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    if (req.url().startsWith('data:') || req.url().startsWith('blob:')) return route.continue();
    const host = new URL(req.url()).host;
    if (hostAllowed(host)) {
      if (new URL(req.url()).pathname.startsWith('/api/')) await pausaApi();
      return route.continue().catch(() => {});
    }
    const t = req.resourceType();
    if (/bullweb/i.test(host) && ['document', 'xhr', 'fetch', 'websocket'].includes(t)) violations.push(`${t} ${host}`);
    return route.abort();
  });
}

export async function shot(page: Page, flow: string, step: string) {
  const dir = join(EVID_DIR, currentEnv(), flow);
  mkdirSync(dir, { recursive: true });
  let buf: Buffer = Buffer.alloc(0);
  for (const quality of [70, 55, 40, 28, 18]) {
    buf = await page.screenshot({ type: 'jpeg', quality, fullPage: false, animations: 'disabled', timeout: 15000 });
    if (buf.length <= MAX_JPG) break;
  }
  if (buf.length > MAX_JPG) throw new Error(`captura ${step} pasa de 200 KB`);
  writeFileSync(join(dir, `${step}.jpg`), buf);
}

export const test = base.extend<{ violations: string[]; forEachGuard: void }>({
  violations: async ({}, use) => { await use([]); },
  forEachGuard: [async ({ context, violations }, use) => {
    // Cada flujo parte con cupo: si el anterior gasto mucho, espera a que baje.
    for (purgar(); stamps.length > 20; purgar()) await sleep(2000);
    await guardContext(context, violations);
    await use();
    expect(violations, 'trafico fuera de la lista blanca').toEqual([]);
  }, { auto: true }],
});
export { expect };

export const goto = async (page: Page, path: string) => {
  const url = new URL(path, baseURL()).toString();
  assertUrl(url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
};

export async function loginPanel(page: Page, c: Creds, flow?: string) {
  await goto(page, '/login');
  await page.getByPlaceholder('turestaurante@bullwebchile.com').fill(c.email);
  await page.getByPlaceholder('••••••••').fill(c.password);
  if (flow) await shot(page, flow, '00_login_formulario');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  const token = await page.evaluate(() => localStorage.getItem('bullweb_token'));
  expect(token, 'token tras login').toBeTruthy();
  assertToken(token as string);
  return token as string;
}

/** Llamada directa a la API con el token de la sesion; pasa por la lista blanca igual que la pagina. */
export async function api(page: Page, method: string, path: string, token: string, body?: unknown) {
  const url = new URL('/api' + path, baseURL()).toString();
  assertUrl(url);
  await pausaApi();
  const r = await page.request.fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body === undefined ? undefined : JSON.stringify(body),
    failOnStatusCode: false,
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* sin json */ }
  return { status: r.status(), json, data: json?.data ?? json, text };
}

export { creds };
