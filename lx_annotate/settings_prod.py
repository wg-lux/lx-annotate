"""
Production settings - paranoid security mode.

This configuration enforces strict security policies and fails fast if 
misconfigured. All secrets must come from environment variables.
"""
from .settings_base import *  # noqa
from .settings_base import BASE_DIR 
import os

# SECURITY: Debug MUST be off in production
DEBUG = False

# Set Permission classes to require authentication
DEFAULT_PERMISSION_CLASSES = ['rest_framework.permissions.IsAuthenticated']


# SECURITY: Fail fast if using unsafe secret key
if SECRET_KEY.startswith("***UNSAFE"):
    raise RuntimeError(
        "🚨 SECURITY ERROR: SECRET_KEY must be set from environment in production!\n"
        "Set DJANGO_SECRET_KEY environment variable to a secure random value."
    )

# SECURITY: Strict host validation - must be configured
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])
if not ALLOWED_HOSTS:
    raise RuntimeError(
        "🚨 SECURITY ERROR: DJANGO_ALLOWED_HOSTS must be set in production!\n"
        "Example: DJANGO_ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com"
    )

# SECURITY: Strict CSRF protection
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])
if not CSRF_TRUSTED_ORIGINS:
    raise RuntimeError(
        "🚨 SECURITY ERROR: DJANGO_CSRF_TRUSTED_ORIGINS must be set in production!\n"
        "Example: DJANGO_CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com"
    )

# SECURITY: Strict CORS - NO wildcard origins
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list("DJANGO_CORS_ALLOWED_ORIGINS", default=[])
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
X_FRAME_OPTIONS = 'DENY'

# SECURITY: HSTS headers
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365  # 1 year
SECURE_HSTS_PRELOAD = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# SECURITY: Additional security headers
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

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
MIDDLEWARE.insert(-2, "lx_annotate.offline_keycloak_middleware.OfflineKeycloakMiddleware")

# SECURITY: Keycloak configuration must be complete in production
if not KEYCLOAK_CLIENT_SECRET:
    raise RuntimeError(
        "🚨 SECURITY ERROR: KEYCLOAK_CLIENT_SECRET must be set in production!\n"
        "Set the KEYCLOAK_CLIENT_SECRET environment variable."
    )

# Database configuration for production
DATABASES = {
    'default': {
        'ENGINE': env('DB_ENGINE', default='django.db.backends.postgresql'),
        'NAME': env('DB_NAME', default='lx_annotate_prod'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD'),  # Required in production
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'sslmode': env('DB_SSLMODE', default='require'),
        },
    }
}

# Ensure database password is set
if not DATABASES['default']['PASSWORD']:
    raise RuntimeError(
        "🚨 SECURITY ERROR: Database password must be set in production!\n"
        "Set the DB_PASSWORD environment variable."
    )

# Production static/media file configuration
STATIC_ROOT = env('DJANGO_STATIC_ROOT', default='/var/www/static/')
MEDIA_ROOT = env('DJANGO_MEDIA_ROOT', default='/var/www/media/')

# Production logging - less verbose but comprehensive
LOGGING["handlers"]["file"] = {
    "class": "logging.handlers.RotatingFileHandler",
    "filename": "/var/log/django/lx-annotate.log",
    "maxBytes": 1024 * 1024 * 10,  # 10 MB
    "backupCount": 5,
    "formatter": "verbose",
}

LOGGING["loggers"][""]["handlers"] = ["console", "file"]
LOGGING["loggers"][""]["level"] = "INFO"

# Production error handling
LOGGING["loggers"]["django.security"] = {
    "handlers": ["console", "file"],
    "level": "WARNING",
    "propagate": False,
}

# Disable Vite dev mode in production
DJANGO_VITE["default"]["dev_mode"] = False

# Optional: Restrict to specific deployment environments
deployment_env = env('DEPLOYMENT_ENV', default=None)
if deployment_env and deployment_env not in ['production', 'staging']:
    raise RuntimeError(
        f"🚨 DEPLOYMENT ERROR: Unknown DEPLOYMENT_ENV '{deployment_env}'!\n"
        "Must be 'production' or 'staging' if set."
    )

print("🔐 PRODUCTION MODE: All security measures enabled")
print(f"🌐 Allowed hosts: {ALLOWED_HOSTS}")
print(f"🔒 CORS origins: {CORS_ALLOWED_ORIGINS}")

# Final security check
if DEBUG:
    raise RuntimeError("🚨 FATAL: DEBUG cannot be True in production!")

print("✅ Production security validation passed")

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Media files
MEDIA_URL = '/media/'
# MEDIA_ROOT already configured above, removing duplicate
MEDIA_ROOT = env.path('MEDIA_ROOT', default=BASE_DIR / 'media')

# WhiteNoise configuration
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Should be early in middleware
    # ...rest of middleware...
]

# WhiteNoise settings
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True

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