$ErrorActionPreference = 'Stop'
$bridgeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $bridgeRoot 'data/config.json'
$recordPath = Join-Path $bridgeRoot 'data/process.json'
if (-not (Test-Path -LiteralPath $configPath)) { Write-Host 'No hay un puente configurado desde esta carpeta.'; exit }
$code = (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).token
try {
    $result = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8787/shutdown' -Headers @{ Authorization = "Bearer $code" } -ContentType 'application/json' -Body '{}' -TimeoutSec 5
    if (-not $result.ok) { throw 'El puente no confirmo el cierre.' }
    if (Test-Path -LiteralPath $recordPath) { Remove-Item -LiteralPath $recordPath }
    Write-Host 'Puente Sebams detenido. Las tareas pendientes se conservaron.'
} catch {
    Write-Host 'No se pudo contactar con el puente de esta carpeta. Puede estar ya cerrado; no se detuvo ningun otro programa.'
    exit 1
}
