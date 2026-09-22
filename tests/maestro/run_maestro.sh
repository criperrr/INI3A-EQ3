#!/usr/bin/env bash
# ==============================================================================
# Presco Mobile - Maestro Automated UI Test Runner
# Usage:
#   ./tests/maestro/run_maestro.sh              # Run all flows
#   ./tests/maestro/run_maestro.sh 01           # Run specific flow (e.g. 01_auth_flow)
#   ./tests/maestro/run_maestro.sh --cloud      # Run on Maestro Cloud
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLOWS_DIR="$DIR/flows"

# Ensure maestro is in PATH
if ! command -v maestro &> /dev/null; then
  if [ -f "$HOME/.maestro/bin/maestro" ]; then
    export PATH="$HOME/.maestro/bin:$PATH"
  else
    echo "❌ Maestro CLI não encontrado no PATH nem em ~/.maestro/bin."
    echo "Instale com: curl -FsSL 'https://get.maestro.mobile.dev' | bash"
    exit 1
  fi
fi

echo "📱 Maestro Version: $(maestro --version)"
echo "🔍 Maestro Viewer: http://127.0.0.1:9999/"

if [ "$1" == "--cloud" ]; then
  echo "☁️ Executando suíte no Maestro Cloud..."
  maestro cloud "$FLOWS_DIR"
elif [ -n "$1" ]; then
  TARGET=$(find "$FLOWS_DIR" -name "*$1*.yaml" | head -n 1)
  if [ -f "$TARGET" ]; then
    echo "🚀 Executando fluxo: $TARGET"
    maestro test "$TARGET"
  else
    echo "❌ Fluxo '$1' não encontrado em $FLOWS_DIR"
    exit 1
  fi
else
  echo "🚀 Executando TODOS os fluxos Maestro sequencialmente..."
  for flow in "$FLOWS_DIR"/*.yaml; do
    echo "▶️ Executando: $(basename "$flow")"
    maestro test "$flow"
  done
  echo "✅ Todos os fluxos Maestro foram concluídos com sucesso!"
fi
