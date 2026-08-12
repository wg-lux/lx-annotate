from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0062_storage_balance_work_item",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0040_storage_control_plane_hardening")
        if app == "endoreg_db"
        else (app, name)
        for app, name in _Upstream.dependencies
    ]
