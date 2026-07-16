"""Proxy to upstream migration."""

from importlib import import_module

Migration = import_module("endoreg_db.migrations.0006_applicationsettings").Migration
