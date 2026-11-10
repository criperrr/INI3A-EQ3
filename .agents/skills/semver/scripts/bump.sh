#!/usr/bin/env bash
# .agents/skills/semver/scripts/bump.sh
# Bridge to execute Presco's synchronized multi-package SemVer bumper

set -euo pipefail

TYPE="${1:-patch}"
shift || true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"

echo "Executing Presco SemVer bump ($TYPE) from $ROOT_DIR..."
npx tsx "$ROOT_DIR/scripts/bump_version.ts" "$TYPE" "$@"
