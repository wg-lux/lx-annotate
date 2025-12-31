"""
Base Django settings.
"""

from typing import Any, cast
import os
from pathlib import Path

from .config import load_config
from logging import getLogger

logger = getLogger(__name__)
# -----------------------------------------------------------------------------
# 1. PATH CONFIGURATION
# -----------------------------------------------------------------------------

# Go up 3 levels: settings_base.py -> settings -> lx_annotate -> REPO ROOT
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BASE_DIR = REPO_ROOT

# XDG Data Logic -> Root Data Directory support
XDG_DATA_HOME = Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share"))
APP_DATA_DIR = Path(os.getenv("LX_ANNOTATE_DATA_DIR", XDG_DATA_HOME / "lx-annotate"))
APP_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Config Loading Strategy:
# 1. Look in User Data Dir (~/.local/share/...)
# 2. Look in Repo Root (.env)
# 3. Fallback to Environment Variables

_env_path = APP_DATA_DIR / ".env"
if not _env_path.exists():
    _env_path = BASE_DIR / ".env"

config = load_config(env_file=_env_path)
_settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "")
_is_dev_settings = _settings_module.endswith("settings_dev")

# --- DEBUG / LOG GUARD ---
SECRET_KEY = config.secret_key

# Fallback Logic
if not SECRET_KEY:
    if _is_dev_settings or os.getenv("DJANGO_DEBUG", "").lower() in {
        "1",
        "true",
        "yes",
    }:
        SECRET_KEY = "django-insecure-dev-only-change-me-000000000000"
    else:
        raise RuntimeError(
            "DJANGO_SECRET_KEY is missing. Set it in the environment or .env file."
        )

DEBUG = config.debug
ALLOWED_HOSTS = config.allowed_hosts

# --- DEBUG / LOG GUARD ---
# Prints status to console on startup to verify .env and keys
print("----------------------------------------------------------------")
print("LX_ANNOTATE SETTINGS: Loading config...")
print(f"Using .env path:      {_env_path} (Exists: {_env_path.exists()})")
_key_status = "MISSING"
if SECRET_KEY:
    _key_status = f"SET (Starts with: {SECRET_KEY[:4]}...)"
print(f"DJANGO_SECRET_KEY:    {_key_status}")
print("----------------------------------------------------------------")
# -------------------------

# -----------------------------------------------------------------------------
# 2. CORE SETTINGS
# -----------------------------------------------------------------------------

SECRET_KEY = config.secret_key
if not SECRET_KEY:
    if _is_dev_settings or os.getenv("DJANGO_DEBUG", "").lower() in {
        "1",
        "true",
        "yes",
    }:
        SECRET_KEY = "django-insecure-dev-only-change-me-000000000000"
        print(
            "WARNING: Using fallback SECRET_KEY for development. "
            "Set DJANGO_SECRET_KEY in .env for a stable value."
        )
    else:
        raise RuntimeError(
            "DJANGO_SECRET_KEY is missing. Set it in the environment or .env file."
        )
DEBUG = config.debug
ALLOWED_HOSTS = config.allowed_hosts

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_vite",
    "lx_annotate",
    "endoreg_db",
    "rest_framework",
    "django_extensions",
    "corsheaders",
    "whitenoise.runserver_nostatic",
    "whitenoise",
    "drf_spectacular",
    "modeltranslation",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "lx_annotate.urls"
WSGI_APPLICATION = "lx_annotate.wsgi.application"

# -----------------------------------------------------------------------------
# 3. TEMPLATES & FRONTEND
# -----------------------------------------------------------------------------

TEMPLATES_DIR = BASE_DIR / "lx_annotate" / "templates"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [TEMPLATES_DIR],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.static",
            ],
        },
    },
]

# -----------------------------------------------------------------------------
# 4. DATABASE
# -----------------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# -----------------------------------------------------------------------------
# 5. STATIC, MEDIA & VITE
# -----------------------------------------------------------------------------

STATIC_URL = "/static/"

# DESTINATION: Where 'collectstatic' copies files TO (Production serving folder)
# Keep as string because Django settings expect STATIC_ROOT to be a string.
STATIC_ROOT = str(REPO_ROOT / "static")
print(f"STATIC_ROOT set to: {STATIC_ROOT}")
# Create the directory if it doesn't exist (using Path for the operation)
Path(STATIC_ROOT).mkdir(parents=True, exist_ok=True)
# SOURCES: Where Django looks for files to collect
STATICFILES_DIRS = [
    # 1. The Vite build output
    Path(STATIC_ROOT) / "dist",
    # 2. General static assets
    Path(STATIC_ROOT) / "assets",
]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Media (User Uploads)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "data"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# 6. LOGGING & APP PATHS
# -----------------------------------------------------------------------------


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "lx_anonymizer": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# -----------------------------------------------------------------------------
# 7. AUTH & I18N
# -----------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = config.language_code
TIME_ZONE = config.time_zone
USE_I18N = True
USE_TZ = True

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
        "TIMEOUT": 60 * 30,  # 30 minutes
        "OPTIONS": {
            "MAX_ENTRIES": 1000  # Limit cache size
        },
    }
}
# DRF Base
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication"
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Keycloak
KEYCLOAK_SERVER_URL = config.keycloak_server_url
KEYCLOAK_CLIENT_ID = config.keycloak_client_id
KEYCLOAK_CLIENT_SECRET = config.keycloak_client_secret


LOGGING = cast(dict[str, Any], LOGGING)
REST_FRAMEWORK = cast(dict[str, Any], REST_FRAMEWORK)
