"""
Base Django settings shared by all environments.

These are the core settings that remain consistent across dev, staging, and production.
Environment-specific settings override these in their respective modules.
"""
import os
from pathlib import Path
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage 
import environ
from django.core.management.utils import get_random_secret_key
import re

# Initialize django-environ
env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parents[1]

# Load environment variables from .env file
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

# SECURITY WARNING: This is a fallback only! 
# Production MUST override this with a real secret from environment
# Use same approach as lx-annotate for better reliability
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "***UNSAFE-DEV-KEY-CHANGE-IN-PROD***")

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_vite',
    'lx_annotate',
    'endoreg_db',
    'rest_framework',
    'django_extensions',
    'corsheaders',
    'whitenoise.runserver_nostatic',
    'whitenoise',
    'drf_spectacular',
    'modeltranslation',
]

# Base middleware - environments can extend this
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'lx_annotate.urls'

# Templates
TEMPLATES_DIR = BASE_DIR / 'lx_annotate' / 'templates'  # Updated to correct path
FRONTEND_DIR = BASE_DIR / 'frontend'


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [TEMPLATES_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'lx_annotate.wsgi.application'

# Database - environments will override this
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'
VITE_APP_DIR = BASE_DIR / "frontend"

STATICFILES_DIRS = [
    BASE_DIR / 'static' / 'dist',
    BASE_DIR / 'static' / 'assets',
    VITE_APP_DIR / 'src' / 'assets',
]

# Static files storage
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Whitenoise configuration
def immutable_file_test(path, url):
    return re.match(r"^.+[.-][0-9a-zA-Z_-]{8,12}\..+$", url)

WHITENOISE_IMMUTABLE_FILE_TEST = immutable_file_test
WHITENOISE_MIMETYPES = {
    '.css': 'text/css',
    '.scss': 'text/x-scss',
    '.ts': 'application/typescript',
    '.tsx': 'application/typescript',
    '.js': 'application/javascript',
    '.vue': 'application/javascript',
    '.mjs': 'application/javascript',
    '.html': 'text/html',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.svg': 'image/svg+xml',
    '.eot': 'application/vnd.ms-fontobject',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
}

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Django Vite base configuration
DJANGO_VITE = {
    "default": {
        "dev_mode": False,  # Environments will override this
        "manifest_path": BASE_DIR / 'static' / 'dist' / 'manifest.json',
    }
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Base REST Framework configuration - environments can override
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Video-specific MIME types
VIDEO_MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/mp4',
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        '': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'lx_anonymizer': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.utils.autoreload': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Keycloak configuration (base values - production will override)
KEYCLOAK_SERVER_URL = env('KEYCLOAK_SERVER_URL', default='https://keycloak-endoreg.net')
KEYCLOAK_REALM = env('KEYCLOAK_REALM', default='master')
KEYCLOAK_CLIENT_ID = env('KEYCLOAK_CLIENT_ID', default='lx-frontend')
KEYCLOAK_CLIENT_SECRET = env('KEYCLOAK_CLIENT_SECRET', default='')


# Modeltranslation settings, english and german as defaults
LANGUAGES = (('de', 'German'), ('en', 'English'))
MODELTRANSLATION_LANGUAGES = ('de', 'en')
MODELTRANSLATION_DEFAULT_LANGUAGE = 'de'
MODELTRANSLATION_FALLBACK_LANGUAGES = ('de', 'en')