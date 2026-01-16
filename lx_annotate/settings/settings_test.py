"""
Test settings - optimized for fast and isolated testing.

These settings prioritize speed and isolation:
- In-Memory SQLite DB
- Migrations disabled (optional, risky for integration tests but fast)
- External services (Keycloak) mocked or disabled
"""

import os
import tempfile
from copy import deepcopy
from typing import Any, cast
from pathlib import Path

# Import everything from base
from .settings_base import *  # noqa: F403
from . import settings_base as base

# -----------------------------------------------------------------------------
# 1. SETUP MUTABLE COPIES
# -----------------------------------------------------------------------------
# Deep copy mutable defaults from base so we don't accidentally modify them
INSTALLED_APPS = deepcopy(base.INSTALLED_APPS)
REST_FRAMEWORK = deepcopy(base.REST_FRAMEWORK)
LOGGING = deepcopy(base.LOGGING)

# Help mypy
INSTALLED_APPS = cast(list[str], INSTALLED_APPS)
REST_FRAMEWORK = cast(dict[str, Any], REST_FRAMEWORK)
LOGGING = cast(dict[str, Any], LOGGING)

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
# 3. DATABASE (In-Memory for Speed)
# -----------------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}


# DISABLE MIGRATIONS FOR SPEED
# ⚠️ Note: This creates tables directly from models.
# If tests fail due to missing DB constraints, comment this out.
class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()

# -----------------------------------------------------------------------------
# 4. PATHS & ASSETS
# -----------------------------------------------------------------------------

# Use temp directories for Media/Static so we don't pollute the real user data dir
MEDIA_ROOT = Path(tempfile.mkdtemp(prefix="lx_test_media_"))
STATIC_ROOT = str(tempfile.mkdtemp(prefix="lx_test_static_"))

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

# -----------------------------------------------------------------------------
# 8. TEST FLAGS
# -----------------------------------------------------------------------------

RUN_VIDEO_TESTS = os.getenv("RUN_VIDEO_TESTS", "1") == "1"
RUN_AI_TESTS = os.getenv("RUN_AI_TESTS", "0") == "1"
RUN_INTEGRATION_TESTS = os.getenv("RUN_INTEGRATION_TESTS", "1") == "1"

print("🧪 TEST MODE ACTIVE: In-memory DB, No Auth, Temp Media Root")
print(f"📂 Test Assets: {TEST_ASSET_DIR}")
print(f"🎬 Video Tests: {'ENABLED' if RUN_VIDEO_TESTS else 'DISABLED'}")
