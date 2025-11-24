"""
Development settings - wide open and convenience-oriented.

This configuration prioritizes developer productivity and ease of debugging.
⚠️  NEVER use these settings in production!
"""
from rest_framework.permissions import AllowAny, IsAuthenticated

from .settings_base import *  # noqa


# SECURITY WARNING: Debug mode is ON - only for development!
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
# Allow all hosts in development
ALLOWED_HOSTS = ["*"]

# Wide-open CORS for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_NULL_ORIGIN = True       # ← add this
CSRF_TRUSTED_ORIGINS = []


# Disable API authentication in development for easier testing
REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
    "rest_framework.permissions.AllowAny"
]

#TODO implement cache for kubernetes deployment version (e.g. redis)
# ✅ FIX: Use LocMemCache instead of DatabaseCache to avoid SQLite lock contention
# during heavy write operations (e.g., video re-import with AI processing)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
        "TIMEOUT": 60 * 30,  # 30 minutes
        "OPTIONS": {
            "MAX_ENTRIES": 1000  # Limit cache size
        }
    }
}


if DEBUG:
    permission_classes = [AllowAny]    # plain attribute is enough
else:
    permission_classes = [IsAuthenticated]

# Enable Vite dev server for hot module replacement
DJANGO_VITE["default"]["dev_mode"] = False  # Use built assets instead

# Development-specific logging (more verbose)
LOGGING["loggers"][""]["level"] = "DEBUG"
LOGGING["loggers"]["lx_annotate"] = {
    "handlers": ["console"],
    "level": "DEBUG",
    "propagate": False,
}

# Override media root for development if needed
import os
if storage_dir := os.getenv("STORAGE_DIR"):
    MEDIA_ROOT = storage_dir

# Development database (SQLite is fine)
# base.py already sets this up

# Frontend development URL
# ✅ Use 'localhost' instead of '127.0.0.1' to avoid Firefox cross-origin blocks
FRONTEND_URL = "http://localhost:8000"

print("🚀 DEVELOPMENT MODE: API authentication disabled, CORS wide open")
print("⚠️  DO NOT use these settings in production!")

# -----------------------------
# SINGLE TOGGLE (dev): Keycloak + RBAC ON/OFF
# -----------------------------
# -----------------------------
# SINGLE TOGGLE (dev): Keycloak + RBAC ON/OFF
# -----------------------------
ENFORCE_AUTH = os.getenv("ENFORCE_AUTH", "0") == "1"  # default OFF

if ENFORCE_AUTH:
    # ✅ Make sure libs/endoreg-db is on sys.path so `config.settings` is importable
    import sys
    from pathlib import Path

    # BASE_DIR comes from settings_base.py which you imported above
    KEYCLOAK_CONFIG_ROOT = BASE_DIR / "libs" / "endoreg-db"
    if KEYCLOAK_CONFIG_ROOT.exists() and str(KEYCLOAK_CONFIG_ROOT) not in sys.path:
        sys.path.insert(0, str(KEYCLOAK_CONFIG_ROOT))
        print(f"🔧 Added to sys.path for Keycloak: {KEYCLOAK_CONFIG_ROOT}")
    else:
        print(f"⚠️ Keycloak config dir not found or already in sys.path: {KEYCLOAK_CONFIG_ROOT}")

    # now this import will succeed
    from config.settings import keycloak as KEYCLOAK
    DEBUG = False  # force prod behavior so PolicyPermission doesn't bypass

    INSTALLED_APPS += KEYCLOAK.EXTRA_INSTALLED_APPS
    MIDDLEWARE     += KEYCLOAK.EXTRA_MIDDLEWARE

    LOGIN_URL           = KEYCLOAK.LOGIN_URL
    LOGIN_REDIRECT_URL  = KEYCLOAK.LOGIN_REDIRECT_URL
    LOGOUT_REDIRECT_URL = KEYCLOAK.LOGOUT_REDIRECT_URL

    KEYCLOAK_BASE_URL          = KEYCLOAK.KEYCLOAK_BASE_URL
    KEYCLOAK_REALM             = KEYCLOAK.KEYCLOAK_REALM
    OIDC_RP_CLIENT_ID          = KEYCLOAK.OIDC_RP_CLIENT_ID
    OIDC_RP_CLIENT_SECRET      = KEYCLOAK.OIDC_RP_CLIENT_SECRET
    OIDC_OP_DISCOVERY_ENDPOINT = KEYCLOAK.OIDC_OP_DISCOVERY_ENDPOINT
    OIDC_OP_AUTHORIZATION_ENDPOINT = KEYCLOAK.OIDC_OP_AUTHORIZATION_ENDPOINT
    OIDC_OP_TOKEN_ENDPOINT         = KEYCLOAK.OIDC_OP_TOKEN_ENDPOINT
    OIDC_OP_USER_ENDPOINT          = KEYCLOAK.OIDC_OP_USER_ENDPOINT
    OIDC_OP_JWKS_ENDPOINT          = KEYCLOAK.OIDC_OP_JWKS_ENDPOINT
    OIDC_VERIFY_SSL   = KEYCLOAK.OIDC_VERIFY_SSL
    OIDC_RP_SCOPES    = KEYCLOAK.OIDC_RP_SCOPES
    OIDC_RP_SIGN_ALGO = KEYCLOAK.OIDC_RP_SIGN_ALGO
    OIDC_OP_LOGOUT_ENDPOINT  = KEYCLOAK.OIDC_OP_LOGOUT_ENDPOINT
    OIDC_STORE_ID_TOKEN      = KEYCLOAK.OIDC_STORE_ID_TOKEN
    OIDC_LOGOUT_REDIRECT_URL = KEYCLOAK.OIDC_LOGOUT_REDIRECT_URL
    OIDC_AUTH_REQUEST_EXTRA_PARAMS = KEYCLOAK.OIDC_AUTH_REQUEST_EXTRA_PARAMS

    AUTHENTICATION_BACKENDS = KEYCLOAK.AUTHENTICATION_BACKENDS
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = KEYCLOAK.REST_FRAMEWORK_DEFAULT_AUTH

    # ❗ This is the critical line you were missing at runtime:
    REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.IsAuthenticated",
        "endoreg_db.authz.permissions.PolicyPermission",
    ]

    print("🔒 ENFORCE_AUTH=1 → Keycloak enabled (session SSO) + RBAC ON")
else:
    # 🔓 Dev-open mode (truly open)
    INSTALLED_APPS = [a for a in INSTALLED_APPS if a != "mozilla_django_oidc"]
    MIDDLEWARE     = [m for m in MIDDLEWARE if "LoginRequiredForAPIsMiddleware" not in m]
    AUTHENTICATION_BACKENDS = ("django.contrib.auth.backends.ModelBackend",)

    REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.AllowAny"
    ]

    print("🔓 ENFORCE_AUTH=0 → Keycloak disabled (dev-open); API wide open")

# ---- final sanity print (leave at the very end of settings_dev.py) ----
print("-------------------------------------------------------------------------------------------------")
print("REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES = ", REST_FRAMEWORK.get("DEFAULT_PERMISSION_CLASSES"))
print("-------------------------------------------------------------------------------------------------")
