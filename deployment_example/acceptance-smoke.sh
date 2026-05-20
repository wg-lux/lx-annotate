#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/lx-annotate/lx-annotate-wheel}"
STATE_DIR="${STATE_DIR:-/var/lib/lx-annotate}"
ENV_FILE="${ENV_FILE:-$STATE_DIR/.env.systemd}"
VENV_DIR="${VENV_DIR:-$APP_DIR/.venv}"
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lx_annotate.settings.settings_prod}"
SMOKE_HOST="${SMOKE_HOST:-}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export DJANGO_SETTINGS_MODULE
export LX_ANNOTATE_ENCRYPTED_DATA_DIR="${LX_ANNOTATE_ENCRYPTED_DATA_DIR:-/var/lib/lx-annotate/data}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-$STATE_DIR}"
export DJANGO_STATIC_ROOT="${DJANGO_STATIC_ROOT:-/var/lib/lx-annotate/staticfiles}"
export WORKING_DIR="${WORKING_DIR:-$APP_DIR}"
export HOME_DIR="${HOME_DIR:-$APP_DIR}"

storage_dir="$LX_ANNOTATE_ENCRYPTED_DATA_DIR/storage"
streamable_video_root="$storage_dir/streamable_videos"

mkdir -p \
  "$storage_dir" \
  "$streamable_video_root" \
  "$streamable_video_root/raw" \
  "$streamable_video_root/processed"

if [[ -z "$SMOKE_HOST" ]]; then
  SMOKE_HOST="${BASE_URL#*://}"
  SMOKE_HOST="${SMOKE_HOST%%/*}"
  SMOKE_HOST="${SMOKE_HOST%%:*}"
fi

if [[ -z "$SMOKE_HOST" ]]; then
  echo "Unable to determine SMOKE_HOST from BASE_URL; set SMOKE_HOST explicitly." >&2
  exit 1
fi

"$VENV_DIR/bin/python" -m django check --settings="$DJANGO_SETTINGS_MODULE" --fail-level CRITICAL
"$VENV_DIR/bin/python" -m django verify_encrypted_storage --settings="$DJANGO_SETTINGS_MODULE"
curl --fail --silent --show-error --insecure \
  --resolve "${SMOKE_HOST}:443:127.0.0.1" \
  "https://${SMOKE_HOST}/static/.vite/manifest.json" >/dev/null

echo "lx-annotate acceptance smoke passed."
