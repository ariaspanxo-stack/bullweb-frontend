#!/bin/bash
set -e
echo "=== BullWeb Deploy ==="
echo "1. Limpiando assets viejos del servidor..."
ssh -i C:\\Users\\Francisco\\.ssh\\id_rsa_bullweb root@72.62.86.188 "rm -rf /var/www/bullweb-frontend/assets/"
echo "2. Copiando nuevos archivos..."
scp -i C:\\Users\\Francisco\\.ssh\\id_rsa_bullweb -r dist/* root@72.62.86.188:/var/www/bullweb-frontend/
echo "3. Recargando Nginx..."
ssh -i C:\\Users\\Francisco\\.ssh\\id_rsa_bullweb root@72.62.86.188 "nginx -s reload"
echo "4. Verificando deploy..."
ssh -i C:\\Users\\Francisco\\.ssh\\id_rsa_bullweb root@72.62.86.188 "grep -o 'index-[^.]*\.js' /var/www/bullweb-frontend/sw.js | head -1"
echo "=== Deploy completo ==="