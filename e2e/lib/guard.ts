// E2E-1: lista blanca. La suite aborta si el entorno, la URL o el slug no estan aqui. Nada de esto se configura por variable de entorno.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const FRONTEND_DIR = resolve(here, '..', '..');

export const SANDBOX_SLUG = 'tu-mejor-sabor-216e63';
export const SANDBOX_TENANT_ID = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568';
export const MARK = 'E2E-PW-';

export type E2EEnv = 'local' | 'sandbox';

const ALLOWED: Record<E2EEnv, { baseURL: string; hosts: string[]; flows: string[] }> = {
  local: { baseURL: 'http://127.0.0.1:5175', hosts: ['127.0.0.1:5175', 'localhost:5175', '127.0.0.1:4399'], flows: ['F1', 'F2', 'F5', 'F8', 'F9', 'F10', 'F11', 'F12', 'V1', 'V2'] }, // LOTE 321: F10 solo local (modelo simulado); LOTE 324: F11 pantalla de pedidos; LOTE 325: F12 modulos por local (precondicion SQL, solo local); LOTE 329: 127.0.0.1:4399 = MP simulado del montaje (OAuth y checkout del F5-MP), como en e2e-mp-a
  sandbox: { baseURL: 'https://app.bullwebchile.com', hosts: ['app.bullwebchile.com'], flows: ['F1', 'F5', 'F8', 'F9', 'F11'] }, // LOTE 324: F11 deja la pantalla apagada
};

export function currentEnv(): E2EEnv {
  const e = process.env.E2E_ENV;
  if (e !== 'local' && e !== 'sandbox') throw new Error(`E2E ABORTADO: E2E_ENV debe ser local o sandbox (llego ${e ?? 'vacio'})`);
  return e;
}

export const baseURL = () => ALLOWED[currentEnv()].baseURL;
export const hostAllowed = (host: string) => ALLOWED[currentEnv()].hosts.includes(host);

export function assertUrl(url: string) {
  const u = new URL(url);
  if (!hostAllowed(u.host)) throw new Error(`E2E ABORTADO: host fuera de la lista blanca: ${u.host}`);
  const m = u.pathname.match(/^\/(?:carta|mesa|kiosk)\/([^/]+)/);
  if (m && m[1] !== SANDBOX_SLUG) throw new Error(`E2E ABORTADO: slug fuera de la lista blanca: ${m[1]}`);
  const t = u.searchParams.get('tenant') ?? u.searchParams.get('slug');
  if (t && t !== SANDBOX_SLUG) throw new Error(`E2E ABORTADO: slug fuera de la lista blanca: ${t}`);
}

export function assertFlow(flow: string) {
  if (!ALLOWED[currentEnv()].flows.includes(flow)) throw new Error(`E2E ABORTADO: ${flow} no corre en ${currentEnv()}`);
}

export function assertToken(token: string) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  if (payload.tenantId !== SANDBOX_TENANT_ID) throw new Error('E2E ABORTADO: la sesion no es del tenant sandbox');
}

export function loadEnvFile(): Record<string, string> {
  const p = resolve(FRONTEND_DIR, '.env.e2e');
  if (!existsSync(p)) throw new Error('E2E ABORTADO: falta frontend/.env.e2e (ver .env.e2e.example)');
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

export interface Creds { email: string; password: string }
export function creds() {
  const v = loadEnvFile();
  const pre = `E2E_${currentEnv().toUpperCase()}_`;
  const need = (k: string) => {
    const x = v[pre + k];
    if (!x) throw new Error(`E2E ABORTADO: falta ${pre + k} en .env.e2e`);
    return x;
  };
  return {
    admin: { email: need('ADMIN_EMAIL'), password: need('ADMIN_PASSWORD') } as Creds,
    cajero: { email: need('CAJERO_EMAIL'), password: need('CAJERO_PASSWORD') } as Creds,
    mesero: { name: need('MESERO_NAME'), pin: need('MESERO_PIN') },
    ajeno: { tenantId: need('AJENO_TENANT_ID'), orderId: need('AJENO_ORDER_ID'), productId: need('AJENO_PRODUCT_ID'), customerId: need('AJENO_CUSTOMER_ID') },
  };
}
