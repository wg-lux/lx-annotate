from icecream import ic
import os
from pathlib import Path


DEFAULT_DEV_SETTINGS = "config.settings.dev"


settings_module = os.environ.get("DJANGO_SETTINGS_MODULE_DEVELOPMENT", DEFAULT_DEV_SETTINGS)

env_path = Path(".env")


try:
    with open(env_path, "r", encoding="utf-8") as f:
        env_lines = f.readlines()
except FileNotFoundError:
    env_lines = []

# change the value of DJANGO_SETTINGS_MODULE to DJANGO_SETTINGS_MODULE_DEVELOPMENT
added = False
for i, line in enumerate(env_lines):
    if line.startswith("DJANGO_SETTINGS_MODULE"):
        env_lines[i] = f"DJANGO_SETTINGS_MODULE={settings_module}\n"
        added = True
        break

if not added:
    env_lines.append(f"DJANGO_SETTINGS_MODULE={settings_module}\n")
    ic(f"Added DJANGO_SETTINGS_MODULE={settings_module} to {env_path}")

with open(env_path, "w", encoding="utf-8") as f:
    f.writelines(env_lines)
