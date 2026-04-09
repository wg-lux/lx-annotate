"""
Base Django settings.
"""

from typing import Any, cast
import os
from importlib.util import find_spec
from pathlib import Path

from django.db import models

from lx_annotate.settings.config import load_config
from logging import getLogger

logger = getLogger(__name__)
# -----------------------------------------------------------------------------
# 1. PATH CONFIGURATION
# -----------------------------------------------------------------------------

# Go up 3 levels: settings_base.py -> settings -> lx_annotate -> REPO ROOT
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BASE_DIR = REPO_ROOT


def _resolve_runtime_data_dir() -> Path:
    encrypted_dir = os.getenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", "").strip()
    logical_data_dir = os.getenv("LX_ANNOTATE_DATA_DIR", "").strip()
    legacy_data_dir = os.getenv("DATA_DIR", "").strip()
    xdg_home = Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    for raw_candidate in (encrypted_dir, logical_data_dir, legacy_data_dir):
        if raw_candidate:
            return Path(raw_candidate).expanduser().resolve()
    return (xdg_home / "lx-annotate").expanduser().resolve()


# XDG Data Logic -> Root Data Directory support
XDG_DATA_HOME = Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share"))
APP_DATA_DIR = _resolve_runtime_data_dir()
APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
APP_STORAGE_DIR = APP_DATA_DIR / "storage"
APP_IO_DIR = APP_DATA_DIR
APP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

PROTECTED_MEDIA_URL = (
    str(os.getenv("NGINX_PROTECTED_MEDIA_URL", "/protected_media/") or "").strip()
    or "/protected_media/"
)
_configured_protected_media_root = str(
    os.getenv("PROTECTED_MEDIA_ROOT", str(APP_STORAGE_DIR)) or ""
).strip() or str(APP_STORAGE_DIR)
PROTECTED_MEDIA_ROOT = Path(_configured_protected_media_root).expanduser().resolve()
try:
    PROTECTED_MEDIA_ROOT.relative_to(APP_DATA_DIR)
except ValueError:
    logger.warning(
        "Configured PROTECTED_MEDIA_ROOT '%s' resolves outside protected root '%s'. "
        "Falling back to '%s'.",
        PROTECTED_MEDIA_ROOT,
        APP_DATA_DIR,
        APP_STORAGE_DIR,
    )
    PROTECTED_MEDIA_ROOT = APP_STORAGE_DIR.resolve()
PROTECTED_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

STREAMABLE_VIDEO_ROOT = (
    Path(
        os.getenv(
            "LX_ANNOTATE_STREAMABLE_VIDEO_ROOT",
            str(APP_STORAGE_DIR / "streamable_videos"),
        )
    )
    .expanduser()
    .resolve()
)
STREAMABLE_RAW_VIDEO_ROOT = (
    Path(
        os.getenv(
            "LX_ANNOTATE_STREAMABLE_VIDEO_RAW_ROOT",
            str(STREAMABLE_VIDEO_ROOT / "raw"),
        )
    )
    .expanduser()
    .resolve()
)
STREAMABLE_PROCESSED_VIDEO_ROOT = (
    Path(
        os.getenv(
            "LX_ANNOTATE_STREAMABLE_VIDEO_PROCESSED_ROOT",
            str(STREAMABLE_VIDEO_ROOT / "processed"),
        )
    )
    .expanduser()
    .resolve()
)
for _path in (
    STREAMABLE_VIDEO_ROOT,
    STREAMABLE_RAW_VIDEO_ROOT,
    STREAMABLE_PROCESSED_VIDEO_ROOT,
):
    _path.mkdir(parents=True, exist_ok=True)

# Defaults for safe dev settings and fallback in case of non expected service deployment
os.environ.setdefault("LX_ANNOTATE_DATA_DIR", str(APP_DATA_DIR))
os.environ.setdefault("DATA_DIR", str(APP_DATA_DIR))
os.environ.setdefault("LX_ANNOTATE_ENCRYPTED_DATA_DIR", str(APP_DATA_DIR))
os.environ.setdefault("STORAGE_DIR", str(APP_STORAGE_DIR))
os.environ.setdefault("IO_DIR", str(APP_IO_DIR))
os.environ.setdefault("NGINX_PROTECTED_MEDIA_URL", PROTECTED_MEDIA_URL)
os.environ["PROTECTED_MEDIA_ROOT"] = str(PROTECTED_MEDIA_ROOT)
os.environ.setdefault("LX_ANNOTATE_STREAMABLE_VIDEO_ROOT", str(STREAMABLE_VIDEO_ROOT))
os.environ.setdefault(
    "LX_ANNOTATE_STREAMABLE_VIDEO_RAW_ROOT",
    str(STREAMABLE_RAW_VIDEO_ROOT),
)
os.environ.setdefault(
    "LX_ANNOTATE_STREAMABLE_VIDEO_PROCESSED_ROOT",
    str(STREAMABLE_PROCESSED_VIDEO_ROOT),
)

