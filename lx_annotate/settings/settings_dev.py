"""
Development settings.
"""

from __future__ import annotations

import atexit
import os
import tempfile
from importlib import import_module
from pathlib import Path
from typing import Any, cast

from endoreg_db.utils.paths import EndoregPathsModel

from lx_annotate.settings.oidc import oidc_scopes_with_center_groups

# The base settings fail closed when no deployment secret is configured.
# Tests supply their explicitly isolated, non-production key before importing base.
os.environ.setdefault("DJANGO_SECRET_KEY", "test-insecure-key-do-not-use-00000000")

_TEST_SECRET_KEY = "lx-annotate-test-only-signing-key-0000000000000000"

_dev_runtime_root = Path(__file__).resolve().parent.parent.parent
os.environ["LX_RUNTIME_ROOT"] = str(_dev_runtime_root)

EndoregPathsModel.from_root(_dev_runtime_root)
_descriptor, _credential_path = tempfile.mkstemp(
    prefix="django-secret-",
    suffix=".key",
    dir=_dev_runtime_root,
)

with os.fdopen(_descriptor, "w", encoding="utf-8") as _credential:
    os.fchmod(_credential.fileno(), 0o600)
    _credential.write(_TEST_SECRET_KEY + "\n")

# Explicitly select the test credential source.
os.environ["DJANGO_SECRET_KEY"] = ""
os.environ["DJANGO_SECRET_KEY_FILE"] = _credential_path
os.environ["DJANGO_SIGNING_KEYRING_FILE"] = ""
os.environ["DJANGO_DB_PASSWORD"] = ""
os.environ["DJANGO_DB_PASSWORD_FILE"] = ""
# Import everything from base


def _cleanup_test_credentials() -> None:
    try:
        Path(_credential_path).unlink(missing_ok=True)
    except OSError:
        pass
    os.environ.pop("DJANGO_SECRET_KEY_FILE", None)


atexit.register(_cleanup_test_credentials)
import secrets

from . import settings_base as base
from .settings_base import *  # noqa: F403

DJANGO_SALT = str(secrets.token_hex(32).encode("ascii"))


base_settings = import_module("lx_annotate.settings.settings_base")

LOGGING = cast(dict[str, Any], LOGGING)
REST_FRAMEWORK = cast(dict[str, Any], REST_FRAMEWORK)
STORAGES = cast(dict[str, dict[str, str]], STORAGES)
TEMPLATES = cast(list[dict[str, Any]], TEMPLATES)
ROOT_URLCONF = cast(str, ROOT_URLCONF)
STATIC_URL = cast(str, STATIC_URL)
STATIC_ROOT = cast(str, STATIC_ROOT)
STATICFILES_DIRS = cast(list[Path], STATICFILES_DIRS)
STATICFILES_STORAGE = cast(str, STATICFILES_STORAGE)
MEDIA_ROOT = cast(Path, MEDIA_ROOT)
MEDIA_URL = cast(str, MEDIA_URL)
DATABASES = cast(dict[str, Any], DATABASES)
BASE_DIR = cast(Path, BASE_DIR)
SECRET_KEY = cast(str, SECRET_KEY)
LX_DTYPES_HOST_MODELS_MODULE = cast(str, LX_DTYPES_HOST_MODELS_MODULE)

# Keep development settings usable for packaged runtime tests and local service
# deployments.  The base settings use a checkout-relative SQLite database by
# default; honor explicit service-provided database settings when present.

DATABASES = {name: database.copy() for name, database in DATABASES.items()}
_database_config = base_settings.config
if "db_engine" in _database_config.model_fields_set:
    DATABASES["default"]["ENGINE"] = _database_config.db_engine
if "db_name" in _database_config.model_fields_set:
    DATABASES["default"]["NAME"] = _database_config.db_name
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
    DATABASES["default"].update(
        USER=_database_config.db_user,
        PASSWORD=_database_config.db_password,
        HOST=_database_config.db_host,
        PORT=_database_config.db_port,
    )
    if DATABASES["default"]["ENGINE"].startswith("django.db.backends.postgresql"):
        DATABASES["default"]["OPTIONS"] = {"sslmode": _database_config.db_sslmode}

