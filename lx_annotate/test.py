"""
Test settings - optimized for fast and isolated testing.

Diese Konfiguration optimiert die Testausführung durch:
- In-Memory-Datenbank für Geschwindigkeit
- Deaktivierte Migrations für schnellere Testdatenbank-Erstellung
- Minimale Logging-Ausgabe
- Deaktivierte externe Services
"""
from .settings_base import *  # noqa
import tempfile

# Test-Modus aktivieren
DEBUG = True
TESTING = True

# In-Memory SQLite für maximale Geschwindigkeit
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'TEST': {
            'NAME': ':memory:',
        },
    }
}

# Deaktiviere Migrations für schnellere Tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Einfaches Password Hashing für Tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# API ohne Authentifizierung für Tests
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny'
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

# Temporäre Media-Dateien für Tests
MEDIA_ROOT = tempfile.mkdtemp()

# Minimales Logging für Tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'CRITICAL',  # Nur kritische Fehler
        },
    },
    'loggers': {
        '': {
            'handlers': ['console'],
            'level': 'CRITICAL',
            'propagate': False,
        },
    },
}

# Deaktiviere externe Services
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Cache-Konfiguration für Tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Keycloak für Tests deaktivieren
KEYCLOAK_SERVER_URL = 'http://test-keycloak'
KEYCLOAK_CLIENT_SECRET = 'test-secret'

# Statische Dateien für Tests
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Test-spezifische Asset-Verzeichnisse
ASSET_DIR = BASE_DIR / 'data' / 'test_assets'
TEST_DATA_DIR = BASE_DIR / 'data' / 'test_data'

# Test-Flags für optionale Test-Kategorien
RUN_VIDEO_TESTS = env.bool('RUN_VIDEO_TESTS', default=True)
RUN_AI_TESTS = env.bool('RUN_AI_TESTS', default=False)  # KI-Tests standardmäßig aus
RUN_INTEGRATION_TESTS = env.bool('RUN_INTEGRATION_TESTS', default=True)

# Verzeichnisse für Test-Assets erstellen falls nicht vorhanden
ASSET_DIR.mkdir(parents=True, exist_ok=True)
TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)

print("🧪 TEST MODE: Fast in-memory database, no auth, minimal logging")
print(f"📁 Asset directory: {ASSET_DIR}")
print(f"🎬 Video tests: {'ENABLED' if RUN_VIDEO_TESTS else 'DISABLED'}")
print(f"🤖 AI tests: {'ENABLED' if RUN_AI_TESTS else 'DISABLED'}")