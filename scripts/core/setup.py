#!/usr/bin/env python3
"""
Environment Setup for Lx Annotate
=================================
Generates a secrets file compatible with Secretspec and Devenv.
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Dict, Any

# --- Universal local import override ---
project_root = Path(__file__).resolve().parents[2]
local_lib = project_root / "libs" / "endoreg-db"

try:
    from django.core.management.utils import get_random_secret_key
except ImportError:
    # Fallback if Django isn't installed yet
    def get_random_secret_key() -> Literal['bootstrapped_secret_key_change_me_immediately']: return "bootstrapped_secret_key_change_me_immediately"

def log(msg: str):
    print(msg, file=sys.stderr)

class EnvironmentSetup:
    def __init__(self, output_file: Path, force: bool = False, status_only: bool = False):
        self.output_file = output_file
        self.force = force
        self.status_only = status_only
        self.project_root = Path(__file__).resolve().parents[2]
        
        # Dynamic paths
        self.cwd = Path.cwd()
        self.home = Path.home()
        self.data_dir = self.cwd / "data"

        # --- THE MASTER LIST OF DEFAULTS ---
        # Maps every missing Secretspec key to a default value or generator
        self.defaults: Dict[str, Any] = {
            # --- Security ---
            "DJANGO_SECRET_KEY": get_random_secret_key,
            "SECRET_KEY": get_random_secret_key, # Often redundant but requested by some configs
            "DJANGO_SALT": get_random_secret_key,
            "OIDC_RP_CLIENT_ID": "EndoregDb-realm",
            "ENFORCE_AUTH": "True",

            # --- Django Config ---
            "DJANGO_SETTINGS_MODULE": "lx_annotate.settings.settings_dev",
            "DJANGO_SETTINGS_MODULE_DEVELOPMENT": "lx_annotate.settings.settings_dev",
            "DJANGO_SETTINGS_MODULE_PRODUCTION": "lx_annotate.settings.settings_prod",
            "DJANGO_ENV": "development",
            "DJANGO_DEBUG": "True",
            "TIME_ZONE": "Europe/Berlin",
            "CENTER_NAME": "university_hospital_wuerzburg",
            "DJANGO_HOST": "localhost",
            "DJANGO_PORT": "8000",
            "STATIC_URL": "/static/",
            "MEDIA_URL": "/media/",
            "RUST_BACKTRACE": "1",

            # --- Directories (Nix/Devenv Compat) ---
            "HOME_DIR": str(self.home),
            "WORKING_DIR": str(self.cwd),
            "STORAGE_DIR": str(self.data_dir / "storage"),
            "ASSET_DIR": str(self.cwd / "tests/assets"),
            "DJANGO_CONF_DIR": str(self.cwd / "conf"),
            "DJANGO_DATA_DIR": str(self.data_dir),
            "DJANGO_IMPORT_DATA_DIR": str(self.data_dir / "import"),
            "DJANGO_VIDEO_IMPORT_DATA_DIR": str(self.data_dir / "import/video"),
            
            # --- AI / HuggingFace ---
            "HF_HOME": str(self.data_dir / "model_weights"),
            "HF_HUB_CACHE": str(self.data_dir / "model_weights/hub"),
            "TRANSFORMERS_CACHE": str(self.data_dir / "model_weights/transformers"),
            "HF_HUB_ENABLE_HF_TRANSFER": "0",
            "OLLAMA_MODELS": str(self.data_dir / "model_weights/ollama"),
            "OLLAMA_KEEP_ALIVE": "5m",

            # --- Feature Flags / Throttling ---
            "RUN_VIDEO_TESTS": "False",
            "SKIP_EXPENSIVE_TESTS": "True",
            "TEST_RUN": "False",
            "TEST_RUN_FRAME_NUMBER": "1000",
            "TEST_DISABLE_MIGRATIONS": "False",
            "VIDEO_DEFAULT_FPS": "25",
            "VIDEO_ALLOW_FPS_FALLBACK": "True",
            "DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE": "500",
            "DRF_THROTTLE_ANON": "100/day",
            "DRF_THROTTLE_USER": "1000/day",
        }

    def load_existing_secrets(self) -> Dict[str, str]:
        secrets = {}
        if self.output_file.exists():
            try:
                with open(self.output_file, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            secrets[key.strip()] = val.strip().strip("'").strip('"')
            except Exception as e:
                log(f"⚠️ Could not read existing secrets: {e}")
        return secrets

    def run(self):
        if self.status_only:
            log("🔍 Status-only mode (checking if file exists)...")
            if self.output_file.exists():
                log("✅ Secrets file found.")
            else:
                log("❌ Secrets file missing.")
            return

        log(f"🚀 Generating configuration in {self.output_file}...")
        
        # Ensure parent directory exists
        if not self.output_file.parent.exists():
            self.output_file.parent.mkdir(parents=True, exist_ok=True)

        current_secrets = self.load_existing_secrets()
        new_lines = []
        updates_count = 0
        
        for key, default_val in self.defaults.items():
            if key in current_secrets and not self.force:
                val = current_secrets[key]
            else:
                # Execute generator if it's a function (like get_random_secret_key)
                val = default_val() if callable(default_val) else default_val
                current_secrets[key] = str(val)
                updates_count += 1
            
            # Determine if we should quote the value (simple heuristic)
            if " " in val or "/" in val:
                new_lines.append(f'{key}="{val}"')
            else:
                new_lines.append(f'{key}={val}')

        try:
            with open(self.output_file, "w") as f:
                f.write("# Auto-generated by setup.py for Secretspec/Devenv\n")
                f.write("\n".join(new_lines))
                f.write("\n")
            log(f"✅ Wrote {len(new_lines)} variables ({updates_count} new) to {self.output_file}")
            log("👉 Run 'direnv reload' or 'devenv shell' to apply changes.")
        except Exception as e:
            log(f"❌ Failed to write file: {e}")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    # Default to writing to .env so direnv picks it up immediately
    parser.add_argument("--output", type=Path, default=Path(".env"), help="Output file")
    parser.add_argument("--force", action="store_true", help="Overwrite existing values")
    parser.add_argument("--status-only", action="store_true")
    args = parser.parse_args()
    
    setup = EnvironmentSetup(args.output, force=args.force, status_only=args.status_only)
    setup.run()

if __name__ == "__main__":
    main()