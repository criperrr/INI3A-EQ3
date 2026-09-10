#!/usr/bin/env bash
# Carrega a configuração de deploy (SSH + segredos) a partir de, em ordem:
#   1. variáveis de ambiente já exportadas (usado pelo GitHub Actions)
#   2. deploy/.env.deploy  (arquivo local, NUNCA versionado)
# Nenhum valor sensível vive neste arquivo.
set -euo pipefail

DEPLOY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_CONF="${DEPLOY_CONFIG:-$DEPLOY_ROOT/deploy/.env.deploy}"

if [ -f "$LOCAL_CONF" ]; then
  set -a; . "$LOCAL_CONF"; set +a
fi

: "${SSH_HOST:?defina SSH_HOST em deploy/.env.deploy (veja deploy/.env.deploy.example)}"
: "${SSH_USER:?defina SSH_USER em deploy/.env.deploy}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_TARGET_DIR="${REMOTE_TARGET_DIR:?defina REMOTE_TARGET_DIR em deploy/.env.deploy}"

SSH_OPTS=(-p "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
[ -n "${SSH_KEY_FILE:-}" ] && SSH_OPTS+=(-i "$SSH_KEY_FILE" -o IdentitiesOnly=yes)
REMOTE="${SSH_USER}@${SSH_HOST}"

remote_exec() { ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"; }
