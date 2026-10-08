$ErrorActionPreference = 'Stop'
$bridgeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataPath = Join-Path $bridgeRoot 'data'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Instala Node.js 22 o superior y vuelve a abrir Start.cmd.' }
$nodeMajor = [int]((& $nodePath --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { throw 'Este puente necesita Node.js 22 o superior.' }
$env:PATH = (Split-Path -Parent $nodePath) + [IO.Path]::PathSeparator + $env:PATH
$envFile = Join-Path $bridgeRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile) {
        if ($line -match '^\s*(GEMINI_API_KEY|GEMINI_MODEL)\s*=\s*(.*?)\s*$') {
            $value = $Matches[2]
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) { $value = $value.Substring(1, $value.Length - 2) }
            [Environment]::SetEnvironmentVariable($Matches[1], $value, 'Process')
        }
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $bridgeRoot 'node_modules/@modelcontextprotocol/sdk/package.json'))) {
    $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
    $pnpmPath = if ($pnpmCommand) { $pnpmCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd' }
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    Write-Host 'Instalando las dependencias oficiales de MCP (solo la primera vez)...'
    Push-Location $bridgeRoot
    try {
        if (Test-Path -LiteralPath $pnpmPath) { & $pnpmPath install --frozen-lockfile }
        elseif ($npmCommand) { & $npmCommand.Source install }
        else { throw 'Instala Node.js con npm y vuelve a abrir Start.cmd.' }
        if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias. Revisa la conexion a Internet.' }
    } finally { Pop-Location }
}
New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
$configPath = Join-Path $dataPath 'config.json'
$connected = $false
if (Test-Path -LiteralPath $configPath) {
    $code = (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).token
    try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8787/health' -Headers @{ Authorization = "Bearer $code" } -TimeoutSec 2; $connected = $health.ok } catch { }
}
if (-not $connected) {
    $serverPath = Join-Path $bridgeRoot 'server.mjs'
    $process = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $bridgeRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dataPath 'server.log') -RedirectStandardError (Join-Path $dataPath 'error.log')
    @{ id = $process.Id; node = $nodePath; server = $serverPath } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $dataPath 'process.json')
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        if (Test-Path -LiteralPath $configPath) {
            $code = (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).token
            try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8787/health' -Headers @{ Authorization = "Bearer $code" } -TimeoutSec 1; $connected = $health.ok; if ($connected) { break } } catch { }
        }
        if ($process.HasExited) { break }
    }
}
if (-not $connected) { throw 'No se pudo iniciar el puente. Revisa data/error.log; el puerto 8787 puede estar ocupado.' }
Write-Host ''
Write-Host 'Sebams esta conectado en http://127.0.0.1:8787'
Write-Host 'Copia este codigo en Settings > AI assistant > Connection code:'
Write-Host $code
Write-Host ''
if ($health.configured) { Write-Host 'Gemini esta configurado. Usa un proyecto Free Tier sin facturacion.' }
else { Write-Host 'Sin API key todavia: puedes recibir tareas de MCP. Para resolver con IA, configura .env y reinicia el puente.' }
Write-Host 'Se ejecuta en segundo plano. Usa Stop.cmd para detenerlo. No se iniciara automaticamente con Windows.'
