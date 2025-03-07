from django.core.exceptions import ImproperlyConfigured
import os
from pathlib import Path

from lx_annotate.settings import (BASE_DIR,
    DEBUG,
    INSTALLED_APPS,
    MIDDLEWARE,
    ROOT_URLCONF,
    TEMPLATES,
    AUTH_PASSWORD_VALIDATORS,
    LANGUAGE_CODE,
    TIME_ZONE,
    USE_I18N,
    USE_TZ,
    STATIC_URL,
    STATIC_ROOT,
    DEFAULT_AUTO_FIELD,
    STATICFILES_DIRS
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def get_env_variable(var_name):
    """Get the environment variable or raise an error."""
    try:
        return os.environ[var_name]
    except KeyError:
        error_msg = f"Set the {var_name} environment variable"
        raise ImproperlyConfigured(error_msg)

DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1')

if DEBUG:
    # Optional: Warn if DEBUG is enabled
    import warnings
    warnings.warn("DEBUG mode is enabled & running in production. This should never be used in production!")


ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
SECURE_SSL_REDIRECT = not DEBUG  # Force SSL in production
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG


DJANGO_VITE = {
    "default": {
        "dev_mode": False,  # In production, ensure dev_mode is off
        "manifest_path": BASE_DIR / 'static' / 'dist' / 'manifest.json',
    }
}



# Limit CORS to your frontend URL(s)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
]


DJANGO_VITE = {
    "default": {
        "dev_mode": False,  # In production, ensure dev_mode is off
        "manifest_path": BASE_DIR / 'static' / 'dist' / 'manifest.json',
    }
}

# Media files and static files should be served by a proper static file server/CDN in production