# Config Loading Strategy:
# 1. Look in User Data Dir (~/.local/share/...)
# 2. Look in Repo Root (.env)
# 3. Fallback to Environment Variables


_settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "")
_is_dev_settings = _settings_module.endswith("settings_dev")
if not _is_dev_settings:
    _env_candidates = []
    if APP_DATA_DIR.name == "data":
        _env_candidates.append(APP_DATA_DIR.parent / ".env.systemd")
    _env_candidates.extend(
        [
            APP_DATA_DIR / ".env.systemd",
            BASE_DIR / ".env.systemd",
        ]
    )
    _env_path = next(
        (candidate for candidate in _env_candidates if candidate.exists()),
        _env_candidates[0],
    )
else:
    _env_path = BASE_DIR / ".env"
    if not _env_path.exists():
        _env_path = APP_DATA_DIR / ".env"

config = load_config(env_file=Path(_env_path))


def _module_available(module_path: str) -> bool:
    try:
        return find_spec(module_path) is not None
    except Exception:
        return False


_default_lx_dtypes_host_models_module = "endoreg_db.models"
if _module_available("endoreg_db.integrations.lx_dtypes_host_models"):
    _default_lx_dtypes_host_models_module = (
        "endoreg_db.integrations.lx_dtypes_host_models"
    )

_configured_lx_dtypes_host_models_module = os.getenv("LX_DTYPES_HOST_MODELS_MODULE", "")
if _configured_lx_dtypes_host_models_module:
    if not _module_available(_configured_lx_dtypes_host_models_module):
        logger.warning(
            "Configured LX_DTYPES_HOST_MODELS_MODULE '%s' could not be resolved. "
            "Falling back to '%s'.",
            _configured_lx_dtypes_host_models_module,
            _default_lx_dtypes_host_models_module,
        )
        LX_DTYPES_HOST_MODELS_MODULE = _default_lx_dtypes_host_models_module
    else:
        LX_DTYPES_HOST_MODELS_MODULE = _configured_lx_dtypes_host_models_module
else:
    LX_DTYPES_HOST_MODELS_MODULE = _default_lx_dtypes_host_models_module

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
            "DJANGO_SECRET_KEY is missing. Set DJANGO_SECRET_KEY or "
            "DJANGO_SECRET_KEY_FILE in the environment or .env file."
        )

DEBUG = config.debug
ALLOWED_HOSTS = config.allowed_hosts
ENDOREG_HUB_MODE = os.getenv(
    "ENDOREG_HUB_MODE", os.getenv("LX_ANNOTATE_HUB_MODE", "0")
).strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
ENDOREG_ENABLE_HUB_TRANSFERS = os.getenv(
    "ENDOREG_ENABLE_HUB_TRANSFERS", "0"
).strip().lower() in {"1", "true", "yes", "on"}
ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT = os.getenv(
    "ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT", "1"
).strip().lower() in {"1", "true", "yes", "on"}
ENDOREG_HUB_TRANSFER_REQUIRE_MTLS = os.getenv(
    "ENDOREG_HUB_TRANSFER_REQUIRE_MTLS", "0"
).strip().lower() in {"1", "true", "yes", "on"}
ENDOREG_HUB_TRANSFER_MTLS_META_KEY = str(
    os.getenv("ENDOREG_HUB_TRANSFER_MTLS_META_KEY", "") or ""
).strip()
ENDOREG_HUB_TRANSFER_MTLS_META_VALUE = str(
    os.getenv("ENDOREG_HUB_TRANSFER_MTLS_META_VALUE", "") or ""
).strip()
LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE = os.getenv(
    "LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE", "0"
).strip().lower() in {"1", "true", "yes", "on"}
LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS = max(
    int(os.getenv("LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS", "1800")),
    60,
)
LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY = str(
    os.getenv(
        "LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY",
        "retain_processed_media",
    )
    or "retain_processed_media"
).strip()


def _is_non_dev_hub_profile() -> bool:
    return (
        ENDOREG_HUB_MODE
        and not _is_dev_settings
        and "settings_test" not in _settings_module
    )


