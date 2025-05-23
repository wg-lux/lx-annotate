"""
Django settings for agl_annotate project.

Generated by 'django-admin startproject' using Django 4.2.11.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.2/ref/settings/
"""

from pathlib import Path
import os
from dotenv import load_dotenv
import environ
from django.contrib import admin
from django.urls import path, include
from django.core.management.utils import get_random_secret_key
from env_setup import SALT
from lx_logging import get_logger

import re

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env()
env_path = BASE_DIR / ".env"
environ.Env.read_env(str(BASE_DIR / ".env")) 
print("Expecting .env at:", env_path, "exists?", env_path.exists())
FRONTEND_URL = env("FRONTEND_URL", default="http://127.0.0.1:8000")  # dev default

logger = get_logger(__name__)
logger.debug(os.environ.get("DJANGO_SETTINGS", "dev"))

# Fix for SECRET_KEY recursion issue
DEFAULT_SECRET_KEY = get_random_secret_key()
SECRET_KEY = env("DJANGO_SECRET_KEY", default=DEFAULT_SECRET_KEY)


DEFAULT_SALT = "CHANGE-ME-IN-PROD"      # ← literal, not a variable reference
SALT = env("DJANGO_SALT", default=DEFAULT_SALT)
if not SECRET_KEY:
    raise Exception("The SECRET_KEY setting must not be empty.")
DJANGO_SETTINGS = os.environ.get("DJANGO_SETTINGS", "dev")

## CHANGE THIS IN PROD TO ALLOW ONLY THE FRONTEND URL
CORS_ALLOW_ALL_ORIGINS = True

# Build paths inside the project like this: BASE_DIR / 'subdir'.
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
VITE_APP_DIR = BASE_DIR / "frontend" 
# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static' / 'dist',
    BASE_DIR / 'static' / 'assets',
    VITE_APP_DIR / 'src' / 'assets',
]
DJANGO_VITE = {
    "default": {
        "dev_mode": False,  # Enable dev_mode only if you run the Vite dev server manually
        "manifest_path": BASE_DIR / 'static' / 'dist' / 'manifest.json',
    }
}

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

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
    'whitenoise.runserver_nostatic',  # For serving static files in development
    'whitenoise',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


def immutable_file_test(path, url):
    # This regex matches filenames with a hash, e.g. some_file-CSliV9zW.js
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



ROOT_URLCONF = 'lx_annotate.urls'


TEMPLATES = [
    {
    'BACKEND': 'django.template.backends.django.DjangoTemplates',        
    'DIRS': [TEMPLATES_DIR,],        
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



# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'dev_db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

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
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

import os
import logging.config

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Existing settings...

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,  # Keeps the default loggers
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
            'formatter': 'verbose',  # Use 'verbose' or 'simple' as desired
        },
        # You can add file handlers or other handlers here
    },
    'loggers': {
        # Root logger
        '': {
            'handlers': ['console'],
            'level': 'DEBUG',  # Set to DEBUG or INFO as needed
            'propagate': True,
        },
        # Specific logger to reduce verbosity
        'django.utils.autoreload': {
            'handlers': ['console'],
            'level': 'INFO',  # Set to INFO or WARNING to reduce DEBUG messages
            'propagate': False,
        },
        # You can configure other loggers here as needed
        'django': {
            'handlers': ['console'],
            'level': 'INFO',  # Adjust Django's default logging level
            'propagate': False,
        }
        
        #
        #'lx-anonymizer': { 
        #    'handlers': ['console'],
        #    'level': 'DEBUG',  # Set desired level for your app's logs
        #    'propagate': True,
        #},
        
    },
}

# REST_FRAMEWORK = {
#     'DEFAULT_AUTHENTICATION_CLASSES': [
#         'rest_framework.authentication.TokenAuthentication',
#     ],
#     'DEFAULT_PERMISSION_CLASSES': [
#         'rest_framework.permissions.IsAuthenticated',
#     ],
# }

# Media files settings
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')