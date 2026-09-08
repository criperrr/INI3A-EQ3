#!/usr/bin/env bash
# ==============================================================================
# Presco (INI3A-EQ3) — Setup para Linux & macOS
# Garante Node + npm + git, instala as dependências e delega o resto
# (Docker/Postgres/Redis, .env, migrations, diagnóstico) para scripts/bootstrap.ts.
#
# Uso:  bash setup.sh [--yes] [--force-docker|--force-native] [--skip-services]
# ==============================================================================

set -euo pipefail

RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"; CYAN="\033[0;36m"
BOLD="\033[1m"; RESET="\033[0m"
info()    { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}${BOLD}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[AVISO]${RESET} $*"; }
error()   { echo -e "${RED}${BOLD}[ERRO]${RESET}  $*"; }
step()    { echo -e "\n${BOLD}━━━  $*  ━━━${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Sistema operacional ────────────────────────────────────────────────────
step "1. Detectando Sistema Operacional"
OS="$(uname -s)"
case "$OS" in
  Linux*)  PLATFORM="linux" ;;
  Darwin*) PLATFORM="macos" ;;
  *) error "Use setup.ps1 / setup.bat no Windows. SO não suportado aqui: $OS"; exit 1 ;;
esac
success "Plataforma: ${BOLD}$PLATFORM${RESET}"

# Homebrew / Docker Desktop no PATH (macOS)
for bin_dir in "$HOME/.docker/bin" "/Applications/Docker.app/Contents/Resources/bin" \
               "/usr/local/bin" "/opt/homebrew/bin" "$HOME/.local/share/fnm"; do
  [ -d "$bin_dir" ] && [[ ":$PATH:" != *":$bin_dir:"* ]] && export PATH="$bin_dir:$PATH" || true
done

# ── 2. Node.js >= 20 (auto) ───────────────────────────────────────────────────
step "2. Verificando Node.js"
check_node() {
  command -v node &>/dev/null || return 1
  local ver major; ver="$(node -e 'process.stdout.write(process.versions.node)')"
  major="${ver%%.*}"
  [ "$major" -ge 20 ] && { success "Node.js $ver"; return 0; } || { warn "Node.js $ver < 20"; return 1; }
}
if ! check_node; then
  info "Instalando Node.js 22 LTS…"
  if [ "$PLATFORM" = "macos" ] && command -v brew &>/dev/null; then
    brew install node@22 && brew link --overwrite --force node@22 || true
  else
    curl -fsSL https://fnm.vercel.app/install | bash
    export PATH="$HOME/.local/share/fnm:$PATH"
    eval "$(fnm env 2>/dev/null || true)"
    fnm install 22 && fnm use 22 && fnm default 22
  fi
  check_node || { error "Instale o Node manualmente: https://nodejs.org"; exit 1; }
fi

# ── 3. npm >= 10 ─────────────────────────────────────────────────────────────
step "3. Verificando npm"
NPM_MAJOR="$(npm --version | cut -d. -f1)"
[ "$NPM_MAJOR" -lt 10 ] && npm install -g npm@latest || true
success "npm $(npm --version)"

# ── 4. git (auto) ────────────────────────────────────────────────────────────
step "4. Verificando git"
if ! command -v git &>/dev/null; then
  info "Instalando git…"
  if   command -v apt-get &>/dev/null; then sudo apt-get update && sudo apt-get install -y git
  elif command -v dnf     &>/dev/null; then sudo dnf install -y git
  elif command -v pacman  &>/dev/null; then sudo pacman -S --noconfirm git
  elif command -v zypper  &>/dev/null; then sudo zypper --non-interactive install git
  elif command -v brew    &>/dev/null; then brew install git
  else warn "Instale o git manualmente: https://git-scm.com/downloads"; fi
fi
command -v git &>/dev/null && success "git $(git --version | awk '{print $3}')" || true

# ── 5. Dependências npm (workspaces) ─────────────────────────────────────────
step "5. Instalando dependências (npm workspaces)"
if ! npm install; then
  warn "npm install falhou no cache padrão — tentando cache isolado…"
  npm install --cache "$HOME/.npm-presco-cache" || npm install --cache /tmp/.npm-presco-cache
fi
success "Dependências instaladas"

# ── 6. Bootstrap (Docker/Postgres/Redis, .env, migrations, diagnóstico) ──────
step "6. Bootstrap do ambiente"
exec npx tsx scripts/bootstrap.ts "$@"
