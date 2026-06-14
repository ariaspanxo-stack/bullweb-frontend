# ═══════════════════════════════════════════════════════════════
# DEPLOY AUTOMÁTICO FRONTEND - BULLWEB 3.0
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$Production,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$VPS = "72.62.86.188"
$FRONTEND_PATH = $PSScriptRoot
$startTime = Get-Date

$modeText = if ($Production) { 'PRODUCCIÓN' } else { 'DESARROLLO' }

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DEPLOY FRONTEND BULLWEB 3.0" -ForegroundColor Cyan
Write-Host "  Modo: $modeText" -ForegroundColor Cyan
Write-Host "  Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# PASO 1: Limpiar dist
if (-not $SkipBuild) {
    Write-Host "[1/6] Limpiando directorio dist..." -ForegroundColor Yellow
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force dist
    }
    Write-Host "✅ Directorio limpio" -ForegroundColor Green
    Write-Host ""
}

# PASO 2: Build
if (-not $SkipBuild) {
    Write-Host "[2/6] Compilando frontend..." -ForegroundColor Yellow
    
    if ($Production) {
        $env:NODE_ENV = "production"
        npm run build
    } else {
        npm run build
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error en build" -ForegroundColor Red
        exit 1
    }
    
    $distSize = (Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "✅ Build completado: $([math]::Round($distSize, 2)) MB" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[2/6] Saltando build..." -ForegroundColor Gray
    Write-Host ""
}

# PASO 3: Crear tarball
Write-Host "[3/6] Creando tarball..." -ForegroundColor Yellow
Set-Location dist
tar -czf ../frontend-deploy.tar.gz *
Set-Location ..

$tarSize = (Get-Item frontend-deploy.tar.gz).Length / 1MB
Write-Host "✅ Tarball creado: $([math]::Round($tarSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# PASO 4: Subir a VPS
Write-Host "[4/6] Subiendo a VPS ($VPS)..." -ForegroundColor Yellow
scp frontend-deploy.tar.gz root@${VPS}:/tmp/
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Archivo subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error al subir archivo" -ForegroundColor Red
    exit 1
}
Write-Host ""

# PASO 5: Desplegar en VPS
Write-Host "[5/6] Desplegando en VPS..." -ForegroundColor Yellow

ssh root@$VPS "cd /var/www/bullweb-frontend && rm -rf * && tar -xzf /tmp/frontend-deploy.tar.gz && find /var/www/bullweb-frontend -type d -exec chmod 755 {} \; && find /var/www/bullweb-frontend -type f -exec chmod 644 {} \; && chown -R www-data:www-data /var/www/bullweb-frontend && rm /tmp/frontend-deploy.tar.gz && systemctl reload nginx && echo 'Deploy completado'"

Write-Host "✅ Archivos desplegados y nginx recargado" -ForegroundColor Green
Write-Host ""

# PASO 6: Verificar
Write-Host "[6/6] Verificando deploy..." -ForegroundColor Yellow
$response = ssh root@$VPS "curl -s -o /dev/null -w '%{http_code}' https://app.bullwebchile.com"

if ($response -eq "200") {
    Write-Host "✅ Sitio respondiendo correctamente (HTTP $response)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Sitio responde con HTTP $response" -ForegroundColor Yellow
}
Write-Host ""

# Limpiar local
Remove-Item frontend-deploy.tar.gz -Force
Write-Host "🧹 Archivo local eliminado" -ForegroundColor Gray
Write-Host ""

$distSize = if (Test-Path "dist") { (Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB } else { 0 }
$duration = (Get-Date) - $startTime

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ DEPLOY COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL: https://app.bullwebchile.com" -ForegroundColor White
$buildSizeMB = [math]::Round($distSize, 2)
Write-Host "Build: $buildSizeMB MB" -ForegroundColor White
$timeMin = $duration.Minutes
$timeSec = $duration.Seconds
Write-Host "Tiempo: ${timeMin}m ${timeSec}s" -ForegroundColor White
Write-Host ""
