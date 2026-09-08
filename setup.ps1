# ==============================================================================
# Presco (INI3A-EQ3) — Setup para Windows (PowerShell)
# Garante Node + npm + git, instala as dependencias e delega o resto
# (Docker/Postgres/Redis, .env, migrations, diagnostico) para scripts/bootstrap.ts.
#
# Uso: powershell -ExecutionPolicy Bypass -File setup.ps1 [--yes] [--force-docker]
# ==============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step { param($m) Write-Host "`n---  $m  ---" -ForegroundColor Cyan }
function Write-Info { param($m) Write-Host "[INFO]  $m" -ForegroundColor Cyan }
function Write-Ok   { param($m) Write-Host "[OK]    $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "[AVISO] $m" -ForegroundColor Yellow }
function Write-Err  { param($m) Write-Host "[ERRO]  $m" -ForegroundColor Red }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [Environment]::GetEnvironmentVariable("Path", "User")
}

# --- 1. Windows ---
Write-Step "1. Ambiente Windows"
Write-Ok "$([Environment]::OSVersion.VersionString)"

# --- 2. Node.js >= 20 (auto) ---
Write-Step "2. Verificando Node.js"
function Test-Node {
    try {
        $ver = (node --version 2>$null).TrimStart("v")
        if ([int]($ver.Split(".")[0]) -ge 20) { Write-Ok "Node.js $ver"; return $true }
        Write-Warn "Node.js $ver < 20"; return $false
    } catch { return $false }
}
if (-not (Test-Node)) {
    Write-Info "Instalando Node.js LTS via winget..."
    winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    Refresh-Path
    if (-not (Test-Node)) {
        Write-Err "Falha ao instalar Node. Baixe: https://nodejs.org  (feche e reabra o terminal depois)"
        exit 1
    }
}

# --- 3. npm >= 10 ---
Write-Step "3. Verificando npm"
if ([int]((npm --version).Split(".")[0]) -lt 10) { npm install -g npm@latest }
Write-Ok "npm $(npm --version)"

# --- 4. git (auto) ---
Write-Step "4. Verificando git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Info "Instalando git via winget..."
    winget install --id Git.Git --accept-package-agreements --accept-source-agreements --silent
    Refresh-Path
}
if (Get-Command git -ErrorAction SilentlyContinue) { Write-Ok "$(git --version)" }
else { Write-Warn "Instale o git manualmente: https://git-scm.com/downloads" }

# --- 5. Dependencias npm ---
Write-Step "5. Instalando dependencias (npm workspaces)"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Tentando com cache isolado..."
    npm install --cache "$env:TEMP\npm-presco-cache"
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install falhou"; exit 1 }
}
Write-Ok "Dependencias instaladas"

# --- 6. Bootstrap ---
Write-Step "6. Bootstrap do ambiente"
npx tsx scripts/bootstrap.ts @args
exit $LASTEXITCODE
