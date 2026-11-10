// E2E-1: script unico. npm run e2e:local (F1 F2 F5 F8 contra bullweb_test) y npm run e2e:sandbox (F1 F5 F8 contra el sandbox, con limpieza).
// local: montaje -> usuarios -> build -> preview -> playwright -> limpieza -> baja con huella. sandbox: playwright -> limpieza por SSH con conteos.
// Banderas: --ref lote-307 (solo local: backend y frontend de esa rama por git archive, sin cambiar el arbol), --sin-montaje (el montaje ya esta arriba y no se baja), --flujo F1 (solo ese flujo).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FE = resolve(here, '..');
const WS = resolve(FE, '..');
const RUN = resolve(here, '.run');
mkdirSync(RUN, { recursive: true });

const [, , env, ...flags] = process.argv;
if (env !== 'local' && env !== 'sandbox') { console.error('uso: run.mjs <local|sandbox> [--sin-montaje] [--flujo F1]'); process.exit(2); }
const sinMontaje = flags.includes('--sin-montaje');
const mantener = flags.includes('--mantener'); // LOTE 309: deja el montaje arriba para iterar
const bajar = flags.includes('--bajar'); // LOTE 309: solo limpia y baja un montaje dejado con --mantener
const flujo = flags.includes('--flujo') ? flags[flags.indexOf('--flujo') + 1] : null;
const ref = flags.includes('--ref') ? flags[flags.indexOf('--ref') + 1] : null;
if (ref && env !== 'local') { console.error('--ref solo aplica a local'); process.exit(2); }
if (ref && !/^[\w./-]+$/.test(ref)) { console.error('ref invalida'); process.exit(2); }
if (ref) process.env.E2E_BACKEND_REF = process.env.E2E_BACKEND_REF ?? ref; // E2E_BACKEND_REF deja elegir otra rama de backend (main frente a master)

