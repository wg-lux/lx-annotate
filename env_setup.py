#!/usr/bin/env python
"""
Create or update the .env file used by Django / devenv.

Adds (if missing):
  DJANGO_SECRET_KEY
  DJANGO_SALT
  STORAGE_DIR            –→ <project_root>/endoreg-db/storage
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
    existing["SALT"] = get_random_secret_key  # Default value if not set
else:
    SALT = existing["SALT"].strip('"')
# ────────────────────────────────────────────────────────────────
# 4.  Append any missing entries
# ----------------------------------------------------------------
with env_file.open("a") as fp:
    if "DJANGO_SECRET_KEY" not in existing:
        fp.write(f'\nDJANGO_SECRET_KEY="{get_random_secret_key()}"')
    if "DJANGO_SALT" not in existing:
        fp.write(f'\nDJANGO_SALT="{SALT}"')
    if "STORAGE_DIR" not in existing:
        fp.write(f'\nSTORAGE_DIR="{default_storage}"')

print(f".env updated at {env_file}")
