#!/usr/bin/env bash
set -e

echo "🚀 Starting Lx Annotate Development Container"
echo "Env: ${DJANGO_ENV:-development}"
echo "Host: ${DJANGO_HOST:-0.0.0.0}"  
echo "Port: ${DJANGO_PORT:-8117}"

if [ "${CENTRAL_NODE:-false}" = "true" ] && [ -z "${DJANGO_ENV:-}" ]; then
  export DJANGO_ENV="central"
else
  export DJANGO_ENV="${DJANGO_ENV:-development}"
fi

# Select settings module
if [ "$DJANGO_ENV" = "production" ]; then
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lx_annotate.settings.settings_prod}"
else
  export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-lx_annotate.settings.settings_dev}"
fi
export DJANGO_MODULE="${DJANGO_MODULE:-lx_annotate}"

# Dev-friendly defaults
export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-dev-secret-key-$(date +%s)}"
export DJANGO_DEBUG="${DJANGO_DEBUG:-True}"
export DJANGO_ALLOWED_HOSTS="${DJANGO_ALLOWED_HOSTS:-*}"
export DATA_DIR="${DATA_DIR:-/app/data}"
export WORKING_DIR="${WORKING_DIR:-/app}"

# Ensure dirs
mkdir -p "$DATA_DIR" /app/staticfiles

# Collect static and migrate (best effort)
python manage.py collectstatic --noinput --clear || echo "Static files collection skipped"
python manage.py migrate || echo "Migration failed, continuing..."

# Start
exec python manage.py runserver ${DJANGO_HOST:-0.0.0.0}:${DJANGO_PORT:-8117}
