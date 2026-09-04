# ==============================================================================
# Presco (INI3A-EQ3) — Setup Script para Windows (PowerShell)
# Instala todas as dependencias, configura ambiente e diagnostica a rede local.
# Uso: powershell -ExecutionPolicy Bypass -File setup.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ── Helpers Visuais ───────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n━━━  $msg  ━━━" -ForegroundColor Cyan }
function Write-Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[AVISO] $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "[ERRO]  $msg" -ForegroundColor Red }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# ==============================================================================
# 1. Verificar ambiente Windows
# ==============================================================================
Write-Step "1. Verificando ambiente Windows"
Write-Ok "Windows detectado: $([System.Environment]::OSVersion.VersionString)"

# ==============================================================================
# 2. Verificar/instalar Node.js >= 20
# ==============================================================================
Write-Step "2. Verificando Node.js"

function Test-Node {
    try {
        $ver = (node --version 2>$null).TrimStart("v")
        $major = [int]($ver.Split(".")[0])
        if ($major -ge 20) { Write-Ok "Node.js $ver encontrado"; return $true }
        Write-Warn "Node.js $ver encontrado, mas e necessario >= 20"; return $false
    } catch { return $false }
}

if (-not (Test-Node)) {
    Write-Info "Instalando Node.js 22 LTS via winget..."
    try {
        winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
        if (-not (Test-Node)) { throw "Node nao encontrado apos instalacao" }
    } catch {
        Write-Err "Falha ao instalar Node.js automaticamente."
        Write-Warn "Baixe manualmente: https://nodejs.org/en/download"
        Write-Warn "Apos instalar, feche este terminal, abra um novo e rode setup.ps1 novamente."
        exit 1
    }
}

# ==============================================================================
# 3. Verificar npm >= 10
# ==============================================================================
Write-Step "3. Verificando npm"

$npmVer = (npm --version)
$npmMajor = [int]($npmVer.Split(".")[0])
if ($npmMajor -lt 10) {
    Write-Info "Atualizando npm..."
    npm install -g npm@latest
}
Write-Ok "npm $(npm --version) pronto"

# ==============================================================================
# 4. Verificar Docker Desktop
# ==============================================================================
Write-Step "4. Verificando Docker Desktop"

$dockerOk = $false
try {
    $dockerVer = docker --version 2>$null
    if ($dockerVer) {
        Write-Ok "$dockerVer"
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dockerOk = $true
            Write-Ok "Docker daemon esta ativo e pronto"
        } else {
            Write-Warn "Docker Desktop esta instalado mas nao esta rodando. Inicie o aplicativo Docker Desktop."
        }
    }
} catch {
    Write-Warn "Docker nao encontrado no PATH."
    Write-Info "Voce pode instalar com: winget install Docker.DockerDesktop"
    Write-Warn "Instale, inicie o Docker Desktop e rode este script novamente para configurar o banco de dados."
}

# ==============================================================================
# 5. Instalar dependencias npm
# ==============================================================================
Write-Step "5. Instalando dependencias npm (Workspaces + Tunnels)"

Write-Info "Executando: npm install"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Tentando com cache isolado..."
    npm install --cache "$env:TEMP\npm-presco-cache"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install falhou"
        exit 1
    }
}
Write-Ok "Dependencias instaladas com sucesso"

# ==============================================================================
# 6. Configurar .env do backend
# ==============================================================================
Write-Step "6. Configurando src\backend\.env"

$envFile = Join-Path $ScriptDir "src\backend\.env"

if (-not (Test-Path $envFile)) {
    $defaultEnv = @"
# Presco Backend Environment Variables
DATABASE_URL=postgres://postgres:postgres@localhost:5433/presco_db
REDIS_URL=redis://localhost:6380
SERVER_PORT=3333
SERVER_HOST=0.0.0.0
JWT_SECRET=super_secret_jwt_presco_key_2026_dev_ini3a
NODE_ENV=development
"@
    $defaultEnv | Set-Content $envFile -Encoding UTF8
    Write-Ok ".env criado (portas Docker: PostgreSQL->5433, Redis->6380, API->3333)"
} else {
    Write-Ok "src\backend\.env ja existe e foi mantido"
}

# ==============================================================================
# 7. Subir containers Docker e rodar Migrations/Seed
# ==============================================================================
Write-Step "7. Inicializando Banco de Dados e Migrations"

if ($dockerOk) {
    Write-Info "Subindo containers Docker (PostgreSQL 17 + Redis 7)..."
    docker compose up -d

    Write-Info "Aguardando PostgreSQL ficar pronto..."
    $retries = 20
    do {
        Start-Sleep -Seconds 1
        $retries--
        docker compose exec -T postgres pg_isready -U postgres -d presco_db 2>&1 | Out-Null
    } while ($LASTEXITCODE -ne 0 -and $retries -gt 0)

    Write-Info "Aplicando migrations Drizzle..."
    npm run db:migrate
    Write-Info "Populando banco com catalogo inicial (seed)..."
    npm run db:seed
    Write-Ok "Banco de dados configurado com sucesso!"
} else {
    Write-Warn "Docker nao disponivel no momento. Apos iniciar o Docker Desktop, execute:"
    Write-Host "    npm run db:up" -ForegroundColor Cyan
    Write-Host "    npm run db:migrate" -ForegroundColor Cyan
    Write-Host "    npm run db:seed" -ForegroundColor Cyan
}

# ==============================================================================
# 8. Diagnostico de Rede
# ==============================================================================
Write-Step "8. Diagnostico de Rede"

$LanIp = "127.0.0.1"
try {
    $LanIp = (npx.cmd tsx -e "import { getLocalLanIp } from './scripts/verify_connection.ts'; console.log(getLocalLanIp());")
} catch {}

Write-Host "IP de Rede Detectado: " -NoNewline
Write-Host "$LanIp" -ForegroundColor Cyan

if ($LanIp -match "^10\.") {
    Write-Warn "Rede corporativa/universitaria detectada (10.x.x.x - ex: UNESP, empresas)."
    Write-Host "  Roteadores corporativos bloqueiam conexoes diretas entre celular e PC (AP Isolation)."
    Write-Host "  Recomendado usar o Modo Corporativo / Tunel: .\start_project.ps1 -Mode corp" -ForegroundColor Yellow
} elseif ($LanIp -match "^172\.20\.10\." -or $LanIp -match "^192\.168\.43\.") {
    Write-Ok "Hotspot movel detectado! Latencia minima garantida (0 a 2ms)."
} else {
    Write-Ok "Rede local convencional detectada. Modo Rede Local recomendado para resposta instantanea."
}

# ==============================================================================
# 9. Resumo Final
# ==============================================================================
Write-Step "Setup Concluido com Sucesso!"

Write-Host ""
Write-Host "Presco pronto para uso no Windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Como Iniciar o Projeto:"
Write-Host "    .\start_project.ps1           -> Menu interativo de inicializacao" -ForegroundColor Cyan
Write-Host "    .\start_project.ps1 -Mode lan  -> ⚡ Modo Rede Local (0 a 5ms - Resposta Instantanea)" -ForegroundColor Cyan
Write-Host "    .\start_project.ps1 -Mode corp -> 🏢 Modo Corporativo (Tunel para redes fechadas)" -ForegroundColor Cyan
Write-Host "    start.bat                     -> Duplo clique para iniciar" -ForegroundColor Cyan
Write-Host "    npm run dev                   -> Inicializador multiplataforma" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Credenciais de teste:"
Write-Host "    Admin   -> admin@admin.org / admin"
Write-Host "    Usuario -> user@user.org / user"
Write-Host ""
