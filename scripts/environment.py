#!/usr/bin/env python3
"""
Unified Environment Settings Management for Lx Annotate
====================================================

Canonical vars: DJANGO_ENV, DJANGO_DEBUG, DJANGO_ALLOWED_HOSTS, DJANGO_SECRET_KEY, DATABASE_URL/DB_*

Usage:
    python scripts/environment.py development
    python scripts/environment.py production  
    python scripts/environment.py central
    python scripts/environment.py show
"""

import os
from pathlib import Path
import argparse

class EnvironmentManager:
    def __init__(self, env_file: Path = Path(".env")):
        self.env_file = env_file
        self.env_lines = self._load_env_file()

    def _load_env_file(self):
        try:
            return self.env_file.read_text(encoding="utf-8").splitlines(True)
        except FileNotFoundError:
            return []

    def _save(self):
        self.env_file.write_text("".join(self.env_lines), encoding="utf-8")

    def _set(self, key: str, value: str):
        for i, line in enumerate(self.env_lines):
            if line.startswith(f"{key}="):
                self.env_lines[i] = f"{key}={value}\n"
                break
        else:
            self.env_lines.append(f"{key}={value}\n")
        print(f"set {key}={value}")

    def set_development(self):
        print("Configuring development env...")
        self._set("DJANGO_ENV", "development")
        self._set("DJANGO_DEBUG", "True")
        self._set("DJANGO_ALLOWED_HOSTS", "*")
        self._save()

    def set_production(self):
        print("Configuring production env...")
        self._set("DJANGO_ENV", "production")
        self._set("DJANGO_DEBUG", "False")
        self._save()

    def set_central(self):
        print("Configuring central env...")
        self._set("DJANGO_ENV", "production")
        self._set("CENTRAL_NODE", "true")
        self._set("DJANGO_DEBUG", "False")
        self._save()

    def show(self):
        print("Current .env:")
        print(self.env_file.read_text(encoding="utf-8") if self.env_file.exists() else "<none>")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["development", "production", "central", "dev", "prod", "show"]) 
    p.add_argument("--env-file", default=".env")
    a = p.parse_args()
    m = EnvironmentManager(Path(a.env_file))
    mode = {"dev":"development", "prod":"production"}.get(a.mode, a.mode)
    if mode == "development":
        m.set_development()
    elif mode == "production":
        m.set_production()
    elif mode == "central":
        m.set_central()
    else:
        m.show()

if __name__ == "__main__":
    main()
