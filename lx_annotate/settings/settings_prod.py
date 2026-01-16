"""
Production settings.
"""

from lx_annotate.settings.config import load_config, AppConfig
from .settings_base import (
    APP_DATA_DIR,
    SECRET_KEY,
    INSTALLED_APPS,
    MIDDLEWARE,
    LOGGING,
    REST_FRAMEWORK,
    TEMPLATES,
    ROOT_URLCONF,
    STATIC_URL,
    MEDIA_ROOT,
    MEDIA_URL,
    BASE_DIR,
    config,
)
from endoreg_db.config.settings import keycloak as KEYCLOAK

import os
from pathlib import Path
from typing import Any, cast

LOGGING = cast(dict[str, Any], LOGGING)
REST_FRAMEWORK = cast(dict[str, Any], REST_FRAMEWORK)
TEMPLATES = cast(list[dict[str, Any]], TEMPLATES)
ROOT_URLCONF = cast(str, ROOT_URLCONF)
STATIC_URL = cast(str, STATIC_URL)
MEDIA_ROOT = cast(Path, MEDIA_ROOT)
MEDIA_URL = cast(str, MEDIA_URL)
config = cast(AppConfig, config)
# -----------------------------------------------------------------------------

config = load_config()
# 1. SECURITY
DEBUG = False

if SECRET_KEY.startswith("***UNSAFE") or not SECRET_KEY:
    raise RuntimeError(
        "🚨 PRODUCTION ERROR: DJANGO_SECRET_KEY is missing/unsafe! "
        "Set DJANGO_SECRET_KEY or DJANGO_SECRET_KEY_FILE."
    )

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

# 3. SECURITY HEADERS
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
# SECURITY: Debug MUST be off in production
DEBUG = False

# Set Permission classes to require authentication
DEFAULT_PERMISSION_CLASSES = ["rest_framework.permissions.IsAuthenticated"]


# SECURITY: Fail fast if using unsafe secret key
if SECRET_KEY.startswith("***UNSAFE"):
    raise RuntimeError(
        "🚨 SECURITY ERROR: SECRET_KEY must be set from environment in production!\n"
        "Set DJANGO_SECRET_KEY or DJANGO_SECRET_KEY_FILE to a secure value."
    )

# SECURITY: Strict host validation - must be configured
ALLOWED_HOSTS = config.allowed_hosts

if not ALLOWED_HOSTS:
    raise RuntimeError(
        "🚨 SECURITY ERROR: DJANGO_ALLOWED_HOSTS must be set in production!\n"
        "Example: DJANGO_ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com"
    )

# SECURITY: Strict CSRF protection
CSRF_TRUSTED_ORIGINS = config.csrf_trusted_origins
if not CSRF_TRUSTED_ORIGINS:
    raise RuntimeError(
        "🚨 SECURITY ERROR: DJANGO_CSRF_TRUSTED_ORIGINS must be set in production!\n"
        "Example: DJANGO_CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com"
    )

# SECURITY: Strict CORS - NO wildcard origins
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = config.cors_allowed_origins
if not CORS_ALLOWED_ORIGINS:
    raise RuntimeError(
        "🚨 SECURITY ERROR: DJANGO_CORS_ALLOWED_ORIGINS must be set in production!\n"
        "Example: DJANGO_CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com"
    )

CORS_ALLOW_CREDENTIALS = True

# SECURITY: SSL/TLS enforcement
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# SECURITY: HSTS headers
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365  # 1 year
SECURE_HSTS_PRELOAD = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# SECURITY: Additional security headers
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# SECURITY: API must require authentication
assert REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] == [
    "rest_framework.permissions.IsAuthenticated"
], "🚨 SECURITY ERROR: Production API must require authentication!"


# SECURITY: Keycloak configuration must be complete in production
if not config.keycloak_client_secret:
    raise RuntimeError(
        "🚨 SECURITY ERROR: KEYCLOAK_CLIENT_SECRET must be set in production!\n"
        "Set DJANGO_KEYCLOAK_CLIENT_SECRET or DJANGO_KEYCLOAK_CLIENT_SECRET_FILE."
    )

# 4. LOGGING (File based)
LOG_FILE = APP_DATA_DIR / "logs" / "production.log"

# 5. Database

