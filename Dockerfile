# Python 3.12 to match your pyproject
FROM python:3.12-slim

# System deps for building wheels (torch/transformers may need build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git curl ca-certificates \
    ffmpeg libgl1 inotify-tools \
 && rm -rf /var/lib/apt/lists/*

# Runtime dirs
WORKDIR /app

# Copy only project metadata first (better layer caching if you later install from a registry)
COPY pyproject.toml /app/
# If you have a README or license referenced by pyproject, copy them too:
# COPY README.md /app/


#  Copy only the submodules, then install them (as root)
COPY libs/endoreg-db /app/libs/endoreg-db
COPY libs/lx-anonymizer /app/libs/lx-anonymizer

# Upgrade pip tooling
RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel

# --- Install local libs (editable) BEFORE installing the main package ---
# Your pyproject declares workspace members libs/endoreg-db and libs/lx-anonymizer. :contentReference[oaicite:4]{index=4}
# We install them explicitly as editable so we don't need PyPI:
RUN pip install --no-cache-dir -e libs/endoreg-db -e libs/lx-anonymizer


# Copy the rest of the repo, including submodules and templates
# NOTE: Make sure your local working tree has submodules checked out.
COPY . /app

# (Don't switch user yet)




# Install the main project (editable so manage.py etc. stay in-place)
RUN pip install --no-cache-dir -e .

# Optional: prove Django and daphne are present; daphne comes via your deps
# (Your pyproject includes django, djangorestframework, django-vite, etc.) :contentReference[oaicite:5]{index=5}

# Default env (can be overridden in k8s)
ENV DJANGO_SETTINGS_MODULE=lx_annotate.settings \
    DJANGO_MODULE=lx_annotate \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# A tiny entrypoint that:
# 1) generates .env (env_setup.py) using our env vars
# 2) generates conf/db.yaml (make_conf.py)
# 3) runs migrate + collectstatic
# 4) starts daphne
# We keep it simple to avoid repeating this logic in an initContainer.
# COPY --chown=appuser:appuser ./ /app #happens before appuser exists. That can fail on many bases (the user/group doesn’t exist yet at that layer)
RUN printf '%s\n' \
'#!/usr/bin/env bash' \
'set -euo pipefail' \
'cd /app' \
'echo "[entrypoint] Ensuring .env and db.yaml..."' \
'python env_setup.py || echo "[warn] env_setup.py finished with warnings or already set."' \
'python scripts/make_conf.py || echo "[warn] make_conf.py finished with warnings or already set."' \
'echo "[entrypoint] Django migrate & collectstatic..."' \
'python -m django --version >/dev/null 2>&1 || true' \
'python manage.py migrate --noinput' \
'python manage.py collectstatic --noinput || true' \
'echo "[entrypoint] Starting daphne..."' \
'exec daphne -b 0.0.0.0 -p "${PORT}" lx_annotate.asgi:application' \
> /app/entrypoint.sh \
 && chmod +x /app/entrypoint.sh


# NOW create/switch to non-root user (AFTER installs)
RUN useradd -m appuser
RUN mkdir -p /data /app/conf /app/staticfiles && chown -R appuser:appuser /data /app
USER appuser


EXPOSE 8000
CMD ["/app/entrypoint.sh"]
