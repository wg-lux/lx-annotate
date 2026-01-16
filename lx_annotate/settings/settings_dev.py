"""
Development settings.
"""

from typing import Any, cast
from .settings_base import (
    APP_DATA_DIR,
    INSTALLED_APPS,
    MIDDLEWARE,
    LOGGING,
    REST_FRAMEWORK,
    SECRET_KEY,
    TEMPLATES,
    ROOT_URLCONF,
    STATIC_URL,
    STATIC_ROOT,
    STATICFILES_DIRS,
    STATICFILES_STORAGE,
    MEDIA_ROOT,
    MEDIA_URL,
    DATABASES,
    BASE_DIR,
)

from pathlib import Path

import os
from endoreg_db.config.settings import keycloak as KEYCLOAK

LOGGING = cast(dict[str, Any], LOGGING)
REST_FRAMEWORK = cast(dict[str, Any], REST_FRAMEWORK)
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
# -----------------------------------------------------------------------------
# 1. CORE OVERRIDES
DEBUG = True
ALLOWED_HOSTS = ["*"]

# 2. VITE (Built Assets)
DJANGO_VITE = {
    "default": {
        "dev_mode": False,
        "static_url_prefix": "dist",
        "manifest_path": os.path.join(
            BASE_DIR, "static", "dist", ".vite", "manifest.json"
        ),
    }
}

# 3. CORS & SECURITY (Relaxed)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]

# 5. AUTHENTICATION TOGGLE (Dev Convenience)
ENFORCE_AUTH = os.getenv("ENFORCE_AUTH", "0") == "1"

if ENFORCE_AUTH:
    print("🔒 AUTH: ENFORCED (Keycloak Mock/Real)")
    try:
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
        print("⚠️  WARNING: endoreg_db not found, falling back to basic auth")
else:
    print("🔓 AUTH: DISABLED (Open Access)")
    REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.AllowAny"
    ]

print(f"🚀 DEV SETTINGS LOADED. Data Dir: {APP_DATA_DIR}")
