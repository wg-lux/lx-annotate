#!/usr/bin/env python3
import os
from pathlib import Path
import environ

# Test environment loading
BASE_DIR = Path("/home/admin/dev/lx-annotate")
env_file = BASE_DIR / '.env'
print(f'BASE_DIR: {BASE_DIR}')
print(f'Looking for .env at: {env_file}')
print(f'.env exists: {env_file.exists()}')

# Load with environ
if env_file.exists():
    environ.Env.read_env(str(env_file))
    print('Loaded .env with environ')

print(f'DJANGO_SECRET_KEY from os.environ: {repr(os.environ.get("DJANGO_SECRET_KEY", "NOT_FOUND"))}')
print(f'DJANGO_SETTINGS_MODULE: {repr(os.environ.get("DJANGO_SETTINGS_MODULE", "NOT_FOUND"))}')
