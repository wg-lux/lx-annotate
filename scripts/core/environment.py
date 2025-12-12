#!/usr/bin/env python3
"""
Unified Environment Settings Management for Lx Annotate
====================================================

Consolidates environment configuration for development, production, and central node modes.
Replaces set_development_settings.py, set_production_settings.py, and set_central_settings.py.

Usage:
    python scripts/environment.py development
    python scripts/environment.py production  
    python scripts/environment.py central
"""

import os
import sys
from pathlib import Path
from typing import Optional
import argparse

class EnvironmentManager:
    """Unified environment configuration management"""
    
    def __init__(self, env_file: Path = Path(".env")):
        self.env_file = env_file
        self.env_lines = self._load_env_file()
    
    def _load_env_file(self) -> list[str]:
        """Load existing .env file or create empty list"""
        try:
            with open(self.env_file, "r", encoding="utf-8") as f:
                return f.readlines()
        except FileNotFoundError:
            return []
    
    def _save_env_file(self):
        """Save environment lines back to file"""
        with open(self.env_file, "w", encoding="utf-8") as f:
            f.writelines(self.env_lines)
    
    def _update_env_var(self, key: str, value: str):
        """Update or add an environment variable in .env file"""
        updated = False
        for i, line in enumerate(self.env_lines):
            if line.startswith(f"{key}="):
                self.env_lines[i] = f"{key}={value}\n"
                updated = True
                break
        
        if not updated:
            self.env_lines.append(f"{key}={value}\n")
            print(f"✅ Added {key}={value} to {self.env_file}")
        else:
            print(f"✅ Updated {key}={value} in {self.env_file}")
    
    def set_development_mode(self):
        """Configure environment for development mode"""
        print("🔧 Configuring development environment...")
        
        settings_module = os.environ.get("DJANGO_SETTINGS_MODULE_DEVELOPMENT")
        if not settings_module:
            settings_module = "lx-annotate.settings_dev"
            print(f"⚠️  Using default development settings: {settings_module}")
        
        self._update_env_var("DJANGO_SETTINGS_MODULE", settings_module)
        self._update_env_var("DJANGO_ENV", "development")
        
        self._save_env_file()
        print("✅ Development environment configured")
    
    def set_production_mode(self):
        """Configure environment for production mode"""
        print("🚀 Configuring production environment...")
        
        settings_module = os.environ.get("DJANGO_SETTINGS_MODULE_PRODUCTION")
        if not settings_module:
            settings_module = "lx-annotate.settings_prod"
            print(f"⚠️  Using default production settings: {settings_module}")
        
        self._update_env_var("DJANGO_SETTINGS_MODULE", settings_module)
        self._update_env_var("DJANGO_ENV", "production")
        
        self._save_env_file()
        print("✅ Production environment configured")
    
    def set_central_mode(self):
        """Configure environment for central node mode"""
        print("🏢 Configuring central node environment...")
        
        settings_module = os.environ.get("DJANGO_SETTINGS_MODULE_CENTRAL")
        if not settings_module:
            settings_module = "lx-annotate.settings_central"
            print(f"⚠️  Using default central settings: {settings_module}")
        
        self._update_env_var("DJANGO_SETTINGS_MODULE", settings_module)
        self._update_env_var("DJANGO_ENV", "production")
        self._update_env_var("CENTRAL_NODE", "true")
        
        self._save_env_file()
        print("✅ Central node environment configured")
    
    def show_current_config(self):
        """Display current environment configuration"""
        print("📋 Current Environment Configuration:")
        print("=" * 40)
        
        if not self.env_file.exists():
            print("❌ No .env file found")
            return
        
        # Show relevant environment variables
        relevant_vars = [
            "DJANGO_SETTINGS_MODULE",
            "DJANGO_ENV", 
            "CENTRAL_NODE"
        ]
        
        env_dict = {}
        for line in self.env_lines:
            if "=" in line and not line.strip().startswith("#"):
                key, value = line.strip().split("=", 1)
                env_dict[key] = value
        
        for var in relevant_vars:
            value = env_dict.get(var, "Not set")
            print(f"  {var}: {value}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Unified environment settings management for Lx Annotate"
    )
    parser.add_argument(
        "mode",
        choices=["development", "production", "central", "dev", "prod", "show"],
        help="Environment mode to configure"
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(".env"),
        help="Path to .env file (default: .env)"
    )
    
    args = parser.parse_args()
    
    manager = EnvironmentManager(args.env_file)
    
    # Handle mode aliases
    mode = args.mode
    if mode == "dev":
        mode = "development"
    elif mode == "prod":
        mode = "production"
    
    if mode == "development":
        manager.set_development_mode()
    elif mode == "production":
        manager.set_production_mode()
    elif mode == "central":
        manager.set_central_mode()
    elif mode == "show":
        manager.show_current_config()
        return
    
    # Show final configuration
    print()
    manager.show_current_config()

if __name__ == "__main__":
    main()
