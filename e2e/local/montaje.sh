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
detener() { powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.Name -in 'node.exe','cmd.exe','nohup.exe' -and \$_.CommandLine -match 'dist/server\.js|vite.*preview.*vite\.e2e\.config' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" > /dev/null 2>&1; }
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
  git -C "$BE" archive main | tar -x -C "$WORK"; echo "backend archivado: main $(git -C "$BE" rev-parse --short main)"
  WIN_WORK=$(cygpath -w "$WORK/node_modules"); WIN_NM=$(cygpath -w "$BE/node_modules")
  MSYS_NO_PATHCONV=1 cmd /c mklink /J "$WIN_WORK" "$WIN_NM" > /dev/null
  cd "$WORK"
  npm run build > "$RUN/backend_e2e_build.log" 2>&1; echo "build_rc=$?"
  S1=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"); S2=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  printf 'NODE_ENV=development\nPORT=4299\nDATABASE_URL=postgresql://postgres@127.0.0.1:5433/bullweb_test\nJWT_SECRET=%s\nJWT_EXPIRES_IN=1h\nSTOCK_ALERT_DRY_RUN=true\nATTENDANCE_SECRET=%s\nCORS_ORIGINS=http://127.0.0.1:5175,http://localhost:5175\nFLOW_API_URL=http://127.0.0.1:9\n' "$S1" "$S2" > .env.test
  : > "$LOG"
  # El backend lo arranca run.mjs: lanzado desde este bash moria sin traza a mitad de la corrida.
  exit 0
fi
if [ "$MODE" = "down" ]; then
  detener; sleep 3; detener; sleep 2
  echo "listeners_4299=$(listeners 4299 | wc -l) listeners_5175=$(listeners 5175 | wc -l)"
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