# -----------------------------------------------------------------------------
# 1. CORE OVERRIDES
DEBUG = True
ALLOWED_HOSTS = ["*"]

# 2. VITE (Built Assets)
DJANGO_VITE = {
    "default": {
        "dev_mode": False,
        "static_url_prefix": "",
        "manifest_path": os.path.join(STATIC_ROOT, ".vite", "manifest.json"),
    },
}

# 3. CORS & SECURITY (Relaxed)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]

# 4. AUTHENTICATION TOGGLE (Dev Convenience)
ENFORCE_AUTH = os.getenv("ENFORCE_AUTH", "0") == "1"

# 5. TERMINOLOGY ROOT PROVISIONING
TERMINOLOGY_AUTO_PROVISION = base_settings.TERMINOLOGY_AUTO_PROVISION
TERMINOLOGY_ROOT = base_settings.TERMINOLOGY_ROOT

if ENFORCE_AUTH:
    print("🔒 AUTH: ENFORCED (Keycloak Mock/Real)")
    try:
        from endoreg_db.config.settings import keycloak as KEYCLOAK

        INSTALLED_APPS.extend(KEYCLOAK.EXTRA_INSTALLED_APPS)
        MIDDLEWARE.extend(KEYCLOAK.EXTRA_MIDDLEWARE)

        LOGIN_URL = KEYCLOAK.LOGIN_URL
        LOGIN_REDIRECT_URL = KEYCLOAK.LOGIN_REDIRECT_URL
        LOGOUT_REDIRECT_URL = KEYCLOAK.LOGOUT_REDIRECT_URL

        # OIDC Configs
        KEYCLOAK_BASE_URL = KEYCLOAK.KEYCLOAK_BASE_URL
        KEYCLOAK_REALM = KEYCLOAK.KEYCLOAK_REALM
        OIDC_RP_CLIENT_ID = KEYCLOAK.OIDC_RP_CLIENT_ID
        OIDC_RP_CLIENT_SECRET = KEYCLOAK.OIDC_RP_CLIENT_SECRET
        OIDC_OP_DISCOVERY_ENDPOINT = KEYCLOAK.OIDC_OP_DISCOVERY_ENDPOINT
        OIDC_OP_AUTHORIZATION_ENDPOINT = KEYCLOAK.OIDC_OP_AUTHORIZATION_ENDPOINT
        OIDC_OP_TOKEN_ENDPOINT = KEYCLOAK.OIDC_OP_TOKEN_ENDPOINT
        OIDC_OP_USER_ENDPOINT = KEYCLOAK.OIDC_OP_USER_ENDPOINT
        OIDC_OP_JWKS_ENDPOINT = KEYCLOAK.OIDC_OP_JWKS_ENDPOINT
        OIDC_RP_SCOPES = oidc_scopes_with_center_groups(KEYCLOAK.OIDC_RP_SCOPES)
        OIDC_RP_SIGN_ALGO = KEYCLOAK.OIDC_RP_SIGN_ALGO
        OIDC_OP_LOGOUT_ENDPOINT = KEYCLOAK.OIDC_OP_LOGOUT_ENDPOINT

        AUTHENTICATION_BACKENDS = KEYCLOAK.AUTHENTICATION_BACKENDS
        REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = (
            KEYCLOAK.REST_FRAMEWORK_DEFAULT_AUTH
        )
        REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
            "rest_framework.permissions.IsAuthenticated",
            "endoreg_db.authz.permissions.PolicyPermission",
        ]
        import os

        print("OIDC_RP_CLIENT_ID =", os.getenv("OIDC_RP_CLIENT_ID"))
        print(
            "OIDC_OP_TOKEN_ENDPOINT =",
            os.getenv("OIDC_OP_TOKEN_ENDPOINT") or OIDC_OP_TOKEN_ENDPOINT,
        )
        print("OIDC_RP_CLIENT_SECRET set? =", bool(os.getenv("OIDC_RP_CLIENT_SECRET")))

    except ImportError:
        print(
            "⚠️  WARNING: endoreg_db Keycloak integration is not installed in the "
            "active environment, falling back to basic auth",
        )
else:
    print("🔓 AUTH: DISABLED (Open Access)")
    REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.AllowAny",
    ]

print("🚀 DEV SETTINGS LOADED")
