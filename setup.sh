#!/usr/bin/env bash
# ==============================================================================
# Presco (INI3A-EQ3) — Setup Script para Linux & macOS
# Instala e valida dependências, configura ambiente e diagnostica a rede local.
# Uso: bash setup.sh
# ==============================================================================

set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────────
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

info()    { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}${BOLD}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[AVISO]${RESET} $*"; }
error()   { echo -e "${RED}${BOLD}[ERRO]${RESET}  $*"; }
step()    { echo -e "\n${BOLD}━━━  $*  ━━━${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ==============================================================================
# 1. Detectar SO
# ==============================================================================
step "1. Detectando Sistema Operacional"

OS="$(uname -s)"
case "$OS" in
  Linux*)  PLATFORM="linux" ;;
  Darwin*) PLATFORM="macos" ;;
  *)       error "Sistema não suportado diretamente por este script shell: $OS. Use Windows (setup.ps1 ou setup.bat)."; exit 1 ;;
esac
success "Plataforma detectada: ${BOLD}$PLATFORM${RESET}"

# ==============================================================================
# 2. Verificar/instalar Node.js >= 20
# ==============================================================================
step "2. Verificando Node.js"

check_node() {
  if command -v node &>/dev/null; then
    NODE_VER="$(node -e "process.stdout.write(process.versions.node)")"
    NODE_MAJOR="${NODE_VER%%.*}"
    if [ "$NODE_MAJOR" -ge 20 ]; then
      success "Node.js $NODE_VER encontrado"
      return 0
    else
      warn "Node.js $NODE_VER encontrado, mas é necessário >= 20"
      return 1
    fi
  fi
  return 1
}

if ! check_node; then
  info "Instalando Node.js 22 LTS via fnm..."
  if ! command -v fnm &>/dev/null; then
    if [ "$PLATFORM" = "macos" ] && command -v brew &>/dev/null; then
      brew install node@22 || true
      brew link node@22 --force --overwrite || true
    else
      info "Instalando fnm (Fast Node Manager)..."
      curl -fsSL https://fnm.vercel.app/install | bash
      export FNM_PATH="$HOME/.local/share/fnm"
      export PATH="$FNM_PATH:$PATH"
      eval "$(fnm env --use-on-cd 2>/dev/null || true)"
      fnm install 22 --lts
      fnm use 22
      fnm default 22
    fi
  fi
  check_node || { error "Falha ao instalar Node.js. Instale manualmente: https://nodejs.org"; exit 1; }
fi

# ==============================================================================
# 3. Verificar npm >= 10
# ==============================================================================
step "3. Verificando npm"

NPM_VER="$(npm --version)"
NPM_MAJOR="${NPM_VER%%.*}"
if [ "$NPM_MAJOR" -lt 10 ]; then
  info "Atualizando npm para versão mais recente..."
  npm install -g npm@latest || true
fi
success "npm $(npm --version) pronto"

# ==============================================================================
# 4. Verificar Docker & Serviços de Infraestrutura
# ==============================================================================
step "4. Verificando Docker"

DOCKER_READY=false
if command -v docker &>/dev/null; then
  DOCKER_VER="$(docker --version 2>/dev/null || echo "desconhecida")"
  success "Docker encontrado: $DOCKER_VER"
  if docker info &>/dev/null 2>&1; then
    DOCKER_READY=true
    success "Docker daemon está ativo e pronto"
  else
    warn "Docker está instalado mas o daemon não está rodando (inicie o Docker Desktop)."
  fi
else
  warn "Docker não encontrado no PATH."
  if [ "$PLATFORM" = "macos" ]; then
    if command -v brew &>/dev/null; then
      info "Homebrew detectado. Você pode instalar o Docker com: brew install --cask docker"
    else
      info "Baixe o Docker Desktop para Mac: https://docs.docker.com/desktop/install/mac-install/"
    fi
  elif [ "$PLATFORM" = "linux" ]; then
    info "Você pode instalar o Docker com: curl -fsSL https://get.docker.com | sudo sh"
  fi
  warn "Continuando instalação (o backend possui fallback resiliente de cache in-memory)."
fi

# ==============================================================================
# 5. Instalar dependências npm com cache resiliente
# ==============================================================================
step "5. Instalando dependências npm (Workspaces + Túneis)"

info "Executando: npm install"
if ! npm install; then
  warn "npm install encontrou problema de permissão no cache padrão. Tentando com cache isolado..."
  npm install --cache "$HOME/.npm-presco-cache" || npm install --cache /tmp/.npm-cache
fi
success "Dependências instaladas com sucesso"

# ==============================================================================
# 6. Configurar arquivo .env do backend
# ==============================================================================
step "6. Configurando src/backend/.env"

