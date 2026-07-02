#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_DIR="${APP_DIR:-/home/lx-annotate/lx-annotate-wheel}"
DATA_DIR="${DATA_DIR:-/var/lib/lx-annotate/data}"
STATIC_ROOT="${STATIC_ROOT:-/var/lib/lx-annotate/staticfiles}"
STATE_DIR="${STATE_DIR:-/var/lib/lx-annotate}"
VENV_DIR="${VENV_DIR:-$APP_DIR/.venv}"
ENV_FILE="${ENV_FILE:-$STATE_DIR/.env.systemd}"
SERVICE_NAME="${SERVICE_NAME:-lx-annotate.service}"
RUN_POST_DEPLOY_ACCEPTANCE="${RUN_POST_DEPLOY_ACCEPTANCE:-1}"
WHEEL_FILE="${1:-}"
export PIP_NO_CACHE_DIR=1
export PIP_DISABLE_PIP_VERSION_CHECK=1

if [[ -z "$WHEEL_FILE" ]]; then
  echo "Usage: $0 /path/to/lx_annotate-<version>-py3-none-any.whl" >&2
  exit 1
fi

if [[ ! -f "$WHEEL_FILE" ]]; then
  echo "Wheel file not found: $WHEEL_FILE" >&2
  exit 1
fi

mkdir -p "$APP_DIR" "$DATA_DIR" "$STATIC_ROOT" "$STATE_DIR"

if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/pip" install --no-cache-dir --upgrade pip
"$VENV_DIR/bin/pip" install --no-cache-dir --upgrade --force-reinstall "$WHEEL_FILE"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lx_annotate.settings.settings_prod}"
export DJANGO_STATIC_ROOT="${DJANGO_STATIC_ROOT:-$STATIC_ROOT}"
export LX_ANNOTATE_ENCRYPTED_DATA_DIR="${LX_ANNOTATE_ENCRYPTED_DATA_DIR:-$DATA_DIR}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-$STATE_DIR}"
export WORKING_DIR="${WORKING_DIR:-$APP_DIR}"
export HOME_DIR="${HOME_DIR:-$APP_DIR}"
export TESSDATA_PREFIX="${TESSDATA_PREFIX:-/usr/share/tesseract-ocr/5/tessdata}"
export PYTORCH_ALLOC_CONF="${PYTORCH_ALLOC_CONF:-expandable_segments:True}"

mkdir -p "$DJANGO_STATIC_ROOT" "$LX_ANNOTATE_ENCRYPTED_DATA_DIR"

package_static_dir="$("$VENV_DIR/bin/python" - <<'PY'
from pathlib import Path
import lx_annotate

package_root = Path(lx_annotate.__file__).resolve().parent
for candidate in (package_root / "staticfiles", package_root / "static"):
    if candidate.exists():
        print(candidate)
        break
PY
)"

if [[ -n "$package_static_dir" && -d "$package_static_dir" ]]; then
  rsync -a --delete "$package_static_dir"/ "$DJANGO_STATIC_ROOT"/
  ln -sfn "$DJANGO_STATIC_ROOT" "$APP_DIR/staticfiles"
fi

"$VENV_DIR/bin/python" -m django migrate --settings="$DJANGO_SETTINGS_MODULE" --noinput

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_NAME"
else
  echo "systemctl not found; skipping service restart." >&2
fi

if [[ "$RUN_POST_DEPLOY_ACCEPTANCE" == "1" ]]; then
  "$SCRIPT_DIR/acceptance-smoke.sh"
fi

echo "Deployment complete."
