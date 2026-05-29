#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)

if [[ "$(uname)" != "Darwin" ]]; then
  printf 'This installer only supports macOS (Darwin).\n' >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  printf 'pnpm is required to install AI Hot locally.\n' >&2
  exit 1
fi

cd "${REPO_ROOT}"
pnpm install

printf '\nInstallation complete. Start the local companion service with:\n'
printf '  %s\n' "${REPO_ROOT}/scripts/start-companion.sh"
