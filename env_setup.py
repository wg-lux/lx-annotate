#!/usr/bin/env python
"""
Create or update the .env file used by Django / devenv.

Adds (if missing):
  DJANGO_SECRET_KEY
  DJANGO_SALT
  STORAGE_DIR            –→ <project_root>/endoreg-db/storage
  VITE_DEVELOPMENT_MODE  –→ true (for development)
  KEYCLOAK_*             –→ Keycloak configuration for production
  VITE_KEYCLOAK_*        –→ Frontend Keycloak configuration
"""
from django.core.management.utils import get_random_secret_key
from pathlib import Path
import shutil

# ────────────────────────────────────────────────────────────────
# 1.  Paths and defaults
# ----------------------------------------------------------------
project_root      = Path(__file__).resolve().parent      # adjust if needed
settings_pkg      = "lx_annotate"                                 # change if different
settings_dir      = project_root / settings_pkg
settings_dir.mkdir(parents=True, exist_ok=True)

env_file          = project_root / ".env"
template_file     = project_root / "conf_template" / "default.env"
default_storage   = project_root / "endoreg-db" / "storage"

# ────────────────────────────────────────────────────────────────
# 2.  Ensure .env exists (copy template or create empty file)
# ----------------------------------------------------------------
if not env_file.exists():
    if template_file.exists():
        shutil.copy(template_file, env_file)
    else:
        env_file.touch()

# ────────────────────────────────────────────────────────────────
# 3.  Scan existing keys
# ----------------------------------------------------------------
existing = {}
for raw in env_file.read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    existing[k.strip()] = v.strip()

if "SALT" not in existing:
    existing["SALT"] = get_random_secret_key()  # Default value if not set
else:
    SALT = existing["SALT"].strip('"')

# ────────────────────────────────────────────────────────────────
# 4.  Append any missing entries
# ----------------------------------------------------------------
with env_file.open("a") as fp:
    # Core Django settings
    if "DJANGO_SECRET_KEY" not in existing:
        fp.write(f'\nDJANGO_SECRET_KEY="{get_random_secret_key()}"')
    if "DJANGO_SALT" not in existing:
        fp.write(f'\nDJANGO_SALT="{SALT}"')
    if "STORAGE_DIR" not in existing:
        fp.write(f'\nSTORAGE_DIR="{default_storage}"')
    
    # Development Mode Configuration
    if "VITE_DEVELOPMENT_MODE" not in existing:
        fp.write('\n\n# Development Mode Configuration')
        fp.write('\nVITE_DEVELOPMENT_MODE=true')
    
    # Frontend Keycloak Configuration
    if "VITE_KEYCLOAK_URL" not in existing:
        fp.write('\n\n# Keycloak Configuration for Production')
        fp.write('\nVITE_KEYCLOAK_URL=https://keycloak-endoreg.net/')
    if "VITE_KEYCLOAK_REALM" not in existing:
        fp.write('\nVITE_KEYCLOAK_REALM=master')
    if "VITE_KEYCLOAK_CLIENT_ID" not in existing:
        fp.write('\nVITE_KEYCLOAK_CLIENT_ID=lx-frontend')
    
    # Backend Keycloak Configuration
    if "KEYCLOAK_SERVER_URL" not in existing:
        fp.write('\n\n# Backend Keycloak Settings')
        fp.write('\nKEYCLOAK_SERVER_URL=https://keycloak-endoreg.net')
    if "KEYCLOAK_REALM" not in existing:
        fp.write('\nKEYCLOAK_REALM=master')
    if "KEYCLOAK_CLIENT_ID" not in existing:
        fp.write('\nKEYCLOAK_CLIENT_ID=lx-frontend')
    if "KEYCLOAK_CLIENT_SECRET" not in existing:
        fp.write('\nKEYCLOAK_CLIENT_SECRET=')
    
    # Database initialization
    if "INITIALIZE_DB" not in existing:
        fp.write('\n\nINITIALIZE_DB=False')

print(f".env updated at {env_file}")
print("✅ Added missing environment variables for:")
print("   - Development Mode support")
print("   - Keycloak configuration (frontend & backend)")
print("   - Database initialization setting")
