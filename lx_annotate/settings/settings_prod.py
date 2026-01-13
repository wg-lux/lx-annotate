"""
Production settings.
"""

from lx_annotate.settings.config import AppConfig
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

# 1. SECURITY
DEBUG = False

if SECRET_KEY.startswith("***UNSAFE") or not SECRET_KEY:
    raise RuntimeError("🚨 PRODUCTION ERROR: DJANGO_SECRET_KEY is missing/unsafe!")

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
        "Set DJANGO_SECRET_KEY environment variable to a secure random value."
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

# Add Keycloak authentication in production
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
    "lx_annotate.keycloak_auth.KeycloakAuthentication",
    "rest_framework.authentication.SessionAuthentication",
]

# Add Keycloak middleware in production
MIDDLEWARE.insert(
    -2, "lx_annotate.offline_keycloak_middleware.OfflineKeycloakMiddleware"
)

# SECURITY: Keycloak configuration must be complete in production
if not config.keycloak_client_secret:
    raise RuntimeError(
        "🚨 SECURITY ERROR: KEYCLOAK_CLIENT_SECRET must be set in production!\n"
        "Set the KEYCLOAK_CLIENT_SECRET environment variable."
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
        "Set the DB_PASSWORD environment variable."
    )

# 6. PROD AUTH (Require endoreg_db)
try:
    from endoreg_db.config.settings import keycloak as KEYCLOAK

    # ... (Copy auth injection logic from dev/base or import shared util)
    # Ideally, extract the OIDC injection into a mixin file to avoid duplicating in dev/prod
    INSTALLED_APPS.extend(KEYCLOAK.EXTRA_INSTALLED_APPS)
    MIDDLEWARE.extend(KEYCLOAK.EXTRA_MIDDLEWARE)
    AUTHENTICATION_BACKENDS = KEYCLOAK.AUTHENTICATION_BACKENDS
    REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = (
        KEYCLOAK.REST_FRAMEWORK_DEFAULT_AUTH
    )
    REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.IsAuthenticated",
        "endoreg_db.authz.permissions.PolicyPermission",
    ]
except ImportError:
    raise RuntimeError("🚨 CRITICAL: endoreg_db is required for production auth!")

print("🔐 PRODUCTION SETTINGS LOADED")
