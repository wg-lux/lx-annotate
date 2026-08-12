from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0065_storage_transfer_commit_and_rekey",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0043_bind_rotation_transfer_evidence")
        if app == "endoreg_db"
        else (app, name)
        for app, name in _Upstream.dependencies
    ]
