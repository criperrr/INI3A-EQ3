# ==============================================================================
# Presco (INI3A-EQ3) — Script de Inicializacao para Windows (PowerShell)
# Suporta:
#   .\start_project.ps1               -> Menu interativo de selecao de rede
#   .\start_project.ps1 -Mode lan     -> ⚡ Modo Rede Local (0 a 5ms - Menor tempo de resposta)
#   .\start_project.ps1 -Mode corp    -> 🏢 Modo Corporativo / Fechado (Tunel para UNESP/empresas)
#   .\start_project.ps1 -Mode localhost -> 💻 Modo Localhost (Simulador/Web)
# ==============================================================================

param(
    [string]$Mode = "",
    [switch]$Local,
    [switch]$Tunnel,
    [switch]$Localhost,
    [string]$Url = "",
    [string]$Ip = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# Normalizar flags de conveniencia
if ($Local) { $Mode = "lan" }
if ($Tunnel) { $Mode = "corp" }
if ($Localhost) { $Mode = "localhost" }

# Verificar se Node.js esta no PATH
try {
    node --version 2>&1 | Out-Null
} catch {
    Write-Host "[ERRO] Node.js nao encontrado. Execute setup.ps1 primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path (Join-Path $ScriptDir "node_modules"))) {
    Write-Host "[AVISO] Dependencias nao encontradas. Executando setup..." -ForegroundColor Yellow
    powershell -ExecutionPolicy Bypass -File (Join-Path $ScriptDir "setup.ps1")
}

$devArgs = @()
if ($Mode -eq "lan" -or $Mode -eq "local") {
    $devArgs += "--lan"
} elseif ($Mode -eq "corp" -or $Mode -eq "tunnel" -or $Mode -eq "fechada") {
    $devArgs += "--corp"
} elseif ($Mode -eq "localhost" -or $Mode -eq "web") {
    $devArgs += "--localhost"
}

if ($Url) {
    $devArgs += @("--url", $Url)
}

if ($Ip) {
    $devArgs += @("--ip", $Ip)
}

# Iniciar o orquestrador TypeScript unificado
& npx.cmd tsx (Join-Path $ScriptDir "scripts\dev_launcher.ts") $devArgs
