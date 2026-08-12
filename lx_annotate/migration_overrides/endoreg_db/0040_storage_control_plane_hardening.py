from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0061_storage_control_plane_hardening",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0039_hub_storage_placement") if app == "endoreg_db" else (app, name)
        for app, name in _Upstream.dependencies
    ]