DATABASES = {
    "default": {
        "ENGINE": config.db_engine,
        "NAME": config.db_name,
        "USER": config.db_user,
        "PASSWORD": config.db_password,
        "HOST": config.db_host,
        "PORT": config.db_port,
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "sslmode": config.db_sslmode,
        },
    }
}

# Ensure database password is set
if not DATABASES["default"]["PASSWORD"]:
    raise RuntimeError(
        "🚨 SECURITY ERROR: Database password must be set in production!\n"
        "Set DJANGO_DB_PASSWORD or DJANGO_DB_PASSWORD_FILE."
    )

ENFORCE_AUTH = os.getenv("ENFORCE_AUTH", "1") == "1"  # default OFF

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
        print(
            f"⚠️ Keycloak config dir not found or already in sys.path: {KEYCLOAK_CONFIG_ROOT}"
        )

    DEBUG = False  # force prod behavior so PolicyPermission doesn't bypass

    INSTALLED_APPS += KEYCLOAK.EXTRA_INSTALLED_APPS
    MIDDLEWARE += KEYCLOAK.EXTRA_MIDDLEWARE

    LOGIN_URL = KEYCLOAK.LOGIN_URL
    LOGIN_REDIRECT_URL = KEYCLOAK.LOGIN_REDIRECT_URL
    LOGOUT_REDIRECT_URL = KEYCLOAK.LOGOUT_REDIRECT_URL

    KEYCLOAK_BASE_URL = KEYCLOAK.KEYCLOAK_BASE_URL
    KEYCLOAK_REALM = KEYCLOAK.KEYCLOAK_REALM
    OIDC_RP_CLIENT_ID = KEYCLOAK.OIDC_RP_CLIENT_ID
    OIDC_RP_CLIENT_SECRET = KEYCLOAK.OIDC_RP_CLIENT_SECRET
    OIDC_OP_DISCOVERY_ENDPOINT = KEYCLOAK.OIDC_OP_DISCOVERY_ENDPOINT
    OIDC_OP_AUTHORIZATION_ENDPOINT = KEYCLOAK.OIDC_OP_AUTHORIZATION_ENDPOINT
    OIDC_OP_TOKEN_ENDPOINT = KEYCLOAK.OIDC_OP_TOKEN_ENDPOINT
    OIDC_OP_USER_ENDPOINT = KEYCLOAK.OIDC_OP_USER_ENDPOINT
    OIDC_OP_JWKS_ENDPOINT = KEYCLOAK.OIDC_OP_JWKS_ENDPOINT
    OIDC_VERIFY_SSL = KEYCLOAK.OIDC_VERIFY_SSL
    OIDC_RP_SCOPES = KEYCLOAK.OIDC_RP_SCOPES
    OIDC_RP_SIGN_ALGO = KEYCLOAK.OIDC_RP_SIGN_ALGO
    OIDC_OP_LOGOUT_ENDPOINT = KEYCLOAK.OIDC_OP_LOGOUT_ENDPOINT
    OIDC_STORE_ID_TOKEN = KEYCLOAK.OIDC_STORE_ID_TOKEN
    OIDC_LOGOUT_REDIRECT_URL = KEYCLOAK.OIDC_LOGOUT_REDIRECT_URL
    OIDC_AUTH_REQUEST_EXTRA_PARAMS = KEYCLOAK.OIDC_AUTH_REQUEST_EXTRA_PARAMS

    AUTHENTICATION_BACKENDS = KEYCLOAK.AUTHENTICATION_BACKENDS
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = (
        KEYCLOAK.REST_FRAMEWORK_DEFAULT_AUTH
    )

    # ❗ This is the critical line you were missing at runtime:
    REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.IsAuthenticated",
        "endoreg_db.authz.permissions.PolicyPermission",
    ]

    print("🔒 ENFORCE_AUTH=1 → Keycloak enabled (session SSO) + RBAC ON")

# Stable Hosting using NGINX, so we can trust the X-Forwarded-* headers
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Ensure this matches the 'alias' path we will set in Nginx later
# The Nix module passes this via environment variable, but fallback is good.
STATIC_ROOT = os.environ.get("DJANGO_STATIC_ROOT", BASE_DIR / "staticfiles")

# Ensure Nginx can read these
MEDIA_ROOT = Path(os.environ.get("LX_ANNOTATE_DATA_DIR", BASE_DIR / "media"))


print("🔐 PRODUCTION SETTINGS LOADED")
