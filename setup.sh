#!/usr/bin/env bash
# ==============================================================================
# Presco (INI3A-EQ3) — Setup Script for Linux & macOS
# Instala todas as dependências e configura o ambiente de desenvolvimento.
# Uso: bash setup.sh
# ==============================================================================

set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}${BOLD}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}${BOLD}[ERRO]${RESET}  $*"; }
step()    { echo -e "\n${BOLD}━━━  $*  ━━━${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ==============================================================================
# 1. Detectar SO
# ==============================================================================
step "1. Detectando sistema operacional"

OS="$(uname -s)"
case "$OS" in
  Linux*)  PLATFORM="linux" ;;
  Darwin*) PLATFORM="macos" ;;
  *)       error "Sistema não suportado: $OS. Use Windows (setup.ps1) ou Linux/macOS."; exit 1 ;;
esac
success "Plataforma detectada: ${BOLD}$PLATFORM${RESET}"

# ==============================================================================
# 2. Verificar/instalar Node.js >= 20
# ==============================================================================
step "2. Verificando Node.js"

check_node() {
  if command -v node &>/dev/null; then
    NODE_VER="$(node -e 'process.stdout.write(process.versions.node)')"
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
    info "Instalando fnm (Fast Node Manager)..."
    curl -fsSL https://fnm.vercel.app/install | bash
    export FNM_PATH="$HOME/.local/share/fnm"
    export PATH="$FNM_PATH:$PATH"
    eval "$(fnm env --use-on-cd 2>/dev/null || true)"
  fi
  fnm install 22 --lts
  fnm use 22
  fnm default 22
  check_node || { error "Falha ao instalar Node.js. Instale manualmente: https://nodejs.org"; exit 1; }
fi

# ==============================================================================
# 3. Verificar npm >= 10
# ==============================================================================
step "3. Verificando npm"

NPM_VER="$(npm --version)"
NPM_MAJOR="${NPM_VER%%.*}"
if [ "$NPM_MAJOR" -lt 10 ]; then
  info "Atualizando npm para a versão mais recente..."
  npm install -g npm@latest
fi
success "npm $(npm --version) pronto"

# ==============================================================================
# 4. Verificar/instalar Docker
# ==============================================================================
step "4. Verificando Docker"

if ! command -v docker &>/dev/null; then
  warn "Docker não encontrado."
  if [ "$PLATFORM" = "macos" ]; then
    info "Instale o Docker Desktop para Mac: https://docs.docker.com/desktop/install/mac-install/"
    warn "Depois de instalar o Docker, rode este script novamente."
    read -rp "Pressione Enter para continuar sem Docker (bancos de dados não serão iniciados)..." || true
  elif [ "$PLATFORM" = "linux" ]; then
    info "Instalando Docker via get.docker.com..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    warn "Você foi adicionado ao grupo 'docker'. Pode ser necessário reiniciar a sessão."
    success "Docker instalado"
  fi
else
  DOCKER_VER="$(docker --version | grep -oP '[\d.]+' | head -1)"
  success "Docker $DOCKER_VER encontrado"
fi

if docker compose version &>/dev/null 2>&1; then
  success "Docker Compose (plugin v2) disponível"
elif command -v docker-compose &>/dev/null; then
  warn "docker-compose v1 encontrado. Recomendado usar Docker >= 23 com plugin compose."
else
  warn "Docker Compose não encontrado. Verifique sua instalação do Docker."
fi

# ==============================================================================
# 5. Verificar Expo CLI
# ==============================================================================
step "5. Verificando Expo CLI"

if ! command -v expo &>/dev/null; then
  info "Instalando Expo CLI globalmente..."
  npm install -g expo-cli
  success "Expo CLI instalado"
else
  success "Expo CLI encontrado"
fi

# ==============================================================================
# 6. Instalar dependências npm (raiz + workspaces)
# ==============================================================================
step "6. Instalando dependências npm (raiz + backend + frontend)"

info "Executando: npm install"
npm install
success "Dependências instaladas com sucesso"

# ==============================================================================
# 7. Configurar arquivo .env do backend
# ==============================================================================
step "7. Configurando src/backend/.env"

ENV_FILE="$SCRIPT_DIR/src/backend/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    # Ajustar porta do Postgres (docker-compose mapeia 5433:5432)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's|@localhost:5432/|@localhost:5433/|g' "$ENV_FILE"
      sed -i '' 's|redis://localhost:6379|redis://localhost:6380|g' "$ENV_FILE"
    else
      sed -i 's|@localhost:5432/|@localhost:5433/|g' "$ENV_FILE"
      sed -i 's|redis://localhost:6379|redis://localhost:6380|g' "$ENV_FILE"
    fi
    success ".env criado em src/backend/.env (portas Docker ajustadas: PG→5433, Redis→6380)"
  else
    cat > "$ENV_FILE" <<'EOF'
DATABASE_URL=postgres://postgres:postgres@localhost:5433/presco_db
REDIS_URL=redis://localhost:6380
SERVER_PORT=3333
SERVER_HOST=0.0.0.0
JWT_SECRET=super_secret_jwt_presco_key_2026_dev_ini3a
EOF
    success ".env criado com valores padrão"
  fi
else
  warn "src/backend/.env já existe — não sobrescrito"
fi

# ==============================================================================
# 8. Subir containers Docker (Postgres + Redis)
# ==============================================================================
step "8. Iniciando serviços Docker (PostgreSQL + Redis)"

if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  info "Subindo containers..."
  docker compose up -d

  info "Aguardando PostgreSQL ficar pronto..."
  RETRIES=30
  until docker compose exec -T postgres pg_isready -U postgres -d presco_db &>/dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
      warn "PostgreSQL demorou para iniciar. Continue manualmente: npm run db:up"
      break
    fi
    sleep 2
  done
  success "PostgreSQL pronto"
  success "Redis pronto"
else
  warn "Docker não está rodando. Inicie manualmente depois: npm run db:up"
fi

# ==============================================================================
# 9. Migrations + Seed
# ==============================================================================
step "9. Migrations e Seed do banco de dados"

if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  info "Aplicando migrations Drizzle..."
  npm run db:migrate && success "Migrations concluídas" || warn "Migrations falharam — verifique os logs acima"

  info "Populando banco de dados (seed)..."
  npm run db:seed && success "Seed concluído (usuários, produtos, mercados, badges criados)" || warn "Seed falhou — verifique os logs acima"
else
  warn "Docker não disponível agora. Quando subir os containers, execute:"
  echo "    npm run db:migrate"
  echo "    npm run db:seed"
fi

# ==============================================================================
# 10. Resumo
# ==============================================================================
step "✅ Setup concluído!"

echo ""
echo -e "${GREEN}${BOLD}Presco pronto para uso!${RESET}"
echo ""
echo -e "  ${BOLD}Iniciar o projeto:${RESET}"
echo -e "    ${CYAN}npm run dev${RESET}        → Backend (porta 3333) + Expo simultaneamente"
echo -e "    ${CYAN}npm run db:up${RESET}      → Subir containers Docker (se parados)"
echo ""
echo -e "  ${BOLD}Credenciais de teste:${RESET}"
echo -e "    Admin   → admin@admin.org / admin"
echo -e "    Usuário → user@user.org / user"
echo ""
echo -e "  ${BOLD}Portas Docker:${RESET}  PostgreSQL 5433  |  Redis 6380"
echo -e "  ${BOLD}.env backend:${RESET}   src/backend/.env"
echo -e "  ${BOLD}Docs:${RESET}           README.md"
echo ""
