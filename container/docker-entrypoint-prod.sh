#!/usr/bin/env bash
set -e

echo "🚀 Starting Lx Annotate Production Container"
echo "Env: ${DJANGO_ENV:-production}"
echo "Host: ${DJANGO_HOST:-0.0.0.0}"
echo "Port: ${DJANGO_PORT:-8117}"

# Set production Django configuration
if [ "${CENTRAL_NODE:-false}" = "true" ]; then
  export DJANGO_ENV="${DJANGO_ENV:-central}"
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.central}"
else
  export DJANGO_ENV="${DJANGO_ENV:-production}"
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}"
fi
export DJANGO_MODULE="${DJANGO_MODULE:-lx_annotate}"

# Production environment variables
export DJANGO_DEBUG="${DJANGO_DEBUG:-False}"
export DJANGO_ALLOWED_HOSTS="${DJANGO_ALLOWED_HOSTS:-*}"
export STORAGE_DIR="${STORAGE_DIR:-/app/data}"
export DATA_DIR="${DATA_DIR:-/app/data}"
export WORKING_DIR="${WORKING_DIR:-/app}"

# Production safety check: Prevent DEBUG=True in production
debug_val=$(echo "${DJANGO_DEBUG:-}" | tr '[:upper:]' '[:lower:]')
if [ "$debug_val" = "1" ] || [ "$debug_val" = "true" ] || [ "$debug_val" = "yes" ] || [ "$debug_val" = "on" ]; then
    echo "❌ ERROR: DJANGO_DEBUG is enabled in production environment!" >&2
    echo "   This is a security risk and not allowed in production." >&2
    echo "   Set DJANGO_DEBUG to 'False', '0', 'no', or leave unset." >&2
    exit 1
fi

# Ensure essential directories exist (no credentials required via volumes)
mkdir -p "$DATA_DIR" /app/staticfiles

# Validate critical environment variables
if [ -z "${DJANGO_SECRET_KEY:-}" ]; then
    echo "❌ DJANGO_SECRET_KEY must be set in production"
    exit 1
fi

# -----------------------------------------------------------------------------
# Database readiness + migrations (robust, always attempted on start)
# -----------------------------------------------------------------------------
: "${DB_WAIT_SECONDS:=60}"              # Total seconds to wait for DB
: "${DB_WAIT_INTERVAL:=2}"              # Interval between checks
: "${MIGRATION_MAX_RETRIES:=5}"         # Retries if migrate command fails
: "${MIGRATION_RETRY_SLEEP:=5}"         # Sleep between migration retries
: "${STRICT_MIGRATIONS:=1}"             # If 1, fail container when migrations fail

wait_for_db() {
  echo "🕒 Waiting for database connectivity (timeout=${DB_WAIT_SECONDS}s)..."
  local start_ts=$(date +%s)
  while true; do
    if python - <<'PY'
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', os.environ.get('DJANGO_SETTINGS_MODULE','lx-annotate.settings_prod'))
try:
    django.setup()
    from django.db import connections
    for c in connections.all():
        with c.cursor() as cur: cur.execute('SELECT 1')
except Exception as e:
    raise SystemExit(1)
PY
    then
      echo "✅ Database reachable"
      return 0
    fi
    sleep "$DB_WAIT_INTERVAL"
    local now=$(date +%s)
    if [ $(( now - start_ts )) -ge "$DB_WAIT_SECONDS" ]; then
      echo "❌ Timed out waiting for database after ${DB_WAIT_SECONDS}s"
      return 1
    fi
  done
}

run_migrations() {
  echo "🗄️ Applying database migrations (retries=${MIGRATION_MAX_RETRIES})..."
  local attempt=1
  while [ $attempt -le "$MIGRATION_MAX_RETRIES" ]; do
    echo "→ migrate attempt ${attempt}/${MIGRATION_MAX_RETRIES}";
    if python manage.py migrate --noinput; then
      echo "✅ Migrations complete"
      return 0
    fi
    echo "⚠️ Migration attempt ${attempt} failed"
    attempt=$(( attempt + 1 ))
    sleep "$MIGRATION_RETRY_SLEEP"
  done
  echo "❌ All migration attempts failed"
  if [ "$STRICT_MIGRATIONS" = "1" ]; then
    echo "Stopping container because STRICT_MIGRATIONS=1"
    return 1
  fi
  echo "Continuing despite migration failures (STRICT_MIGRATIONS!=1)"
  return 0
}

if wait_for_db; then
  run_migrations || exit 1
else
  echo "❌ Database not reachable; exiting"
  exit 1
fi

# Optional: collect static files (idempotent)
if [ "${COLLECT_STATIC:-1}" = "1" ]; then
  echo "🗃️ Collecting static files..."
  python manage.py collectstatic --noinput --clear || echo "⚠️ collectstatic failed"
fi

# Health check (non-fatal)
echo "🏥 Running production health check..."
python manage.py check --deploy || echo "⚠️ Health check warnings detected"

# -----------------------------------------------------------------------------
# Start ASGI server
# -----------------------------------------------------------------------------
echo "🌟 Starting production server..."
HOST="${DJANGO_HOST:-0.0.0.0}"
PORT="${DJANGO_PORT:-8117}"

if command -v daphne >/dev/null 2>&1; then
  echo "🚀 Using Daphne ASGI server (production-ready)"
  exec daphne -b "$HOST" -p "$PORT" "${DJANGO_MODULE}.asgi:application"
else
  echo "⚠️ Daphne not found, falling back to Django runserver"
  exec python manage.py runserver "$HOST:$PORT" --noreload
fi
