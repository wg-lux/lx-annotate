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
import os
import json

# get_safe_random_secret_key
def get_safe_random_secret_key():
    """
    Generate a random secret key for Django settings.
    This function is a wrapper around Django's get_random_secret_key.
    It ensures, that the following characters are not used:
    - ' (single quote)
    - " (double quote)
    - ` (backtick)
    - \ (backslash)
    - ; (semicolon)
    - : (colon)
    - , (comma)
    - { (left curly brace)
    - } (right curly brace)
    - ( (left parenthesis)
    - ) (right parenthesis)
    - # (hash)
    - $ (dollar sign)
    """
    key = get_random_secret_key()
    # Replace problematic characters with underscores
    safe_key = key.replace("'", "_").replace('"', "_").replace("`", "_").replace("\\", "_")
    safe_key = safe_key.replace(";", "_").replace(":", "_").replace(",", "_")
    safe_key = safe_key.replace("{", "_").replace("}", "_")
    safe_key = safe_key.replace("(", "_").replace(")", "_").replace("#", "_").replace("$", "_")
    
    return safe_key
    

# --- Constants ---
DEFAULT_DB_PASSWORD = "changeme_in_production"  # Placeholder password

# --- Load Nix Variables ---
nix_vars = {}
nix_vars_path = Path(".devenv-vars.json")
if nix_vars_path.exists():
    with open(nix_vars_path, 'r', encoding="utf-8") as f:
        nix_vars = json.load(f)
    print(f"Loaded Nix variables: {', '.join(nix_vars.keys())}")
else:
    print("No Nix variables file found at .devenv-vars.json")

# --- Determine Paths ---
working_dir = Path(nix_vars.get("WORKING_DIR", os.path.abspath(os.getcwd())))
conf_dir_rel = nix_vars.get("CONF_DIR", "conf")
conf_dir = (working_dir / conf_dir_rel).resolve()
db_pwd_file = conf_dir / "db_pwd"
nix_vars["WORKING_DIR"] = str(working_dir)
nix_vars["CONF_DIR"] = str(conf_dir)
home_dir = nix_vars.get("HOME_DIR", os.path.expanduser("~"))
nix_vars["HOME_DIR"] = home_dir

# --- Generate Secrets ---
SALT = get_safe_random_secret_key()
SECRET_KEY = get_safe_random_secret_key()

# --- Ensure conf dir and db_pwd file exist ---
print(f"Checking configuration directory: {conf_dir}")
if not conf_dir.exists():
    print(f"Creating configuration directory: {conf_dir}")
    conf_dir.mkdir(parents=True, exist_ok=True)
else:
    print("Configuration directory already exists.")

print(f"Checking database password file: {db_pwd_file}")
if not db_pwd_file.exists():
    print(f"Database password file not found. Creating '{db_pwd_file}' with default password.")
    try:
        with open(db_pwd_file, 'w', encoding='utf-8') as f:
            f.write(DEFAULT_DB_PASSWORD)
        print(f"Successfully created '{db_pwd_file}'. IMPORTANT: Change the default password for production!")
    except IOError as e:
        print(f"ERROR: Failed to create database password file '{db_pwd_file}': {e}")
else:
    print("Database password file already exists.")

# --- Manage .env file ---
template = Path("./conf/default.env")
target = Path(".env")  # .env should be in the working_dir (project root)
if not target.exists():
    print(f"Creating .env file from template: {template}")
    try:
        shutil.copy(template, target)
    except Exception as e:
        print(f"Error copying template {template} to {target}: {e}")
else:
    print(".env file already exists. Updating...")

found_keys = set()
lines = []
if target.exists():
    try:
        with target.open("r", encoding="utf-8") as f:
            lines = f.readlines()
    except IOError as e:
        print(f"Error reading .env file {target}: {e}")

updated_lines = []
django_module_from_nix = nix_vars.get("DJANGO_MODULE")
for line in lines:
    stripped_line = line.strip()
    if not stripped_line or stripped_line.startswith("#"):
        updated_lines.append(line)
        continue
    if "=" not in stripped_line:
        updated_lines.append(line)
        continue
    key, value = stripped_line.split("=", 1)
    key = key.strip()
    found_keys.add(key)
    if django_module_from_nix:
        if key == "DJANGO_SETTINGS_MODULE":
            updated_lines.append(f'{key}={django_module_from_nix}.settings_dev\n')
            continue
        elif key == "DJANGO_SETTINGS_MODULE_PRODUCTION":
            updated_lines.append(f'{key}={django_module_from_nix}.settings_prod\n')
            continue
        elif key == "DJANGO_SETTINGS_MODULE_DEVELOPMENT":
            updated_lines.append(f'{key}={django_module_from_nix}.settings_dev\n')
            continue
    updated_lines.append(line)
