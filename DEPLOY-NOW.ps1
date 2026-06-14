# Deploy rápido - Fix autenticación
$ErrorActionPreference = "Stop"

Write-Host "🚀 Creando tarball..." -ForegroundColor Cyan
Set-Location "c:\Users\Francisco\OneDrive\Escritorio\Bullweb3.0\frontend\dist"
tar -czf ../frontend-deploy.tar.gz *
Set-Location ..

Write-Host "📤 Subiendo a VPS..." -ForegroundColor Cyan
scp frontend-deploy.tar.gz root@72.62.86.188:/tmp/

Write-Host "🔧 Desplegando..." -ForegroundColor Cyan
ssh root@72.62.86.188 "cd /var/www/bullweb-frontend && rm -rf * && tar -xzf /tmp/frontend-deploy.tar.gz && chown -R www-data:www-data /var/www/bullweb-frontend && rm /tmp/frontend-deploy.tar.gz && systemctl reload nginx && echo 'Deploy OK'"

Write-Host "🧹 Limpiando..." -ForegroundColor Cyan
Remove-Item frontend-deploy.tar.gz -Force

Write-Host "✅ DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "URL: https://app.bullwebchile.com" -ForegroundColor White
Write-Host ""
Write-Host "🔄 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "1. Ctrl+Shift+Delete → Borrar caché" -ForegroundColor White
Write-Host "2. Ctrl+F5 → Recarga forzada" -ForegroundColor White
Write-Host "3. Login nuevamente" -ForegroundColor White
Write-Host "4. Probar crear cliente" -ForegroundColor White
