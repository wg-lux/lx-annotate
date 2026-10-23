#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

if ! command -v devenv >/dev/null 2>&1; then
  echo "devenv is required to run backend checks in the intended runtime environment." >&2
  exit 1
fi

if [ ! -x ".devenv/state/venv/bin/python" ]; then
  echo "Expected virtualenv interpreter at .devenv/state/venv/bin/python" >&2
  echo "Run 'uv sync --active --extra dev --extra docs' or the repo bootstrap first." >&2
  exit 1
fi

eval "$(devenv print-dev-env)"

exec .devenv/state/venv/bin/python -m pytest "$@"
