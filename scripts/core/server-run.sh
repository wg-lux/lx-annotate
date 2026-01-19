#!/usr/bin/env bash
# Unified server startup script (DRY)
# - Detects mode (prefers .mode, falls back to DJANGO_ENV)
# - Ensures environment is initialized (.env, conf)
# - Honors DJANGO_HOST/DJANGO_PORT at runtime to avoid rebuilds
# - Starts appropriate server (daphne in prod if available, dev runserver otherwise)
set -eo pipefail

# Detect env: prefer .mode, fallback to DJANGO_ENV, default development
if [ -f .mode ]; then
  read -r mode_value < .mode 2>/dev/null || mode_value=""
  # Strip CR/LF and surrounding whitespace
  mode_value="${mode_value%$'\r'}"  # Remove trailing CR
  mode_value="${mode_value#"${mode_value%%[![:space:]]*}"}"  # Remove leading whitespace
  mode_value="${mode_value%"${mode_value##*[![:space:]]}"}"  # Remove trailing whitespace
  export DJANGO_ENV="${mode_value:-development}"
else
  export DJANGO_ENV="${DJANGO_ENV:-development}"
fi

# Runtime configuration (favor environment to avoid rebuilds)
HOST="${DJANGO_HOST:-127.0.0.1}"
PORT="${DJANGO_PORT:-8117}"
DJANGO_MODULE_RUNTIME="${DJANGO_MODULE:-lx-annotate}"

echo "🌟 Starting Lx Annotate Server"
echo "Env: ${DJANGO_ENV}"
echo "Host: ${HOST}"
echo "Port: ${PORT}"
echo ""

# Ensure environment is ready
if [ ! -f ".env" ]; then
  echo "📝 Environment file missing, running setup..."
  if command -v manage >/dev/null 2>&1; then
    manage setup || { echo "❌ Setup failed"; exit 1; }
  else
    if command -v uv >/dev/null 2>&1; then
      uv run python scripts/database/make_conf.py || { echo "❌ Database configuration failed"; exit 1; }
    else
      python scripts/database/make_conf.py || { echo "❌ Database configuration failed"; exit 1; }
    fi
  fi
fi

# Helper to run python via uv when available
py() {
  if command -v uv >/dev/null 2>&1; then
    uv run python "$@"
  else
    python "$@"
  fi
}

run_daphne() {
  if command -v uv >/dev/null 2>&1; then
    uv run daphne -b "$HOST" -p "$PORT" "${DJANGO_MODULE_RUNTIME}.asgi:application"
  elif command -v daphne >/dev/null 2>&1; then
    daphne -b "$HOST" -p "$PORT" "${DJANGO_MODULE_RUNTIME}.asgi:application"
  else
    echo "⚠️  Daphne not available, falling back to Django runserver"
    py manage.py runserver "$HOST:$PORT" --noreload
  fi
}

if [ "$DJANGO_ENV" = "production" ]; then
  echo "🚀 Production pipeline: migrate, load base data, collectstatic"
  py manage.py migrate --noinput || { echo "❌ migrate failed"; exit 1; }
  if py manage.py help | grep -q "load_base_db_data"; then
    py manage.py load_base_db_data || echo "⚠️ load_base_db_data failed or skipped"
  fi
  py manage.py collectstatic --noinput || echo "⚠️ collectstatic warnings"

  echo "🏁 Starting ASGI server (Daphne if available)"
  run_daphne
else
  echo "🛠️  Development mode: migrate and run dev server"
  py manage.py migrate || echo "⚠️ migration warnings"
  py manage.py runserver "$HOST:$PORT"
fi