def _require_env_var(*names: str) -> None:
    if any(os.getenv(name, "").strip() for name in names):
        return
    joined = " or ".join(names)
    raise RuntimeError(f"{joined} must be set when ENDOREG_HUB_MODE is enabled.")


def _validate_hub_transfer_security_contract() -> None:
    if not ENDOREG_ENABLE_HUB_TRANSFERS:
        return
    if not ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT:
        raise RuntimeError(
            "ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT must be enabled when "
            "ENDOREG_ENABLE_HUB_TRANSFERS is true."
        )
    if ENDOREG_HUB_TRANSFER_REQUIRE_MTLS and (
        not ENDOREG_HUB_TRANSFER_MTLS_META_KEY
        or not ENDOREG_HUB_TRANSFER_MTLS_META_VALUE
    ):
        raise RuntimeError(
            "ENDOREG_HUB_TRANSFER_MTLS_META_KEY and "
            "ENDOREG_HUB_TRANSFER_MTLS_META_VALUE must be set when "
            "ENDOREG_HUB_TRANSFER_REQUIRE_MTLS is enabled."
        )


_validate_hub_transfer_security_contract()

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
            "DJANGO_SECRET_KEY is missing. Set DJANGO_SECRET_KEY or "
            "DJANGO_SECRET_KEY_FILE in the environment or .env file."
        )
DEBUG = config.debug
ALLOWED_HOSTS = config.allowed_hosts
CORS_ALLOWED_ORIGINS = config.cors_allowed_origins

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
    "lx_dtypes.django",
    "rest_framework",
    "django_extensions",
    "corsheaders",
    "whitenoise.runserver_nostatic",
    "whitenoise",
    "drf_spectacular",
    "modeltranslation",
    "ninja",
    "django_linear_migrations",
]

# lx_dtypes may evaluate parameterized field hints at runtime
# (e.g. models.ManyToManyField[T, U]). Django field classes are not
# subscriptable by default, so provide a minimal compatibility shim.
for _field_cls in (models.ManyToManyField, models.ForeignKey, models.OneToOneField):
    field_cls: Any = _field_cls
    if not hasattr(field_cls, "__class_getitem__"):
        field_cls.__class_getitem__ = classmethod(lambda cls, item: cls)  # type: ignore[attr-defined]

# Override a broken upstream migration transaction boundary:
# endoreg_db.0008 performs deletes and then adds a constraint on PostgreSQL.
# Running it non-atomically avoids "pending trigger events" on ALTER TABLE.
MIGRATION_MODULES = {
    "endoreg_db": "lx_annotate.migration_overrides.endoreg_db",
}

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
    "lx_annotate.middleware.lookup_tracker.KnowledgeBaseLookupTrackerLoggingMiddleware",
    "lx_annotate.middleware.PdfStreamFrameOptionsMiddleware",
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
STATIC_ROOT = str(REPO_ROOT / "staticfiles")
# Create the directory if it doesn't exist (using Path for the operation)
Path(STATIC_ROOT).mkdir(parents=True, exist_ok=True)
# SOURCES: Where Django looks for files to collect
STATICFILES_DIRS = [
    # Root source directory so /static/* and /static/assets/* resolve correctly.
    REPO_ROOT / "static",
]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Media (User Uploads)
_configured_media_url = str(os.getenv("MEDIA_URL", "") or "").strip()
if (
    not _configured_media_url
    or _configured_media_url == "/media/"
    or _configured_media_url.startswith("/media/")
):
    MEDIA_URL = PROTECTED_MEDIA_URL
else:
    MEDIA_URL = _configured_media_url
os.environ["MEDIA_URL"] = MEDIA_URL
MEDIA_ROOT = PROTECTED_MEDIA_ROOT
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
DEFAULT_STORAGE_BACKEND = "lx_annotate.storage.encrypted.EncryptedStorage"

STORAGES = {
    "default": {
        "BACKEND": DEFAULT_STORAGE_BACKEND,
    },
    "staticfiles": {
        "BACKEND": STATICFILES_STORAGE,
    },
}

if _is_non_dev_hub_profile():
    _require_env_var("LX_ANNOTATE_ENCRYPTED_DATA_DIR")
    _require_env_var("DJANGO_DB_NAME", "DATABASE_URL")

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
        "lx_annotate.hub_export.audit": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
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
        "OPTIONS": {"MAX_ENTRIES": 1000},  # Limit cache size
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
