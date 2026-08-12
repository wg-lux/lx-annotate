from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0071_storage_operator_control",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0049_storage_reconciliation") if app == "endoreg_db" else (app, name)
        for app, name in _Upstream.dependencies
    ]
