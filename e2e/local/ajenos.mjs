// E2E-1: lee por stdin una linea tenant|pedido|producto|cliente de OTRO tenant y la escribe en .env.e2e para F8. No imprime los ids.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const env = process.argv[2];
if (!['local', 'sandbox'].includes(env)) process.exit(2);
const FE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const line = readFileSync(0, 'utf8').split(/\r?\n/).find((l) => /^AJENO\|/.test(l));
const parts = line ? line.split('|').slice(1) : [];
if (parts.length !== 4 || parts.some((p) => !p)) { console.error('ids ajenos incompletos'); process.exit(1); }
const f = resolve(FE, '.env.e2e');
let text = readFileSync(f, 'utf8');
['TENANT', 'ORDER', 'PRODUCT', 'CUSTOMER'].forEach((k, i) => {
  const key = `E2E_${env.toUpperCase()}_AJENO_${k}_ID`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  text = re.test(text) ? text.replace(re, `${key}=${parts[i]}`) : `${text}\n${key}=${parts[i]}`;
});
writeFileSync(f, text);
console.log('ids ajenos escritos en .env.e2e: 4');
