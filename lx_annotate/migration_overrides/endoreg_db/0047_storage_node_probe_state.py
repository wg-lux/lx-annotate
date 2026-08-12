from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0068_storage_node_probe_state",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0046_storage_transfer_delete_evidence")
        if app == "endoreg_db"
        else (app, name)
        for app, name in _Upstream.dependencies
    ]
