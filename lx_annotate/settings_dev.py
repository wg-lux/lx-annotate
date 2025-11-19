"""
Development settings - wide open and convenience-oriented.

This configuration prioritizes developer productivity and ease of debugging.
⚠️  NEVER use these settings in production!
"""
from rest_framework.permissions import AllowAny, IsAuthenticated

from .settings_base import *  # noqa


# SECURITY WARNING: Debug mode is ON - only for development!
DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ["*"]

# Wide-open CORS for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_NULL_ORIGIN = True       # ← add this
CSRF_TRUSTED_ORIGINS = []


# Disable API authentication in development for easier testing
REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
    "rest_framework.permissions.AllowAny"
]

#TODO implement cache for kubernetes deployment version (e.g. redis)
# ✅ FIX: Use LocMemCache instead of DatabaseCache to avoid SQLite lock contention
# during heavy write operations (e.g., video re-import with AI processing)
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


if DEBUG:
    permission_classes = [AllowAny]    # plain attribute is enough
else:
    permission_classes = [IsAuthenticated]

# Enable Vite dev server for hot module replacement
DJANGO_VITE["default"]["dev_mode"] = False  # Use built assets instead

# Development-specific logging (more verbose)
LOGGING["loggers"][""]["level"] = "DEBUG"
LOGGING["loggers"]["lx_annotate"] = {
    "handlers": ["console"],
    "level": "DEBUG",
    "propagate": False,
}

# Override media root for development if needed
import os
if storage_dir := os.getenv("STORAGE_DIR"):
    MEDIA_ROOT = storage_dir

# Development database (SQLite is fine)
# base.py already sets this up

# Frontend development URL
# ✅ Use 'localhost' instead of '127.0.0.1' to avoid Firefox cross-origin blocks
FRONTEND_URL = "http://localhost:8000"

print("🚀 DEVELOPMENT MODE: API authentication disabled, CORS wide open")
print("⚠️  DO NOT use these settings in production!")