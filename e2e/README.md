# Suite E2E en pantalla (Playwright)

Dos comandos, desde `frontend/`:

- `npm run e2e:local`: F1, F2, F5 y F8 contra `bullweb_test` (5433) con el backend de `main` (git archive, el repo no se toca) y el frontend de la rama actual en 127.0.0.1:5175. Sube y baja todo, y compara la huella al final. Unos 5 min.
- `npm run e2e:sandbox`: F1, F5 y F8 contra `app.bullwebchile.com`, solo tenant `tu-mejor-sabor-216e63`. Limpia por SSH y compara conteos. Unos 3 min. La carta debe estar abierta.

## Flujos

| Flujo | Cubre | Corre en |
|---|---|---|
| F1 | login panel, clave mala, login mesero con PIN, token viejo rechazado con "Sesión cerrada" | local, sandbox |
| F2 | turno, Mostrador con modificador obligatorio, comanda en KDS, Iniciar/Listo por ítem, cobro en efectivo con vuelto | solo local |
| F5 | carta a 360 px, modificador, tracking con progreso, aceptar desde dos POS, doble aceptación = 1 pedido | local, sandbox |
| F8 | sin datos de otro tenant en 3 pantallas, ni por id ajeno, ni por parámetro | local, sandbox |

## Seguridad

- `lib/guard.ts` es la lista blanca de hosts y slugs. La suite aborta si la URL, el slug o el tenant del token no calzan, y bloquea cualquier otro host. F2 no puede correr en el sandbox.
- Marca de datos: `E2E-PW-`. La limpieza solo toca esa marca; los `E2E-158`, `E2E-163` y `E2E-176` previos no se tocan.
- Credenciales en `frontend/.env.e2e`, fuera de git. Las genera `local/usuarios.mjs` y no se imprimen.
- `e2e/.results/*/error-context.md` y `e2e/.report/` pueden contener lo escrito en los formularios, incluidas claves. Están fuera de git: no pegarlos en chats ni reportes.
- `lib/base.ts` limita la suite a 100 llamadas a `/api` por minuto, porque el tope del servidor es 120/min por IP y corre antes de autenticar. Sin esto la suite se bloquea sola y bloquea a quien trabaje desde la misma IP.

## Salidas

- Capturas JPG de 200 KB o menos: `_auditoria/evidencia/_e2e/<fecha>/<local|sandbox>/<flujo>/`.
- Reporte HTML: `e2e/.report/` (`npx playwright show-report e2e/.report`), fuera de git.
- Resultado por flujo y conteos: al final de la salida del comando y en `e2e/.run/`.

## Primera vez en otro equipo

1. `npm install` y `npx playwright install chromium`.
2. Copiar `.env.e2e.example` a `.env.e2e` y ajustar `E2E_PG_BIN` y `E2E_PG_DATA`.
3. Sandbox: los usuarios `E2E-Admin`, `E2E-Cajero` y `E2E-Mesero` ya existen; sus claves viven solo en el `.env.e2e` de este equipo. En otro equipo hay que copiar ese archivo o generarlas de nuevo.

## Trampas conocidas

- Con el montaje arriba, `run.mjs local --sin-montaje --flujo F2` sirve para iterar, pero no repone el stock: el cobro de F2 descuenta receta. La corrida completa sí lo repone.
- El `previousStock` de `stock_movements` viene redondeado y no sirve para restaurar la huella; por eso `sql/stock_local_guardar.sql`.
- `E2E-Cajero` usa el rol Cajero de plantilla, que no tiene permisos de venta (B1-01). Las pruebas de cobro usan `E2E-Admin`.
