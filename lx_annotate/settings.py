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

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
VITE_APP_DIR = BASE_DIR / "frontend"
# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'static' / 'dist',
    VITE_APP_DIR / 'public',
]
DJANGO_VITE = {
    "default": {
        "dev_mode": False,  # Enable dev_mode only if you run the Vite dev server manually
        "manifest_path": BASE_DIR / 'static' / 'dist' / 'manifest.json',
    }
}

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-vyl-(s(xa4v)5mn!-vyr3q76a&%bc_$1lje=dy-b4)=53scrbo'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
    "*"
]

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
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # if you want to use WhiteNoise
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
import re

def immutable_file_test(path, url):
    # This regex matches filenames with a hash, e.g. some_file-CSliV9zW.js
    return re.match(r"^.+[.-][0-9a-zA-Z_-]{8,12}\..+$", url)

WHITENOISE_IMMUTABLE_FILE_TEST = immutable_file_test
WHITENOISE_MIMETYPES = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.ts': 'application/typescript',
    '.html': 'text/html'
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
        'NAME': BASE_DIR / 'db.sqlite3',
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