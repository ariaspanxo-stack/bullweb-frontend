// E2E-1: genera credenciales al azar en frontend/.env.e2e (nunca las imprime) y el SQL con hashes para crear E2E-Admin, E2E-Cajero y E2E-Mesero en el tenant sandbox.
// Uso: node e2e/local/usuarios.mjs <local|sandbox> <salida.sql> ; el SQL lleva hashes y no va a git.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const [, , env, out] = process.argv;
if (!['local', 'sandbox'].includes(env) || !out) { console.error('uso: usuarios.mjs <local|sandbox> <salida.sql>'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const FE = resolve(here, '..', '..');
const require = createRequire(resolve(FE, '..', 'bullweb-backend', 'package.json'));
const bcrypt = require('bcryptjs');
const TENANT = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568';
const envFile = resolve(FE, '.env.e2e');
let text = existsSync(envFile) ? readFileSync(envFile, 'utf8') : readFileSync(resolve(FE, '.env.e2e.example'), 'utf8');
const P = `E2E_${env.toUpperCase()}_`;
const set = (k, v) => {
  const re = new RegExp(`^${P}${k}=.*$`, 'm');
  text = re.test(text) ? text.replace(re, () => `${P}${k}=${v}`) : `${text}\n${P}${k}=${v}`;
};
const pass = () => `E2e-${randomBytes(15).toString('base64url')}`;
const c = {
  adminMail: 'e2e-admin@bullwebchile.com', cajeroMail: 'e2e-cajero@bullwebchile.com', meseroMail: 'e2e-mesero@bullwebchile.com',
  admin: pass(), cajero: pass(), meseroPass: pass(), pin: String(randomInt(1000, 10000)),
};
set('ADMIN_EMAIL', c.adminMail); set('ADMIN_PASSWORD', c.admin);
set('CAJERO_EMAIL', c.cajeroMail); set('CAJERO_PASSWORD', c.cajero);
set('MESERO_NAME', 'E2E-Mesero'); set('MESERO_PIN', c.pin);
writeFileSync(envFile, text);
const row = (name, mail, password, role, pin) => `INSERT INTO users (id, email, password, name, "roleId", "tenantId", active, pin, "updatedAt")
  SELECT '${randomUUID()}', '${mail}', '${bcrypt.hashSync(password, 10)}', '${name}', r.id, r."tenantId", true, ${pin ? `'${bcrypt.hashSync(pin, 10)}'` : 'NULL'}, now()
  FROM roles r WHERE r."tenantId"::text = '${TENANT}' AND r.name = '${role}';`;
const sql = `BEGIN;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM users WHERE email LIKE 'e2e-%@bullwebchile.com' OR name IN ('E2E-Admin', 'E2E-Cajero', 'E2E-Mesero')) THEN RAISE EXCEPTION 'usuarios E2E ya existen: ABORTADO'; END IF; END $$;
${row('E2E-Admin', c.adminMail, c.admin, 'Administrador', null)}
${row('E2E-Cajero', c.cajeroMail, c.cajero, 'Cajero', null)}
${row('E2E-Mesero', c.meseroMail, c.meseroPass, 'Mesero', c.pin)}
SELECT 'usuarios_e2e=' || count(*) FROM users WHERE "tenantId"::text = '${TENANT}' AND name IN ('E2E-Admin', 'E2E-Cajero', 'E2E-Mesero');
COMMIT;
`;
writeFileSync(out, sql);
console.log(`usuarios ${env}: credenciales en .env.e2e, SQL con hashes en archivo temporal`);