try:
    with target.open("w", encoding="utf-8") as f:
        f.writelines(updated_lines)
except IOError as e:
    print(f"Error writing updated .env file {target}: {e}")
try:
    with target.open("a", encoding="utf-8") as f:
        if "DJANGO_SECRET_KEY" not in found_keys:
            f.write(f"\nDJANGO_SECRET_KEY={SECRET_KEY}")
            print("Added DJANGO_SECRET_KEY to .env")
        if "DJANGO_SALT" not in found_keys:
            f.write(f'\nDJANGO_SALT={SALT}')
            print("Added DJANGO_SALT to .env")
        if "STORAGE_DIR" not in found_keys:
            storage_dir = nix_vars.get("STORAGE_DIR", str(working_dir / "storage"))
            f.write(f'\nSTORAGE_DIR={storage_dir}')
            print("Added STORAGE_DIR to .env")
        vars_to_add = {
            "DJANGO_HOST": nix_vars.get("HOST"),
            "DJANGO_PORT": nix_vars.get("PORT"),
            "DJANGO_CONF_DIR": str(conf_dir),
            "HOME_DIR": nix_vars.get("HOME_DIR"),
            "WORKING_DIR": nix_vars.get("WORKING_DIR"),
            "DJANGO_DATA_DIR": str(working_dir / nix_vars.get("DATA_DIR", "data")),
            "DJANGO_IMPORT_DATA_DIR": str(working_dir / nix_vars.get("IMPORT_DIR", "data/import")),
            "DJANGO_VIDEO_IMPORT_DATA_DIR": str(working_dir / nix_vars.get("IMPORT_DIR", "data/import") / "video"),
        }
        for key, value in vars_to_add.items():
            if value is not None and key not in found_keys:
                f.write(f'\n{key}={value}')
                print(f"Added {key} to .env")
        if django_module_from_nix:
            settings_variants = {
                "DJANGO_SETTINGS_MODULE": f"{django_module_from_nix}.settings_dev",
                "DJANGO_SETTINGS_MODULE_PRODUCTION": f"{django_module_from_nix}.settings_prod",
                "DJANGO_SETTINGS_MODULE_DEVELOPMENT": f"{django_module_from_nix}.settings_dev",
            }
            for key, value in settings_variants.items():
                if key not in found_keys:
                    f.write(f'\n{key}={value}')
                    print(f"Added {key} to .env")
        # Keycloak/Vite/Dev
        if "VITE_DEVELOPMENT_MODE" not in found_keys:
            f.write('\nVITE_DEVELOPMENT_MODE=true')
        if "VITE_KEYCLOAK_URL" not in found_keys:
            f.write('\nVITE_KEYCLOAK_URL=https://keycloak-endoreg.net/')
        if "VITE_KEYCLOAK_REALM" not in found_keys:
            f.write('\nVITE_KEYCLOAK_REALM=master')
        if "VITE_KEYCLOAK_CLIENT_ID" not in found_keys:
            f.write('\nVITE_KEYCLOAK_CLIENT_ID=lx-frontend')
        if "KEYCLOAK_SERVER_URL" not in found_keys:
            f.write('\nKEYCLOAK_SERVER_URL=https://keycloak-endoreg.net')
        if "KEYCLOAK_REALM" not in found_keys:
            f.write('\nKEYCLOAK_REALM=master')
        if "KEYCLOAK_CLIENT_ID" not in found_keys:
            f.write('\nKEYCLOAK_CLIENT_ID=lx-frontend')
        if "KEYCLOAK_CLIENT_SECRET" not in found_keys:
            f.write('\nKEYCLOAK_CLIENT_SECRET=')
        if "INITIALIZE_DB" not in found_keys:
            f.write('\nINITIALIZE_DB=False')
        default_values = {
            "TEST_RUN": "False",
            "TEST_RUN_FRAME_NUMBER": "1000",
            "RUST_BACKTRACE": "1",
            "DJANGO_DEBUG": "True",
            "DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE": "500",
            "LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION": "3"
        }
        for key, value in default_values.items():
            if key not in found_keys:
                f.write(f'\n{key}={value}')
                print(f"Added {key} to .env")
except IOError as e:
    print(f"Error appending missing entries to .env file {target}: {e}")

print(f"Environment setup script finished. Check {target} and {db_pwd_file}")
