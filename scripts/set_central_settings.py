from icecream import ic
import os
import sys
from pathlib import Path

# Use central settings if available, otherwise fall back to production
settings_module = os.environ.get("DJANGO_SETTINGS_MODULE_CENTRAL")
if not settings_module:
    settings_module = os.environ.get("DJANGO_SETTINGS_MODULE_PRODUCTION")
    if not settings_module:
        raise ValueError("Neither DJANGO_SETTINGS_MODULE_CENTRAL nor DJANGO_SETTINGS_MODULE_PRODUCTION environment variable is set")

env_path = Path(".env")

try:
    with open(env_path, "r", encoding="utf-8") as f:
        env_lines = f.readlines()
except FileNotFoundError:
    print(f"Error: .env file not found at {env_path}. Creating a new one.", file=sys.stderr)
    env_lines = []
except PermissionError:
    print(f"Error: Permission denied when reading {env_path}. Check file permissions.", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: Failed to read {env_path}: {e}", file=sys.stderr)
    sys.exit(1)

added = False
for i, line in enumerate(env_lines):
    if line.startswith("DJANGO_SETTINGS_MODULE"):
        env_lines[i] = f"DJANGO_SETTINGS_MODULE={settings_module}\n"
        added = True
        break

if not added:
    env_lines.append(f"DJANGO_SETTINGS_MODULE={settings_module}\n")

try:
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(env_lines)
except PermissionError:
    print(f"Error: Permission denied when writing to {env_path}. Check file permissions.", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: Failed to write to {env_path}: {e}", file=sys.stderr)
    sys.exit(1)

ic(f"DJANGO_SETTINGS_MODULE set to {settings_module}")
