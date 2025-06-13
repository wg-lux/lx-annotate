"""
Django settings with secure environment-based configuration.

This module automatically loads the appropriate settings based on DJANGO_ENV:
- dev: Development settings (open, convenience-oriented)
- prod: Production settings (paranoid, security-focused)

Usage:
    export DJANGO_ENV=dev    # or omit for local development
    export DJANGO_ENV=prod   # for production deployment
"""
import os
from importlib import import_module

# Get environment - default to dev for safety in local development
_env = os.getenv("DJANGO_ENV", "dev")

if _env not in {"dev", "prod"}:
    raise RuntimeError(f"Unknown DJANGO_ENV {_env!r}. Must be 'dev' or 'prod'")

# Import base settings first, then environment-specific overrides
base = import_module(".base", __package__)
env = import_module(f".{_env}", __package__)

# Export all UPPERCASE settings to Django
# Base settings first, then environment overrides
globals().update({k: v for k, v in base.__dict__.items() if k.isupper()})
globals().update({k: v for k, v in env.__dict__.items() if k.isupper()})

# Log which environment was loaded
print(f"🔧 Django settings loaded: {_env.upper()} mode")