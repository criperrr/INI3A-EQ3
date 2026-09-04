# ==============================================================================
# Presco (INI3A-EQ3) — Setup Script for Windows (PowerShell)
# Instala todas as dependencias e configura o ambiente de desenvolvimento.
# Uso: powershell -ExecutionPolicy Bypass -File setup.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ── Helpers ────────────────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n━━━  $msg  ━━━" -ForegroundColor Cyan }
function Write-Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
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
        $ver = (node --version 2>$null).TrimStart('v')
        $major = [int]($ver.Split('.')[0])
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
$npmMajor = [int]($npmVer.Split('.')[0])
if ($npmMajor -lt 10) {
    Write-Info "Atualizando npm..."
    npm install -g npm@latest
}
Write-Ok "npm $(npm --version) pronto"

# ==============================================================================
# 4. Verificar Docker Desktop
# ==============================================================================
Write-Step "4. Verificando Docker"

$dockerOk = $false
try {
    $dockerVer = docker --version
    Write-Ok "$dockerVer"
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
    else { throw "Docker daemon nao esta rodando" }
} catch {
    Write-Warn "Docker nao encontrado ou nao esta rodando."
    Write-Info "Baixe o Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
    Write-Warn "Instale, inicie o Docker Desktop e rode este script novamente para configurar o banco de dados."
}

# ==============================================================================
# 5. Verificar Expo CLI
# ==============================================================================
Write-Step "5. Verificando Expo CLI"

try {
    expo --version 2>&1 | Out-Null
    Write-Ok "Expo CLI encontrado"
} catch {
    Write-Info "Instalando Expo CLI globalmente..."
    npm install -g expo-cli
    Write-Ok "Expo CLI instalado"
}

# ==============================================================================
# 6. Instalar dependencias npm
# ==============================================================================
Write-Step "6. Instalando dependencias npm (raiz + backend + frontend)"

Write-Info "Executando: npm install"
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install falhou"; exit 1 }
Write-Ok "Dependencias instaladas com sucesso"

# ==============================================================================
# 7. Configurar .env do backend
# ==============================================================================
Write-Step "7. Configurando src\backend\.env"

$envFile    = Join-Path $ScriptDir "src\backend\.env"
$envExample = Join-Path $ScriptDir ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        # Ajustar porta Postgres (docker-compose mapeia 5433:5432)
        (Get-Content $envFile) -replace '@localhost:5432/', '@localhost:5433/' | Set-Content $envFile
        # Ajustar porta Redis (docker-compose mapeia 6380:6379)
        (Get-Content $envFile) -replace 'redis://localhost:6379', 'redis://localhost:6380' | Set-Content $envFile
        Write-Ok ".env criado (portas Docker: PG->5433, Redis->6380)"
    } else {
        $defaultEnv = @"
DATABASE_URL=postgres://postgres:postgres@localhost:5433/presco_db
REDIS_URL=redis://localhost:6380
SERVER_PORT=3333
SERVER_HOST=0.0.0.0
JWT_SECRET=super_secret_jwt_presco_key_2026_dev_ini3a
"@
        $defaultEnv | Set-Content $envFile
        Write-Ok ".env criado com valores padrao"
    }
} else {
    Write-Warn "src\backend\.env ja existe — nao sobrescrito"
}

# ==============================================================================
# 8. Subir containers Docker
# ==============================================================================
Write-Step "8. Iniciando servicos Docker (PostgreSQL + Redis)"

if ($dockerOk) {
    Write-Info "Subindo containers..."
    docker compose up -d

    Write-Info "Aguardando PostgreSQL ficar pronto..."
    $retries = 30
    do {
        Start-Sleep -Seconds 2
        $retries--
        docker compose exec -T postgres pg_isready -U postgres -d presco_db 2>&1 | Out-Null
    } while ($LASTEXITCODE -ne 0 -and $retries -gt 0)

    if ($retries -le 0) {
        Write-Warn "PostgreSQL demorou para iniciar. Execute manualmente: npm run db:up"
    } else {
        Write-Ok "PostgreSQL pronto"
        Write-Ok "Redis pronto"
    }
} else {
    Write-Warn "Docker nao disponivel. Apos instalar e iniciar o Docker Desktop, execute:"
    Write-Host "    npm run db:up" -ForegroundColor Cyan
}

# ==============================================================================
# 9. Migrations + Seed
# ==============================================================================
Write-Step "9. Migrations e Seed do banco de dados"

if ($dockerOk) {
    Write-Info "Aplicando migrations Drizzle..."
    npm run db:migrate
    if ($LASTEXITCODE -eq 0) { Write-Ok "Migrations concluidas" }
    else { Write-Warn "Migrations falharam — verifique os logs acima" }

    Write-Info "Populando banco de dados (seed)..."
    npm run db:seed
    if ($LASTEXITCODE -eq 0) { Write-Ok "Seed concluido (usuarios, produtos, mercados, badges criados)" }
    else { Write-Warn "Seed falhou — verifique os logs acima" }
} else {
    Write-Warn "Docker nao disponivel agora. Quando subir os containers, execute:"
    Write-Host "    npm run db:migrate" -ForegroundColor Cyan
    Write-Host "    npm run db:seed" -ForegroundColor Cyan
}

# ==============================================================================
# 10. Resumo
# ==============================================================================
Write-Step "Setup concluido!"

Write-Host ""
Write-Host "Presco pronto para uso!" -ForegroundColor Green
Write-Host ""
Write-Host "  Iniciar o projeto:"
Write-Host "    npm run dev" -NoNewline -ForegroundColor Cyan
Write-Host "        -> Backend (porta 3333) + Expo simultaneamente"
Write-Host "    npm run db:up" -NoNewline -ForegroundColor Cyan
Write-Host "       -> Subir containers Docker (se parados)"
Write-Host ""
Write-Host "  Credenciais de teste:"
Write-Host "    Admin   -> admin@admin.org / admin"
Write-Host "    Usuario -> user@user.org / user"
Write-Host ""
Write-Host "  Portas Docker:  PostgreSQL 5433  |  Redis 6380"
Write-Host "  .env backend:   src\backend\.env"
Write-Host "  Docs:           README.md"
Write-Host ""
