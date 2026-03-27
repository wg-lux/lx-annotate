from importlib import import_module

Migration = import_module(
    "endoreg_db.migrations.0013_remove_legacy_requirement_models"
).Migration