const dotenv = () => Object.fromEntries(readFileSync(resolve(FE, '.env.e2e'), 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const GIT_BASH = 'C:/Program Files/Git/bin/bash.exe';
const pgBin = () => dotenv().E2E_PG_BIN ?? 'C:/Users/Francisco/bullweb_pgtest/pgsql/bin';
const pgData = () => dotenv().E2E_PG_DATA ?? 'C:/Users/Francisco/bullweb_pgtest/data';

function bash(args, opts = {}) {
  const r = spawnSync(GIT_BASH, args, { cwd: WS, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26, ...opts });
  return { rc: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
function psqlFile(file) {
  const r = spawnSync(`${pgBin()}/psql.exe`, ['-h', '127.0.0.1', '-p', '5433', '-U', 'postgres', '-d', 'bullweb_test', '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-f', file], { encoding: 'utf8' });
  return { rc: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
function npx(args, extraEnv = {}) {
  return spawnSync('npx', args, { cwd: FE, stdio: 'inherit', shell: true, env: { ...process.env, ...extraEnv } }).status;
}
const montaje = (mode) => bash([resolve(here, 'local/montaje.sh'), pgBin(), pgData(), WS, mode]);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function prepararLocal() {
  const m = montaje('up');
  console.log(m.out.trim());
  if (m.rc !== 0) throw new Error('montaje local fallo');
  const st = psqlFile(resolve(here, 'sql/stock_local_guardar.sql'));
  if (st.rc !== 0) throw new Error(`respaldo de stock fallo: ${st.out}`);
  const sql = resolve(RUN, 'usuarios_local.sql');
  spawnSync('node', [resolve(here, 'local/usuarios.mjs'), 'local', sql], { stdio: 'inherit' });
  const u = psqlFile(sql);
  rmSync(sql, { force: true });
  console.log(u.out.trim());
  if (u.rc !== 0) throw new Error('alta de usuarios locales fallo');
  const a = psqlFile(resolve(here, 'sql/ajenos.sql'));
  if (a.rc !== 0) throw new Error('lectura de ids ajenos fallo');
  const w = spawnSync('node', [resolve(here, 'local/ajenos.mjs'), 'local'], { input: a.out, encoding: 'utf8' });
  console.log(w.stdout.trim());
  if (w.status !== 0) throw new Error('escritura de ids ajenos fallo');
}

let backendVivo = false;
async function subirBackend() {
  const work = resolve(pgData(), '..', 'run', '_e2e_backend');
  const log = openSync(resolve(pgData(), '..', 'run', 'backend_e2e.log'), 'a');
  const vars = Object.fromEntries(readFileSync(resolve(work, '.env.test'), 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  // LOTE 314: rama con envio por tramos -> Google simulado local (nada sale a internet); el montaje lo detiene al bajar
  if (vars.GOOGLE_MAPS_API_BASE && existsSync(resolve(WS, '_deploy', '_314_google_simulado.js'))) {
    const g = spawn(process.execPath, [resolve(WS, '_deploy', '_314_google_simulado.js')], { detached: true, windowsHide: true, stdio: ['ignore', log, log] });
    g.unref();
    console.log('google simulado 4397 arriba');
  }
  // LOTE 321: rama con chat del dueno -> modelo simulado local 4398 (nada sale a internet); el montaje lo detiene al bajar
  if (vars.GEMINI_API_BASE === 'http://127.0.0.1:4398' && existsSync(resolve(WS, '_deploy', '_copiloto_simulado.js'))) {
    const s = spawn(process.execPath, [resolve(WS, '_deploy', '_copiloto_simulado.js')], { detached: true, windowsHide: true, stdio: ['ignore', log, log] });
    s.unref();
    console.log('modelo simulado 4398 arriba');
  }
  const child = spawn(process.execPath, ['dist/server.js'], { cwd: work, env: { ...process.env, ...vars }, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
  backendVivo = true;
  child.on('exit', (code, signal) => { backendVivo = false; console.log(`BACKEND LOCAL TERMINO code=${code} signal=${signal}`); });
  child.unref();
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://127.0.0.1:4299/health')).ok) { console.log('backend 4299 responde'); return; } } catch { /* aun no */ }
    await espera(2000);
  }
  throw new Error('backend 4299 no respondio');
}

async function subirPreview() {
  const viteEnv = { VITE_API_URL: '/api', VITE_WS_URL: 'http://127.0.0.1:5175', VITE_ENV: 'e2e' };
  let rc;
  if (ref) {
    // El arbol queda en la rama de la suite: el frontend a probar sale de git archive a e2e/.ref y compila con su propia configuracion.
    const dir = resolve(here, '.ref');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const a = bash(['-c', `git -C frontend archive '${ref}' | tar -x -C frontend/e2e/.ref`]);
    if (a.rc !== 0) throw new Error(`git archive frontend ${ref} fallo: ${a.out}`);
    console.log(`frontend archivado: ${ref} ${bash(['-c', `git -C frontend rev-parse --short '${ref}'`]).out.trim()}`);
    rc = spawnSync('npx', ['vite', 'build', '--outDir', '../.dist', '--emptyOutDir', '--mode', 'e2e', '--logLevel', 'error'], { cwd: dir, stdio: 'inherit', shell: true, env: { ...process.env, ...viteEnv } }).status;
    rmSync(dir, { recursive: true, force: true });
  } else {
    rc = npx(['vite', 'build', '--config', 'e2e/vite.e2e.config.ts', '--mode', 'e2e', '--logLevel', 'error'], viteEnv);
  }
  if (rc !== 0) throw new Error('build local fallo');
  const pvLog = openSync(resolve(RUN, 'preview.log'), 'w');
  const child = spawn('npx', ['vite', 'preview', '--config', 'e2e/vite.e2e.config.ts', '--mode', 'e2e'], { cwd: FE, shell: true, detached: true, stdio: ['ignore', pvLog, pvLog] });
  child.unref();
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch('http://127.0.0.1:5175/login')).ok) return; } catch { /* aun no */ }
    await espera(1000);
  }
  throw new Error('preview 5175 no respondio');
}

function correrPlaywright() {
  // LOTE 321: cada flujo con limite de palabra (F1 no debe tomar F10)
  const grep = (flujo ?? (env === 'local' ? 'F1|F2|F5|F8|F9|F10|F11' : 'F1|F5|F8|F9')).split('|').map((x) => `${x}(?![0-9])`).join('|');
  return npx(['playwright', 'test', '--config', 'e2e/playwright.config.ts', '--grep', `"${grep}"`], { E2E_ENV: env, E2E_FECHA: process.env.E2E_FECHA ?? fechaLocal() });
}
function fechaLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function resumen() {
  const f = resolve(RUN, 'resultado.json');
  if (!existsSync(f)) return [];
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const out = [];
  const walk = (s) => {
    for (const c of s.suites ?? []) walk(c);
    for (const sp of s.specs ?? []) for (const t of sp.tests ?? []) for (const r of t.results ?? []) out.push({ titulo: sp.title, estado: r.status, seg: Math.round(r.duration / 1000), obs: (r.annotations ?? t.annotations ?? []).map((a) => a.description) });
  };
  walk(j);
  return out;
}

const conteo = () => {
  const r = env === 'local' ? psqlFile(resolve(here, 'sql/conteo.sql')) : bash(['_deploy/_aud/run.sh', '_deploy/_aud/_e2e_sandbox_conteo.sh']);
  return r.out.split(/\r?\n/).filter((l) => l.startsWith('CONTEO ')).map((l) => l.trim());
};

if (bajar) {
  const l = psqlFile(resolve(here, 'sql/limpieza.sql')); console.log(`limpieza local rc=${l.rc}: ${l.out.trim()}`);
  const st = psqlFile(resolve(here, 'sql/stock_local_restaurar.sql')); console.log(`stock local repuesto rc=${st.rc} ${st.out.trim()}`);
  const u = psqlFile(resolve(here, 'sql/usuarios_borrar.sql')); console.log(`usuarios locales fuera rc=${u.rc}: ${u.out.trim()}`);
  console.log(montaje('down').out.trim());
  process.exit(0);
}
let rc = 1;
let antes = [];
try {
  if (env === 'local') {
    if (!sinMontaje) { prepararLocal(); await subirBackend(); }
    if (!sinMontaje || !existsSync(resolve(here, '.dist/index.html'))) await subirPreview();
  }
  antes = conteo();
  if (antes.length !== 13) throw new Error(`conteo inicial incompleto (${antes.length} de 13)`); // LOTE 310: + compras
  console.log(`conteo antes:\n${antes.join('\n')}`);
  const t0 = Date.now();
  rc = correrPlaywright();
  if (env === 'local') {
    const sonda = async (u) => { try { return (await fetch(u)).status; } catch (e) { return `ERROR ${e.cause?.code ?? e.message}`; } };
    console.log(`tras la suite: backend=${await sonda('http://127.0.0.1:4299/health')} preview=${await sonda('http://127.0.0.1:5175/login')} proxy=${await sonda('http://127.0.0.1:5175/api/public/hours?slug=tu-mejor-sabor-216e63')}`);
  }
  const filas = resumen();
  console.log(`\n== RESULTADO ${env} (${Math.round((Date.now() - t0) / 1000)} s)`);
  for (const r of filas) {
    console.log(`${r.estado.toUpperCase().padEnd(8)} ${String(r.seg).padStart(4)} s  ${r.titulo}`);
    for (const o of r.obs) console.log(`         obs: ${o}`);
  }
  writeFileSync(resolve(RUN, `resultado_${env}.txt`), filas.map((r) => `${r.estado}\t${r.seg}\t${r.titulo}\t${r.obs.join(' ; ')}`).join('\n'));
} finally {
  const verificar = () => {
    const despues = conteo();
    const distintos = antes.filter((l, i) => l !== despues[i]);
    console.log(`conteo despues:\n${despues.join('\n')}\nconteos_identicos=${antes.length > 0 && distintos.length === 0 ? 'si' : 'NO'}`);
    if (distintos.length > 0 || antes.length === 0) { console.log(`DISTINTOS: ${distintos.join(' ; ')}`); rc = rc || 1; }
  };
  if (env === 'local') {
    const l = psqlFile(resolve(here, 'sql/limpieza.sql'));
    console.log(`limpieza local rc=${l.rc}: ${l.out.trim()}`);
    if (!sinMontaje && !mantener) {
      const st = psqlFile(resolve(here, 'sql/stock_local_restaurar.sql'));
      console.log(`stock local repuesto rc=${st.rc} ${st.out.trim()}`);
    }
    verificar();
    if (!sinMontaje && !mantener) {
      const u = psqlFile(resolve(here, 'sql/usuarios_borrar.sql'));
      console.log(`usuarios locales fuera rc=${u.rc}: ${u.out.trim()}`);
      console.log(montaje('down').out.trim());
    }
  } else {
    const s = bash(['_deploy/_aud/run.sh', '_deploy/_aud/_e2e_sandbox_limpieza.sh']);
    console.log(s.out.trim());
    writeFileSync(resolve(RUN, 'limpieza_sandbox.txt'), s.out);
    if (s.rc !== 0 || !/restos pedidos=0 qr=0 clientes=0/.test(s.out)) { console.log('LIMPIEZA SANDBOX NO VERIFICADA'); rc = rc || 1; }
    verificar();
  }
}
process.exit(rc ?? 1);
