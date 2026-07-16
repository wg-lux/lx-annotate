from importlib import import_module

Migration = import_module(
    "endoreg_db.migrations.0012_networknode_transferjob"
).Migration