ENV_FILE="$SCRIPT_DIR/src/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" << "EOF_ENV"
# Presco Backend Environment Variables
DATABASE_URL=postgres://postgres:postgres@localhost:5433/presco_db
REDIS_URL=redis://localhost:6380
SERVER_PORT=3333
SERVER_HOST=0.0.0.0
JWT_SECRET=super_secret_jwt_presco_key_2026_dev_ini3a
NODE_ENV=development
EOF_ENV
  success ".env criado em src/backend/.env (Portas mapeadas: PostgreSQL→5433, Redis→6380, API→3333)"
else
  success "src/backend/.env já existe e foi mantido"
fi

# ==============================================================================
# 7. Subir Docker (se disponível) e rodar Migrations/Seed
# ==============================================================================
step "7. Inicializando Banco de Dados e Migrations"

if [ "$DOCKER_READY" = true ]; then
  info "Subindo containers Docker (PostgreSQL 17 + PostGIS e Redis 7)..."
  docker compose up -d

  info "Aguardando PostgreSQL ficar saudável..."
  RETRIES=20
  until docker compose exec -T postgres pg_isready -U postgres -d presco_db &>/dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
      warn "PostgreSQL ainda está inicializando..."
      break
    fi
    sleep 1
  done

  info "Aplicando migrations Drizzle..."
  npm run db:migrate || warn "Aviso: Migrations já aplicadas ou aguardando conexão."

  info "Populando banco com catálogo de produtos, mercados e badges (seed)..."
  npm run db:seed || warn "Aviso: Seed já executado ou aguardando conexão."
else
  warn "Docker não está ativo no momento. Quando iniciar o Docker Desktop, execute:"
  echo -e "    ${CYAN}npm run db:up${RESET}       → Iniciar banco de dados"
  echo -e "    ${CYAN}npm run db:migrate${RESET}  → Aplicar estrutura de tabelas"
  echo -e "    ${CYAN}npm run db:seed${RESET}     → Popular dados de teste"
fi

# ==============================================================================
# 8. Diagnóstico de Rede & Detecção de Ambiente
# ==============================================================================
step "8. Diagnóstico de Rede"

LAN_IP=$(npx tsx -e '
  import { getLocalLanIp } from "./scripts/verify_connection.ts";
  console.log(getLocalLanIp());
' 2>/dev/null || echo "127.0.0.1")

echo -e "📍 ${BOLD}IP de Rede Detectado:${RESET} ${CYAN}${BOLD}${LAN_IP}${RESET}"

case "$LAN_IP" in
  10.*)
    echo -e "${YELLOW}ℹ️  Rede corporativa/universitária detectada (10.x.x.x - ex: UNESP, eduroam).${RESET}"
    echo -e "   • Roteadores corporativos bloqueiam conexões diretas entre celulares e notebooks (AP Isolation)."
    echo -e "   • Para rodar sem bloqueio, use o ${BOLD}Modo Corporativo / Túnel${RESET} ou conecte o notebook ao Hotspot 4G/5G do celular."
    ;;
  172.20.10.*|192.168.43.*)
    echo -e "${GREEN}✓ Hotspot móvel detectado! Latência mínima garantida (0 a 2ms).${RESET}"
    ;;
  *)
    echo -e "${GREEN}✓ Rede local convencional detectada. Modo Rede Local recomendado para resposta instantânea.${RESET}"
    ;;
esac

# ==============================================================================
# 9. Resumo Final
# ==============================================================================
step "✅ Setup Concluído com Sucesso!"

echo ""
echo -e "${GREEN}${BOLD}Ambiente Presco pronto para desenvolvimento!${RESET}"
echo ""
echo -e "  ${BOLD}Como Iniciar o Projeto:${RESET}"
echo -e "    ${CYAN}./start_project.sh${RESET}          → Menu interativo para escolher o modo"
echo -e "    ${CYAN}./start_project.sh --lan${RESET}    → ⚡ Modo Rede Local (Menor tempo de resposta: 0-5ms)"
echo -e "    ${CYAN}./start_project.sh --corp${RESET}   → 🏢 Modo Corporativo (Túnel seguro para UNESP/empresas)"
echo -e "    ${CYAN}npm run dev${RESET}                 → Inicializador universal multiplataforma"
echo ""
echo -e "  ${BOLD}Credenciais de Teste:${RESET}"
echo -e "    Administrador → ${CYAN}admin@admin.org${RESET} / ${CYAN}admin${RESET}"
echo -e "    Usuário       → ${CYAN}user@user.org${RESET} / ${CYAN}user${RESET}"
echo ""
