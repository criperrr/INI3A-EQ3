#!/usr/bin/env bash
# .agents/skills/semver/scripts/bump.sh
# Bridge to execute Presco's synchronized multi-package SemVer bumper

set -euo pipefail

TYPE="${1:-patch}"
DRY_RUN=""

for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN="--dry-run"
  fi
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"

echo "📦 Executing Presco SemVer bump ($TYPE) from $ROOT_DIR..."
npx tsx "$ROOT_DIR/scripts/bump_version.ts" "$TYPE" $DRY_RUN
