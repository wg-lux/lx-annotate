#!/usr/bin/env python3
"""
Environment Setup and Initialization for Lx Annotate
=================================================

Handles initial environment setup including:
- .env file creation from templates
- Secret key generation  
- Configuration directory setup
- Database password file management

Usage:
    python scripts/core/setup.py
    python scripts/core/setup.py --force  # Force regeneration
"""

import os
import sys
import json
import shutil
import argparse
from pathlib import Path
from typing import Dict, Set
from django.core.management.utils import get_random_secret_key


class EnvironmentSetup:
    """Handles environment initialization and setup"""
    
    def __init__(self, force: bool = False, status_only: bool = False):
        self.force = force
        self.status_only = status_only
        self.default_db_password = "changeme_in_production"
        
        # Calculate project root (2 levels up from scripts/core/setup.py)
        self.project_root = Path(__file__).resolve().parents[2]
        
        self.status = {
            "config_dir": False,
            "db_pwd_file": False,
            "env_file": False,
            "secrets_generated": False
        }
        
        # Load environment variables only if not status-only mode
        if not status_only:
            self.nix_vars = self._load_nix_variables()
            self.nix_paths = self._process_paths()
        else:
            self.nix_vars = {}
            self.nix_paths = {}
            # For status-only mode, check basic files that don't need Nix vars
            self._check_basic_status()
    
    def _check_basic_status(self):
        """Check basic status without requiring Nix environment variables"""
        # Check if basic files exist
        if Path(".env").exists():
            self.status["env_file"] = True
            
        # Check if conf directory exists (using common paths)
        conf_paths = [Path("conf"), Path("./conf")]
        for conf_path in conf_paths:
            if conf_path.exists():
                self.status["config_dir"] = True
                break
                
        # Check if db password file exists (using common paths) 
        db_pwd_paths = [Path("conf/db_pwd"), Path("./conf/db_pwd")]
        for db_pwd_path in db_pwd_paths:
            if db_pwd_path.exists():
                self.status["db_pwd_file"] = True
                break
                
        # Check if .env has secrets (basic check)
        if Path(".env").exists():
            try:
                with open(".env", "r") as f:
                    content = f.read()
                    if "DJANGO_SECRET_KEY" in content and "DJANGO_SALT" in content:
                        self.status["secrets_generated"] = True
            except Exception:
                pass
    
    def _load_nix_variables(self) -> Dict[str, str]:
        """Load required environment variables"""
        required_vars = [
            "CONF_DIR", "HOME_DIR", "DJANGO_MODULE",
            "DJANGO_HOST", "DB_PWD_FILE", "DJANGO_PORT", "DATA_DIR"
        ]
        
        # Optional variables with smart defaults
        optional_vars = [
            "WORKING_DIR",  # Can be derived from current directory
            "IMPORT_DIR", "IMPORT_VIDEO_DIR", "IMPORT_REPORT_DIR",
            "MODEL_DIR", "CONF_TEMPLATE_DIR", "STORAGE_DIR",
            "DJANGO_SETTINGS_MODULE_PRODUCTION",
            "DJANGO_SETTINGS_MODULE_DEVELOPMENT",
            "DJANGO_SETTINGS_MODULE_CENTRAL"
        ]
        
        vars_dict = {}
        
        # Required variables
        for var in required_vars:
            value = os.environ.get(var)
            if not value:
                raise ValueError(f"Missing required environment variable: {var}")
            vars_dict[var] = value
        
        # Optional variables with smart defaults
        defaults = {
            "WORKING_DIR": os.getcwd(),  # Use current working directory
            "IMPORT_DIR": "data/import",
            "IMPORT_VIDEO_DIR": "data/import/video", 
            "IMPORT_REPORT_DIR": "data/import/report",
            "MODEL_DIR": "data/model",
            "CONF_TEMPLATE_DIR": str(self.project_root / "conf_template"),
            "STORAGE_DIR": "data/storage"
        }
        
        for var in optional_vars:
            value = os.environ.get(var, defaults.get(var))
            if value:
                vars_dict[var] = value
        
        return vars_dict
    
    def _process_paths(self) -> Dict[str, Path]:
        """Process environment variables into Path objects"""
        paths = {}
        
        for key, value in self.nix_vars.items():
            if key.endswith("_DIR") or key.endswith("_FILE"):
                # Clean quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1].strip()
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1].strip()
                else:
                    value = value.strip()
                
                paths[key] = Path(value).resolve()
        
        return paths
    
    def setup_configuration_directory(self) -> bool:
        """Ensure configuration directory exists"""
        if self.status_only or not self.nix_paths:
            return False
            
        conf_dir = self.nix_paths["CONF_DIR"]
        
        print(f"📁 Checking configuration directory: {conf_dir}")
        if not conf_dir.exists():
            print(f"Creating configuration directory: {conf_dir}")
            conf_dir.mkdir(parents=True, exist_ok=True)
            self.status["config_dir"] = True
            return True
        else:
            print("Configuration directory already exists.")
            self.status["config_dir"] = True
            return False
    
    def setup_database_password_file(self) -> bool:
        """Create database password file if missing"""
        if self.status_only or not self.nix_paths:
            return False
            
        db_pwd_file = self.nix_paths["DB_PWD_FILE"]
        
        print(f"🔐 Checking database password file: {db_pwd_file}")
        if not db_pwd_file.exists() or self.force:
            print(f"Creating database password file: {db_pwd_file}")
            try:
                # Create file with restrictive permissions (owner read/write only)
                fd = os.open(db_pwd_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode=0o600)
                with os.fdopen(fd, 'w', encoding='utf-8') as f:
                    f.write(self.default_db_password)
                print(f"✅ Created '{db_pwd_file}'. IMPORTANT: Change default password for production!")
                self.status["db_pwd_file"] = True
                return True
            except IOError as e:
                print(f"❌ Failed to create database password file '{db_pwd_file}': {e}")
                return False
        else:
            print("Database password file already exists.")
            self.status["db_pwd_file"] = True
            return False
    
    def setup_env_file(self) -> bool:
        """Create and configure .env file"""
        if self.status_only or not self.nix_paths:
            return False
            
        env_template = self.nix_paths.get("CONF_TEMPLATE_DIR", self.project_root / "conf_template") / "default.env"
        env_target = Path(".env")
        
        print("🌍 Setting up .env file...")
        
        # Create from template if doesn't exist or force is specified
        if not env_target.exists():
            print(f"Creating .env file from template: {env_template}")
            if env_template.exists():
                try:
                    shutil.copy(env_template, env_target)
                    print("✅ Created .env from template")
                except Exception as e:
                    print(f"⚠️  Error copying template: {e}")
                    # Create empty .env file
                    env_target.touch()
            else:
                print("⚠️  Template not found, creating empty .env file")
                env_target.touch()
        else:
            print(".env file already exists. Updating...")
        
        # Update/add required environment variables
        self._update_env_file(env_target)
        self.status["env_file"] = True
        return True
    
    def _update_env_file(self, env_file: Path):
        """Update .env file with required variables"""
        # Read existing content
        found_keys: Set[str] = set()
        lines = []
        
        if env_file.exists():
            try:
                with env_file.open("r", encoding="utf-8") as f:
                    lines = f.readlines()
            except IOError as e:
                print(f"Error reading .env file: {e}")
                return
        
        # Track existing keys
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key = stripped.split("=", 1)[0].strip()
            found_keys.add(key)
        
        # Write back existing content
        try:
            with env_file.open("w", encoding="utf-8") as f:
                f.writelines(lines)
        except IOError as e:
            print(f"Error writing .env file: {e}")
            return
        
        # Add missing variables
        self._add_missing_env_vars(env_file, found_keys)
    
    def _add_missing_env_vars(self, env_file: Path, found_keys: Set[str]):
        """Add missing environment variables to .env file"""
        try:
            with env_file.open("a", encoding="utf-8") as f:
                # Generate and add secrets if missing
                if "DJANGO_SECRET_KEY" not in found_keys:
                    secret_key = get_random_secret_key()
                    f.write(f'\nDJANGO_SECRET_KEY="{secret_key}"\n')
                    print("✅ Added DJANGO_SECRET_KEY to .env")
                    self.status["secrets_generated"] = True
                else:
                    print("✅ DJANGO_SECRET_KEY already exists in .env")
                    self.status["secrets_generated"] = True
                
                if "DJANGO_SALT" not in found_keys:
                    salt = get_random_secret_key()
                    f.write(f'DJANGO_SALT="{salt}"\n')
                    print("✅ Added DJANGO_SALT to .env")
                    self.status["secrets_generated"] = True
                else:
                    print("✅ DJANGO_SALT already exists in .env")
                    self.status["secrets_generated"] = True
                
                # Add configuration variables if missing
                vars_to_add = {
                    "DJANGO_HOST": self.nix_vars.get("DJANGO_HOST"),
                    "DJANGO_PORT": self.nix_vars.get("DJANGO_PORT"),
                    "DJANGO_CONF_DIR": str(self.nix_paths.get("CONF_DIR")),
                    "HOME_DIR": str(self.nix_paths.get("HOME_DIR")),
                    "WORKING_DIR": str(self.nix_paths.get("WORKING_DIR")),
                    "STORAGE_DIR": str(self.nix_paths.get("STORAGE_DIR")),
                    "DJANGO_DATA_DIR": str(self.nix_paths.get("DATA_DIR")),
                    "DJANGO_IMPORT_DATA_DIR": str(self.nix_paths.get("IMPORT_DIR")),
                    "DJANGO_VIDEO_IMPORT_DATA_DIR": str(self.nix_paths.get("IMPORT_VIDEO_DIR")),
                    "DJANGO_SETTINGS_MODULE_PRODUCTION": self.nix_vars.get("DJANGO_SETTINGS_MODULE_PRODUCTION"),
                    "DJANGO_SETTINGS_MODULE_DEVELOPMENT": self.nix_vars.get("DJANGO_SETTINGS_MODULE_DEVELOPMENT"),
                    # Default values
                    "TEST_RUN": "False",
                    "TEST_RUN_FRAME_NUMBER": "1000", 
                    "RUST_BACKTRACE": "1",
                    "DJANGO_DEBUG": "True",
                    "DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE": "500",
                    "LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION": "3"
                }
                
                for key, value in vars_to_add.items():
                    if value is not None and key not in found_keys:
                        f.write(f'{key}={value}\n')
                        print(f"✅ Added {key} to .env")
        
        except IOError as e:
            print(f"Error adding variables to .env file: {e}")
    
    def run_setup(self) -> Dict[str, bool]:
        """Run complete environment setup"""
        if self.status_only:
            print("🔍 Status-only mode: skipping setup operations")
            return self.status
            
        print("🚀 Starting Lx Annotate Environment Setup")
        print("=" * 40)
        
        try:
            self.setup_configuration_directory()
            self.setup_database_password_file()
            self.setup_env_file()
            
            print("\n✅ Environment setup completed successfully!")
            print(f"📋 Status: {sum(self.status.values())}/{len(self.status)} components configured")
            
            return self.status
            
        except Exception as e:
            print(f"\n❌ Environment setup failed: {e}")
            return self.status
    
    def show_status(self):
        """Display setup status"""
        print("\n📊 Environment Setup Status:")
        print("-" * 30)
        
        status_icons = {True: "✅", False: "❌"}
        status_messages = {
            "config_dir": "Configuration directory",
            "db_pwd_file": "Database password file", 
            "env_file": ".env file",
            "secrets_generated": "Secret keys generated"
        }
        
        for key, value in self.status.items():
            icon = status_icons[value]
            message = status_messages[key]
            print(f"  {icon} {message}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Environment setup and initialization for Lx Annotate"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force regeneration of existing files"
    )
    parser.add_argument(
        "--status-only",
        action="store_true", 
        help="Show status without making changes"
    )
    
    args = parser.parse_args()
    
    try:
        setup = EnvironmentSetup(force=args.force, status_only=args.status_only)
        
        if args.status_only:
            # Just check and show status without making changes
            setup.show_status()
        else:
            # Run full setup
            status = setup.run_setup()
            setup.show_status()
            
            # Exit with error if setup failed
            if not all(status.values()):
                print("\n⚠️  Some setup components failed. Check logs above.")
                sys.exit(1)
    
    except Exception as e:
        print(f"❌ Setup failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
