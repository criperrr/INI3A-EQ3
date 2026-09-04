#!/usr/bin/env bash
# ==============================================================================
# Presco (INI3A-EQ3) — Script de Inicialização (macOS & Linux)
# Suporta:
#   ./start_project.sh           → Menu interativo para escolher o modo
#   ./start_project.sh --lan     → ⚡ Modo Rede Local (0 a 5ms - Menor tempo de resposta)
#   ./start_project.sh --corp    → 🏢 Modo Corporativo / Fechado (Túnel Cloud para UNESP/empresas)
#   ./start_project.sh --localhost → 💻 Modo Localhost (Simulador/Web)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verificar se Node.js está instalado
if ! command -v node &>/dev/null; then
  echo "❌ Node.js não foi encontrado. Execute primeiro: ./setup.sh"
  exit 1
fi

# Verificar se dependências estão instaladas
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "⚠️  Dependências não encontradas. Executando setup inicial..."
  bash "$SCRIPT_DIR/setup.sh"
fi

# Executar o orquestrador TypeScript unificado
exec npx tsx "$SCRIPT_DIR/scripts/dev_launcher.ts" "$@"
