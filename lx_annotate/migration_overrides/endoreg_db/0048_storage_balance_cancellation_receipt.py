from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0069_storage_balance_cancellation_receipt",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0047_storage_node_probe_state") if app == "endoreg_db" else (app, name)
        for app, name in _Upstream.dependencies
    ]
