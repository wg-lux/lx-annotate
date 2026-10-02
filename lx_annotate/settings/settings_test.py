"""
Test settings - optimized for fast and isolated testing.

These settings prioritize speed and isolation:
- In-Memory SQLite DB
- Migrations disabled (optional, risky for integration tests but fast)
- External services (Keycloak) mocked or disabled
"""

from __future__ import annotations

import os
import tempfile
from copy import deepcopy
from pathlib import Path
from typing import Any, cast
from uuid import uuid4

# The base settings fail closed when no deployment secret is configured.
# Tests supply their explicitly isolated, non-production key before importing base.
os.environ.setdefault("DJANGO_SECRET_KEY", "test-insecure-key-do-not-use-00000000")
os.environ["LX_RUNTIME_ROOT"] = str(
    Path(tempfile.gettempdir()) / f"lx_test_runtime_{uuid4().hex}"
)

# Import everything from base
from . import settings_base as base
from .settings_base import *  # noqa: F403

DJANGO_SALT = "test-identity-salt-not-for-production"

# -----------------------------------------------------------------------------
# 1. SETUP MUTABLE COPIES
# -----------------------------------------------------------------------------
# Deep copy mutable defaults from base so we don't accidentally modify them
INSTALLED_APPS = deepcopy(base.INSTALLED_APPS)
MIDDLEWARE = deepcopy(base.MIDDLEWARE)
REST_FRAMEWORK = deepcopy(base.REST_FRAMEWORK)
LOGGING = deepcopy(base.LOGGING)
STORAGES = deepcopy(base.STORAGES)

# Help mypy
INSTALLED_APPS = cast(list[str], INSTALLED_APPS)
MIDDLEWARE = cast(list[str], MIDDLEWARE)
REST_FRAMEWORK = cast(dict[str, Any], REST_FRAMEWORK)
LOGGING = cast(dict[str, Any], LOGGING)
STORAGES = cast(dict[str, Any], STORAGES)

# -----------------------------------------------------------------------------
# 2. CORE TEST OVERRIDES
# -----------------------------------------------------------------------------
REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = ["rest_framework.permissions.AllowAny"]

DEBUG = True
TESTING = True
SECRET_KEY = "test-insecure-key-do-not-use"

# Ensure required apps are present
REQUIRED_TEST_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "endoreg_db",
]

for app in REQUIRED_TEST_APPS:
    if app not in INSTALLED_APPS:
        INSTALLED_APPS.append(app)


# -----------------------------------------------------------------------------
# 3. DATABASE (PostgreSQL Test Instance)
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# 3. DATABASE — pytest-managed PostgreSQL
# -----------------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "lx_test",
        # Replaced by the session fixture before test-database setup.
        "USER": "pytest_not_configured",
        "PASSWORD": "",
        "HOST": "127.0.0.1",
        "PORT": "1",
        "CONN_MAX_AGE": 0,
        "OPTIONS": {
            "connect_timeout": 5,
        },
        "TEST": {
            "NAME": "test_lx_test",
        },
    }
}

# Use the real migration graph.
MIGRATION_MODULES: dict[str, str | None] = {}

# -----------------------------------------------------------------------------
# 4. PATHS & ASSETS
# -----------------------------------------------------------------------------

# Base settings derive media, terminology and logs from the isolated runtime root.

# Test Assets (Videos/JSONs) should live in the CODE repository, not the data dir.
# BASE_DIR from settings_base now correctly points to the repo root.
TEST_ASSET_DIR = base.BASE_DIR / "test_data" / "test_assets"
TEST_DATA_DIR = base.BASE_DIR / "test_data" / "test_data"

# Ensure they exist to prevent FileNotFoundError during test setup
TEST_ASSET_DIR.mkdir(parents=True, exist_ok=True)
TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# 5. SECURITY & AUTH (Disabled)
# -----------------------------------------------------------------------------

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Disable Keycloak/OIDC checks
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = []
REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = ["rest_framework.permissions.AllowAny"]
REST_FRAMEWORK["TEST_REQUEST_DEFAULT_FORMAT"] = "json"

# Mock Keycloak settings to prevent crashes if code references them
KEYCLOAK_SERVER_URL = "http://mock-keycloak"
KEYCLOAK_CLIENT_ID = "mock-client"
KEYCLOAK_CLIENT_SECRET = "mock-secret"

# -----------------------------------------------------------------------------
# 6. LOGGING & EMAIL
# -----------------------------------------------------------------------------

# Minimal Logging
LOGGING["handlers"] = {
    "console": {
        "class": "logging.StreamHandler",
        "level": "CRITICAL",
    }
}
LOGGING["loggers"] = {
    "": {
        "handlers": ["console"],
        "level": "CRITICAL",
        "propagate": False,
    }
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# -----------------------------------------------------------------------------
# 7. CACHE & STATIC FILES
# -----------------------------------------------------------------------------

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
STORAGES["default"] = {
    "BACKEND": "django.core.files.storage.FileSystemStorage",
}
STORAGES["staticfiles"] = {
    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
}

# -----------------------------------------------------------------------------
# 8. TEST FLAGS
# -----------------------------------------------------------------------------

RUN_VIDEO_TESTS = os.getenv("RUN_VIDEO_TESTS", "1") == "1"
RUN_AI_TESTS = os.getenv("RUN_AI_TESTS", "0") == "1"
RUN_INTEGRATION_TESTS = os.getenv("RUN_INTEGRATION_TESTS", "1") == "1"

print("TEST MODE ACTIVE: PostgreSQL, migrations enabled, no auth, temp media root")
print(f"🎬 Video Tests: {'ENABLED' if RUN_VIDEO_TESTS else 'DISABLED'}")
