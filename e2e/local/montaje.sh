#!/bin/bash
# E2E-1 - montaje TEMPORAL de la suite local: bullweb_test 5433, backend 4299 con el codigo DESPLEGADO (git archive de main, el repo backend no se toca), preview 5175 lo levanta run.mjs.
# up: postgres -> guarda sin 288b -> huella -> migraciones 288b, 304, 306 -> archivo de main en carpeta temporal -> build -> .env.test (el backend lo arranca run.mjs).
# down: backend detenido -> rollback 306, 304, 288b -> huella identica -> carpeta temporal fuera -> postgres detenido.
# Uso: bash montaje.sh <pgsql_bin_dir> <pg_data_dir> <workspace_dir> <up|down>
set -uo pipefail
PGB="$1"; PGD="$2"; WS="$3"; MODE="$4"
D="$WS/_deploy"; BE="$WS/bullweb-backend"
RUN="$PGD/../run"; WORK="$RUN/_e2e_backend"; H0F="$RUN/.e2e_huella"; LOG="$RUN/backend_e2e.log"
q() { "$PGB/psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d bullweb_test -X -A -t -q -v ON_ERROR_STOP=1 "$@"; }
HQ=$(sed -n '/^HQ="/,/subscriptions s))"$/p' "$D/_288b_bateria_local.sh" | sed -e '1s/^HQ="//' -e '$s/"$//' -e 's/[\]"/"/g')
# netstat desde Git Bash no siempre lista 4299: se pregunta por PowerShell. Los procesos se detienen por linea de comando (ver memoria del montaje).
listeners() { powershell.exe -NoProfile -Command "(Get-NetTCPConnection -State Listen -LocalPort $1 -ErrorAction SilentlyContinue).OwningProcess" | tr -d '\r' | sort -u | grep -v '^0$'; }
detener() { powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.Name -in 'node.exe','cmd.exe','nohup.exe' -and \$_.CommandLine -match 'dist/server\.js|_mpa_mp_simulado|_314_google_simulado|_copiloto_simulado|vite.*preview.*vite\.e2e\.config' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" > /dev/null 2>&1; }
if [ "$MODE" = "up" ]; then
  if [ -n "$(listeners 4299)" ] || [ -n "$(listeners 5175)" ]; then echo "== puertos 4299/5175 ocupados: ABORTADO"; exit 1; fi
  "$PGB/pg_ctl.exe" -D "$PGD" -l "$PGD/../pg.log" -o "-p 5433" start -w > /dev/null 2>&1 < /dev/null; echo "== postgres rc=$?"
  if [ "$(q -c "SELECT current_database()")" != "bullweb_test" ]; then echo "== BD inesperada: ABORTADO"; exit 1; fi
  if [ "$(q -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'trackStock'")" != "0" ]; then echo "== bullweb_test YA TIENE la migracion 288b: ABORTADO SIN TOCAR NADA"; exit 1; fi
  q -c "$HQ" > "$H0F"; echo "HUELLA ANTES E2E: $(cat "$H0F")"
  q -c "ALTER DATABASE bullweb_test SET timezone TO 'UTC'"
  q -f "$D/_288b_migracion.sql" 2>&1 | grep -v NOTICE; echo "rc_migracion=${PIPESTATUS[0]}"
  q -f "$D/_304_migracion.sql"; echo "rc_migracion_304=$?"
  q -f "$D/_306_migracion.sql" > /dev/null; echo "rc_migracion_306=$?"
  rm -rf "$WORK"; mkdir -p "$WORK"
  REF="${E2E_BACKEND_REF:-main}"; git -C "$BE" archive "$REF" | tar -x -C "$WORK"; echo "backend archivado: $REF $(git -C "$BE" rev-parse --short "$REF")"
  WIN_WORK=$(cygpath -w "$WORK/node_modules"); WIN_NM=$(cygpath -w "$BE/node_modules")
  MSYS_NO_PATHCONV=1 cmd /c mklink /J "$WIN_WORK" "$WIN_NM" > /dev/null
  cd "$WORK"
  npm run build > "$RUN/backend_e2e_build.log" 2>&1; echo "build_rc=$?"
  S1=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"); S2=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  printf 'NODE_ENV=development\nPORT=4299\nDATABASE_URL=postgresql://postgres@127.0.0.1:5433/bullweb_test\nJWT_SECRET=%s\nJWT_EXPIRES_IN=1h\nSTOCK_ALERT_DRY_RUN=true\nATTENDANCE_SECRET=%s\nCORS_ORIGINS=http://127.0.0.1:5175,http://localhost:5175\nFLOW_API_URL=http://127.0.0.1:9\n' "$S1" "$S2" > .env.test
  # LOTE MP-A: solo si la rama trae el modulo: migracion y variables del MP simulado (redirect por el proxy de la lista blanca)
  if [ -d src/modules/mercadopago ]; then
    q -f "$D/_mpa_migracion.sql" > /dev/null; echo "rc_migracion_mpa=$?"
    q -c "SELECT COALESCE(\"cartaBusinessHours\"::text, 'NULL') FROM tenants WHERE id = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568'" > "$RUN/.e2e_horas"
    q -c "UPDATE tenants SET \"cartaBusinessHours\" = (SELECT jsonb_object_agg(d, '{\"open\": \"00:00\", \"close\": \"23:59\", \"enabled\": true}'::jsonb) FROM unnest(ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']) d) WHERE id = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568'"
    SUPER=$(q -c "SELECT u.id FROM users u JOIN roles r ON r.id = u.\"roleId\" WHERE r.name ILIKE 'super%' AND u.\"tenantId\" IS NULL AND u.\"deletedAt\" IS NULL ORDER BY u.\"createdAt\" LIMIT 1")
    rnd() { node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"; }
    printf 'ENCRYPTION_KEY=%s\nSUPERADMIN_USER_IDS=%s\nMP_CLIENT_ID=sim-client\nMP_CLIENT_SECRET=%s\nMP_WEBHOOK_SECRET=%s\nMP_REDIRECT_URI=http://127.0.0.1:5175/api/payments/mp/oauth/callback\nMP_API_URL=http://127.0.0.1:4399\nMP_AUTH_URL=http://127.0.0.1:4399\nMP_TEST_TOKEN=true\nMP_ENABLED_TENANTS=6c9d34d2-29d0-4094-93a8-9abd1f5c9568\nAPP_URL=http://127.0.0.1:5175\nMP_SIM_WEBHOOK_URL=http://127.0.0.1:4299/api/payments/mp/webhook\n' "$(rnd 32)" "$SUPER" "$(rnd 16)" "$(rnd 24)" >> .env.test
  fi
  # LOTE 308b: solo si la rama trae el lote: columnas del cupon en la carta, historial de marcas y opciones de impresion
  if [ -f src/modules/attendance/pin-lock.ts ]; then q -f "$D/_308b_migracion.sql" > /dev/null; echo "rc_migracion_308b=$?"; fi
  # LOTE 309: solo si la rama trae el lote (el servicio de proveedores ya escribe contactname)
  if grep -q contactname src/modules/suppliers/suppliers.service.ts; then q -f "$D/_309_migracion.sql" > /dev/null; echo "rc_migracion_309=$?"; fi
  # LOTE 310: solo si la rama trae el lote (compras con estado de pago)
  if grep -q paymentStatus src/modules/inventory/inventory.service.ts; then q -f "$D/_310_migracion.sql" > /dev/null; echo "rc_migracion_310=$?"; fi
  # LOTE 312: solo si la rama trae el Copiloto (tablas copilot_* nuevas)
  if [ -d src/modules/copilot ]; then q -f "$D/_copiloto_migracion.sql" > /dev/null; echo "rc_migracion_copiloto=$?"; fi
  # LOTE 321: solo si la rama trae el chat del dueno (tabla copilot_chat y modelo simulado 4398, que arranca run.mjs)
  if [ -f src/modules/copilot/copilot.chat.ts ]; then
    q -f "$D/_321_migracion.sql" > /dev/null; echo "rc_migracion_321=$?"
    CK=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
    printf 'GEMINI_API_KEY=sim-%s\nGEMINI_API_BASE=http://127.0.0.1:4398\nCOPILOT_GEMINI_TIMEOUT_MS=5000\nGEMINI_MODEL_FALLBACK=gemini-sim-respaldo\n' "$CK" >> .env.test
  fi
  # LOTE 314: solo si la rama trae el envio por tramos (tablas nuevas; el Google simulado 4397 lo arranca run.mjs)
  if [ -d src/modules/delivery-zones ]; then
    q -f "$D/_314_migracion.sql" > /dev/null; echo "rc_migracion_314=$?"
    GK=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
    printf 'GOOGLE_MAPS_SERVER_KEY=sim-%s\nGOOGLE_MAPS_API_BASE=http://127.0.0.1:4397\nGOOGLE_ROUTES_API_BASE=http://127.0.0.1:4397\n' "$GK" >> .env.test # LOTE 321: la Routes API del 320 tambien va al simulado
  fi
  : > "$LOG"
  # El backend lo arranca run.mjs: lanzado desde este bash moria sin traza a mitad de la corrida.
  exit 0
fi
if [ "$MODE" = "down" ]; then
  detener; sleep 3; detener; sleep 2
  echo "listeners_4299=$(listeners 4299 | wc -l) listeners_5175=$(listeners 5175 | wc -l)"
  if [ -f "$RUN/.e2e_horas" ]; then H=$(cat "$RUN/.e2e_horas"); if [ "$H" = "NULL" ]; then q -c "UPDATE tenants SET \"cartaBusinessHours\" = NULL WHERE id = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568'"; else q -c "UPDATE tenants SET \"cartaBusinessHours\" = '$H'::jsonb WHERE id = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568'"; fi; rm -f "$RUN/.e2e_horas"; echo "horas devueltas"; fi
  if [ "$(q -c "SELECT count(*) FROM information_schema.tables WHERE table_name = 'delivery_zones'")" != "0" ]; then q -f "$D/_314_rollback.sql" > /dev/null; echo "rc_rollback_314=$?"; fi # LOTE 314
  if [ "$(q -c "SELECT count(*) FROM information_schema.tables WHERE table_name = 'copilot_chat'")" != "0" ]; then q -f "$D/_321_rollback.sql" > /dev/null; echo "rc_rollback_321=$?"; fi # LOTE 321
  if [ "$(q -c "SELECT count(*) FROM information_schema.tables WHERE table_name = 'copilot_settings'")" != "0" ]; then q -f "$D/_copiloto_rollback.sql" > /dev/null; echo "rc_rollback_copiloto=$?"; fi # LOTE 312
  if [ "$(q -c "SELECT count(*) FROM information_schema.tables WHERE table_name = '_bk308b_print_settings'")" != "0" ]; then q -f "$D/_308b_rollback.sql" > /dev/null; echo "rc_rollback_308b=$?"; fi # LOTE 308b
  if [ "$(q -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'paymentStatus'")" != "0" ]; then q -f "$D/_310_rollback.sql" > /dev/null; echo "rc_rollback_310=$?"; q -c "DROP TABLE IF EXISTS _bk310_purchases"; fi # LOTE 310
  if [ "$(q -c "SELECT count(*) FROM information_schema.tables WHERE table_name = '_bk309_suppliers_idx'")" != "0" ]; then q -f "$D/_309_rollback.sql" > /dev/null; echo "rc_rollback_309=$?"; fi # LOTE 309
  q -f "$D/_mpa_rollback.sql" > /dev/null; echo "rc_rollback_mpa=$?" # LOTE MP-A: idempotente si la rama no lo trae
  q -f "$D/_306_rollback.sql" > /dev/null; echo "rc_rollback_306=$?"
  q -f "$D/_304_rollback.sql"; echo "rc_rollback_304=$?"
  q -f "$D/_288b_rollback.sql"; echo "rc_rollback=$?"
  q -c "DROP TABLE _bk288b_products_stock, _bk288b_product_movements"
  q -c "ALTER DATABASE bullweb_test RESET timezone"
  H0=$(cat "$H0F"); H1=$(q -c "$HQ"); echo "HUELLA DESPUES: $H1 ; identica=$([ "$H0" = "$H1" ] && echo si || echo NO)"
  # La junction se quita primero: borrar a traves de ella vaciaria node_modules del backend.
  [ -e "$WORK/node_modules" ] && MSYS_NO_PATHCONV=1 cmd /c rmdir "$(cygpath -w "$WORK/node_modules")"
  if [ -e "$WORK/node_modules" ]; then echo "junction sigue: carpeta temporal NO borrada"; else rm -rf "$WORK"; fi
  rm -f "$H0F"
  "$PGB/pg_ctl.exe" -D "$PGD" stop -m fast > /dev/null; echo "postgres detenido rc=$?"
  echo "listeners_5433=$(listeners 5433 | wc -l) backend_node_modules=$(ls "$BE/node_modules" | wc -l)"
  exit 0
fi
echo "modo invalido: $MODE"; exit 2
