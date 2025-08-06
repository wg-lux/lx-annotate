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
DEFAULT_DB_PASSWORD = get_safe_random_secret_key # Placeholder password

# --- Load Envoronment Variables ---
# Include luxnix-specific environment variables
nix_vars = {
    "WORKING_DIR": os.environ.get("WORKING_DIR" ),
    "CONF_DIR": os.environ.get("CONF_DIR",),
    "HOME_DIR": os.environ.get("HOME_DIR"),
    "DJANGO_MODULE": os.environ.get("DJANGO_MODULE"),
    "DJANGO_HOST": os.environ.get("DJANGO_HOST"),
    "DB_PWD_FILE": os.environ.get("DB_PWD_FILE"),
    "DJANGO_PORT": os.environ.get("DJANGO_PORT"),
    "DATA_DIR": os.environ.get("DATA_DIR"),
    "IMPORT_DIR": os.environ.get("IMPORT_DIR", "data/import"),
    "IMPORT_VIDEO_DIR": os.environ.get("IMPORT_VIDEO_DIR", "data/import/video"),
    "IMPORT_REPORT_DIR": os.environ.get("IMPORT_REPORT_DIR", "data/import/report"),
    "MODEL_DIR": os.environ.get("MODEL_DIR", "data/model"),
    "CONF_TEMPLATE_DIR": os.environ.get("CONF_TEMPLATE_DIR", "./conf_template"),
    "DJANGO_SETTINGS_MODULE_PRODUCTION": os.environ.get("DJANGO_SETTINGS_MODULE_PRODUCTION"),
    "DJANGO_SETTINGS_MODULE_DEVELOPMENT": os.environ.get("DJANGO_SETTINGS_MODULE_DEVELOPMENT"),
    # Add luxnix central node support
    "DJANGO_SETTINGS_MODULE_CENTRAL": os.environ.get("DJANGO_SETTINGS_MODULE_CENTRAL"),
    "STORAGE_DIR": os.environ.get("STORAGE_DIR", "data/storage"),

}

nix_vars_paths: Dict[str, Path] = {}
for key, value in nix_vars.items():
    if value is None:
        raise ValueError(f"Missing required environment variable: {key}")
    if key.endswith("_DIR") or key.endswith("_FILE"):
        assert isinstance(value, str), f"Environment variable {key} must be a string"
        # Ensure no quotes around values
        if value.startswith('"') and value.endswith('"'):
            _var = value[1:-1].strip()
        elif value.startswith("'") and value.endswith("'"):
            _var = value[1:-1].strip()
        else:
            _var = value.strip()
        nix_vars_paths[key] = Path(_var).resolve()

conf_dir = nix_vars_paths["CONF_DIR"]
db_pwd_file = nix_vars_paths["DB_PWD_FILE"]
working_dir = nix_vars_paths["WORKING_DIR"]
conf_template_dir = nix_vars_paths["CONF_TEMPLATE_DIR"]
env_template_file = conf_template_dir / "default.env"
db_template_file = conf_template_dir / "db.yaml"


# --- Generate Secrets ---
SALT = get_random_secret_key()
SECRET_KEY = get_random_secret_key()

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
# env_template_file = Path("./conf/default.env")
target = Path(".env") # .env should be in the working_dir (project root)

# Create a new .env file from template if it doesn't exist
if not target.exists():
    print(f"Creating .env file from template: {env_template_file}")
    try:
        shutil.copy(env_template_file, target)
    except Exception as e:
        print(f"Error copying template {env_template_file} to {target}: {e}")
else:
    print(".env file already exists. Updating...")

# Track what we've found or added in .env
found_keys = set()

# Read existing entries from .env
lines = []
if target.exists():
    try:
        with target.open("r", encoding="utf-8") as f:
            lines = f.readlines()
    except IOError as e:
        print(f"Error reading .env file {target}: {e}")


# Process and update entries
updated_lines = []
django_settings_production = nix_vars.get("DJANGO_SETTINGS_MODULE_PRODUCTION")
django_settings_development = nix_vars.get("DJANGO_SETTINGS_MODULE_DEVELOPMENT")
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
    # Keep existing line if no specific update rule matched
    updated_lines.append(line)


# Write updated content back to .env
try:
    with target.open("w", encoding="utf-8") as f:
        f.writelines(updated_lines)
except IOError as e:
    print(f"Error writing updated .env file {target}: {e}")

# Add any missing required entries to .env without quotes
try:
    with target.open("a", encoding="utf-8") as f:
        # Add secrets if missing
        if "DJANGO_SECRET_KEY" not in found_keys:
            f.write(f'\nDJANGO_SECRET_KEY={SECRET_KEY}') # No quotes
            print("Added DJANGO_SECRET_KEY to .env")

        if "DJANGO_SALT" not in found_keys:
            f.write(f'\nDJANGO_SALT={SALT}') # No quotes
            print("Added DJANGO_SALT to .env")
        

        # Add paths and config from nix_vars if missing
        # Ensure paths are NOT quoted
        vars_to_add = {
            "DJANGO_HOST": nix_vars.get("DJANGO_HOST"),
            "DJANGO_PORT": nix_vars.get("DJANGO_PORT"),
            "DJANGO_CONF_DIR": str(conf_dir),
            "HOME_DIR": str(nix_vars_paths.get("HOME_DIR")),
            "WORKING_DIR": str(nix_vars_paths.get("WORKING_DIR")),
            "STORAGE_DIR": str(nix_vars_paths.get("STORAGE_DIR")),
            "DJANGO_DATA_DIR": str(nix_vars_paths.get("DATA_DIR")),
            "DJANGO_IMPORT_DATA_DIR": str(nix_vars_paths.get("IMPORT_DIR")),
            "DJANGO_VIDEO_IMPORT_DATA_DIR": str(nix_vars_paths.get("IMPORT_VIDEO_DIR")),
            "DJANGO_SETTINGS_MODULE_PRODUCTION": nix_vars.get("DJANGO_SETTINGS_MODULE_PRODUCTION"),
            "DJANGO_SETTINGS_MODULE_DEVELOPMENT": nix_vars.get("DJANGO_SETTINGS_MODULE_DEVELOPMENT"),
            # "DJANGO_IMPORT_REPORT_DATA_DIR": str(nix_vars_paths.get("IMPORT_REPORT_DIR")),

            # Other defaults
            "TEST_RUN": "False",
            "TEST_RUN_FRAME_NUMBER": "1000",
            "RUST_BACKTRACE": "1",
            "DJANGO_DEBUG": "True",
            "DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE": "500",
            "LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION": "3" # Added missing default
        }
        for key, value in vars_to_add.items():
            if value is not None and key not in found_keys:
                f.write(f'\n{key}={value}') # No quotes
                print(f"Added {key} to .env")

except IOError as e:
    print(f"Error appending missing entries to .env file {target}: {e}")


print(f"Environment setup script finished. Check {target} and {db_pwd_file}")
