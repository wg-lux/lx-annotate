import os
from pathlib import Path
from endoreg_db.utils.paths import STORAGE_DIR

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
MEDIA_ROOT = STORAGE_DIR

VITE_DEV_SERVER_URL = 'http://localhost:8000'

DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1')
ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True  # Allow credentials in CORS requests

# Use SQLite or another simple database for development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

DJANGO_VITE = {
    "default": {
        "dev_mode": True,  # Enable HMR via Vite dev server
        "manifest_path": BASE_DIR / 'static' / 'dist' / 'manifest.json',
    }
}
