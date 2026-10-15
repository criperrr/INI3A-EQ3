#!/usr/bin/env bash
# ==============================================================================
# Presco Mobile - Maestro Automated UI Test Runner (100% Docker-Only)
# Usage:
#   ./tests/maestro/run_maestro.sh              # Run full stability audit in Docker
#   ./tests/maestro/run_maestro.sh 11           # Run flow 11 in Docker
#   ./tests/maestro/run_maestro.sh --all        # Run all flows in Docker
#   ./tests/maestro/run_maestro.sh --cloud      # Run on Maestro Cloud
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$DIR/../.." && pwd)"
FLOWS_DIR="$DIR/flows"

echo "🐳 Executando Maestro exclusivamente via Docker Container (presco_maestro)..."

if [ "$1" == "--cloud" ]; then
  echo "☁️ Executando suíte no Maestro Cloud..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" run --rm maestro cloud tests/maestro/flows
elif [ "$1" == "--all" ]; then
  echo "🚀 Executando TODOS os fluxos Maestro sequencialmente via Docker..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" run --rm maestro test tests/maestro/flows
elif [ -n "$1" ]; then
  TARGET=$(find "$FLOWS_DIR" -name "*$1*.yaml" | head -n 1)
  if [ -f "$TARGET" ]; then
    REL_TARGET=$(realpath --relative-to="$ROOT_DIR" "$TARGET")
    echo "🚀 Executando fluxo: $REL_TARGET via Docker..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" run --rm maestro test "$REL_TARGET"
  else
    echo "❌ Fluxo '$1' não encontrado em $FLOWS_DIR"
    exit 1
  fi
else
  echo "🚀 Executando suíte abrangente de estabilidade (11_full_app_stability_suite.yaml) via Docker..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" run --rm maestro test tests/maestro/flows/11_full_app_stability_suite.yaml
fi
