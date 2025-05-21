from django.core.management.utils import get_random_secret_key
import os
from pathlib import Path
import shutil

# Generate random keys
SALT = get_random_secret_key()
SECRET_KEY = get_random_secret_key()

# Define the correct path for the .env file
project_root = Path(__file__).resolve().parent.parent  # Adjust to point to the project root
settings_pkg = "lx_annotate"  # Adjust if your settings package name differs
target_dir = project_root

target = target_dir / ".env"

target_dir.mkdir(parents=True, exist_ok=True)

# Ensure the .env file exists
template = project_root / "conf_template" / "default.env"

target_dir.mkdir(parents=True, exist_ok=True)

# Ensure the .env file exists
template = project_root / "conf_template" / "default.env"

target_dir.mkdir(parents=True, exist_ok=True)

# Ensure the .env file exists
template = project_root / "conf_template" / "default.env"

target_dir.mkdir(parents=True, exist_ok=True)

# Ensure the .env file exists
template = project_root / "conf_template" / "default.env"

target_dir.mkdir(parents=True, exist_ok=True)

# Ensure the .env file exists
template = Path("./conf_template/default.env")
if not target.exists():
    if template.exists():
        shutil.copy(template, target)
    else:
        try:
            target.touch()
        except Exception as e:
            print(f"Error creating .env file: {e}")
            raise

# Check if keys already exist in the .env file
found_salt = False
found_secret_key = False
for line in target.open():
    key, value = line.split("=", 1)
    if key == "DJANGO_SALT":
        found_salt = True
    if key == "DJANGO_SECRET_KEY":
        found_secret_key = True

# Append keys if they are missing
with target.open("a") as f:
    if not found_secret_key:
        f.write(f'\nDJANGO_SECRET_KEY="{SECRET_KEY}"')  # Wrap in quotes for safety
    if not found_salt:
        f.write(f'\nDJANGO_SALT="{SALT}"')
