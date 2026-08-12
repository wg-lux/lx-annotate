from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0064_bind_rotation_transfer_evidence",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0042_storage_transfer_evidence") if app == "endoreg_db" else (app, name)
        for app, name in _Upstream.dependencies
    ]
